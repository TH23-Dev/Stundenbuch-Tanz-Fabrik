import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { C, knopfStil, eingabeStil } from "./theme";
import Login from "./Login";
import Logo from "./Logo";
import MeineStunden from "./MeineStunden";
import OffeneStunden from "./OffeneStunden";
import Backoffice from "./Backoffice";
import Lektionsverwaltung from "./Lektionsverwaltung";
import Kurse from "./Kurse";
import Personen from "./Personen";
import Anlaesse from "./Anlaesse";

const ROLLEN_LABEL = {
  r_lehrer: "Lehrer",
  r_anlaesse: "Anlässe",
  r_lohn: "Lohn",
  r_admin: "Admin",
};

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = wird geladen, null = kein Login
  const [profil, setProfil] = useState(undefined);
  const [profilFehler, setProfilFehler] = useState("");
  const [ansicht, setAnsicht] = useState("lehrer"); // lehrer | offen

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setProfil(session === null ? null : undefined);
      return;
    }
    let aktiv = true;
    setProfil(undefined);
    supabase
      .from("lehrer")
      .select("id, vorname, nachname, satz, vertretungssatz, r_lehrer, r_anlaesse, r_lohn, r_admin, aktiv")
      .eq("user_id", session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!aktiv) return;
        if (error) setProfilFehler(error.message);
        setProfil(data ?? null);
      });
    return () => {
      aktiv = false;
    };
  }, [session]);

  if (session === undefined) return null; // Session wird noch geladen
  if (!session) return <Login />;

  // Eine inaktive Person bekommt kein Menü mehr -- unabhängig von ihren
  // Rollen. Der eigentliche Zugriffsschutz sitzt zusätzlich in der
  // Datenbank (RLS-Funktionen prüfen "aktiv" mit); das hier verhindert nur,
  // dass die Person ein Menü sieht, dessen Aktionen ohnehin überall
  // fehlschlagen würden.
  const optionen = [];
  if (profil?.aktiv && profil?.r_lehrer) {
    optionen.push({ value: "lehrer", label: "Meine Stunden" });
    optionen.push({ value: "offen", label: "Offene Stunden / Anlässe" });
  }
  if (profil?.aktiv && (profil?.r_lohn || profil?.r_admin)) {
    optionen.push({ value: "backoffice", label: "Abrechnung" });
    optionen.push({ value: "lektionen", label: "Lektionen verwalten" });
  }
  if (profil?.aktiv && profil?.r_admin) {
    optionen.push({ value: "kurse", label: "Kurse verwalten" });
  }
  if (profil?.aktiv && (profil?.r_anlaesse || profil?.r_lohn || profil?.r_admin)) {
    optionen.push({ value: "anlaesse", label: "Anlässe verwalten" });
  }
  if (profil?.aktiv && profil?.r_admin) {
    optionen.push({ value: "personen", label: "Personen & Rollen" });
  }
  const aktuelleAnsicht = optionen.some((o) => o.value === ansicht) ? ansicht : optionen[0]?.value;

  return (
    <div style={{ minHeight: "100vh", background: C.paper, color: C.ink }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Logo height={24} color={C.ink} />
            <h1 className="display" style={{ fontSize: 27, margin: 0 }}>
              Stundenbuch
            </h1>
          </div>
          <button onClick={() => supabase.auth.signOut()} style={{ ...knopfStil("still"), width: "auto", padding: "6px 12px", fontSize: 13 }}>
            Abmelden
          </button>
        </div>

        {profil === undefined && <p style={{ color: C.inkSoft }}>Lade Profil …</p>}

        {profilFehler && (
          <p style={{ color: C.rose, fontSize: 14 }}>Profil konnte nicht geladen werden: {profilFehler}</p>
        )}

        {profil === null && !profilFehler && (
          <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: 16 }}>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
              Angemeldet als <strong>{session.user.email}</strong>, aber diese Adresse ist keiner
              Lehrperson zugeordnet. Bitte beim Backoffice die E-Mail-Adresse in den Stammdaten
              nachtragen lassen.
            </p>
          </div>
        )}

        {profil && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            <strong style={{ fontSize: 14 }}>
              {profil.vorname} {profil.nachname}
            </strong>
            {Object.entries(ROLLEN_LABEL)
              .filter(([feld]) => profil[feld])
              .map(([feld, label]) => (
                <span
                  key={feld}
                  style={{
                    fontSize: 11,
                    letterSpacing: 0.4,
                    textTransform: "uppercase",
                    color: C.teal,
                    border: `1px solid ${C.teal}33`,
                    background: `${C.teal}0F`,
                    padding: "2px 7px",
                    borderRadius: 4,
                    fontWeight: 600,
                  }}
                >
                  {label}
                </span>
              ))}
            {!profil.aktiv && <span style={{ fontSize: 11, color: C.rose }}>inaktiv</span>}
          </div>
        )}

        {profil && optionen.length > 0 && (
          <>
            <select value={aktuelleAnsicht} onChange={(e) => setAnsicht(e.target.value)} style={{ ...eingabeStil, width: "auto", marginBottom: 18 }}>
              {optionen.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {aktuelleAnsicht === "lehrer" && <MeineStunden profil={profil} session={session} />}
            {aktuelleAnsicht === "offen" && <OffeneStunden profil={profil} session={session} />}
            {aktuelleAnsicht === "backoffice" && <Backoffice session={session} />}
            {aktuelleAnsicht === "lektionen" && <Lektionsverwaltung session={session} />}
            {aktuelleAnsicht === "kurse" && <Kurse />}
            {aktuelleAnsicht === "anlaesse" && <Anlaesse />}
            {aktuelleAnsicht === "personen" && <Personen />}
          </>
        )}

        {profil && optionen.length === 0 && !profil.aktiv && (
          <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: 16 }}>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
              Dieser Zugang ist deaktiviert. Bitte wende dich ans Backoffice, falls das nicht
              stimmen sollte.
            </p>
          </div>
        )}

        {profil && optionen.length === 0 && profil.aktiv && (
          <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: 16 }}>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
              Für diesen Account gibt es hier noch keine Ansicht. Weitere Bereiche (Anlässe,
              Stammdaten …) folgen in den nächsten Etappen.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
