-- Erweiterung Anlässe:
--  1) Mehrere Lehrpersonen pro Anlass, jede mit eigenem Betrag (zusätzlich
--     zur bisherigen Haupt-Person in anlaesse.lehrer_id/pauschale, die
--     weiterhin wie gehabt "offen"/Selbst-Eintragung steuert). Reine
--     Admin-/Anlass-Verwalter-Zuteilung, kein Self-Service für diese
--     Zusatzplätze.
--  2) Haken, ob ein offener Anlass bei "Offene Stunden" sichtbar sein soll.

begin;

alter table anlaesse add column if not exists offen_sichtbar boolean not null default true;

create table if not exists anlass_teilnehmer (
  id         text primary key,
  anlass_id  text not null references anlaesse(id) on delete cascade,
  lehrer_id  text not null references lehrer(id),
  betrag     numeric(8,2) not null default 0,
  unique (anlass_id, lehrer_id)
);

alter table anlass_teilnehmer enable row level security;

drop policy if exists lesen on anlass_teilnehmer;
create policy lesen on anlass_teilnehmer for select to authenticated
  using (darf_lohn() or darf_anlaesse() or lehrer_id = meine_lehrer_id());

drop policy if exists verwalten on anlass_teilnehmer;
create policy verwalten on anlass_teilnehmer for all to authenticated
  using (darf_anlaesse())
  with check (darf_anlaesse());

create index if not exists anlass_teilnehmer_anlass_idx on anlass_teilnehmer (anlass_id);
create index if not exists anlass_teilnehmer_lehrer_idx on anlass_teilnehmer (lehrer_id);

-- v_anlaesse_ohne_betrag neu erstellen, damit offen_sichtbar auch für
-- reine r_lehrer-Personen (ohne Zugriff auf die Basistabelle) sichtbar ist.
create or replace view v_anlaesse_ohne_betrag as
  select id, datum, zeit, titel, standort_code, typ, lehrer_id, status, offen_sichtbar from anlaesse;
grant select on v_anlaesse_ohne_betrag to authenticated;

commit;
