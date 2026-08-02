import { iso, wochentag } from "./datum";

// Schreibt eine Abweichung zu einer abgeleiteten Lektion (lektion_status).
// kurs_id + datum sind der Primärschlüssel, daher immer upsert statt update —
// für Lektionen ohne bisherige Abweichung existiert noch keine Zeile.
export function speichereLektionStatus(supabase, { kursId, datum, istLehrer, status, bemerkung, geaendertVon }) {
  return supabase.from("lektion_status").upsert(
    {
      kurs_id: kursId,
      datum,
      ist_lehrer: istLehrer,
      status,
      bemerkung: bemerkung || null,
      geaendert_von: geaendertVon,
    },
    { onConflict: "kurs_id,datum" }
  );
}

// Ermittelt alle künftigen, nicht ausgefallenen Lektionen, die aktuell
// `lehrerId` zugeteilt sind (eigene Kurse + Vertretungen), innerhalb eines
// frei wählbaren Zeitraums — unabhängig von einem geladenen Monat. Für
// «Abwesenheit melden» (Regel unter Etappe 6).
export async function ladeAktuelleLektionen(supabase, lehrerId, von, bis) {
  const { data: eigeneKurse, error: kurseErr } = await supabase
    .from("kurse")
    .select("id,wochentag,lehrer_id,gueltig_von,gueltig_bis")
    .eq("lehrer_id", lehrerId);
  if (kurseErr) throw kurseErr;
  const eigeneIds = (eigeneKurse || []).map((k) => k.id);

  const [{ data: statusEigene, error: se1 }, { data: statusVertretung, error: se2 }] = await Promise.all([
    supabase
      .from("lektion_status")
      .select("kurs_id,datum,ist_lehrer,status")
      .in("kurs_id", eigeneIds.length ? eigeneIds : ["__keine__"])
      .gte("datum", von)
      .lte("datum", bis),
    supabase.from("lektion_status").select("kurs_id,datum,ist_lehrer,status").eq("ist_lehrer", lehrerId).gte("datum", von).lte("datum", bis),
  ]);
  if (se1 || se2) throw se1 || se2;

  const overridesMap = {};
  [...(statusEigene || []), ...(statusVertretung || [])].forEach((s) => (overridesMap[`${s.kurs_id}|${s.datum}`] = s));

  const heute = new Date();
  const ergebnisse = [];

  for (let d = new Date(von + "T12:00"); d <= new Date(bis + "T12:00"); d.setDate(d.getDate() + 1)) {
    const datum = iso(d);
    const wt = wochentag(d);
    (eigeneKurse || []).forEach((k) => {
      if (k.wochentag !== wt) return;
      if (k.gueltig_von > datum) return;
      if (k.gueltig_bis && k.gueltig_bis < datum) return;
      const o = overridesMap[`${k.id}|${datum}`];
      const istLehrer = o ? o.ist_lehrer : k.lehrer_id;
      const status = o?.status || "geplant";
      if (istLehrer === lehrerId && status !== "ausgefallen" && new Date(datum + "T23:59") >= heute) {
        ergebnisse.push({ kursId: k.id, datum, istLehrer });
      }
    });
  }

  (statusVertretung || []).forEach((s) => {
    if (eigeneIds.includes(s.kurs_id)) return; // schon über eigeneKurse erfasst
    if (s.status === "ausgefallen") return;
    if (new Date(s.datum + "T23:59") < heute) return;
    ergebnisse.push({ kursId: s.kurs_id, datum: s.datum, istLehrer: s.ist_lehrer });
  });

  return ergebnisse;
}

// Gegenstück zu ladeAktuelleLektionen: findet die eigenen Kurse von
// `lehrerId`, die aktuell offen sind (durch «Abwesenheit melden» oder «Kann
// nicht» freigegeben, noch von niemandem übernommen) — für «Abwesenheit
// rückgängig machen». Nur eigene Kurse, keine Vertretungen: welche fremde
// Vertretung diese Person wieder übernehmen soll, ist nicht eindeutig.
export async function ladeOffeneEigeneLektionen(supabase, lehrerId, von, bis) {
  const { data: eigeneKurse, error: kurseErr } = await supabase.from("kurse").select("id").eq("lehrer_id", lehrerId);
  if (kurseErr) throw kurseErr;
  const eigeneIds = (eigeneKurse || []).map((k) => k.id);
  if (eigeneIds.length === 0) return [];

  const { data, error } = await supabase
    .from("lektion_status")
    .select("kurs_id,datum")
    .in("kurs_id", eigeneIds)
    .is("ist_lehrer", null)
    .neq("status", "ausgefallen")
    .gte("datum", von)
    .lte("datum", bis);
  if (error) throw error;
  return data || [];
}
