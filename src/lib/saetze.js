// Sucht den zu `datum` gültigen Satz aus der Satz-Historie (lehrer_saetze) —
// nie den aktuellen/live-Satz, damit vergangene (und abgeschlossene!)
// Monate nicht rückwirkend neu berechnet werden, wenn sich ein Satz ändert.
//
// Liegt `datum` vor dem ältesten Historie-Eintrag einer Person (z.B. weil sie
// erst heute angelegt wurde, aber für eine schon leicht zurückliegende
// Lektion eingesprungen ist), wird ersatzweise der älteste bekannte Satz
// verwendet statt 0 — 0 würde fälschlich "unbezahlt" statt "kein Datenpunkt"
// bedeuten.
export function satzAmDatum(historie, lehrerId, datum, feld) {
  let bester = null;
  let fruehester = null;
  for (const h of historie) {
    if (h.lehrer_id !== lehrerId) continue;
    if (!fruehester || h.gueltig_von < fruehester.gueltig_von) fruehester = h;
    if (h.gueltig_von > datum) continue;
    if (!bester || h.gueltig_von > bester.gueltig_von) bester = h;
  }
  const treffer = bester || fruehester;
  return treffer ? treffer[feld] : 0;
}
