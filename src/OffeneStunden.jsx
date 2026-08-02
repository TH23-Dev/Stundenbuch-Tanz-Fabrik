import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";
import { C } from "./theme";
import { Knopf, karteStil } from "./ui";
import { datumLabel, monatsGrenzen } from "./lib/datum";
import { speichereLektionStatus } from "./lib/lektionen";

// Kein `ansatz` hier: Vertretung wird immer mit dem persönlichen
// Vertretungssatz abgerechnet (Regel 4), nie mit dem Kurs-Ansatz.
const KURS_FELDER = "id,wochentag,zeit,dauer_min,bezeichnung,standort_code,gueltig_von,gueltig_bis,lehrer_id";

export default function OffeneStunden({ profil, session }) {
  const [laden, setLaden] = useState(true);
  const [ladeFehler, setLadeFehler] = useState("");
  const [orte, setOrte] = useState({});
  const [personen, setPersonen] = useState({});
  const [offene, setOffene] = useState([]);
  const [kurseById, setKurseById] = useState({});
  const [speichernFehler, setSpeichernFehler] = useState({});
  const [uebernommen, setUebernommen] = useState({});
  const [offeneAnlaesse, setOffeneAnlaesse] = useState([]);
  const [anlassFehler, setAnlassFehler] = useState({});
  const [anlassUebernommen, setAnlassUebernommen] = useState({});

  const { von, bis } = useMemo(() => monatsGrenzen(), []);

  useEffect(() => {
    let aktiv = true;

    async function laden() {
      setLaden(true);
      setLadeFehler("");

      const [{ data: offeneStatus, error: statusErr }, { data: orteData, error: orteErr }, { data: anlaesseData, error: anlassErr }] = await Promise.all([
        supabase
          .from("lektion_status")
          .select("kurs_id,datum,status,bemerkung")
          .is("ist_lehrer", null)
          .neq("status", "ausgefallen")
          .gte("datum", von)
          .lte("datum", bis),
        supabase.from("standorte").select("code,name"),
        // v_anlaesse_ohne_betrag statt anlaesse: Pauschale ist hier nicht sichtbar,
        // reine r_lehrer-Personen dürften die Basistabelle sonst gar nicht lesen.
        // Kein Datumsfilter: Anlässe sind selten und nicht an den Kalendermonat
        // gebunden (anders als Lektionen) — auch vergangene, noch offene
        // Anlässe sollen nachträglich eintragbar bleiben.
        supabase
          .from("v_anlaesse_ohne_betrag")
          .select("id,datum,zeit,titel,standort_code,typ,lehrer_id,status")
          .is("lehrer_id", null)
          .neq("status", "ausgefallen"),
      ]);
      if (!aktiv) return;
      if (statusErr || orteErr || anlassErr) {
        setLadeFehler((statusErr || orteErr || anlassErr).message);
        setLaden(false);
        return;
      }
      const orteMap = {};
      (orteData || []).forEach((o) => (orteMap[o.code] = o.name));
      setOrte(orteMap);
      setOffeneAnlaesse((anlaesseData || []).sort((a, b) => a.datum.localeCompare(b.datum) || a.zeit.localeCompare(b.zeit)));

      const kursIds = [...new Set((offeneStatus || []).map((s) => s.kurs_id))];
      if (kursIds.length === 0) {
        setOffene([]);
        setKurseById({});
        setLaden(false);
        return;
      }

      const { data: kurse, error: kurseErr } = await supabase.from("kurse").select(KURS_FELDER).in("id", kursIds);
      if (!aktiv) return;
      if (kurseErr) {
        setLadeFehler(kurseErr.message);
        setLaden(false);
        return;
      }

      const lehrerIds = [...new Set(kurse.map((k) => k.lehrer_id))];
      const { data: personenData, error: personenErr } = await supabase
        .from("v_personen_oeffentlich")
        .select("id,vorname,nachname")
        .in("id", lehrerIds);
      if (!aktiv) return;
      if (personenErr) {
        setLadeFehler(personenErr.message);
        setLaden(false);
        return;
      }

      const kMap = {};
      kurse.forEach((k) => (kMap[k.id] = k));
      const personenMap = {};
      (personenData || []).forEach((p) => (personenMap[p.id] = p));

      setKurseById(kMap);
      setPersonen(personenMap);
      setOffene(offeneStatus);
      setLaden(false);
    }

    laden();
    return () => {
      aktiv = false;
    };
  }, [profil.id, von, bis]);

  const liste = useMemo(
    () =>
      offene
        .filter((o) => kurseById[o.kurs_id] && !uebernommen[`${o.kurs_id}|${o.datum}`])
        .sort((a, b) => a.datum.localeCompare(b.datum) || kurseById[a.kurs_id].zeit.localeCompare(kurseById[b.kurs_id].zeit)),
    [offene, kurseById, uebernommen]
  );

  async function uebernehmen(o) {
    const key = `${o.kurs_id}|${o.datum}`;
    setUebernommen((prev) => ({ ...prev, [key]: true }));
    setSpeichernFehler((prev) => ({ ...prev, [key]: null }));

    const { error } = await speichereLektionStatus(supabase, {
      kursId: o.kurs_id,
      datum: o.datum,
      istLehrer: profil.id,
      status: o.status,
      bemerkung: o.bemerkung,
      geaendertVon: session.user.id,
    });

    if (error) {
      setUebernommen((prev) => {
        const rest = { ...prev };
        delete rest[key];
        return rest;
      });
      setSpeichernFehler((prev) => ({ ...prev, [key]: error.message }));
    }
  }

  const listeAnlaesse = offeneAnlaesse.filter((a) => !anlassUebernommen[a.id]);

  async function anlassUebernehmen(a) {
    setAnlassUebernommen((prev) => ({ ...prev, [a.id]: true }));
    setAnlassFehler((prev) => ({ ...prev, [a.id]: null }));
    const { error } = await supabase.from("anlaesse").update({ lehrer_id: profil.id, status: "geplant" }).eq("id", a.id);
    if (error) {
      setAnlassUebernommen((prev) => {
        const rest = { ...prev };
        delete rest[a.id];
        return rest;
      });
      setAnlassFehler((prev) => ({ ...prev, [a.id]: error.message }));
    }
  }

  if (laden) return <p style={{ color: C.inkSoft }}>Lade offene Stunden …</p>;
  if (ladeFehler) return <p style={{ color: C.rose, fontSize: 14 }}>Offene Stunden konnten nicht geladen werden: {ladeFehler}</p>;

  return (
    <div>
      <h2 className="display" style={{ fontSize: 21, margin: "0 0 6px" }}>
        Offene Stunden
      </h2>
      <p style={{ color: C.inkSoft, fontSize: 13, marginTop: 0, marginBottom: 16 }}>
        Vertretungen werden mit deinem persönlichen Vertretungssatz von CHF {profil.vertretungssatz}.– pro
        Lohnstunde abgerechnet.
      </p>

      {liste.length === 0 && (
        <div style={{ ...karteStil, justifyContent: "center", color: C.inkSoft, padding: 26 }}>
          Alle Stunden sind besetzt.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {liste.map((o) => {
          const key = `${o.kurs_id}|${o.datum}`;
          const k = kurseById[o.kurs_id];
          const soll = personen[k.lehrer_id];
          return (
            <div key={key} style={{ flexDirection: "column", alignItems: "stretch", ...karteStil, width: "100%", minWidth: 0 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ width: 4, borderRadius: 2, background: C.rose, alignSelf: "stretch", minHeight: 32 }} />
                <div style={{ flex: 1 }}>
                  <div className="mono" style={{ fontSize: 13, color: C.inkSoft }}>
                    {datumLabel(o.datum)} · {k.zeit}
                  </div>
                  <strong style={{ fontSize: 14 }}>{k.bezeichnung}</strong>
                  <span style={{ fontSize: 12, color: C.inkSoft }}>
                    {" "}
                    · {orte[k.standort_code] || k.standort_code} · {k.dauer_min}′ · sonst{" "}
                    {soll ? `${soll.vorname} ${soll.nachname}` : "—"}
                  </span>
                </div>
                <Knopf klein variante="voll" onClick={() => uebernehmen(o)}>
                  Übernehmen
                </Knopf>
              </div>
              {speichernFehler[key] && (
                <p style={{ color: C.rose, fontSize: 12, margin: "6px 0 0 16px" }}>
                  Konnte nicht übernommen werden: {speichernFehler[key]}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <h3 className="display" style={{ fontSize: 18, margin: "24px 0 6px" }}>
        Offene Anlässe
      </h3>
      <p style={{ color: C.inkSoft, fontSize: 13, marginTop: 0, marginBottom: 14 }}>
        Workshops, Camps und Auftritte, für die noch jemand gesucht wird. Pauschale pro Anlass, mit deinem
        Backoffice absprechen.
      </p>
      {listeAnlaesse.length === 0 && (
        <div style={{ ...karteStil, justifyContent: "center", color: C.inkSoft, padding: 22 }}>
          Keine offenen Anlässe.
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {listeAnlaesse.map((a) => (
          <div key={a.id} style={{ flexDirection: "column", alignItems: "stretch", ...karteStil, width: "100%", minWidth: 0 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ width: 4, borderRadius: 2, background: C.brass, alignSelf: "stretch", minHeight: 32 }} />
              <div style={{ flex: 1 }}>
                <div className="mono" style={{ fontSize: 13, color: C.inkSoft }}>
                  {datumLabel(a.datum)} · {a.zeit}
                </div>
                <strong style={{ fontSize: 14 }}>{a.titel}</strong>
                <span style={{ fontSize: 12, color: C.inkSoft }}>
                  {" "}
                  · {a.typ} · {orte[a.standort_code] || a.standort_code}
                </span>
              </div>
              <Knopf klein variante="voll" onClick={() => anlassUebernehmen(a)}>
                Eintragen
              </Knopf>
            </div>
            {anlassFehler[a.id] && (
              <p style={{ color: C.rose, fontSize: 12, margin: "6px 0 0 16px" }}>
                Konnte nicht eingetragen werden: {anlassFehler[a.id]}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
