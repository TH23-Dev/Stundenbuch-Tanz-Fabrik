-- Zusätzlicher "Standort" für Anlässe, die keinem festen Tanz-Fabrik-Standort
-- zugeordnet werden können (z.B. Auftritt an einem externen Ort). Da
-- anlaesse.standort_code und kurse.standort_code beide auf standorte(code)
-- verweisen, genügt ein zusätzlicher Eintrag hier -- er erscheint dann
-- automatisch im bestehenden Standort-Dropdown, kein Code-Sonderfall nötig.
insert into standorte (code, name)
values ('extern', 'Extern')
on conflict (code) do nothing;
