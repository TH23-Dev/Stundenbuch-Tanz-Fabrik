import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";
import { C, eingabeStil } from "./theme";
import { Tag, Knopf, Kennzahl, karteStil } from "./ui";
import { iso, wochentag, monatsGrenzenFuer, aktuellerMonat, datumLabel, datumVoll } from "./lib/datum";
import { std, chf } from "./lib/lohn";
import { satzAmDatum } from "./lib/saetze";
import { anlassRelevant } from "./lib/anlaesse";

const KURS_FELDER = "id,wochentag,zeit,dauer_min,bezeichnung,standort_code,lehrer_id,ansatz,gueltig_von,gueltig_bis";
const LEHRER_FELDER = "id,vorname,nachname,satz,vertretungssatz,aktiv,r_lehrer";

export default function Backoffice({ session }) {
  const [monat, setMonat] = useState(aktuellerMonat());
  const [laden, setLaden] = useState(true);
  const [ladeFehler, setLadeFehler] = useState("");
  const [aktionFehler, setAktionFehler] = useState("");

  const [orte, setOrte] = useState({});
  const [lehrerListe, setLehrerListe] = useState([]);
  const [kurse, setKurse] = useState([]);
  const [overrides, setOverrides] = useState({});
  const [zusatzListe, setZusatzListe] = useState([]);
  const [anlaesseListe, setAnlaesseListe] = useState([]);
  const [abschluss, setAbschluss] = useState(null);
  const [satzHistorie, setSatzHistorie] = useState([]);

  const [neueZusatz, setNeueZusatz] = useState({ lehrerId: "", typ: "Spesen", betrag: "", text: "" });

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
        { data: zusatzData, error: e5 },
        { data: abschlussData, error: e6 },
        { data: historieData, error: e7 },
        { data: anlaesseData, error: e8 },
      ] = await Promise.all([
        supabase.from("standorte").select("code,name"),
        supabase.from("lehrer").select(LEHRER_FELDER),
        supabase.from("kurse").select(KURS_FELDER),
        supabase.from("lektion_status").select("kurs_id,datum,ist_lehrer,status,bemerkung").gte("datum", von).lte("datum", bis),
        supabase.from("zusatzpositionen").select("id,lehrer_id,typ,betrag,bemerkung").eq("monat", monat),
        supabase.from("monatsabschluss").select("monat,abgeschlossen_am").eq("monat", monat).maybeSingle(),
        supabase.from("lehrer_saetze").select("lehrer_id,satz,vertretungssatz,gueltig_von"),
        supabase.from("anlaesse").select("id,datum,zeit,titel,standort_code,typ,pauschale,lehrer_id,status").gte("datum", von).lte("datum", bis),
      ]);
      if (!aktiv) return;

      const fehler = e1 || e2 || e3 || e4 || e5 || e6 || e7 || e8;
      if (fehler) {
        setLadeFehler(fehler.message);
        setLaden(false);
        return;
      }
      setSatzHistorie(historieData || []);
      setAnlaesseListe(anlaesseData || []);

      const orteMap = {};
      (orteData || []).forEach((o) => (orteMap[o.code] = o.name));
      const oMap = {};
      (statusData || []).forEach((s) => (oMap[`${s.kurs_id}|${s.datum}`] = s));

      setOrte(orteMap);
      setLehrerListe(lehrerData || []);
      setKurse(kurseData || []);
      setOverrides(oMap);
      setZusatzListe(zusatzData || []);
      setAbschluss(abschlussData || null);
      setNeueZusatz((z) => ({ ...z, lehrerId: z.lehrerId || (lehrerData || []).find((p) => p.r_lehrer)?.id || "" }));
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
  const name = (id) => {
    const p = P(id);
    return p ? `${p.vorname} ${p.nachname}` : "—";
  };
  const lehrpersonen = lehrerListe.filter((p) => p.r_lehrer);

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

  const vergangen = (l) => new Date(l.datum + "T23:59") < new Date();
  const istVertretung = (l) => l.istLehrer && l.istLehrer !== l.sollLehrer;
  const unbest = (l) => l.status === "geplant" && vergangen(l) && !!l.istLehrer;
  // Regel 6 (korrigiert): nur bestätigte ("gehalten") Lektionen zählen für den Lohn.
  const relevant = (l) => l.status === "gehalten" && !!l.istLehrer;
  const stdFn = (l) => std(K(l.kursId).dauer_min);
  const satz = (l) => {
    if (!l.istLehrer) return 0;
    if (istVertretung(l)) return satzAmDatum(satzHistorie, l.istLehrer, l.datum, "vertretungssatz");
    const k = K(l.kursId);
    if (k.ansatz != null) return k.ansatz;
    return satzAmDatum(satzHistorie, l.istLehrer, l.datum, "satz");
  };
  const lohn = (l) => (relevant(l) ? stdFn(l) * satz(l) : 0);

  // Bestätigte Anlässe fliessen automatisch als Zusatzposition ein (Etappe 6) —
  // nicht löschbar hier, das läuft über den Anlass selbst ("Fällt aus").
  const anlassAlsZusatz = useMemo(
    () =>
      anlaesseListe.filter(anlassRelevant).map((a) => ({
        id: "anl-" + a.id,
        lehrer_id: a.lehrer_id,
        typ: a.typ,
        betrag: a.pauschale,
        bemerkung: `${a.titel} · ${datumLabel(a.datum)}`,
        auto: true,
      })),
    [anlaesseListe]
  );
  const alleZusatz = useMemo(() => [...zusatzListe, ...anlassAlsZusatz], [zusatzListe, anlassAlsZusatz]);

  const auswertung = useMemo(
    () =>
      lehrerListe
        .map((p) => {
          const eig = lektionen.filter((l) => l.istLehrer === p.id && relevant(l));
          const norm = eig.filter((l) => !istVertretung(l));
          const vert = eig.filter(istVertretung);
          const zz = alleZusatz.filter((z) => z.lehrer_id === p.id);
          const sum = (arr) => arr.reduce((s, l) => s + stdFn(l), 0);
          const lohnStd = eig.reduce((s, l) => s + lohn(l), 0);
          const zusatz = zz.reduce((s, z) => s + Number(z.betrag), 0);
          const unbestCount = lektionen.filter((l) => l.istLehrer === p.id && unbest(l)).length;
          return { p, stdNormal: sum(norm), stdVert: sum(vert), lohnStd, zusatz, unbest: unbestCount, total: lohnStd + zusatz };
        })
        .filter((a) => a.stdNormal + a.stdVert !== 0 || a.zusatz !== 0),
    [lehrerListe, lektionen, alleZusatz]
  );

  const totalLohn = auswertung.reduce((s, a) => s + a.total, 0);
  const offeneCount = lektionen.filter((l) => !l.istLehrer && l.status !== "ausgefallen").length;
  const unbestGesamt = auswertung.reduce((s, a) => s + a.unbest, 0);

  async function zusatzHinzufuegen() {
    if (!neueZusatz.betrag || !neueZusatz.lehrerId) return;
    const { data, error } = await supabase
      .from("zusatzpositionen")
      .insert({
        lehrer_id: neueZusatz.lehrerId,
        monat,
        typ: neueZusatz.typ,
        betrag: Number(neueZusatz.betrag),
        bemerkung: neueZusatz.text || null,
      })
      .select()
      .single();
    if (error) {
      setAktionFehler(error.message);
      return;
    }
    setZusatzListe((prev) => [...prev, data]);
    setNeueZusatz((z) => ({ ...z, betrag: "", text: "" }));
  }

  async function zusatzLoeschen(id) {
    const vorher = zusatzListe;
    setZusatzListe((prev) => prev.filter((z) => z.id !== id));
    const { error } = await supabase.from("zusatzpositionen").delete().eq("id", id);
    if (error) {
      setZusatzListe(vorher);
      setAktionFehler(error.message);
    }
  }

  async function monatAbschliessen() {
    if (!window.confirm(`Monat ${monat} wirklich abschliessen? Danach können keine Lektionen mehr geändert werden.`)) return;
    const { data, error } = await supabase
      .from("monatsabschluss")
      .insert({ monat, abgeschlossen_von: session.user.id })
      .select()
      .single();
    if (error) {
      setAktionFehler(error.message);
      return;
    }
    setAbschluss(data);
  }

  async function exportieren() {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        auswertung.map((a) => ({
          Name: a.p.nachname,
          Vorname: a.p.vorname,
          "Std.": a.stdNormal,
          "Lohn Std.": Number(a.lohnStd.toFixed(2)),
          "Std. Vertretung": a.stdVert,
          "Satz Vertretung": a.p.vertretungssatz,
          "Zusatz/Abzug": a.zusatz,
          "Total CHF": Number(a.total.toFixed(2)),
          Unbestätigt: a.unbest,
        }))
      ),
      "Zusammenfassung"
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        lektionen.map((l) => {
          const k = K(l.kursId);
          return {
            Datum: datumVoll(l.datum),
            Standort: orte[k.standort_code] || k.standort_code,
            Zeit: k.zeit,
            Kurs: k.bezeichnung,
            Minuten: k.dauer_min,
            Lohnstunden: stdFn(l),
            Soll: name(l.sollLehrer),
            Ist: l.istLehrer ? name(l.istLehrer) : "OFFEN",
            Vertretung: istVertretung(l) ? "ja" : "",
            Status: unbest(l) ? "unbestätigt" : l.status,
            Satz: satz(l),
            "Lohn CHF": Number(lohn(l).toFixed(2)),
            Bemerkung: l.bemerkung,
          };
        })
      ),
      "Lektionen"
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        alleZusatz.map((z) => ({
          Name: name(z.lehrer_id),
          Typ: z.typ,
          Betrag: z.betrag,
          Bemerkung: z.bemerkung || "",
          Herkunft: z.auto ? "Anlass" : "manuell",
        }))
      ),
      "Zusatzpositionen"
    );
    XLSX.writeFile(wb, `Lehrerabrechnung_${monat}.xlsx`);
  }

  if (laden) return <p style={{ color: C.inkSoft }}>Lade Abrechnung …</p>;
  if (ladeFehler) return <p style={{ color: C.rose, fontSize: 14 }}>Abrechnung konnte nicht geladen werden: {ladeFehler}</p>;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <h2 className="display" style={{ fontSize: 21, margin: 0 }}>
          Abrechnung
        </h2>
        <input type="month" value={monat} onChange={(e) => setMonat(e.target.value)} style={{ ...eingabeStil, width: "auto" }} />
        <div style={{ marginLeft: "auto" }}>
          <Knopf variante="voll" onClick={exportieren}>
            Excel exportieren
          </Knopf>
        </div>
      </div>

      {aktionFehler && (
        <p style={{ color: C.rose, fontSize: 13, marginTop: -6, marginBottom: 14 }}>{aktionFehler}</p>
      )}

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <Kennzahl label="Total Ausgaben" wert={`CHF ${chf(totalLohn)}`} />
        <Kennzahl label="Unbestätigt" wert={unbestGesamt} warn />
        <Kennzahl label="Offene Stunden" wert={offeneCount} warn />
        <Kennzahl label="Lektionen" wert={lektionen.length} />
      </div>

      <div style={{ ...karteStil, marginBottom: 24, gap: 8, flexWrap: "wrap" }}>
        {monatGesperrt ? (
          <>
            <Tag text={`Abgeschlossen am ${datumVoll(abschluss.abgeschlossen_am.slice(0, 10))}`} farbe={C.muted} />
            <span style={{ fontSize: 12, color: C.inkSoft }}>Dieser Monat ist gesperrt, es können keine Lektionen mehr geändert werden.</span>
          </>
        ) : (
          <>
            <strong style={{ fontSize: 13 }}>Monat</strong>
            <span style={{ fontSize: 12, color: C.inkSoft }}>Nach Abschluss sind keine Änderungen an Lektionen mehr möglich.</span>
            <Knopf variante="warn" onClick={monatAbschliessen} klein>
              Monat abschliessen
            </Knopf>
          </>
        )}
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, overflow: "auto", marginBottom: 24 }}>
        <table>
          <thead>
            <tr>
              <th>Lehrer</th>
              <th>Std.</th>
              <th>Lohn Std.</th>
              <th>Std. Vertr.</th>
              <th>Zusatz/Abzug</th>
              <th>Total CHF</th>
              <th>Unbest.</th>
            </tr>
          </thead>
          <tbody>
            {auswertung.map((a) => (
              <tr key={a.p.id}>
                <td style={{ fontWeight: 600 }}>
                  {a.p.nachname}, {a.p.vorname}
                </td>
                <td className="mono">{a.stdNormal.toFixed(1)}</td>
                <td className="mono">{chf(a.lohnStd)}</td>
                <td className="mono">{a.stdVert > 0 ? a.stdVert.toFixed(1) : "–"}</td>
                <td className="mono" style={{ color: a.zusatz < 0 ? C.rose : a.zusatz > 0 ? C.teal : C.muted }}>
                  {a.zusatz ? chf(a.zusatz) : "–"}
                </td>
                <td className="mono" style={{ fontWeight: 600 }}>
                  {chf(a.total)}
                </td>
                <td className="mono" style={{ color: a.unbest ? C.rose : C.muted }}>
                  {a.unbest || "–"}
                </td>
              </tr>
            ))}
            {auswertung.length === 0 && (
              <tr>
                <td colSpan={7} style={{ color: C.muted }}>
                  Keine Aktivität in diesem Monat.
                </td>
              </tr>
            )}
            <tr style={{ background: C.paper }}>
              <td style={{ fontWeight: 700 }}>Total</td>
              <td colSpan={4}></td>
              <td className="mono" style={{ fontWeight: 700 }}>
                {chf(totalLohn)}
              </td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="display" style={{ fontSize: 18, margin: "0 0 4px" }}>
        Zusatzpositionen
      </h3>
      <p style={{ color: C.inkSoft, fontSize: 13, marginTop: 0, marginBottom: 12 }}>
        Bestätigte Anlässe erscheinen automatisch. Manuell nur Spesen und Abzüge (Abzug = negativer Betrag).
      </p>
      <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, overflow: "auto", marginBottom: 10 }}>
        <table>
          <thead>
            <tr>
              <th>Lehrer</th>
              <th>Typ</th>
              <th>Betrag</th>
              <th>Bemerkung</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {alleZusatz.map((z) => (
              <tr key={z.id}>
                <td>{name(z.lehrer_id)}</td>
                <td>
                  {z.typ} {z.auto && <span style={{ fontSize: 11, color: C.brass }}>· aus Anlass</span>}
                </td>
                <td className="mono" style={{ color: z.betrag < 0 ? C.rose : C.ink }}>
                  {chf(z.betrag)}
                </td>
                <td style={{ color: C.inkSoft }}>{z.bemerkung}</td>
                <td>
                  {z.auto ? (
                    <span style={{ fontSize: 12, color: C.muted }}>automatisch</span>
                  ) : (
                    <Knopf klein variante="warn" onClick={() => zusatzLoeschen(z.id)}>
                      Löschen
                    </Knopf>
                  )}
                </td>
              </tr>
            ))}
            {alleZusatz.length === 0 && (
              <tr>
                <td colSpan={5} style={{ color: C.muted }}>
                  Keine Positionen.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div style={{ ...karteStil, gap: 8, flexWrap: "wrap" }}>
        <select value={neueZusatz.lehrerId} onChange={(e) => setNeueZusatz({ ...neueZusatz, lehrerId: e.target.value })} style={{ ...eingabeStil, width: "auto" }}>
          {lehrpersonen.map((p) => (
            <option key={p.id} value={p.id}>
              {p.vorname} {p.nachname}
            </option>
          ))}
        </select>
        <select value={neueZusatz.typ} onChange={(e) => setNeueZusatz({ ...neueZusatz, typ: e.target.value })} style={{ ...eingabeStil, width: "auto" }}>
          <option>Spesen</option>
          <option>Abzug</option>
        </select>
        <input
          type="number"
          placeholder="Betrag"
          value={neueZusatz.betrag}
          onChange={(e) => setNeueZusatz({ ...neueZusatz, betrag: e.target.value })}
          className="mono"
          style={{ ...eingabeStil, width: 100 }}
        />
        <input
          placeholder="Bemerkung"
          value={neueZusatz.text}
          onChange={(e) => setNeueZusatz({ ...neueZusatz, text: e.target.value })}
          style={{ ...eingabeStil, flex: 1, minWidth: 180 }}
        />
        <Knopf variante="voll" onClick={zusatzHinzufuegen}>
          Hinzufügen
        </Knopf>
      </div>
    </div>
  );
}
