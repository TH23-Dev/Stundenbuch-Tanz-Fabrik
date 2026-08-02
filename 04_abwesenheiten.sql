-- Historie für «Abwesenheit melden»: hält fest, wann für wen welcher
-- Zeitraum freigegeben wurde, damit sich das nachträglich nachschauen lässt
-- (z.B. bei einem Verdacht auf ein falsch eingegebenes Datum). Reine
-- Protokoll-Tabelle -- verändert nichts an lektion_status.
create table abwesenheiten (
  id               uuid primary key default gen_random_uuid(),
  lehrer_id        text not null references lehrer(id),
  von              date not null,
  bis              date not null,
  anzahl_stunden   int not null,
  erfasst_von      uuid references auth.users,
  erfasst_am       timestamptz not null default now()
);

alter table abwesenheiten enable row level security;

create policy lesen on abwesenheiten for select to authenticated
  using (darf_lohn() or lehrer_id = meine_lehrer_id());

create policy schreiben on abwesenheiten for insert to authenticated
  with check (darf_lohn() or lehrer_id = meine_lehrer_id());

create index on abwesenheiten (lehrer_id, erfasst_am);
