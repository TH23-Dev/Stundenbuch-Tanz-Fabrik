import React from "react";
import { C } from "./theme";

export const karteStil = {
  display: "flex",
  gap: 12,
  alignItems: "center",
  background: C.surface,
  border: `1px solid ${C.line}`,
  borderRadius: 10,
  padding: 12,
};

export const Tag = ({ text, farbe }) => (
  <span
    style={{
      fontSize: 11,
      letterSpacing: 0.4,
      textTransform: "uppercase",
      color: farbe,
      border: `1px solid ${farbe}33`,
      background: `${farbe}0F`,
      padding: "2px 8px",
      borderRadius: 999,
      fontWeight: 600,
      whiteSpace: "nowrap",
    }}
  >
    {text}
  </span>
);

export const Kennzahl = ({ label, wert, warn }) => (
  <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: "12px 18px", minWidth: 140 }}>
    <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, color: C.inkSoft }}>{label}</div>
    <div className="mono" style={{ fontSize: 22, fontWeight: 600, color: warn && wert !== 0 ? C.rose : C.ink }}>
      {wert}
    </div>
  </div>
);

export const Knopf = ({ children, onClick, variante = "still", klein, disabled }) => {
  const varianten = {
    voll: { background: C.ink, color: "#fff", border: `1px solid ${C.ink}` },
    still: { background: "transparent", color: C.inkSoft, border: `1px solid ${C.line}` },
    warn: { background: "transparent", color: C.rose, border: `1px solid ${C.rose}55` },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...varianten[variante],
        padding: klein ? "5px 11px" : "8px 16px",
        borderRadius: 999,
        fontSize: klein ? 12 : 13,
        fontWeight: 600,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1,
        fontFamily: "inherit",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
};
