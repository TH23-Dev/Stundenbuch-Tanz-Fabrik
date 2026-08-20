import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";
import { C, eingabeStil } from "./theme";
import { Tag, Knopf, karteStil } from "./ui";
import { iso, wochentag, monatsGrenzenFuer, aktuellerMonat, datumLabel, datumVoll, TAGE, istVergangen } from "./lib/datum";
import { std, chf } from "./lib/lohn";
import { speichereLektionStatus, ladeAktuelleLektionen, ladeOffeneEigeneLektionen } from "./lib/lektionen";
import { satzAmDatum } from "./lib/saetze";
import { protokolliereAbwesenheit } from "./lib/abwesenheiten";

const KURS_FELDER = "id,wochentag,zeit,dauer_min,bezeichnung,standort_code,lehrer_id,ansatz,gueltig_von,gueltig_bis";
const LEHRER_FELDER = "id,vorname,nachname,satz,vertretungssatz,aktiv,r_lehrer";

export default function Lektionsverwaltung({ session }) {
  const [monat, setMonat] = useState(aktuellerMonat());
  const [laden, setLaden] = useState(true);
  const [ladeFehler, setLadeFehler] = useState("");
  const [aktionFehler, setAktionFehler] = useState("");

  const [orte, setOrte] = useState({});
  const [lehrerListe, setLehrerListe] = useState([]);
  const [kurse, setKurse] = useState([]);
  const [overrides, setOverrides] = useState({});
  const [abschluss, setAbschluss] = useState(null);
  const [satzHistorie, setSatzHistorie] = useState([]);

  const [filterOrt, setFilterOrt] = useState("");
  const [filterLehrer, setFilterLehrer] = useState("");
  const [ferienVon, setFerienVon] = useState("");
  const [ferienBis, setFerienBis] = useState("");
  const [ferienOrt, setFerienOrt] = useState("");
  const [pauseKursId, setPauseKursId] = useState("");
  const [pauseVon, setPauseVon] = useState("");
  const [pauseBis, setPauseBis] = useState("");
  const [absLehrerId, setAbsLehrerId] = useState("");
  const [absVon, setAbsVon] = useState("");
  const [absBis, setAbsBis] = useState("");
  const [absMeldung, setAbsMeldung] = useState("");
  const [absLaeuft, setAbsLaeuft] = useState(false);
  const [abwesenheitenHistorie, setAbwesenheitenHistorie] = useState([]);

  const { jahr, monatIndex, tageImMonat, von, bis } = useMemo(() => monatsGrenzenFuer(monat), [monat]);
  const monatGesperrt = !!abschluss;

  useEffect(() => {
    let aktiv = true;

    async function laden() {
      setLaden(true);
      setLadeFehler("");
      setAktionFehler("");

      const [
        { data: orteData, error: e1 },
        { data: lehrerData, error: e2 },
        { data: kurseData, error: e3 },
        { data: statusData, error: e4 },
        { data: abschlussData, error: e5 },
        { data: historieData, error: e6 },
        { data: abwesenheitData, error: e7 },
      ] = await Promise.all([
        supabase.from("standorte").select("code,name"),
        supabase.from("lehrer").select(LEHRER_FELDER).order("nachname"),
        supabase.from("kurse").select(KURS_FELDER),
        supabase.from("lektion_status").select("kurs_id,datum,ist_lehrer,status,bemerkung").gte("datum", von).lte("datum", bis),
        supabase.from("monatsabschluss").select("monat,abgeschlossen_am").eq("monat", monat).maybeSingle(),
        supabase.from("lehrer_saetze").select("lehrer_id,satz,vertretungssatz,gueltig_von"),
        supabase.from("abwesenheiten").select("id,lehrer_id,von,bis,anzahl_stunden,erfasst_am").order("erfasst_am", { ascending: false }).limit(50),
      ]);
      if (!aktiv) return;

      const fehler = e1 || e2 || e3 || e4 || e5 || e6 || e7;
      if (fehler) {
        setLadeFehler(fehler.message);
        setLaden(false);
        return;
      }
      setSatzHistorie(historieData || []);
      setAbwesenheitenHistorie(abwesenheitData || []);

      const orteMap = {};
      (orteData || []).forEach((o) => (orteMap[o.code] = o.name));
      const oMap = {};
      (statusData || []).forEach((s) => (oMap[`${s.kurs_id}|${s.datum}`] = s));

      setOrte(orteMap);
      setLehrerListe(lehrerData || []);
      setKurse(kurseData || []);
      setOverrides(oMap);
      setAbschluss(abschlussData || null);
      setAbsLehrerId((id) => id || (lehrerData || []).find((p) => p.r_lehrer)?.id || "");
      setLaden(false);
    }

    laden();
    return () => {
      aktiv = false;
    };
  }, [monat, von, bis]);

  const kurseById = useMemo(() => {
    const m = {};
    kurse.forEach((k) => (m[k.id] = k));
    return m;
  }, [kurse]);
  const lehrerById = useMemo(() => {
    const m = {};
    lehrerListe.forEach((p) => (m[p.id] = p));
    return m;
  }, [lehrerListe]);
  const K = (id) => kurseById[id];
  const P = (id) => lehrerById[id];
  const lehrpersonen = lehrerListe.filter((p) => p.r_lehrer && p.aktiv);

  const lektionen = useMemo(() => {
    const liste = [];
    for (let t = 1; t <= tageImMonat; t++) {
      const d = new Date(jahr, monatIndex, t, 12);
      const datum = iso(d);
      const wt = wochentag(d);
      kurse.forEach((k) => {
        if (k.wochentag !== wt) return;
        if (k.gueltig_von > datum) return;
        if (k.gueltig_bis && k.gueltig_bis < datum) return;
        const key = `${k.id}|${datum}`;
        const o = overrides[key];
        const istLehrer = o ? o.ist_lehrer : k.lehrer_id;
        const status = o?.status || "geplant";
        const bemerkung = o?.bemerkung || "";
        liste.push({ id: key, kursId: k.id, datum, sollLehrer: k.lehrer_id, istLehrer, status, bemerkung });
      });
    }
    return liste.sort((a, b) => a.datum.localeCompare(b.datum) || K(a.kursId).zeit.localeCompare(K(b.kursId).zeit));
  }, [kurse, overrides, jahr, monatIndex, tageImMonat]);

  const vergangen = (l) => istVergangen(l.datum, K(l.kursId).zeit, K(l.kursId).dauer_min);
  const istVertretung = (l) => l.istLehrer && l.istLehrer !== l.sollLehrer;
  const unbest = (l) => l.status === "geplant" && vergangen(l) && !!l.istLehrer;
  const stdFn = (l) => std(K(l.kursId).dauer_min);
  const satz = (l) => {
    if (!l.istLehrer) return 0;
    if (istVertretung(l)) return satzAmDatum(satzHistorie, l.istLehrer, l.datum, "vertretungssatz");
    const k = K(l.kursId);
    if (k.ansatz != null) return k.ansatz;
    return satzAmDatum(satzHistorie, l.istLehrer, l.datum, "satz");
  };
  const relevant = (l) => l.status === "gehalten" && !!l.istLehrer;
  const lohn = (l) => (relevant(l) ? stdFn(l) * satz(l) : 0);

  // Der Lehrer-Filter zeigt sowohl Lektionen, die diese Person aktuell hält,
  // als auch Lektionen ihrer eigenen Kurse, die gerade offen oder von jemand
  // anderem übernommen sind -- sonst verschwindet z.B. eine wegen
  // Abwesenheit freigegebene Lektion beim Filtern komplett aus der Ansicht.
  const gefiltert = lektionen.filter(
    (l) =>
      (!filterOrt || K(l.kursId).standort_code === filterOrt) &&
      (!filterLehrer || l.istLehrer === filterLehrer || l.sollLehrer === filterLehrer)
  );

  // Sichtbare Übersicht der per "Ferien" gestrichenen Lektionen im gewählten
  // Monat, gruppiert pro Standort (früheste bis späteste betroffene
  // Lektion) -- sonst ist ein Ferien-Eintrag nirgends einsehbar, ausser man
  // sucht ihn Zeile für Zeile in "Alle Lektionen".
  const ferienGruppen = useMemo(() => {
    const eintraege = lektionen.filter((l) => l.status === "ausgefallen" && l.bemerkung === "Ferien");
    const gruppen = {};
    eintraege.forEach((l) => {
      const ort = K(l.kursId).standort_code;
      if (!gruppen[ort]) gruppen[ort] = { ort, von: l.datum, bis: l.datum, lektionen: [] };
      const g = gruppen[ort];
      if (l.datum < g.von) g.von = l.datum;
      if (l.datum > g.bis) g.bis = l.datum;
      g.lektionen.push({ kursId: l.kursId, datum: l.datum, istLehrer: l.istLehrer });
    });
    return Object.values(gruppen).sort((a, b) => a.von.localeCompare(b.von));
  }, [lektionen, kurseById]);

  async function aendern(l, changes) {
    const key = l.id;
    const vorher = overrides[key];
    const neu = {
      ist_lehrer: "ist_lehrer" in changes ? changes.ist_lehrer : l.istLehrer,
      status: "status" in changes ? changes.status : l.status,
      bemerkung: "bemerkung" in changes ? changes.bemerkung : l.bemerkung,
    };
    setOverrides((prev) => ({ ...prev, [key]: neu }));
    setAktionFehler("");
    const { error } = await speichereLektionStatus(supabase, {
      kursId: l.kursId,
      datum: l.datum,
      istLehrer: neu.ist_lehrer,
      status: neu.status,
      bemerkung: neu.bemerkung,
      geaendertVon: session.user.id,
    });
    if (error) {
      setOverrides((prev) => ({ ...prev, [key]: vorher }));
      setAktionFehler(`Änderung an ${datumLabel(l.datum)} ${K(l.kursId).bezeichnung} fehlgeschlagen: ${error.message}`);
    }
  }

  // Streicht alle Lektionen eines (optional: aller) Standorte über einen
  // frei wählbaren Zeitraum -- unabhängig vom aktuell angezeigten Monat, da
  // Ferien über Monatsgrenzen hinausgehen können. Beliebig oft mit
  // unterschiedlichem Standort/Zeitraum wiederholbar, da jeder Standort
  // andere Ferienwochen hat.
  async function ferienSetzen() {
    if (!ferienVon || !ferienBis || ferienVon > ferienBis) return;
    setAktionFehler("");

    const betroffeneKurse = kurse.filter((k) => !ferienOrt || k.standort_code === ferienOrt);
    if (betroffeneKurse.length === 0) {
      setAktionFehler("Keine Kurse für diesen Standort gefunden.");
      return;
    }
    const kurseByIdLokal = {};
    betroffeneKurse.forEach((k) => (kurseByIdLokal[k.id] = k));

    const termine = [];
    for (let d = new Date(ferienVon + "T12:00"); d <= new Date(ferienBis + "T12:00"); d.setDate(d.getDate() + 1)) {
      const datum = iso(d);
      const wt = wochentag(d);
      betroffeneKurse.forEach((k) => {
        if (k.wochentag !== wt) return;
        if (k.gueltig_von > datum) return;
        if (k.gueltig_bis && k.gueltig_bis < datum) return;
        termine.push({ kursId: k.id, datum });
      });
    }
    if (termine.length === 0) {
      setAktionFehler("Keine Lektionen im gewählten Zeitraum gefunden.");
      return;
    }

    const { data: bestehende, error: ladeErr } = await supabase
      .from("lektion_status")
      .select("kurs_id,datum,ist_lehrer,status")
      .in("kurs_id", betroffeneKurse.map((k) => k.id))
      .gte("datum", ferienVon)
      .lte("datum", ferienBis);
    if (ladeErr) {
      setAktionFehler(ladeErr.message);
      return;
    }
    const bestehendeMap = {};
    (bestehende || []).forEach((s) => (bestehendeMap[`${s.kurs_id}|${s.datum}`] = s));

    const betroffene = termine
      .filter(({ kursId, datum }) => (bestehendeMap[`${kursId}|${datum}`]?.status || "geplant") !== "ausgefallen")
      .map(({ kursId, datum }) => ({
        kursId,
        datum,
        istLehrer: bestehendeMap[`${kursId}|${datum}`] ? bestehendeMap[`${kursId}|${datum}`].ist_lehrer : kurseByIdLokal[kursId].lehrer_id,
      }));

    if (betroffene.length === 0) {
      setAktionFehler("Alle Lektionen in diesem Zeitraum sind bereits als ausgefallen markiert.");
      return;
    }

    setOverrides((prev) => {
      const next = { ...prev };
      betroffene.forEach(({ kursId, datum, istLehrer }) => {
        if (datum >= von && datum <= bis) next[`${kursId}|${datum}`] = { ist_lehrer: istLehrer, status: "ausgefallen", bemerkung: "Ferien" };
      });
      return next;
    });

    const ergebnisse = await Promise.all(
      betroffene.map(({ kursId, datum, istLehrer }) =>
        speichereLektionStatus(supabase, {
          kursId,
          datum,
          istLehrer,
          status: "ausgefallen",
          bemerkung: "Ferien",
          geaendertVon: session.user.id,
        })
      )
    );
    const fehlgeschlagen = ergebnisse.filter((r) => r.error).length;
    if (fehlgeschlagen) {
      setAktionFehler(`${fehlgeschlagen} von ${betroffene.length} Lektionen konnten nicht gestrichen werden.`);
    } else {
      setFerienVon("");
      setFerienBis("");
    }
  }

  // Gegenstück zu ferienSetzen: reaktiviert im selben Standort/Zeitraum nur
  // Lektionen mit bemerkung "Ferien" -- nicht einzeln gestrichene ("Ausfall")
  // oder pausierte ("Pause") Lektionen, die im selben Zeitraum liegen könnten.
  async function ferienRueckgaengig() {
    if (!ferienVon || !ferienBis || ferienVon > ferienBis) return;
    setAktionFehler("");

    const betroffeneKurse = kurse.filter((k) => !ferienOrt || k.standort_code === ferienOrt);
    if (betroffeneKurse.length === 0) {
      setAktionFehler("Keine Kurse für diesen Standort gefunden.");
      return;
    }

    const { data: bestehende, error: ladeErr } = await supabase
      .from("lektion_status")
      .select("kurs_id,datum,ist_lehrer")
      .in("kurs_id", betroffeneKurse.map((k) => k.id))
      .gte("datum", ferienVon)
      .lte("datum", ferienBis)
      .eq("status", "ausgefallen")
      .eq("bemerkung", "Ferien");
    if (ladeErr) {
      setAktionFehler(ladeErr.message);
      return;
    }
    if (!bestehende || bestehende.length === 0) {
      setAktionFehler("Keine Ferien-Einträge in diesem Zeitraum/Standort gefunden.");
      return;
    }

    setOverrides((prev) => {
      const next = { ...prev };
      bestehende.forEach((s) => {
        if (s.datum >= von && s.datum <= bis) next[`${s.kurs_id}|${s.datum}`] = { ist_lehrer: s.ist_lehrer, status: "geplant", bemerkung: "" };
      });
      return next;
    });

    const ergebnisse = await Promise.all(
      bestehende.map((s) =>
        speichereLektionStatus(supabase, {
          kursId: s.kurs_id,
          datum: s.datum,
          istLehrer: s.ist_lehrer,
          status: "geplant",
          bemerkung: "",
          geaendertVon: session.user.id,
        })
      )
    );
    const fehlgeschlagen = ergebnisse.filter((r) => r.error).length;
    if (fehlgeschlagen) {
      setAktionFehler(`${fehlgeschlagen} von ${bestehende.length} Lektionen konnten nicht reaktiviert werden.`);
    } else {
      setFerienVon("");
      setFerienBis("");
    }
  }

  // Rückgängig direkt aus der sichtbaren Liste heraus: nutzt die schon
  // bekannten kursId/datum-Paare der Gruppe statt Von/Bis erneut abzufragen.
  async function ferienGruppeRueckgaengig(gruppe) {
    setAktionFehler("");
    setOverrides((prev) => {
      const next = { ...prev };
      gruppe.lektionen.forEach(({ kursId, datum, istLehrer }) => {
        next[`${kursId}|${datum}`] = { ist_lehrer: istLehrer, status: "geplant", bemerkung: "" };
      });
      return next;
    });
    const ergebnisse = await Promise.all(
      gruppe.lektionen.map(({ kursId, datum, istLehrer }) =>
        speichereLektionStatus(supabase, { kursId, datum, istLehrer, status: "geplant", bemerkung: "", geaendertVon: session.user.id })
      )
    );
    const fehlgeschlagen = ergebnisse.filter((r) => r.error).length;
    if (fehlgeschlagen) {
      setAktionFehler(`${fehlgeschlagen} von ${gruppe.lektionen.length} Lektionen konnten nicht reaktiviert werden.`);
    }
  }

  // Pausiert einen einzelnen Kurs über einen frei wählbaren Zeitraum (z.B.
  // Semesterferien) — unabhängig vom aktuell angezeigten Monat, da der
  // Zeitraum über Monatsgrenzen hinausgehen kann.
  async function kursPausieren() {
    if (!pauseKursId || !pauseVon || !pauseBis || pauseVon > pauseBis) return;
    const k = K(pauseKursId);
    if (!k) return;
    setAktionFehler("");

    const termine = [];
    for (let d = new Date(pauseVon + "T12:00"); d <= new Date(pauseBis + "T12:00"); d.setDate(d.getDate() + 1)) {
      const datum = iso(d);
      if (wochentag(d) === k.wochentag && k.gueltig_von <= datum && (!k.gueltig_bis || k.gueltig_bis >= datum)) {
        termine.push(datum);
      }
    }
    if (termine.length === 0) {
      setAktionFehler("Keine Lektionen dieses Kurses im gewählten Zeitraum.");
      return;
    }

    const { data: bestehende, error: ladeErr } = await supabase
      .from("lektion_status")
      .select("datum,ist_lehrer,status")
      .eq("kurs_id", pauseKursId)
      .in("datum", termine);
    if (ladeErr) {
      setAktionFehler(ladeErr.message);
      return;
    }
    const bestehendeMap = {};
    (bestehende || []).forEach((s) => (bestehendeMap[s.datum] = s));

    const betroffene = termine
      .filter((datum) => (bestehendeMap[datum]?.status || "geplant") !== "ausgefallen")
      .map((datum) => ({ datum, istLehrer: datum in bestehendeMap ? bestehendeMap[datum].ist_lehrer : k.lehrer_id }));

    if (betroffene.length === 0) {
      setAktionFehler("Alle Lektionen in diesem Zeitraum sind bereits als ausgefallen markiert.");
      return;
    }

    setOverrides((prev) => {
      const next = { ...prev };
      betroffene.forEach(({ datum, istLehrer }) => {
        if (datum >= von && datum <= bis) next[`${pauseKursId}|${datum}`] = { ist_lehrer: istLehrer, status: "ausgefallen", bemerkung: "Pause" };
      });
      return next;
    });

    const ergebnisse = await Promise.all(
      betroffene.map(({ datum, istLehrer }) =>
        speichereLektionStatus(supabase, {
          kursId: pauseKursId,
          datum,
          istLehrer,
          status: "ausgefallen",
          bemerkung: "Pause",
          geaendertVon: session.user.id,
        })
      )
    );
    const fehlgeschlagen = ergebnisse.filter((r) => r.error).length;
    if (fehlgeschlagen) {
      setAktionFehler(`${fehlgeschlagen} von ${betroffene.length} Lektionen konnten nicht pausiert werden.`);
    } else {
      setPauseKursId("");
      setPauseVon("");
      setPauseBis("");
    }
  }

  async function absenzMelden() {
    if (!absLehrerId || !absVon || !absBis) return;
    setAktionFehler("");
    setAbsMeldung("");
    setAbsLaeuft(true);
    try {
      const betroffene = await ladeAktuelleLektionen(supabase, absLehrerId, absVon, absBis);
      if (betroffene.length === 0) {
        setAbsMeldung("Keine Stunden im gewählten Zeitraum gefunden.");
        setAbsLaeuft(false);
        return;
      }
      setOverrides((prev) => {
        const next = { ...prev };
        betroffene.forEach((l) => {
          if (l.datum >= von && l.datum <= bis) next[`${l.kursId}|${l.datum}`] = { ist_lehrer: null, status: "geplant", bemerkung: "" };
        });
        return next;
      });
      const ergebnisse = await Promise.all(
        betroffene.map((l) =>
          speichereLektionStatus(supabase, { kursId: l.kursId, datum: l.datum, istLehrer: null, status: "geplant", bemerkung: "", geaendertVon: session.user.id })
        )
      );
      const fehlgeschlagen = ergebnisse.filter((r) => r.error).length;
      const erfolgreich = betroffene.length - fehlgeschlagen;
      setAbsMeldung(
        fehlgeschlagen
          ? `${erfolgreich} von ${betroffene.length} Stunde(n) freigegeben, ${fehlgeschlagen} fehlgeschlagen.`
          : `${betroffene.length} Stunde(n) freigegeben.`
      );
      if (erfolgreich > 0) {
        const { data: protokoll, error: protokollErr } = await protokolliereAbwesenheit(supabase, {
          lehrerId: absLehrerId,
          von: absVon,
          bis: absBis,
          anzahlStunden: erfolgreich,
          erfasstVon: session.user.id,
        }).select().single();
        if (!protokollErr && protokoll) setAbwesenheitenHistorie((prev) => [protokoll, ...prev]);
      }
      setAbsVon("");
      setAbsBis("");
    } catch (e) {
      setAktionFehler(e.message || String(e));
    }
    setAbsLaeuft(false);
  }

  // Gibt {betroffeneCount, fehlgeschlagen} zurück, damit Aufrufer (Historie-
  // Zeile, Bearbeiten) erkennen können, ob wirklich etwas zurückgeholt wurde
  // -- vorher war das nicht ersichtlich: die Historie-Zeile blieb unverändert
  // stehen und die Meldung erschien nur oben im Formular, ausserhalb des
  // aufgeklappten Verlaufs, wo man sie leicht übersieht.
  async function stundenZurueckholen(zLehrerId, zVon, zBis, { formZuruecksetzen } = {}) {
    setAktionFehler("");
    setAbsMeldung("");
    setAbsLaeuft(true);
    let ergebnis = { betroffeneCount: 0, fehlgeschlagen: 0 };
    try {
      const betroffene = await ladeOffeneEigeneLektionen(supabase, zLehrerId, zVon, zBis);
      if (betroffene.length === 0) {
        setAbsMeldung("Keine offenen eigenen Stunden im gewählten Zeitraum gefunden — vermutlich bereits von jemand anderem übernommen.");
        setAbsLaeuft(false);
        return ergebnis;
      }
      setOverrides((prev) => {
        const next = { ...prev };
        betroffene.forEach((l) => {
          if (l.datum >= von && l.datum <= bis) next[`${l.kurs_id}|${l.datum}`] = { ist_lehrer: zLehrerId, status: "geplant", bemerkung: "" };
        });
        return next;
      });
      const ergebnisse = await Promise.all(
        betroffene.map((l) =>
          speichereLektionStatus(supabase, { kursId: l.kurs_id, datum: l.datum, istLehrer: zLehrerId, status: "geplant", bemerkung: "", geaendertVon: session.user.id })
        )
      );
      const fehlgeschlagen = ergebnisse.filter((r) => r.error).length;
      ergebnis = { betroffeneCount: betroffene.length, fehlgeschlagen };
      setAbsMeldung(
        fehlgeschlagen
          ? `${betroffene.length - fehlgeschlagen} von ${betroffene.length} Stunde(n) zurückgeholt, ${fehlgeschlagen} fehlgeschlagen.`
          : `${betroffene.length} Stunde(n) zurückgeholt.`
      );
      if (formZuruecksetzen) {
        setAbsVon("");
        setAbsBis("");
      }
    } catch (e) {
      setAktionFehler(e.message || String(e));
    }
    setAbsLaeuft(false);
    return ergebnis;
  }

  function absenzRueckgaengig() {
    if (!absLehrerId || !absVon || !absBis) return;
    stundenZurueckholen(absLehrerId, absVon, absBis, { formZuruecksetzen: true });
  }

  // Holt die Stunden einer Historie-Zeile zurück und entfernt die Zeile bei
  // vollem Erfolg aus der Liste -- das ist die sichtbare Bestätigung, dass
  // etwas passiert ist. Bleibt stehen, wenn nichts (mehr) offen war oder ein
  // Teil fehlschlug, mit erklärender Meldung oben im Formular.
  async function abwesenheitAusHistorieEntfernen(a) {
    const { betroffeneCount, fehlgeschlagen } = await stundenZurueckholen(a.lehrer_id, a.von, a.bis);
    if (betroffeneCount > 0 && fehlgeschlagen === 0) {
      setAbwesenheitenHistorie((prev) => prev.filter((x) => x.id !== a.id));
    }
  }

  // Macht eine Abwesenheit rückgängig und füllt das Formular direkt mit
  // Person und Zeitraum vor, damit man nur noch das korrigieren muss, was
  // falsch war, statt Von/Bis selbst neu heraussuchen zu müssen.
  async function absenzBearbeiten(a) {
    await abwesenheitAusHistorieEntfernen(a);
    setAbsLehrerId(a.lehrer_id);
    setAbsVon(a.von);
    setAbsBis(a.bis);
  }

  // Für einen falsch eingegebenen Eintrag (z.B. falsches Datum): holt zuerst
  // best-effort noch offene eigene Stunden zurück, löscht den
  // Protokolleintrag danach aber in jedem Fall -- anders als "Rückgängig"
  // bleibt er nicht stehen, nur weil nichts (mehr) zum Zurückholen da war.
  async function abwesenheitLoeschen(a) {
    const name = P(a.lehrer_id) ? `${P(a.lehrer_id).vorname} ${P(a.lehrer_id).nachname}` : "diese Person";
    if (!window.confirm(`Abwesenheit ${datumVoll(a.von)} – ${datumVoll(a.bis)} für ${name} wirklich löschen?`)) return;
    await stundenZurueckholen(a.lehrer_id, a.von, a.bis);
    setAktionFehler("");
    const vorher = abwesenheitenHistorie;
    setAbwesenheitenHistorie((prev) => prev.filter((x) => x.id !== a.id));
    const { error } = await supabase.from("abwesenheiten").delete().eq("id", a.id);
    if (error) {
      setAbwesenheitenHistorie(vorher);
      setAktionFehler(`Löschen fehlgeschlagen: ${error.message}`);
    }
  }

  if (laden) return <p style={{ color: C.inkSoft }}>Lade Lektionen …</p>;
  if (ladeFehler) return <p style={{ color: C.rose, fontSize: 14 }}>Lektionen konnten nicht geladen werden: {ladeFehler}</p>;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <h2 className="display" style={{ fontSize: 21, margin: 0 }}>
          Lektionen verwalten
        </h2>
        <input type="month" value={monat} onChange={(e) => setMonat(e.target.value)} style={{ ...eingabeStil, width: "auto" }} />
        {monatGesperrt && <Tag text="Monat abgeschlossen — gesperrt" farbe={C.muted} />}
      </div>

      {aktionFehler && <p style={{ color: C.rose, fontSize: 13, marginTop: -6, marginBottom: 14 }}>{aktionFehler}</p>}

      <div style={{ ...karteStil, marginBottom: 14, gap: 8, flexWrap: "wrap" }}>
        <strong style={{ fontSize: 13 }}>Ferien / Feiertage</strong>
        <select value={ferienOrt} onChange={(e) => setFerienOrt(e.target.value)} style={{ ...eingabeStil, width: "auto" }}>
          <option value="">Alle Standorte</option>
          {Object.entries(orte).map(([code, name2]) => (
            <option key={code} value={code}>
              {name2}
            </option>
          ))}
        </select>
        <span style={{ fontSize: 12, color: C.inkSoft }}>von</span>
        <input type="date" value={ferienVon} onChange={(e) => setFerienVon(e.target.value)} style={{ ...eingabeStil, width: "auto" }} />
        <span style={{ fontSize: 12, color: C.inkSoft }}>bis</span>
        <input type="date" value={ferienBis} onChange={(e) => setFerienBis(e.target.value)} style={{ ...eingabeStil, width: "auto" }} />
        <Knopf onClick={ferienSetzen} disabled={!ferienVon || !ferienBis}>
          Stunden streichen
        </Knopf>
        <Knopf onClick={ferienRueckgaengig} disabled={!ferienVon || !ferienBis}>
          Rückgängig
        </Knopf>
        <span style={{ fontSize: 12, color: C.inkSoft }}>
          Für einen einzelnen Feiertag einfach von = bis dasselbe Datum setzen. Gestrichene Stunden werden nicht
          vergütet. Für jeden Standort einzeln wiederholbar, da nicht alle dieselben Ferien und Feiertage
          haben — auch über Monatsgrenzen hinweg. "Rückgängig" macht mit denselben Angaben nur die hier
          gestrichenen Lektionen wieder rückgängig.
        </span>

        {ferienGruppen.length > 0 && (
          <details style={{ width: "100%", marginTop: 4 }}>
            <summary style={{ fontSize: 12, color: C.inkSoft, cursor: "pointer" }}>
              Ferien-/Feiertag-Einträge im gewählten Monat ({ferienGruppen.length})
            </summary>
            <table style={{ marginTop: 6 }}>
              <thead>
                <tr>
                  <th>Standort</th>
                  <th>Zeitraum</th>
                  <th>Lektionen</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {ferienGruppen.map((g) => (
                  <tr key={g.ort}>
                    <td>{orte[g.ort] || g.ort}</td>
                    <td className="mono">
                      {datumVoll(g.von)} – {datumVoll(g.bis)}
                    </td>
                    <td className="mono">{g.lektionen.length}</td>
                    <td>
                      <Knopf klein onClick={() => ferienGruppeRueckgaengig(g)}>
                        Rückgängig
                      </Knopf>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        )}
      </div>

      <div style={{ ...karteStil, marginBottom: 14, gap: 8, flexWrap: "wrap" }}>
        <strong style={{ fontSize: 13 }}>Einzelnen Kurs pausieren</strong>
        <select value={pauseKursId} onChange={(e) => setPauseKursId(e.target.value)} style={{ ...eingabeStil, width: "auto" }}>
          <option value="">Kurs …</option>
          {kurse.map((k) => (
            <option key={k.id} value={k.id}>
              {k.bezeichnung} · {orte[k.standort_code] || k.standort_code} · {TAGE[k.wochentag]} {k.zeit}
            </option>
          ))}
        </select>
        <span style={{ fontSize: 12, color: C.inkSoft }}>von</span>
        <input type="date" value={pauseVon} onChange={(e) => setPauseVon(e.target.value)} style={{ ...eingabeStil, width: "auto" }} />
        <span style={{ fontSize: 12, color: C.inkSoft }}>bis</span>
        <input type="date" value={pauseBis} onChange={(e) => setPauseBis(e.target.value)} style={{ ...eingabeStil, width: "auto" }} />
        <Knopf onClick={kursPausieren} disabled={!pauseKursId || !pauseVon || !pauseBis}>
          Pausieren
        </Knopf>
        <span style={{ fontSize: 12, color: C.inkSoft }}>Für eine Ferienpause eines einzelnen Kurses, unabhängig vom oben gewählten Monat.</span>
      </div>

      <div style={{ ...karteStil, marginBottom: 24, gap: 8, flexWrap: "wrap" }}>
        <strong style={{ fontSize: 13 }}>Abwesenheit melden</strong>
        <select value={absLehrerId} onChange={(e) => setAbsLehrerId(e.target.value)} style={{ ...eingabeStil, width: "auto" }}>
          {lehrpersonen.map((p) => (
            <option key={p.id} value={p.id}>
              {p.vorname} {p.nachname}
            </option>
          ))}
        </select>
        <span style={{ fontSize: 12, color: C.inkSoft }}>von</span>
        <input type="date" value={absVon} onChange={(e) => setAbsVon(e.target.value)} style={{ ...eingabeStil, width: "auto" }} />
        <span style={{ fontSize: 12, color: C.inkSoft }}>bis</span>
        <input type="date" value={absBis} onChange={(e) => setAbsBis(e.target.value)} style={{ ...eingabeStil, width: "auto" }} />
        <Knopf variante="warn" onClick={absenzMelden} disabled={absLaeuft || !absLehrerId || !absVon || !absBis}>
          Stunden freigeben
        </Knopf>
        <Knopf onClick={absenzRueckgaengig} disabled={absLaeuft || !absLehrerId || !absVon || !absBis}>
          Rückgängig
        </Knopf>
        <span style={{ fontSize: 12, color: C.inkSoft }}>
          Künftige Stunden dieser Person im Zeitraum werden freigegeben. Nach "Bearbeiten" hier den Zeitraum
          korrigieren und nochmals auf "Stunden freigeben" klicken, um die Korrektur zu speichern.
        </span>
        {absMeldung && <span style={{ fontSize: 12, color: C.teal, width: "100%" }}>{absMeldung}</span>}

        {abwesenheitenHistorie.length > 0 && (
          <details style={{ width: "100%", marginTop: 4 }}>
            <summary style={{ fontSize: 12, color: C.inkSoft, cursor: "pointer" }}>Bisher erfasste Abwesenheiten ({abwesenheitenHistorie.length})</summary>
            <table style={{ marginTop: 6 }}>
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Zeitraum</th>
                  <th>Stunden</th>
                  <th>Erfasst am</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {abwesenheitenHistorie.map((a) => (
                  <tr key={a.id}>
                    <td>{P(a.lehrer_id) ? `${P(a.lehrer_id).vorname} ${P(a.lehrer_id).nachname}` : "—"}</td>
                    <td className="mono">
                      {datumVoll(a.von)} – {datumVoll(a.bis)}
                    </td>
                    <td className="mono">{a.anzahl_stunden}</td>
                    <td className="mono" style={{ color: C.inkSoft }}>
                      {datumVoll(a.erfasst_am.slice(0, 10))}
                    </td>
                    <td style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <Knopf klein disabled={absLaeuft} onClick={() => absenzBearbeiten(a)}>
                        Bearbeiten
                      </Knopf>
                      <Knopf klein disabled={absLaeuft} onClick={() => abwesenheitAusHistorieEntfernen(a)}>
                        Rückgängig
                      </Knopf>
                      <Knopf klein variante="warn" disabled={absLaeuft} onClick={() => abwesenheitLoeschen(a)}>
                        Löschen
                      </Knopf>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <h3 className="display" style={{ fontSize: 18, margin: "0 0 14px" }}>
          Alle Lektionen
        </h3>
        <select value={filterOrt} onChange={(e) => setFilterOrt(e.target.value)} style={{ ...eingabeStil, width: "auto", marginBottom: 14 }}>
          <option value="">Alle Standorte</option>
          {Object.entries(orte).map(([code, name2]) => (
            <option key={code} value={code}>
              {name2}
            </option>
          ))}
        </select>
        <select value={filterLehrer} onChange={(e) => setFilterLehrer(e.target.value)} style={{ ...eingabeStil, width: "auto", marginBottom: 14 }}>
          <option value="">Alle Lehrer</option>
          {lehrpersonen.map((p) => (
            <option key={p.id} value={p.id}>
              {p.vorname} {p.nachname}
            </option>
          ))}
        </select>
      </div>
      <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, maxHeight: 560, overflow: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Datum</th>
              <th>Kurs</th>
              <th>Ist-Lehrer</th>
              <th>Status</th>
              <th>Satz</th>
              <th>Lohn</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {gefiltert.length === 0 && (
              <tr>
                <td colSpan={7} style={{ color: C.muted }}>
                  Keine Lektionen für diese Filterung.
                </td>
              </tr>
            )}
            {gefiltert.map((l) => {
              const k = K(l.kursId);
              return (
                <tr key={l.id}>
                  <td className="mono" style={{ color: C.inkSoft, whiteSpace: "nowrap" }}>
                    {datumLabel(l.datum)} {k.zeit}
                  </td>
                  <td>
                    {k.bezeichnung}{" "}
                    <span style={{ color: C.muted, fontSize: 12 }}>
                      · {orte[k.standort_code] || k.standort_code} · {k.dauer_min}′
                    </span>
                  </td>
                  <td>
                    <select
                      value={l.istLehrer || ""}
                      onChange={(e) => aendern(l, { ist_lehrer: e.target.value || null })}
                      style={{ ...eingabeStil, width: "auto", padding: "3px 5px", fontSize: 12 }}
                      disabled={monatGesperrt}
                    >
                      <option value="">— offen —</option>
                      {lehrpersonen.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.vorname} {p.nachname}
                        </option>
                      ))}
                    </select>
                    {istVertretung(l) && (
                      <span style={{ marginLeft: 6 }}>
                        <Tag text={`Vertr. für ${P(l.sollLehrer) ? `${P(l.sollLehrer).vorname} ${P(l.sollLehrer).nachname}` : "—"}`} farbe={C.brass} />
                      </span>
                    )}
                  </td>
                  <td>
                    {l.status === "ausgefallen" ? (
                      <Tag text={l.bemerkung || "Fällt aus"} farbe={C.muted} />
                    ) : unbest(l) ? (
                      <Tag text="Unbestätigt" farbe={C.rose} />
                    ) : l.status === "gehalten" ? (
                      <Tag text="Gehalten" farbe={C.teal} />
                    ) : (
                      <Tag text="Geplant" farbe={C.muted} />
                    )}
                  </td>
                  <td className="mono" style={{ color: C.inkSoft }}>
                    {satz(l)}
                  </td>
                  <td className="mono">{lohn(l) ? chf(lohn(l)) : "–"}</td>
                  <td style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {l.status === "ausgefallen" ? (
                      <Knopf klein onClick={() => aendern(l, { status: "geplant", bemerkung: "" })} disabled={monatGesperrt}>
                        Reaktivieren
                      </Knopf>
                    ) : (
                      <>
                        {l.status !== "gehalten" && !!l.istLehrer && (
                          <Knopf klein onClick={() => aendern(l, { status: "gehalten", bemerkung: "" })} disabled={monatGesperrt}>
                            Gehalten
                          </Knopf>
                        )}
                        <Knopf klein variante="warn" onClick={() => aendern(l, { status: "ausgefallen", bemerkung: "Ausfall" })} disabled={monatGesperrt}>
                          Fällt aus
                        </Knopf>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
