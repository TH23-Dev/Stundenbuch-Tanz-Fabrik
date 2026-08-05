import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { C, eingabeStil } from "./theme";
import { Knopf, karteStil } from "./ui";
import { iso, TAGE } from "./lib/datum";

const KURS_FELDER = "id,wochentag,zeit,dauer_min,bezeichnung,standort_code,lehrer_id,ansatz,gueltig_von,gueltig_bis";

const LEER_NEUER_KURS = { tag: 1, zeit: "18:00", dauer: 55, bezeichnung: "", ort: "", lehrerId: "", ansatz: "", von: iso(new Date()) };

export default function Kurse() {
  const [laden, setLaden] = useState(true);
  const [ladeFehler, setLadeFehler] = useState("");
  const [aktionFehler, setAktionFehler] = useState("");
  const [kurse, setKurse] = useState([]);
  const [orte, setOrte] = useState({});
  const [lehrpersonen, setLehrpersonen] = useState([]);
  const [neuerKurs, setNeuerKurs] = useState(LEER_NEUER_KURS);
  const [neuerStandort, setNeuerStandort] = useState({ code: "", name: "" });

  useEffect(() => {
    let aktiv = true;
    async function laden() {
      setLaden(true);
      setLadeFehler("");
      const [{ data: kurseData, error: e1 }, { data: orteData, error: e2 }, { data: lehrerData, error: e3 }] = await Promise.all([
        supabase.from("kurse").select(KURS_FELDER),
        supabase.from("standorte").select("code,name"),
        supabase.from("lehrer").select("id,vorname,nachname,aktiv,r_lehrer").eq("r_lehrer", true).order("nachname"),
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
      setKurse((kurseData || []).sort((a, b) => a.wochentag - b.wochentag || a.zeit.localeCompare(b.zeit)));
      setOrte(orteMap);
      setLehrpersonen(lehrerData || []);
      setNeuerKurs((k) => ({ ...k, ort: k.ort || (orteData || [])[0]?.code || "", lehrerId: k.lehrerId || (lehrerData || [])[0]?.id || "" }));
      setLaden(false);
    }
    laden();
    return () => {
      aktiv = false;
    };
  }, []);

  const name = (id) => {
    const p = lehrpersonen.find((x) => x.id === id);
    return p ? `${p.vorname} ${p.nachname}` : "—";
  };
  const heute = iso(new Date());

  async function kursBeenden(k) {
    if (!window.confirm(`Kurs "${k.bezeichnung}" ab morgen beenden?\n\nDanach erscheint er nicht mehr im Kursplan. Für einen Lehrer- oder Ansatzwechsel anschliessend unten einen neuen Kurs ab morgen anlegen (Regel 9: keine rückwirkenden Änderungen).`))
      return;
    setAktionFehler("");
    const { data, error } = await supabase.from("kurse").update({ gueltig_bis: heute }).eq("id", k.id).select(KURS_FELDER).single();
    if (error) {
      setAktionFehler(error.message);
      return;
    }
    setKurse((prev) => prev.map((x) => (x.id === k.id ? data : x)));
  }

  async function kursHinzufuegen() {
    if (!neuerKurs.bezeichnung || !neuerKurs.lehrerId || !neuerKurs.ort) return;
    setAktionFehler("");
    const { data, error } = await supabase
      .from("kurse")
      .insert({
        id: "c" + Date.now(),
        wochentag: Number(neuerKurs.tag),
        zeit: neuerKurs.zeit,
        dauer_min: Number(neuerKurs.dauer),
        bezeichnung: neuerKurs.bezeichnung,
        standort_code: neuerKurs.ort,
        lehrer_id: neuerKurs.lehrerId,
        ansatz: neuerKurs.ansatz ? Number(neuerKurs.ansatz) : null,
        gueltig_von: neuerKurs.von,
      })
      .select(KURS_FELDER)
      .single();
    if (error) {
      setAktionFehler(error.message);
      return;
    }
    setKurse((prev) => [...prev, data].sort((a, b) => a.wochentag - b.wochentag || a.zeit.localeCompare(b.zeit)));
    setNeuerKurs((k) => ({ ...k, bezeichnung: "", ansatz: "" }));
  }

  async function standortHinzufuegen() {
    const code = neuerStandort.code.trim();
    const name = neuerStandort.name.trim();
    if (!code || !name) return;
    setAktionFehler("");
    const { error } = await supabase.from("standorte").insert({ code, name });
    if (error) {
      setAktionFehler(error.message);
      return;
    }
    setOrte((prev) => ({ ...prev, [code]: name }));
    setNeuerKurs((k) => ({ ...k, ort: k.ort || code }));
    setNeuerStandort({ code: "", name: "" });
  }

  if (laden) return <p style={{ color: C.inkSoft }}>Lade Kurse …</p>;
  if (ladeFehler) return <p style={{ color: C.rose, fontSize: 14 }}>Kurse konnten nicht geladen werden: {ladeFehler}</p>;

  return (
    <div>
      <h2 className="display" style={{ fontSize: 21, margin: "0 0 6px" }}>
        Kurse verwalten
      </h2>
      <p style={{ color: C.inkSoft, fontSize: 13, marginTop: 0, marginBottom: 14 }}>
        Lehrer, Ansatz, Tag, Zeit, Dauer und Standort eines bestehenden Kurses sind absichtlich nicht direkt
        änderbar (Regel 9) — das würde auch bereits vergangene Lektionen rückwirkend verändern. Für einen
        Wechsel: Kurs beenden, danach unten einen neuen Kurs ab dem Folgetag anlegen.
      </p>

      {aktionFehler && <p style={{ color: C.rose, fontSize: 13, marginBottom: 14 }}>{aktionFehler}</p>}

      <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, maxHeight: 560, overflow: "auto", marginBottom: 20 }}>
        <table>
          <thead>
            <tr>
              <th>Tag</th>
              <th>Zeit</th>
              <th>Dauer</th>
              <th>Kurs</th>
              <th>Standort</th>
              <th>Lehrer</th>
              <th>Ansatz</th>
              <th>Gültig ab</th>
              <th>bis</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {kurse.map((k) => {
              const beendet = k.gueltig_bis && k.gueltig_bis <= heute;
              return (
                <tr key={k.id} style={{ opacity: beendet ? 0.45 : 1 }}>
                  <td style={{ color: C.inkSoft }}>{TAGE[k.wochentag]}</td>
                  <td className="mono">{k.zeit}</td>
                  <td className="mono" style={{ color: C.inkSoft }}>
                    {k.dauer_min}′
                  </td>
                  <td style={{ fontWeight: 600 }}>{k.bezeichnung}</td>
                  <td style={{ color: C.inkSoft }}>{orte[k.standort_code] || k.standort_code}</td>
                  <td>{name(k.lehrer_id)}</td>
                  <td className="mono" style={{ color: C.inkSoft }}>
                    {k.ansatz ?? "–"}
                  </td>
                  <td className="mono" style={{ color: C.inkSoft }}>
                    {k.gueltig_von}
                  </td>
                  <td className="mono" style={{ color: C.inkSoft }}>
                    {k.gueltig_bis || "–"}
                  </td>
                  <td>
                    {!k.gueltig_bis || k.gueltig_bis > heute ? (
                      <Knopf klein variante="warn" onClick={() => kursBeenden(k)}>
                        Beenden
                      </Knopf>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h3 className="display" style={{ fontSize: 18, margin: "0 0 12px" }}>
        Standorte verwalten
      </h3>
      <div style={{ ...karteStil, gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
        {Object.entries(orte).map(([code, n]) => (
          <span
            key={code}
            style={{
              fontSize: 12,
              color: C.inkSoft,
              border: `1px solid ${C.line}`,
              borderRadius: 999,
              padding: "3px 10px",
            }}
          >
            {n} <span className="mono" style={{ color: C.muted }}>({code})</span>
          </span>
        ))}
      </div>
      <div style={{ ...karteStil, gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
        <input
          placeholder="Kurzcode, z.B. TFXY"
          value={neuerStandort.code}
          onChange={(e) => setNeuerStandort({ ...neuerStandort, code: e.target.value })}
          className="mono"
          style={{ ...eingabeStil, width: 140 }}
        />
        <input
          placeholder="Name, z.B. Baden"
          value={neuerStandort.name}
          onChange={(e) => setNeuerStandort({ ...neuerStandort, name: e.target.value })}
          style={{ ...eingabeStil, width: 180 }}
        />
        <Knopf variante="voll" onClick={standortHinzufuegen} disabled={!neuerStandort.code.trim() || !neuerStandort.name.trim()}>
          Standort hinzufügen
        </Knopf>
        <span style={{ fontSize: 12, color: C.inkSoft }}>Der Kurzcode ist danach nicht mehr änderbar, der Name jederzeit über Supabase.</span>
      </div>

      <h3 className="display" style={{ fontSize: 18, margin: "0 0 12px" }}>
        Neuen Kurs anlegen
      </h3>
      <div style={{ ...karteStil, gap: 6, flexWrap: "wrap" }}>
        <select value={neuerKurs.tag} onChange={(e) => setNeuerKurs({ ...neuerKurs, tag: e.target.value })} style={{ ...eingabeStil, width: "auto" }}>
          {TAGE.slice(1).map((t, i) => (
            <option key={t} value={i + 1}>
              {t}
            </option>
          ))}
        </select>
        <input value={neuerKurs.zeit} onChange={(e) => setNeuerKurs({ ...neuerKurs, zeit: e.target.value })} className="mono" style={{ ...eingabeStil, width: 80 }} />
        <select value={neuerKurs.dauer} onChange={(e) => setNeuerKurs({ ...neuerKurs, dauer: e.target.value })} style={{ ...eingabeStil, width: "auto" }}>
          <option value={55}>55′</option>
          <option value={85}>85′</option>
        </select>
        <input
          placeholder="Kursname"
          value={neuerKurs.bezeichnung}
          onChange={(e) => setNeuerKurs({ ...neuerKurs, bezeichnung: e.target.value })}
          style={{ ...eingabeStil, width: 180 }}
        />
        <select value={neuerKurs.ort} onChange={(e) => setNeuerKurs({ ...neuerKurs, ort: e.target.value })} style={{ ...eingabeStil, width: "auto" }}>
          {Object.entries(orte).map(([code, n]) => (
            <option key={code} value={code}>
              {n}
            </option>
          ))}
        </select>
        <select value={neuerKurs.lehrerId} onChange={(e) => setNeuerKurs({ ...neuerKurs, lehrerId: e.target.value })} style={{ ...eingabeStil, width: "auto" }}>
          {lehrpersonen.filter((p) => p.aktiv).map((p) => (
            <option key={p.id} value={p.id}>
              {p.vorname} {p.nachname}
            </option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Ansatz"
          value={neuerKurs.ansatz}
          onChange={(e) => setNeuerKurs({ ...neuerKurs, ansatz: e.target.value })}
          className="mono"
          style={{ ...eingabeStil, width: 90 }}
        />
        <input type="date" value={neuerKurs.von} onChange={(e) => setNeuerKurs({ ...neuerKurs, von: e.target.value })} style={{ ...eingabeStil, width: "auto" }} />
        <Knopf variante="voll" onClick={kursHinzufuegen}>
          Kurs hinzufügen
        </Knopf>
      </div>
    </div>
  );
}
