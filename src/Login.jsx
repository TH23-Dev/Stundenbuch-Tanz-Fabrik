import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { C, eingabeStil, knopfStil } from "./theme";
import Logo from "./Logo";

const LINK_FEHLER = {
  otp_expired: "Der Link ist abgelaufen oder wurde bereits verwendet. Bitte einen neuen anfordern.",
};

export default function Login() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("bereit"); // bereit | sendet | gesendet | fehler
  const [fehler, setFehler] = useState("");

  // Supabase meldet abgelaufene/ungültige Magic-Links über Fehlerparameter
  // im URL-Hash statt über einen normalen Seitenaufruf.
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const code = hash.get("error_code");
    if (code) {
      setStatus("fehler");
      setFehler(LINK_FEHLER[code] || hash.get("error_description") || "Anmeldung fehlgeschlagen.");
      history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  async function linkSenden(e) {
    e.preventDefault();
    if (!email) return;
    setStatus("sendet");
    setFehler("");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      setStatus("fehler");
      setFehler(error.message);
    } else {
      setStatus("gesendet");
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background: C.paper,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 360,
          background: C.surface,
          border: `1px solid ${C.line}`,
          borderRadius: 12,
          padding: 28,
        }}
      >
        <Logo height={26} color={C.ink} />
        <h1 className="display" style={{ fontSize: 28, margin: "10px 0 4px" }}>
          Stundenbuch
        </h1>
        <p style={{ color: C.inkSoft, fontSize: 13, margin: "0 0 24px" }}>Tanz-Fabrik</p>

        {status === "gesendet" ? (
          <p style={{ fontSize: 14, lineHeight: 1.5 }}>
            Link verschickt an <strong>{email}</strong>. Bitte E-Mail-Postfach prüfen und
            den Link öffnen, um dich anzumelden.
          </p>
        ) : (
          <form onSubmit={linkSenden} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label style={{ fontSize: 13, color: C.inkSoft }}>
              E-Mail-Adresse
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vorname.nachname@beispiel.ch"
                style={{ ...eingabeStil, marginTop: 6 }}
              />
            </label>
            <button type="submit" disabled={status === "sendet"} style={knopfStil("voll")}>
              {status === "sendet" ? "Sende Link …" : "Anmeldelink senden"}
            </button>
            {status === "fehler" && (
              <p style={{ color: C.rose, fontSize: 13, margin: 0 }}>{fehler}</p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
