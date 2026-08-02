-- ============================================================
--  Stundenbuch Tanz-Fabrik – Datenbankschema für Supabase
--  In Supabase: SQL Editor -> New query -> einfügen -> Run
-- ============================================================

-- ---------- Stammdaten ----------

create table standorte (
  code  text primary key,
  name  text not null
);

create table lehrer (
  id        text primary key,
  vorname   text not null,
  nachname  text not null,
  kurzname  text,                       -- Name wie im alten Kursplan
  email     text unique,                -- für den Login
  user_id   uuid references auth.users, -- wird beim ersten Login verknüpft
  satz            numeric(6,2) not null default 0,  -- regulärer Ansatz pro Lohnstunde
  vertretungssatz numeric(6,2) not null default 60, -- persönlicher Satz bei Vertretung
  -- Rollen (kombinierbar): eine Person kann mehrere haben
  r_lehrer   boolean not null default true,   -- eigene Stunden, offene Stunden
  r_anlaesse boolean not null default false,  -- Anlässe verwalten (ohne Löhne)
  r_lohn     boolean not null default false,  -- Abrechnung, Sätze, Export
  r_admin    boolean not null default false,  -- Stammdaten, Rollen vergeben
  aktiv     boolean not null default true
);

create table kurse (
  id             text primary key,
  wochentag      int  not null check (wochentag between 1 and 7), -- 1 = Montag
  zeit           text not null,          -- 'HH:MM'
  dauer_min      int  not null,          -- 55 oder 85
  bezeichnung    text not null,
  standort_code  text not null references standorte(code),
  lehrer_id      text not null references lehrer(id),
  ansatz         numeric(6,2),           -- überschreibt lehrer.satz, sonst null
  gueltig_von    date not null,
  gueltig_bis    date                    -- null = läuft weiter
);

-- ---------- Bewegungsdaten ----------
-- Lektionen werden aus den Kursen abgeleitet, nicht gespeichert.
-- Hier steht nur, was vom Plan abweicht.

create table lektion_status (
  kurs_id      text not null references kurse(id),
  datum        date not null,
  ist_lehrer   text references lehrer(id),   -- null = offen, Vertretung gesucht
  status       text not null default 'geplant'
               check (status in ('geplant','gehalten','ausgefallen')),
  bemerkung    text,
  geaendert_von uuid references auth.users,
  geaendert_am  timestamptz not null default now(),
  primary key (kurs_id, datum)
);

-- Anlässe: einmalige, datierte Termine mit Pauschale (Workshop, Camp, Auftritt).
-- lehrer_id null = offen zum Eintragen. Bestätigte Anlässe fliessen in den Lohn.
create table anlaesse (
  id          text primary key,
  datum       date not null,
  zeit        text not null,
  titel       text not null,
  standort_code text not null references standorte(code),
  typ         text not null check (typ in ('Workshop','Camp','Auftritt')),
  pauschale   numeric(8,2) not null,
  lehrer_id   text references lehrer(id),   -- null = offen
  status      text not null default 'offen'
              check (status in ('offen','geplant','gehalten','ausgefallen')),
  geaendert_am timestamptz not null default now()
);

-- Zusatzpositionen: nur noch manuelle Spesen und Abzüge.
-- Workshop/Camp/Auftritt laufen über anlaesse.
create table zusatzpositionen (
  id         uuid primary key default gen_random_uuid(),
  lehrer_id  text not null references lehrer(id),
  monat      text not null,              -- 'YYYY-MM'
  typ        text not null check (typ in ('Spesen','Abzug')),
  betrag     numeric(8,2) not null,      -- Abzüge negativ
  bemerkung  text,
  erfasst_am timestamptz not null default now()
);

create table monatsabschluss (
  monat        text primary key,         -- 'YYYY-MM'
  abgeschlossen_am timestamptz not null default now(),
  abgeschlossen_von uuid references auth.users
);

create table einstellungen (
  schluessel text primary key,
  wert       text not null
);
insert into einstellungen (schluessel, wert) values ('vertretungssatz', '60');

-- ---------- Hilfsfunktionen ----------
-- Rollen der angemeldeten Person. Admin schliesst Lohn und Anlässe mit ein.

create or replace function hat_rolle(feld text) returns boolean as $$
  select coalesce((
    select case feld
      when 'lehrer'   then r_lehrer
      when 'anlaesse' then r_anlaesse or r_admin
      when 'lohn'     then r_lohn or r_admin
      when 'admin'    then r_admin
    end
    from lehrer where user_id = auth.uid()
  ), false);
$$ language sql security definer stable set search_path = public;

create or replace function ist_admin() returns boolean as $$
  select exists (select 1 from lehrer where user_id = auth.uid() and r_admin);
$$ language sql security definer stable set search_path = public;

create or replace function darf_lohn() returns boolean as $$
  select exists (select 1 from lehrer where user_id = auth.uid() and (r_lohn or r_admin));
$$ language sql security definer stable set search_path = public;

create or replace function darf_anlaesse() returns boolean as $$
  select exists (select 1 from lehrer where user_id = auth.uid() and (r_anlaesse or r_admin));
$$ language sql security definer stable set search_path = public;

create or replace function meine_lehrer_id() returns text as $$
  select id from lehrer where user_id = auth.uid();
$$ language sql security definer stable set search_path = public;

create or replace function monat_offen(d date) returns boolean as $$
  select not exists (select 1 from monatsabschluss where monat = to_char(d,'YYYY-MM'));
$$ language sql security definer stable set search_path = public;

-- ---------- Zugriffsschutz (Row Level Security) ----------

alter table standorte        enable row level security;
alter table lehrer           enable row level security;
alter table kurse            enable row level security;
alter table lektion_status   enable row level security;
alter table anlaesse         enable row level security;
alter table zusatzpositionen enable row level security;
alter table monatsabschluss  enable row level security;
alter table einstellungen    enable row level security;

-- Lesen: alle Angemeldeten (Lehrer müssen den Plan und offene Stunden sehen)
create policy lesen on standorte      for select to authenticated using (true);
create policy lesen on kurse          for select to authenticated using (true);
create policy lesen on lektion_status for select to authenticated using (true);
create policy lesen on einstellungen  for select to authenticated using (true);
create policy lesen on monatsabschluss for select to authenticated using (true);

-- Anlässe eintragen/absagen/bestätigen: Lehrperson für die eigene/offene Zeile,
-- Anlass-Verwalter und Admin für alle. Anlegen/Löschen nur Verwalter/Admin.
create policy anlass_update on anlaesse for update to authenticated
  using (
    monat_offen(datum) and (
      darf_anlaesse() or lehrer_id = meine_lehrer_id() or lehrer_id is null
    )
  )
  with check (
    monat_offen(datum) and (
      darf_anlaesse() or lehrer_id = meine_lehrer_id() or lehrer_id is null
    )
  );
create policy anlass_insert on anlaesse for insert to authenticated with check (darf_anlaesse());
create policy anlass_delete on anlaesse for delete to authenticated using (darf_anlaesse());

-- Lehrerliste: Namen sehen alle (für "wer vertritt wen"), aber die SÄTZE
-- (satz, vertretungssatz) und Rollenfelder dürfen nur Lohn/Admin sehen.
-- Deshalb im Frontend für Nicht-Lohn-Rollen die View v_personen_oeffentlich
-- verwenden; die Tabelle lehrer selbst ist nur für Lohn/Admin lesbar.
create policy lesen_lohn on lehrer for select to authenticated
  using (darf_lohn() or user_id = auth.uid());

create view v_personen_oeffentlich as
  select id, vorname, nachname, r_lehrer, aktiv from lehrer;
grant select on v_personen_oeffentlich to authenticated;

-- Anlässe: Termindaten sehen alle Berechtigten, die Pauschale nur Lohn/Admin,
-- Anlass-Verwalter (r_anlaesse setzt/sieht Pauschalen der von ihr verwalteten
-- Anlässe, Regel-Korrektur) oder die eingetragene Person selbst. Dazu eine
-- View ohne Pauschale für alle übrigen (offene Anlässe zum Eintragen).
create policy lesen_anlass on anlaesse for select to authenticated
  using (darf_lohn() or darf_anlaesse() or lehrer_id = meine_lehrer_id());

create view v_anlaesse_ohne_betrag as
  select id, datum, zeit, titel, standort_code, typ, lehrer_id, status from anlaesse;
grant select on v_anlaesse_ohne_betrag to authenticated;

-- Löhne/Zusatzpositionen: nur eigene sichtbar, Lohn/Admin sieht alles
create policy lesen on zusatzpositionen for select to authenticated
  using (darf_lohn() or lehrer_id = meine_lehrer_id());

-- Schreiben auf Lektionen:
--   Lohn/Admin dürfen alles (solange Monat offen) — u.a. Ferienwoche
--   streichen und Ist-Lehrer umverteilen (Etappe 4 Backoffice)
--   Lehrer darf: sich austragen, eine offene Stunde übernehmen,
--                die eigene Stunde als gehalten bestätigen
create policy schreiben on lektion_status for all to authenticated
  using (
    monat_offen(datum) and (
      darf_lohn()
      or ist_lehrer = meine_lehrer_id()
      or ist_lehrer is null
      or exists (select 1 from kurse k where k.id = kurs_id and k.lehrer_id = meine_lehrer_id())
    )
  )
  with check (
    monat_offen(datum) and (
      darf_lohn()
      or ist_lehrer = meine_lehrer_id()
      or ist_lehrer is null
    )
  );

-- Stammdaten und Zusatzpositionen ändern: nur Admin
-- Stammdaten (Kurse, Personen, Standorte, Rollen): nur Admin
create policy admin on kurse            for all to authenticated using (ist_admin()) with check (ist_admin());
create policy admin on lehrer           for all to authenticated using (ist_admin()) with check (ist_admin());
create policy admin on standorte        for all to authenticated using (ist_admin()) with check (ist_admin());
-- Abrechnung (Zusatzpositionen, Abschluss, Einstellungen): Lohn oder Admin
create policy lohn on zusatzpositionen for all to authenticated using (darf_lohn()) with check (darf_lohn());
create policy lohn on monatsabschluss  for all to authenticated using (darf_lohn()) with check (darf_lohn());
create policy lohn on einstellungen    for all to authenticated using (darf_lohn()) with check (darf_lohn());

-- ---------- Login-Verknüpfung ----------
-- Beim ersten Login wird der Auth-Benutzer über die E-Mail dem Lehrer zugeordnet.

create or replace function verknuepfe_lehrer() returns trigger as $$
begin
  update lehrer set user_id = new.id where lower(email) = lower(new.email) and user_id is null;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger auf_neuen_benutzer
  after insert on auth.users
  for each row execute function verknuepfe_lehrer();

-- ---------- Index ----------
create index on kurse (wochentag, gueltig_von, gueltig_bis);
create index on lektion_status (datum);
create index on anlaesse (datum);
create index on zusatzpositionen (monat, lehrer_id);
