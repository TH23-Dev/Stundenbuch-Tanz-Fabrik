// Farb-Tokens angelehnt an das Tanz-Fabrik-Markendesign (tanz-fabrik.ch):
// Schwarz/Weiss-Kontrast, Pink und Mint als Akzente. Flächen bleiben hell,
// damit dichte Tabellen lesbar bleiben — die Marke selbst ist fast
// durchgehend dunkel, das eignet sich für eine Marketingseite, nicht für
// ein Arbeitswerkzeug mit langen Listen.
export const C = {
  ink: "#0C0A09",
  inkSoft: "#6B6663",
  paper: "#F5F4F2",
  surface: "#FFFFFF",
  line: "#E7E5E4",
  teal: "#00A876",
  rose: "#F40058",
  brass: "#A8761F",
  muted: "#A39D99",
};

export const eingabeStil = {
  padding: "10px 12px",
  borderRadius: 8,
  border: `1px solid ${C.line}`,
  background: C.surface,
  color: C.ink,
  fontSize: 15,
  fontFamily: "inherit",
  width: "100%",
};

export const knopfStil = (variante = "still") => {
  const varianten = {
    voll: { background: C.ink, color: "#fff", border: `1px solid ${C.ink}` },
    still: { background: "transparent", color: C.inkSoft, border: `1px solid ${C.line}` },
    warn: { background: "transparent", color: C.rose, border: `1px solid ${C.rose}55` },
  };
  return {
    ...varianten[variante],
    padding: "11px 18px",
    borderRadius: 999,
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
    width: "100%",
  };
};
