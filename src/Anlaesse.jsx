import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";
import { C, eingabeStil } from "./theme";
import { Tag, Knopf, karteStil } from "./ui";
import { iso, datumLabel, monatsGrenzenFuer, aktuellerMonat } from "./lib/datum";
import { ANLASS_TYPEN, anlassUnbest } from "./lib/anlaesse";

export default function Anlaesse() {
  const [monat, setMonat] = useState(aktuellerMonat());
  const [laden, setLaden] = useState(true);
  const [ladeFehler, setLadeFehler] = useState("");
  const [aktionFehler, setAktionFehler] = useState("");

  const [orte, setOrte] = useState({});
  const [lehrpersonen, setLehrpersonen] = useState([]);
  const [anlaesseListe, setAnlaesseListe] = useState([]);

  const [neuerAnlass, setNeuerAnlass] = useState({ datum: iso(new Date()), zeit: "14:00", titel: "", typ: "Workshop", ort: "", pauschale: "", lehrerId: "" });

  const { von, bis } = useMemo(() => monatsGrenzenFuer(monat), [monat]);

  useEffect(() => {
    let aktiv = true;
    async function laden() {
      setLaden(true);
      setLadeFehler("");
      const [{ data: orteData, error: e1 }, { data: lehrerData, error: e2 }, { data: anlaesseData, error: e3 }] = await Promise.all([
        supabase.from("standorte").select("code,name"),
        supabase.from("v_personen_oeffentlich").select("id,vorname,nachname,aktiv,r_lehrer").eq("r_lehrer", true).order("nachname"),
        supabase.from("anlaesse").select("id,datum,zeit,titel,standort_code,typ,pauschale,lehrer_id,status").gte("datum", von).lte("datum", bis),
      ]);
      if (!aktiv) return;
      const fehler = e1 || e2 || e3;
      if (fehler) {
        setLadeFehler(fehler.message);
        setLaden(false);
        return;
      }
      const orteMap = {};
      (orteData || []).forEach((o) => (orteMap[o.code] = o.name));
      setOrte(orteMap);
      setLehrpersonen(lehrerData || []);
      setAnlaesseListe((anlaesseData || []).sort((a, b) => a.datum.localeCompare(b.datum) || a.zeit.localeCompare(b.zeit)));
      setNeuerAnlass((a) => ({ ...a, ort: a.ort || (orteData || [])[0]?.code || "" }));
      setLaden(false);
    }
    laden();
    return () => {
      aktiv = false;
    };
  }, [monat, von, bis]);

  const name = (id) => {
    const p = lehrpersonen.find((x) => x.id === id);
    return p ? `${p.vorname} ${p.nachname}` : "—";
  };

  async function anlassAendern(a, changes) {
    setAktionFehler("");
    setAnlaesseListe((prev) => prev.map((x) => (x.id === a.id ? { ...x, ...changes } : x)));
    const { error } = await supabase.from("anlaesse").update(changes).eq("id", a.id);
    if (error) {
      setAnlaesseListe((prev) => prev.map((x) => (x.id === a.id ? a : x)));
      setAktionFehler(error.message);
    }
  }

  async function anlassLoeschen(a) {
    if (!window.confirm(`Anlass "${a.titel}" vom ${datumLabel(a.datum)} wirklich löschen?\n\nEin bereits bestätigter Anlass verschwindet damit auch aus der Abrechnung, falls der Monat noch offen ist.`)) return;
    setAktionFehler("");
    const vorher = anlaesseListe;
    setAnlaesseListe((prev) => prev.filter((x) => x.id !== a.id));
    const { error } = await supabase.from("anlaesse").delete().eq("id", a.id);
    if (error) {
      setAnlaesseListe(vorher);
      setAktionFehler(error.message);
    }
  }

  async function anlassHinzufuegen() {
    if (!neuerAnlass.titel || !neuerAnlass.ort) return;
    setAktionFehler("");
    const { data, error } = await supabase
      .from("anlaesse")
      .insert({
        id: "a" + Date.now(),
        datum: neuerAnlass.datum,
        zeit: neuerAnlass.zeit,
        titel: neuerAnlass.titel,
        standort_code: neuerAnlass.ort,
        typ: neuerAnlass.typ,
        pauschale: Number(neuerAnlass.pauschale) || 0,
        lehrer_id: neuerAnlass.lehrerId || null,
        status: neuerAnlass.lehrerId ? "geplant" : "offen",
      })
      .select()
      .single();
    if (error) {
      setAktionFehler(error.message);
      return;
    }
    setAnlaesseListe((prev) => [...prev, data].sort((a, b) => a.datum.localeCompare(b.datum) || a.zeit.localeCompare(b.zeit)));
    setNeuerAnlass((a) => ({ ...a, titel: "", pauschale: "" }));
  }

  if (laden) return <p style={{ color: C.inkSoft }}>Lade Anlässe …</p>;
  if (ladeFehler) return <p style={{ color: C.rose, fontSize: 14 }}>Anlässe konnten nicht geladen werden: {ladeFehler}</p>;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
        <h2 className="display" style={{ fontSize: 21, margin: 0 }}>
          Anlässe verwalten
        </h2>
        <input type="month" value={monat} onChange={(e) => setMonat(e.target.value)} style={{ ...eingabeStil, width: "auto" }} />
      </div>
      <p style={{ color: C.inkSoft, fontSize: 13, marginTop: 0, marginBottom: 14 }}>
        Einmalige Termine. Ohne Lehrer angelegt = offen zum Eintragen. Bestätigte Anlässe fliessen automatisch
        in die Abrechnung.
      </p>

      {aktionFehler && <p style={{ color: C.rose, fontSize: 13, marginBottom: 14 }}>{aktionFehler}</p>}

      <div style={{ ...karteStil, gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        <input type="date" value={neuerAnlass.datum} onChange={(e) => setNeuerAnlass({ ...neuerAnlass, datum: e.target.value })} style={{ ...eingabeStil, width: "auto" }} />
        <input value={neuerAnlass.zeit} onChange={(e) => setNeuerAnlass({ ...neuerAnlass, zeit: e.target.value })} className="mono" style={{ ...eingabeStil, width: 80 }} />
        <input placeholder="Titel" value={neuerAnlass.titel} onChange={(e) => setNeuerAnlass({ ...neuerAnlass, titel: e.target.value })} style={{ ...eingabeStil, width: 190 }} />
        <select value={neuerAnlass.typ} onChange={(e) => setNeuerAnlass({ ...neuerAnlass, typ: e.target.value })} style={{ ...eingabeStil, width: "auto" }}>
          {ANLASS_TYPEN.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <select value={neuerAnlass.ort} onChange={(e) => setNeuerAnlass({ ...neuerAnlass, ort: e.target.value })} style={{ ...eingabeStil, width: "auto" }}>
          {Object.entries(orte).map(([code, n]) => (
            <option key={code} value={code}>
              {n}
            </option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Pauschale"
          value={neuerAnlass.pauschale}
          onChange={(e) => setNeuerAnlass({ ...neuerAnlass, pauschale: e.target.value })}
          className="mono"
          style={{ ...eingabeStil, width: 100 }}
        />
        <select value={neuerAnlass.lehrerId} onChange={(e) => setNeuerAnlass({ ...neuerAnlass, lehrerId: e.target.value })} style={{ ...eingabeStil, width: "auto" }}>
          <option value="">offen lassen</option>
          {lehrpersonen.filter((p) => p.aktiv).map((p) => (
            <option key={p.id} value={p.id}>
              {p.nachname}, {p.vorname}
            </option>
          ))}
        </select>
        <Knopf variante="voll" onClick={anlassHinzufuegen}>
          Anlass anlegen
        </Knopf>
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, maxHeight: 520, overflow: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Datum</th>
              <th>Titel</th>
              <th>Typ</th>
              <th>Standort</th>
              <th>Pauschale</th>
              <th>Lehrer</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {anlaesseListe.length === 0 && (
              <tr>
                <td colSpan={8} style={{ color: C.muted }}>
                  Keine Anlässe in diesem Monat.
                </td>
              </tr>
            )}
            {anlaesseListe.map((a) => (
              <tr key={a.id}>
                <td className="mono" style={{ color: C.inkSoft, whiteSpace: "nowrap" }}>
                  {datumLabel(a.datum)} {a.zeit}
                </td>
                <td style={{ fontWeight: 600 }}>{a.titel}</td>
                <td>{a.typ}</td>
                <td style={{ color: C.inkSoft }}>{orte[a.standort_code] || a.standort_code}</td>
                <td>
                  <input
                    type="number"
                    value={a.pauschale}
                    onChange={(e) => anlassAendern(a, { pauschale: Number(e.target.value) })}
                    className="mono"
                    style={{ ...eingabeStil, width: 80, padding: "3px 5px", fontSize: 12 }}
                  />
                </td>
                <td>
                  <select
                    value={a.lehrer_id || ""}
                    onChange={(e) => {
                      const neu = e.target.value || null;
                      anlassAendern(a, { lehrer_id: neu, status: neu ? (a.status === "offen" ? "geplant" : a.status) : "offen" });
                    }}
                    style={{ ...eingabeStil, width: "auto", padding: "3px 5px", fontSize: 12 }}
                  >
                    <option value="">— offen —</option>
                    {lehrpersonen.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nachname}, {p.vorname}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  {a.status === "ausgefallen" ? (
                    <Tag text="Fällt aus" farbe={C.muted} />
                  ) : anlassUnbest(a) ? (
                    <Tag text="Unbestätigt" farbe={C.rose} />
                  ) : a.status === "gehalten" ? (
                    <Tag text="Bestätigt" farbe={C.teal} />
                  ) : a.status === "offen" ? (
                    <Tag text="Offen" farbe={C.brass} />
                  ) : (
                    <Tag text="Geplant" farbe={C.muted} />
                  )}
                </td>
                <td style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {a.status === "ausgefallen" ? (
                    <Knopf klein onClick={() => anlassAendern(a, { status: a.lehrer_id ? "geplant" : "offen" })}>
                      Reaktivieren
                    </Knopf>
                  ) : (
                    <Knopf klein variante="warn" onClick={() => anlassAendern(a, { status: "ausgefallen" })}>
                      Fällt aus
                    </Knopf>
                  )}
                  <Knopf klein variante="warn" onClick={() => anlassLoeschen(a)}>
                    Löschen
                  </Knopf>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
