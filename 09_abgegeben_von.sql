-- Merkt sich, wer eine Lektion zuletzt abgegeben hat.
--
-- Bisher steht in lektion_status nur der AKTUELLE Ist-Lehrer. Gibt eine
-- Vertretung (z.B. Maja für Adonia) eine Stunde zurück und jemand anderes
-- übernimmt sie, ist danach nirgends mehr vermerkt, dass Maja sie hatte --
-- sie sieht die Stunde nicht mehr und erfährt nicht, wer übernommen hat.
--
-- Ein Trigger füllt abgegeben_von automatisch, sobald sich der Ist-Lehrer
-- ändert. Keine Änderung an den Aufrufern nötig. Gilt nur für künftige
-- Wechsel, für frühere gibt es keine Aufzeichnung.

begin;

alter table lektion_status add column if not exists abgegeben_von text references lehrer(id);

create or replace function merke_abgegeben_von() returns trigger as $$
declare
  vorher text;
begin
  if tg_op = 'INSERT' then
    -- Erste Abweichung zu dieser Lektion: bisheriger Inhaber ist der
    -- Kurs-Lehrer (aus dem Kurs abgeleitet, noch keine Zeile vorhanden).
    select lehrer_id into vorher from kurse where id = new.kurs_id;
  else
    vorher := old.ist_lehrer;
    new.abgegeben_von := old.abgegeben_von;  -- bleibt erhalten, solange niemand wechselt
  end if;
  if vorher is not null and new.ist_lehrer is distinct from vorher then
    new.abgegeben_von := vorher;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists lektion_status_abgegeben on lektion_status;
create trigger lektion_status_abgegeben
  before insert or update on lektion_status
  for each row execute function merke_abgegeben_von();

commit;
