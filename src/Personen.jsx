import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { C, eingabeStil } from "./theme";
import { Knopf, karteStil, Tag } from "./ui";
import { iso } from "./lib/datum";

const LEHRER_FELDER = "id,vorname,nachname,email,satz,vertretungssatz,r_lehrer,r_anlaesse,r_lohn,r_admin,aktiv";
const LEER_NEUE_PERSON = { vorname: "", nachname: "", email: "", satz: 60, vertretungssatz: 60 };

export default function Personen() {
  const [laden, setLaden] = useState(true);
  const [ladeFehler, setLadeFehler] = useState("");
  const [aktionFehler, setAktionFehler] = useState("");
  const [lehrerListe, setLehrerListe] = useState([]);
  const [kursAnzahl, setKursAnzahl] = useState({});
  const [neuePerson, setNeuePerson] = useState(LEER_NEUE_PERSON);
  const [bearbeiteId, setBearbeiteId] = useState(null);
  const [satzForm, setSatzForm] = useState({ satz: "", vertretungssatz: "" });

  const [importOffen, setImportOffen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importVorschau, setImportVorschau] = useState([]);
  const [importSatz, setImportSatz] = useState(60);
  const [importVertretungssatz, setImportVertretungssatz] = useState(60);
  const [importLaeuft, setImportLaeuft] = useState(false);
  const [importErgebnis, setImportErgebnis] = useState("");
  const [importFehler, setImportFehler] = useState("");

  useEffect(() => {
    let aktiv = true;
    async function laden() {
      setLaden(true);
      setLadeFehler("");
      const [{ data: lehrerData, error: e1 }, { data: kurseData, error: e2 }] = await Promise.all([
        supabase.from("lehrer").select(LEHRER_FELDER).order("nachname"),
        supabase.from("kurse").select("lehrer_id,gueltig_bis"),
      ]);
      if (!aktiv) return;
      const fehler = e1 || e2;
      if (fehler) {
        setLadeFehler(fehler.message);
        setLaden(false);
        return;
      }
      const heute = iso(new Date());
      const anzahl = {};
      (kurseData || []).forEach((k) => {
        if (!k.gueltig_bis || k.gueltig_bis >= heute) anzahl[k.lehrer_id] = (anzahl[k.lehrer_id] || 0) + 1;
      });
      setLehrerListe(lehrerData || []);
      setKursAnzahl(anzahl);
      setLaden(false);
    }
    laden();
    return () => {
      aktiv = false;
    };
  }, []);

  async function feldUmschalten(p, feld) {
    const vorher = p[feld];
    setLehrerListe((prev) => prev.map((x) => (x.id === p.id ? { ...x, [feld]: !vorher } : x)));
    const { error } = await supabase.from("lehrer").update({ [feld]: !vorher }).eq("id", p.id);
    if (error) {
      setLehrerListe((prev) => prev.map((x) => (x.id === p.id ? { ...x, [feld]: vorher } : x)));
      setAktionFehler(error.message);
    }
  }

  function emailAendern(id, wert) {
    setLehrerListe((prev) => prev.map((x) => (x.id === id ? { ...x, email: wert } : x)));
  }

  async function emailSpeichern(p) {
    const { error } = await supabase.from("lehrer").update({ email: p.email || null }).eq("id", p.id);
    if (error) setAktionFehler(error.message);
  }

  function satzBearbeitenStart(p) {
    setBearbeiteId(p.id);
    setSatzForm({ satz: p.satz, vertretungssatz: p.vertretungssatz });
  }

  async function satzSpeichern(p) {
    const satz = Number(satzForm.satz);
    const vertretungssatz = Number(satzForm.vertretungssatz);
    if (Number.isNaN(satz) || Number.isNaN(vertretungssatz)) return;
    setAktionFehler("");
    const heute = iso(new Date());

    const { error: histErr } = await supabase
      .from("lehrer_saetze")
      .upsert({ lehrer_id: p.id, satz, vertretungssatz, gueltig_von: heute }, { onConflict: "lehrer_id,gueltig_von" });
    if (histErr) {
      setAktionFehler(histErr.message);
      return;
    }
    const { error: lehrerErr } = await supabase.from("lehrer").update({ satz, vertretungssatz }).eq("id", p.id);
    if (lehrerErr) {
      setAktionFehler(lehrerErr.message);
      return;
    }
    setLehrerListe((prev) => prev.map((x) => (x.id === p.id ? { ...x, satz, vertretungssatz } : x)));
    setBearbeiteId(null);
  }

  async function personHinzufuegen() {
    if (!neuePerson.vorname || !neuePerson.nachname) return;
    setAktionFehler("");
    const id = "p" + Date.now();
    const heute = iso(new Date());
    const satz = Number(neuePerson.satz) || 0;
    const vertretungssatz = Number(neuePerson.vertretungssatz) || 0;

    const { data, error } = await supabase
      .from("lehrer")
      .insert({
        id,
        vorname: neuePerson.vorname,
        nachname: neuePerson.nachname,
        email: neuePerson.email || null,
        satz,
        vertretungssatz,
        r_lehrer: true,
      })
      .select(LEHRER_FELDER)
      .single();
    if (error) {
      setAktionFehler(error.message);
      return;
    }
    const { error: histErr } = await supabase.from("lehrer_saetze").insert({ lehrer_id: id, satz, vertretungssatz, gueltig_von: heute });
    if (histErr) {
      setAktionFehler(histErr.message);
    }
    setLehrerListe((prev) => [...prev, data].sort((a, b) => a.nachname.localeCompare(b.nachname)));
    setNeuePerson(LEER_NEUE_PERSON);
  }

  // Aus eingefügtem Text eine Vorschau bauen, eine Person pro Zeile. Drei
  // Formate werden erkannt:
  //   - Tab-getrennt "Nachname<Tab>Vorname" (Kopieren aus Excel, zwei Spalten)
  //   - Komma-getrennt "Nachname,Vorname"
  //   - frei getippt "Vorname Nachname" (ohne Tab/Komma -- letztes Wort gilt
  //     als Nachname, alles davor als Vorname, für Mehrfach-Vornamen)
  // Zeilen ohne erkennbare zwei Teile (Notizen, Leerzeilen) werden
  // stillschweigend übersprungen. Gegen die bestehende Liste abgeglichen,
  // damit niemand versehentlich doppelt angelegt wird.
  function importVorschauErstellen() {
    setImportErgebnis("");
    setImportFehler("");
    const bestehende = new Set(lehrerListe.map((p) => `${p.nachname.trim().toLowerCase()}|${p.vorname.trim().toLowerCase()}`));
    const gesehen = new Set();
    const zeilen = [];
    importText.split(/\r?\n/).forEach((zeileRoh, i) => {
      const zeile = zeileRoh.trim();
      if (!zeile) return;
      let nachname = "";
      let vorname = "";
      if (zeile.includes("\t")) {
        const teile = zeile.split("\t");
        nachname = (teile[0] || "").trim();
        vorname = (teile[1] || "").trim();
      } else if (zeile.includes(",")) {
        const teile = zeile.split(",");
        nachname = (teile[0] || "").trim();
        vorname = (teile[1] || "").trim();
      } else {
        const woerter = zeile.split(/\s+/);
        if (woerter.length >= 2) {
          nachname = woerter[woerter.length - 1];
          vorname = woerter.slice(0, -1).join(" ");
        }
      }
      if (!nachname || !vorname) return;
      const key = `${nachname.toLowerCase()}|${vorname.toLowerCase()}`;
      if (gesehen.has(key)) return;
      gesehen.add(key);
      const existiertBereits = bestehende.has(key);
      zeilen.push({ key: `${key}-${i}`, nachname, vorname, existiertBereits, ausgewaehlt: !existiertBereits });
    });
    setImportVorschau(zeilen);
  }

  function importZeileUmschalten(key) {
    setImportVorschau((prev) => prev.map((z) => (z.key === key ? { ...z, ausgewaehlt: !z.ausgewaehlt } : z)));
  }

  async function importAusfuehren() {
    const zeilenZumAnlegen = importVorschau.filter((z) => z.ausgewaehlt);
    if (zeilenZumAnlegen.length === 0) return;
    setImportLaeuft(true);
    setImportFehler("");
    setImportErgebnis("");

    const heute = iso(new Date());
    const satz = Number(importSatz) || 0;
    const vertretungssatz = Number(importVertretungssatz) || 0;
    const basis = Date.now();
    const neueZeilen = zeilenZumAnlegen.map((z, i) => ({
      id: `p${basis}_${i}`,
      vorname: z.vorname,
      nachname: z.nachname,
      satz,
      vertretungssatz,
      r_lehrer: true,
    }));

    const { data, error } = await supabase.from("lehrer").insert(neueZeilen).select(LEHRER_FELDER);
    if (error) {
      setImportFehler(error.message);
      setImportLaeuft(false);
      return;
    }
    const { error: histErr } = await supabase
      .from("lehrer_saetze")
      .insert(neueZeilen.map((z) => ({ lehrer_id: z.id, satz, vertretungssatz, gueltig_von: heute })));
    if (histErr) {
      setImportFehler(histErr.message);
    }

    setLehrerListe((prev) => [...prev, ...data].sort((a, b) => a.nachname.localeCompare(b.nachname)));
    setImportErgebnis(`${data.length} neue Personen angelegt.`);
    setImportVorschau([]);
    setImportText("");
    setImportLaeuft(false);
  }

  if (laden) return <p style={{ color: C.inkSoft }}>Lade Personen …</p>;
  if (ladeFehler) return <p style={{ color: C.rose, fontSize: 14 }}>Personen konnten nicht geladen werden: {ladeFehler}</p>;

  return (
    <div>
      <h2 className="display" style={{ fontSize: 21, margin: "0 0 6px" }}>
        Personen &amp; Rollen
      </h2>
      <p style={{ color: C.inkSoft, fontSize: 13, marginTop: 0, marginBottom: 14 }}>
        Eine Satz-Änderung gilt ab heute, vergangene (auch abgeschlossene) Monate bleiben unverändert — die
        Historie wird automatisch mitgeführt. Rollen bestimmen, was eine Person sieht; wer «Lehrer» nicht hat,
        erscheint nicht in der Stundenzuteilung.
      </p>

      {aktionFehler && <p style={{ color: C.rose, fontSize: 13, marginBottom: 14 }}>{aktionFehler}</p>}

      <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, maxHeight: 560, overflow: "auto", marginBottom: 20 }}>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>E-Mail</th>
              <th>Ansatz</th>
              <th>Vertr.</th>
              <th>Lehrer</th>
              <th>Anlässe</th>
              <th>Lohn</th>
              <th>Admin</th>
              <th>Kurse</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {lehrerListe.map((p) => (
              <tr key={p.id} style={{ opacity: p.aktiv ? 1 : 0.45 }}>
                <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                  {p.nachname}, {p.vorname}
                </td>
                <td>
                  <input
                    value={p.email || ""}
                    onChange={(e) => emailAendern(p.id, e.target.value)}
                    onBlur={() => emailSpeichern(p)}
                    placeholder="—"
                    style={{ ...eingabeStil, width: 170, padding: "3px 5px", fontSize: 12 }}
                  />
                </td>
                {bearbeiteId === p.id ? (
                  <td colSpan={2}>
                    <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
                      <input
                        type="number"
                        value={satzForm.satz}
                        onChange={(e) => setSatzForm({ ...satzForm, satz: e.target.value })}
                        className="mono"
                        style={{ ...eingabeStil, width: 60, padding: "3px 5px", fontSize: 12 }}
                      />
                      <input
                        type="number"
                        value={satzForm.vertretungssatz}
                        onChange={(e) => setSatzForm({ ...satzForm, vertretungssatz: e.target.value })}
                        className="mono"
                        style={{ ...eingabeStil, width: 60, padding: "3px 5px", fontSize: 12 }}
                      />
                      <Knopf klein variante="voll" onClick={() => satzSpeichern(p)}>
                        Sichern
                      </Knopf>
                      <Knopf klein onClick={() => setBearbeiteId(null)}>
                        Abbr.
                      </Knopf>
                    </div>
                  </td>
                ) : (
                  <>
                    <td className="mono">{p.satz}</td>
                    <td className="mono">
                      {p.vertretungssatz}{" "}
                      <button
                        onClick={() => satzBearbeitenStart(p)}
                        style={{ border: "none", background: "none", color: C.inkSoft, textDecoration: "underline", cursor: "pointer", fontSize: 11, padding: 0, marginLeft: 4 }}
                      >
                        ändern
                      </button>
                    </td>
                  </>
                )}
                <td>
                  <input type="checkbox" checked={!!p.r_lehrer} onChange={() => feldUmschalten(p, "r_lehrer")} style={{ cursor: "pointer" }} />
                </td>
                <td>
                  <input type="checkbox" checked={!!p.r_anlaesse} onChange={() => feldUmschalten(p, "r_anlaesse")} style={{ cursor: "pointer" }} />
                </td>
                <td>
                  <input type="checkbox" checked={!!p.r_lohn} onChange={() => feldUmschalten(p, "r_lohn")} style={{ cursor: "pointer" }} />
                </td>
                <td>
                  <input type="checkbox" checked={!!p.r_admin} onChange={() => feldUmschalten(p, "r_admin")} style={{ cursor: "pointer" }} />
                </td>
                <td className="mono" style={{ color: C.inkSoft }}>
                  {kursAnzahl[p.id] || 0}
                </td>
                <td>
                  <Knopf klein variante={p.aktiv ? "still" : "voll"} onClick={() => feldUmschalten(p, "aktiv")}>
                    {p.aktiv ? "Aktiv" : "Inaktiv"}
                  </Knopf>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="display" style={{ fontSize: 18, margin: "0 0 12px" }}>
        Person hinzufügen
      </h3>
      <div style={{ ...karteStil, gap: 8, flexWrap: "wrap" }}>
        <input
          placeholder="Vorname"
          value={neuePerson.vorname}
          onChange={(e) => setNeuePerson({ ...neuePerson, vorname: e.target.value })}
          style={{ ...eingabeStil, width: "auto" }}
        />
        <input
          placeholder="Nachname"
          value={neuePerson.nachname}
          onChange={(e) => setNeuePerson({ ...neuePerson, nachname: e.target.value })}
          style={{ ...eingabeStil, width: "auto" }}
        />
        <input
          placeholder="E-Mail (optional)"
          value={neuePerson.email}
          onChange={(e) => setNeuePerson({ ...neuePerson, email: e.target.value })}
          style={{ ...eingabeStil, width: 200 }}
        />
        <span title="Standardansatz" style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 12, color: C.inkSoft }}>Satz</span>
          <input
            type="number"
            value={neuePerson.satz}
            onChange={(e) => setNeuePerson({ ...neuePerson, satz: e.target.value })}
            className="mono"
            style={{ ...eingabeStil, width: 70 }}
          />
        </span>
        <span title="Vertretungssatz" style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 12, color: C.inkSoft }}>Vertr.</span>
          <input
            type="number"
            value={neuePerson.vertretungssatz}
            onChange={(e) => setNeuePerson({ ...neuePerson, vertretungssatz: e.target.value })}
            className="mono"
            style={{ ...eingabeStil, width: 70 }}
          />
        </span>
        <Knopf variante="voll" onClick={personHinzufuegen}>
          Person hinzufügen
        </Knopf>
      </div>

      <div style={{ marginTop: 28 }}>
        {!importOffen ? (
          <Knopf onClick={() => setImportOffen(true)}>Mehrere Personen auf einmal importieren</Knopf>
        ) : (
          <>
            <h3 className="display" style={{ fontSize: 18, margin: "0 0 6px" }}>
              Mehrere Personen importieren
            </h3>
            <p style={{ color: C.inkSoft, fontSize: 13, marginTop: 0, marginBottom: 10 }}>
              Eine Person pro Zeile, in einem dieser Formate: aus Excel kopiert (zwei Spalten Nachname/
              Vorname, Tab-getrennt), "Nachname,Vorname" mit Komma, oder einfach frei getippt
              "Vorname Nachname" (z.B. "Max Muster"). Notizen oder unvollständige Zeilen werden beim
              Erstellen der Vorschau automatisch übersprungen.
            </p>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={"Ammann\tBenjamin\nCehajic\tJasmin\nMax Muster\n…"}
              rows={6}
              style={{ ...eingabeStil, width: "100%", fontFamily: "monospace", fontSize: 13, marginBottom: 10 }}
            />
            <div style={{ marginBottom: 14 }}>
              <Knopf variante="voll" onClick={importVorschauErstellen} disabled={!importText.trim()}>
                Vorschau erstellen
              </Knopf>
            </div>

            {importVorschau.length > 0 && (
              <>
                <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, maxHeight: 360, overflow: "auto", marginBottom: 14 }}>
                  <table>
                    <thead>
                      <tr>
                        <th></th>
                        <th>Nachname</th>
                        <th>Vorname</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importVorschau.map((z) => (
                        <tr key={z.key}>
                          <td>
                            <input type="checkbox" checked={z.ausgewaehlt} onChange={() => importZeileUmschalten(z.key)} style={{ cursor: "pointer" }} />
                          </td>
                          <td>{z.nachname}</td>
                          <td>{z.vorname}</td>
                          <td>
                            {z.existiertBereits ? <Tag text="Bereits vorhanden" farbe={C.muted} /> : <Tag text="Neu" farbe={C.teal} />}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ ...karteStil, gap: 8, flexWrap: "wrap" }}>
                  <span title="Standardansatz für alle ausgewählten Zeilen" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 12, color: C.inkSoft }}>Satz</span>
                    <input
                      type="number"
                      value={importSatz}
                      onChange={(e) => setImportSatz(e.target.value)}
                      className="mono"
                      style={{ ...eingabeStil, width: 70 }}
                    />
                  </span>
                  <span title="Vertretungssatz für alle ausgewählten Zeilen" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 12, color: C.inkSoft }}>Vertr.</span>
                    <input
                      type="number"
                      value={importVertretungssatz}
                      onChange={(e) => setImportVertretungssatz(e.target.value)}
                      className="mono"
                      style={{ ...eingabeStil, width: 70 }}
                    />
                  </span>
                  <Knopf variante="voll" onClick={importAusfuehren} disabled={importLaeuft || importVorschau.every((z) => !z.ausgewaehlt)}>
                    {importVorschau.filter((z) => z.ausgewaehlt).length} Personen anlegen
                  </Knopf>
                  <span style={{ fontSize: 12, color: C.inkSoft }}>Satz gilt einzeln pro Person danach wie gewohnt änderbar.</span>
                </div>
              </>
            )}

            {importFehler && <p style={{ color: C.rose, fontSize: 13, marginTop: 10 }}>{importFehler}</p>}
            {importErgebnis && <p style={{ color: C.teal, fontSize: 13, marginTop: 10 }}>{importErgebnis}</p>}
          </>
        )}
      </div>
    </div>
  );
}
