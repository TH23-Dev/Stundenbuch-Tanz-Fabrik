export const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const datumLabel = (isoStr) =>
  new Date(isoStr + "T12:00").toLocaleDateString("de-CH", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });

// Schweizer Format TT.MM.JJJJ (mit führenden Nullen — toLocaleDateString
// ohne explizite Optionen liefert das nicht zuverlässig).
export const datumVoll = (isoStr) =>
  new Date(isoStr + "T12:00").toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" });

// ISO-Kalenderwoche, für "Ferienwoche streichen"
export function kw(isoStr) {
  const dt = new Date(isoStr + "T12:00");
  const t = new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  return Math.ceil(((t - new Date(Date.UTC(t.getUTCFullYear(), 0, 1))) / 86400000 + 1) / 7);
}

// Wochentag wie in kurse.wochentag: 1 = Montag ... 7 = Sonntag
export const wochentag = (d) => (d.getDay() === 0 ? 7 : d.getDay());

export const TAGE = ["", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

export function monatsGrenzen(heute = new Date()) {
  const jahr = heute.getFullYear();
  const monatIndex = heute.getMonth();
  const letzterTag = new Date(jahr, monatIndex + 1, 0).getDate();
  return {
    jahr,
    monatIndex,
    tageImMonat: letzterTag,
    von: iso(new Date(jahr, monatIndex, 1)),
    bis: iso(new Date(jahr, monatIndex, letzterTag)),
  };
}

// Wie monatsGrenzen, aber ausgehend von einem "YYYY-MM"-String
// (z.B. aus <input type="month">) statt einem Date.
export function monatsGrenzenFuer(monatStr) {
  const [jahr, monat1] = monatStr.split("-").map(Number);
  return monatsGrenzen(new Date(jahr, monat1 - 1, 1));
}

export const aktuellerMonat = () => {
  const { jahr, monatIndex } = monatsGrenzen();
  return `${jahr}-${String(monatIndex + 1).padStart(2, "0")}`;
};
