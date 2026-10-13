-- Erweitert verknuepfe_mich() (siehe 06_selbst_verknuepfen.sql).
--
-- Die erste Version verknüpfte nur Zeilen ohne user_id. Hängt eine Person
-- aber schon an einem ALTEN Login-Konto (z.B. weil zuerst eine andere
-- E-Mail-Adresse benutzt und danach die gespeicherte Adresse geändert wurde),
-- blieb sie dauerhaft auf "keiner Lehrperson zugeordnet" hängen.
--
-- Jetzt wird neu verknüpft, sobald die E-Mail des eingeloggten Kontos mit der
-- gespeicherten übereinstimmt -- auch wenn vorher ein anderes Konto
-- verknüpft war. Sicher, weil nur einloggen kann, wer das Postfach der
-- gespeicherten Adresse kontrolliert.

create or replace function verknuepfe_mich() returns void as $$
begin
  update lehrer
  set user_id = auth.uid()
  where email is not null
    and lower(trim(email)) = lower(trim(coalesce(auth.jwt() ->> 'email', '')))
    and user_id is distinct from auth.uid();
end;
$$ language plpgsql security definer set search_path = public;
