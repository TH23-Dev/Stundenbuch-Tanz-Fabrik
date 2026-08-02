// Sucht den zu `datum` gültigen Satz aus der Satz-Historie (lehrer_saetze) —
// nie den aktuellen/live-Satz, damit vergangene (und abgeschlossene!)
// Monate nicht rückwirkend neu berechnet werden, wenn sich ein Satz ändert.
export function satzAmDatum(historie, lehrerId, datum, feld) {
  let bester = null;
  for (const h of historie) {
    if (h.lehrer_id !== lehrerId || h.gueltig_von > datum) continue;
    if (!bester || h.gueltig_von > bester.gueltig_von) bester = h;
  }
  return bester ? bester[feld] : 0;
}
