export const ANLASS_TYPEN = ["Workshop", "Camp", "Auftritt"];

export const anlassVergangen = (a) => new Date(a.datum + "T23:59") < new Date();
export const anlassUnbest = (a) => a.status === "geplant" && anlassVergangen(a) && !!a.lehrer_id;
// Regel 6 (korrigiert): nur bestätigte ("gehalten") Anlässe fliessen in den Lohn.
export const anlassRelevant = (a) => a.status === "gehalten" && !!a.lehrer_id;
