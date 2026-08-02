-- ============================================================
--  Satz-Historie: lehrer.satz/vertretungssatz wurden bisher live
--  nachgeschlagen, auch für vergangene (und abgeschlossene!) Monate.
--  Eine Lohnerhöhung hätte rückwirkend alle bisherigen Abrechnungen
--  verändert. Diese Tabelle hält die Sätze datiert fest, damit jede
--  Lektion mit dem an ihrem Datum gültigen Satz abgerechnet wird.
--  lehrer.satz/vertretungssatz bleiben als "aktueller Satz" bestehen
--  (Anzeige, Fallback) und werden bei jeder Änderung synchron
--  nachgeführt.
-- ============================================================

create table lehrer_saetze (
  id               uuid primary key default gen_random_uuid(),
  lehrer_id        text not null references lehrer(id),
  satz             numeric(6,2) not null,
  vertretungssatz  numeric(6,2) not null,
  gueltig_von      date not null,
  erfasst_am       timestamptz not null default now(),
  erfasst_von      uuid references auth.users,
  unique (lehrer_id, gueltig_von)
);

alter table lehrer_saetze enable row level security;

create policy lesen on lehrer_saetze for select to authenticated
  using (darf_lohn() or lehrer_id = meine_lehrer_id());

create policy admin on lehrer_saetze for all to authenticated
  using (ist_admin()) with check (ist_admin());

create index on lehrer_saetze (lehrer_id, gueltig_von);

-- Einmaliger Backfill: für jede bestehende Lehrperson einen ersten
-- Eintrag mit dem heutigen Satz anlegen, gültig ab dem frühesten
-- Kurs-Datum (01.01.2026) — sonst fehlt für alle bisherigen Lektionen
-- ein gültiger Satz.
insert into lehrer_saetze (lehrer_id, satz, vertretungssatz, gueltig_von)
select id, satz, vertretungssatz, date '2026-01-01'
from lehrer
on conflict (lehrer_id, gueltig_von) do nothing;
