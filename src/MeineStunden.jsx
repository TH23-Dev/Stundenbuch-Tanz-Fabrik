import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";
import { C, eingabeStil } from "./theme";
import { Tag, Knopf, karteStil } from "./ui";
import { iso, datumLabel, datumVoll, wochentag, monatsGrenzen, istVergangen } from "./lib/datum";
import { std } from "./lib/lohn";
import { speichereLektionStatus, ladeAktuelleLektionen, ladeOffeneEigeneLektionen } from "./lib/lektionen";
import { satzAmDatum } from "./lib/saetze";
import { anlassVergangen, anlassUnbest } from "./lib/anlaesse";
import { protokolliereAbwesenheit } from "./lib/abwesenheiten";

// Felder, die für Vertretungs-Kurse (nicht die eigenen) geladen werden.
// Bewusst OHNE `ansatz` — bei Vertretung zählt immer der persönliche
// Vertretungssatz (Regel 4), der Kurs-Ansatz einer fremden Person geht
// niemand ausser Lohn/Admin etwas an.
const FREMDE_KURS_FELDER = "id,wochentag,zeit,dauer_min,bezeichnung,standort_code,gueltig_von,gueltig_bis,lehrer_id";
const EIGENE_KURS_FELDER = FREMDE_KURS_FELDER + ",ansatz";

export default function MeineStunden({ profil, session }) {
  const [laden, setLaden] = useState(true);
  const [ladeFehler, setLadeFehler] = useState("");
  const [orte, setOrte] = useState({});
  const [kurseById, setKurseById] = useState({});
  const [overrides, setOverrides] = useState({});
  const [satzHistorie, setSatzHistorie] = useState([]);
  const [speichernFehler, setSpeichernFehler] = useState({});
  const [meineAnlaesse, setMeineAnlaesse] = useState([]);
  const [anlassFehler, setAnlassFehler] = useState({});
  const [lehrerNamen, setLehrerNamen] = useState({});

  const [absVon, setAbsVon] = useState("");
  const [absBis, setAbsBis] = useState("");
  const [absMeldung, setAbsMeldung] = useState("");
  const [absFehler, setAbsFehler] = useState("");
  const [absLaeuft, setAbsLaeuft] = useState(false);
  const [abwesenheitenHistorie, setAbwesenheitenHistorie] = useState([]);

  const { jahr, monatIndex, tageImMonat, von, bis } = useMemo(() => monatsGrenzen(), []);

  useEffect(() => {
    let aktiv = true;

    async function laden() {
      setLaden(true);
      setLadeFehler("");

      const [
        { data: orteData, error: orteErr },
        { data: meineKurse, error: kurseErr },
        { data: historieData, error: histErr },
        { data: anlaesseData, error: anlassErr },
        { data: abwesenheitData, error: abwErr },
        { data: personenData, error: personenErr },
      ] = await Promise.all([
        supabase.from("standorte").select("code,name"),
        supabase.from("kurse").select(EIGENE_KURS_FELDER).eq("lehrer_id", profil.id),
        supabase.from("lehrer_saetze").select("lehrer_id,satz,vertretungssatz,gueltig_von").eq("lehrer_id", profil.id),
        // Kein Datumsfilter: Anlässe sind nicht an den Kalendermonat gebunden
        // (anders als Lektionen) — auch vergangene, noch unbestätigte
        // Anlässe sollen hier zum Bestätigen erscheinen.
        supabase.from("anlaesse").select("id,datum,zeit,titel,standort_code,typ,pauschale,lehrer_id,status").eq("lehrer_id", profil.id),
        supabase.from("abwesenheiten").select("id,von,bis,anzahl_stunden,erfasst_am").eq("lehrer_id", profil.id).order("erfasst_am", { ascending: false }).limit(20),
        // Namen aller Personen (ohne Sätze/Löhne) -- damit sichtbar ist, wer
        // eine freigegebene eigene Lektion übernommen hat.
        supabase.from("v_personen_oeffentlich").select("id,vorname,nachname"),
      ]);
      if (!aktiv) return;
      if (orteErr || kurseErr || histErr || anlassErr || abwErr || personenErr) {
        setLadeFehler((orteErr || kurseErr || histErr || anlassErr || abwErr || personenErr).message);
        setLaden(false);
        return;
      }
      setSatzHistorie(historieData || []);
      const namenMap = {};
      (personenData || []).forEach((p) => (namenMap[p.id] = `${p.vorname} ${p.nachname}`));
      setLehrerNamen(namenMap);
      setMeineAnlaesse((anlaesseData || []).sort((a, b) => a.datum.localeCompare(b.datum) || a.zeit.localeCompare(b.zeit)));
      setAbwesenheitenHistorie(abwesenheitData || []);

      const meineIds = meineKurse.map((k) => k.id);
      const [{ data: statusEigene, error: se1 }, { data: statusVertretung, error: se2 }] = await Promise.all([
        supabase
          .from("lektion_status")
          .select("kurs_id,datum,ist_lehrer,status,bemerkung")
          .in("kurs_id", meineIds.length ? meineIds : ["__keine__"])
          .gte("datum", von)
          .lte("datum", bis),
        supabase
          .from("lektion_status")
          .select("kurs_id,datum,ist_lehrer,status,bemerkung")
          .eq("ist_lehrer", profil.id)
          .gte("datum", von)
          .lte("datum", bis),
      ]);
      if (!aktiv) return;
      if (se1 || se2) {
        setLadeFehler((se1 || se2).message);
        setLaden(false);
        return;
      }

      const fremdeIds = [...new Set((statusVertretung || []).map((s) => s.kurs_id).filter((id) => !meineIds.includes(id)))];
      let fremdeKurse = [];
      if (fremdeIds.length) {
        const { data, error } = await supabase.from("kurse").select(FREMDE_KURS_FELDER).in("id", fremdeIds);
        if (!aktiv) return;
        if (error) {
          setLadeFehler(error.message);
          setLaden(false);
          return;
        }
        fremdeKurse = data;
      }

      const kMap = {};
      [...meineKurse, ...fremdeKurse].forEach((k) => (kMap[k.id] = k));

      const oMap = {};
      [...(statusEigene || []), ...(statusVertretung || [])].forEach((s) => {
        oMap[`${s.kurs_id}|${s.datum}`] = s;
      });

      const orteMap = {};
      (orteData || []).forEach((o) => (orteMap[o.code] = o.name));

      setKurseById(kMap);
      setOverrides(oMap);
      setOrte(orteMap);
      setLaden(false);
    }

    laden();
    return () => {
      aktiv = false;
    };
  }, [profil.id, von, bis]);

  const K = (id) => kurseById[id];

  const lektionen = useMemo(() => {
    const liste = [];
    const kurse = Object.values(kurseById);
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
    return liste
      .filter((l) => l.istLehrer === profil.id || l.sollLehrer === profil.id)
      .sort((a, b) => a.datum.localeCompare(b.datum) || K(a.kursId).zeit.localeCompare(K(b.kursId).zeit));
  }, [kurseById, overrides, profil.id, jahr, monatIndex, tageImMonat]);

  const vergangen = (l) => istVergangen(l.datum, K(l.kursId).zeit, K(l.kursId).dauer_min);
  const istVertretung = (l) => l.istLehrer && l.istLehrer !== l.sollLehrer;
  const unbest = (l) => l.status === "geplant" && vergangen(l) && l.istLehrer;
  // Eigener Kurs, aber aktuell von einer anderen Person übernommen -- rein
  // informativ (wer, wegen Musik/Absprache), keine Aktionen und kein
  // Lohnbetrag: die Lektion und ihr Lohn gehören jetzt der übernehmenden Person.
  const uebernommenVonAnderer = (l) => l.sollLehrer === profil.id && l.istLehrer && l.istLehrer !== profil.id;
  const namePerson = (id) => lehrerNamen[id] || "—";
  const satz = (l) => {
    if (!l.istLehrer || l.istLehrer !== profil.id) return 0;
    if (istVertretung(l)) return satzAmDatum(satzHistorie, profil.id, l.datum, "vertretungssatz");
    const k = K(l.kursId);
    return k.ansatz != null ? k.ansatz : satzAmDatum(satzHistorie, profil.id, l.datum, "satz");
  };

  async function aendern(l, changes) {
    const key = l.id;
    const vorher = overrides[key];
    const neu = {
      ist_lehrer: "ist_lehrer" in changes ? changes.ist_lehrer : l.istLehrer,
      status: "status" in changes ? changes.status : l.status,
      bemerkung: "bemerkung" in changes ? changes.bemerkung : l.bemerkung,
    };
    setOverrides((prev) => ({ ...prev, [key]: neu }));
    setSpeichernFehler((prev) => ({ ...prev, [key]: null }));

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
      setSpeichernFehler((prev) => ({ ...prev, [key]: error.message }));
    }
  }

  async function anlassAendern(a, changes) {
    setAnlassFehler((prev) => ({ ...prev, [a.id]: null }));
    setMeineAnlaesse((prev) => prev.map((x) => (x.id === a.id ? { ...x, ...changes } : x)));
    const { error } = await supabase.from("anlaesse").update(changes).eq("id", a.id);
    if (error) {
      setMeineAnlaesse((prev) => prev.map((x) => (x.id === a.id ? a : x)));
      setAnlassFehler((prev) => ({ ...prev, [a.id]: error.message }));
    }
  }

  // Gibt einen zugewiesenen Anlass wieder frei (erscheint danach unter
  // "Offene Stunden / Anlässe" zum Eintragen für alle). Anders als
  // anlassAendern: die Liste hier zeigt nur "meine" Anlässe, ein
  // freigegebener gehört nicht mehr dazu und muss verschwinden statt nur
  // seinen Status zu aktualisieren.
  async function anlassFreigeben(a) {
    setAnlassFehler((prev) => ({ ...prev, [a.id]: null }));
    setMeineAnlaesse((prev) => prev.filter((x) => x.id !== a.id));
    const { error } = await supabase.from("anlaesse").update({ lehrer_id: null, status: "offen" }).eq("id", a.id);
    if (error) {
      setMeineAnlaesse((prev) => [...prev, a].sort((x, y) => x.datum.localeCompare(y.datum) || x.zeit.localeCompare(y.zeit)));
      setAnlassFehler((prev) => ({ ...prev, [a.id]: error.message }));
    }
  }

  async function absenzMelden() {
    if (!absVon || !absBis) return;
    setAbsFehler("");
    setAbsMeldung("");
    setAbsLaeuft(true);
    try {
      const betroffene = await ladeAktuelleLektionen(supabase, profil.id, absVon, absBis);
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
          : `${betroffene.length} Stunde(n) freigegeben. Sie erscheinen jetzt unter «Offene Stunden / Anlässe».`
      );
      if (erfolgreich > 0) {
        const { data: protokoll, error: protokollErr } = await protokolliereAbwesenheit(supabase, {
          lehrerId: profil.id,
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
      setAbsFehler(e.message || String(e));
    }
    setAbsLaeuft(false);
  }

  // Gibt {betroffeneCount, fehlgeschlagen} zurück, damit Aufrufer (Historie-
  // Zeile, Bearbeiten) erkennen können, ob wirklich etwas zurückgeholt wurde
  // -- vorher war das nicht ersichtlich: die Historie-Zeile blieb unverändert
  // stehen und die Meldung erschien nur oben im Formular, ausserhalb des
  // aufgeklappten Verlaufs, wo man sie leicht übersieht.
  async function stundenZurueckholen(zVon, zBis, { formZuruecksetzen } = {}) {
    setAbsFehler("");
    setAbsMeldung("");
    setAbsLaeuft(true);
    let ergebnis = { betroffeneCount: 0, fehlgeschlagen: 0 };
    try {
      const betroffene = await ladeOffeneEigeneLektionen(supabase, profil.id, zVon, zBis);
      if (betroffene.length === 0) {
        setAbsMeldung("Keine offenen eigenen Stunden im gewählten Zeitraum gefunden — vermutlich bereits von jemand anderem übernommen.");
        setAbsLaeuft(false);
        return ergebnis;
      }
      setOverrides((prev) => {
        const next = { ...prev };
        betroffene.forEach((l) => {
          if (l.datum >= von && l.datum <= bis) next[`${l.kurs_id}|${l.datum}`] = { ist_lehrer: profil.id, status: "geplant", bemerkung: "" };
        });
        return next;
      });
      const ergebnisse = await Promise.all(
        betroffene.map((l) =>
          speichereLektionStatus(supabase, { kursId: l.kurs_id, datum: l.datum, istLehrer: profil.id, status: "geplant", bemerkung: "", geaendertVon: session.user.id })
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
      setAbsFehler(e.message || String(e));
    }
    setAbsLaeuft(false);
    return ergebnis;
  }

  function absenzRueckgaengig() {
    if (!absVon || !absBis) return;
    stundenZurueckholen(absVon, absBis, { formZuruecksetzen: true });
  }

  // Holt die Stunden einer Historie-Zeile zurück und entfernt die Zeile bei
  // vollem Erfolg aus der Liste -- das ist die sichtbare Bestätigung, dass
  // etwas passiert ist. Bleibt stehen, wenn nichts (mehr) offen war oder ein
  // Teil fehlschlug, mit erklärender Meldung oben im Formular.
  async function abwesenheitAusHistorieEntfernen(a) {
    const { betroffeneCount, fehlgeschlagen } = await stundenZurueckholen(a.von, a.bis);
    if (betroffeneCount > 0 && fehlgeschlagen === 0) {
      setAbwesenheitenHistorie((prev) => prev.filter((x) => x.id !== a.id));
    }
  }

  // Macht eine Abwesenheit rückgängig und füllt das Formular direkt mit
  // ihrem Zeitraum vor, damit man nur noch das korrigieren muss, was falsch
  // war, statt sich Von/Bis selbst merken zu müssen.
  async function absenzBearbeiten(a) {
    await abwesenheitAusHistorieEntfernen(a);
    setAbsVon(a.von);
    setAbsBis(a.bis);
  }

  // Für einen falsch eingegebenen Eintrag (z.B. falsches Datum): holt zuerst
  // best-effort noch offene eigene Stunden zurück, löscht den
  // Protokolleintrag danach aber in jedem Fall -- anders als "Rückgängig"
  // bleibt er nicht stehen, nur weil nichts (mehr) zum Zurückholen da war.
  async function abwesenheitLoeschen(a) {
    if (!window.confirm(`Abwesenheit ${datumVoll(a.von)} – ${datumVoll(a.bis)} wirklich löschen?`)) return;
    await stundenZurueckholen(a.von, a.bis);
    setAbsFehler("");
    const vorher = abwesenheitenHistorie;
    setAbwesenheitenHistorie((prev) => prev.filter((x) => x.id !== a.id));
    const { error } = await supabase.from("abwesenheiten").delete().eq("id", a.id);
    if (error) {
      setAbwesenheitenHistorie(vorher);
      setAbsFehler(`Löschen fehlgeschlagen: ${error.message}`);
    }
  }

  if (laden) return <p style={{ color: C.inkSoft }}>Lade Stunden …</p>;
  if (ladeFehler) return <p style={{ color: C.rose, fontSize: 14 }}>Stunden konnten nicht geladen werden: {ladeFehler}</p>;

  return (
    <div>
      <h2 className="display" style={{ fontSize: 21, margin: "0 0 14px" }}>
        Meine Stunden · {new Date(jahr, monatIndex, 1).toLocaleDateString("de-CH", { month: "long", year: "numeric" })}
      </h2>

      <div style={{ ...karteStil, gap: 8, flexWrap: "wrap", marginBottom: 16, background: "#FBFAFD" }}>
        <strong style={{ fontSize: 13 }}>Abwesenheit melden</strong>
        <span style={{ fontSize: 12, color: C.inkSoft }}>von</span>
        <input type="date" value={absVon} onChange={(e) => setAbsVon(e.target.value)} style={{ ...eingabeStil, width: "auto" }} />
        <span style={{ fontSize: 12, color: C.inkSoft }}>bis</span>
        <input type="date" value={absBis} onChange={(e) => setAbsBis(e.target.value)} style={{ ...eingabeStil, width: "auto" }} />
        <Knopf variante="warn" onClick={absenzMelden} disabled={absLaeuft || !absVon || !absBis}>
          Stunden freigeben
        </Knopf>
        <Knopf onClick={absenzRueckgaengig} disabled={absLaeuft || !absVon || !absBis}>
          Rückgängig
        </Knopf>
        <span style={{ fontSize: 12, color: C.inkSoft }}>
          Alle deine künftigen Stunden im Zeitraum werden für Vertretungen freigegeben. Nach "Bearbeiten" hier den
          Zeitraum korrigieren und nochmals auf "Stunden freigeben" klicken, um die Korrektur zu speichern.
        </span>
        {absMeldung && <span style={{ fontSize: 12, color: C.teal, width: "100%" }}>{absMeldung}</span>}
        {absFehler && <span style={{ fontSize: 12, color: C.rose, width: "100%" }}>{absFehler}</span>}

        {abwesenheitenHistorie.length > 0 && (
          <details style={{ width: "100%", marginTop: 4 }}>
            <summary style={{ fontSize: 12, color: C.inkSoft, cursor: "pointer" }}>Bisher erfasste Abwesenheiten ({abwesenheitenHistorie.length})</summary>
            <table style={{ marginTop: 6 }}>
              <thead>
                <tr>
                  <th>Zeitraum</th>
                  <th>Stunden</th>
                  <th>Erfasst am</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {abwesenheitenHistorie.map((a) => (
                  <tr key={a.id}>
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

      {lektionen.length === 0 && (
        <div style={{ ...karteStil, justifyContent: "center", color: C.inkSoft, padding: 26 }}>
          Keine Stunden in diesem Monat.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {lektionen.map((l) => {
          const k = K(l.kursId);
          return (
            <div key={l.id} style={{ flexDirection: "column", alignItems: "stretch", ...karteStil, width: "100%", minWidth: 0 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <div
                  style={{
                    width: 4,
                    borderRadius: 2,
                    alignSelf: "stretch",
                    minHeight: 32,
                    flexShrink: 0,
                    background:
                      l.status === "ausgefallen"
                        ? C.line
                        : !l.istLehrer || unbest(l)
                        ? C.rose
                        : l.status === "gehalten"
                        ? istVertretung(l)
                          ? C.brass
                          : C.teal
                        : C.muted,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span className="mono" style={{ fontSize: 13, color: C.inkSoft }}>
                    {datumLabel(l.datum)} · {k.zeit}
                  </span>
                  <strong style={{ fontSize: 14 }}>{k.bezeichnung}</strong>
                  <span style={{ fontSize: 12, color: C.inkSoft }}>
                    {orte[k.standort_code] || k.standort_code} · {k.dauer_min}′
                    {!uebernommenVonAnderer(l) && <> · CHF {satz(l)}.–</>}
                  </span>
                  {istVertretung(l) && l.istLehrer === profil.id && <Tag text={`Vertretung für ${namePerson(l.sollLehrer)}`} farbe={C.brass} />}
                  {uebernommenVonAnderer(l) && <Tag text={`Übernommen von ${namePerson(l.istLehrer)}`} farbe={C.brass} />}
                  {l.status === "gehalten" && <Tag text="Gehalten" farbe={C.teal} />}
                  {l.status === "ausgefallen" && <Tag text={l.bemerkung || "Fällt aus"} farbe={C.muted} />}
                  {unbest(l) && <Tag text="Noch offen" farbe={C.rose} />}
                  {!l.istLehrer && l.status !== "ausgefallen" && <Tag text="Ausgetragen · Vertretung gesucht" farbe={C.rose} />}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {l.status === "geplant" && vergangen(l) && l.istLehrer === profil.id && (
                    <Knopf klein variante="voll" onClick={() => aendern(l, { status: "gehalten" })}>
                      Gehalten
                    </Knopf>
                  )}
                  {!l.istLehrer && (
                    <Knopf klein onClick={() => aendern(l, { ist_lehrer: profil.id })}>
                      Doch übernehmen
                    </Knopf>
                  )}
                  {l.istLehrer === profil.id && l.status !== "ausgefallen" && !vergangen(l) && (
                    <Knopf klein variante="warn" onClick={() => aendern(l, { ist_lehrer: null })}>
                      Kann nicht
                    </Knopf>
                  )}
                  {l.istLehrer === profil.id && l.status !== "ausgefallen" && vergangen(l) && (
                    <Knopf klein variante="warn" onClick={() => aendern(l, { ist_lehrer: null, status: "geplant" })}>
                      Doch nicht gegeben
                    </Knopf>
                  )}
                  {l.istLehrer === profil.id && l.status !== "ausgefallen" && (
                    <Knopf klein variante="warn" onClick={() => aendern(l, { status: "ausgefallen", bemerkung: "Ausfall" })}>
                      Fällt aus
                    </Knopf>
                  )}
                  {l.istLehrer === profil.id && l.status === "ausgefallen" && (
                    <Knopf klein onClick={() => aendern(l, { status: "geplant", bemerkung: "" })}>
                      Reaktivieren
                    </Knopf>
                  )}
                </div>
              </div>
              {speichernFehler[l.id] && (
                <p style={{ color: C.rose, fontSize: 12, margin: "6px 0 0 16px" }}>
                  Konnte nicht gespeichert werden: {speichernFehler[l.id]}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {meineAnlaesse.length > 0 && (
        <>
          <h3 className="display" style={{ fontSize: 18, margin: "24px 0 14px" }}>
            Meine Anlässe
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {meineAnlaesse.map((a) => (
              <div key={a.id} style={{ flexDirection: "column", alignItems: "stretch", ...karteStil, width: "100%", minWidth: 0 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <div
                    style={{
                      width: 4,
                      borderRadius: 2,
                      alignSelf: "stretch",
                      minHeight: 32,
                      flexShrink: 0,
                      background: a.status === "gehalten" ? C.teal : anlassUnbest(a) ? C.rose : C.brass,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span className="mono" style={{ fontSize: 13, color: C.inkSoft }}>
                      {datumLabel(a.datum)} · {a.zeit}
                    </span>
                    <strong style={{ fontSize: 14 }}>{a.titel}</strong>
                    <Tag text={a.typ} farbe={C.brass} />
                    <span style={{ fontSize: 12, color: C.inkSoft }}>
                      {orte[a.standort_code] || a.standort_code} · Pauschale CHF {a.pauschale}.–
                    </span>
                    {a.status === "gehalten" && <Tag text="Bestätigt" farbe={C.teal} />}
                    {anlassUnbest(a) && <Tag text="Noch offen" farbe={C.rose} />}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {a.status === "geplant" && anlassVergangen(a) && (
                      <Knopf klein variante="voll" onClick={() => anlassAendern(a, { status: "gehalten" })}>
                        Gehalten
                      </Knopf>
                    )}
                    {a.status !== "ausgefallen" && !anlassVergangen(a) && (
                      <Knopf klein variante="warn" onClick={() => anlassFreigeben(a)}>
                        Wieder freigeben
                      </Knopf>
                    )}
                  </div>
                </div>
                {anlassFehler[a.id] && (
                  <p style={{ color: C.rose, fontSize: 12, margin: "6px 0 0 16px" }}>
                    Konnte nicht gespeichert werden: {anlassFehler[a.id]}
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
