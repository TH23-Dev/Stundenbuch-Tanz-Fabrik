export function protokolliereAbwesenheit(supabase, { lehrerId, von, bis, anzahlStunden, erfasstVon }) {
  return supabase.from("abwesenheiten").insert({
    lehrer_id: lehrerId,
    von,
    bis,
    anzahl_stunden: anzahlStunden,
    erfasst_von: erfasstVon,
  });
}
