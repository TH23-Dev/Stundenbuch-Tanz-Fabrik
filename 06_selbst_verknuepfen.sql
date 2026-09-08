-- Der bestehende Trigger verknuepfe_lehrer() verknüpft lehrer.user_id nur
-- EINMALIG, im Moment des allerersten Login-Versuchs (wenn Supabase Auth
-- den auth.users-Eintrag für diese E-Mail neu anlegt). Wird die E-Mail-
-- Adresse in den Stammdaten erst NACH einem ersten (fehlgeschlagenen)
-- Versuch eingetragen oder korrigiert, greift nichts mehr nach -- die
-- Person bleibt dauerhaft auf "keiner Lehrperson zugeordnet" hängen,
-- obwohl die Adresse inzwischen korrekt ist.
--
-- Diese Funktion holt die Verknüpfung bei jedem Login-Versuch nach: sie
-- läuft mit den Rechten des Funktions-Eigentümers (security definer),
-- rührt aber ganz bewusst nur das eigene, noch unverknüpfte user_id-Feld
-- an -- kein Zugriff auf andere Zeilen oder Felder.

create or replace function verknuepfe_mich() returns void as $$
begin
  update lehrer
  set user_id = auth.uid()
  where user_id is null
    and email is not null
    and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''));
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function verknuepfe_mich() to authenticated;
