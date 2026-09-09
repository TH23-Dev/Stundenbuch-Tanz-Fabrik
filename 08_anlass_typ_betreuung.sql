-- Neuer Anlass-Typ "Betreuung" zusätzlich zu Workshop/Camp/Auftritt.

begin;

alter table anlaesse drop constraint if exists anlaesse_typ_check;
alter table anlaesse add constraint anlaesse_typ_check
  check (typ in ('Workshop','Camp','Auftritt','Betreuung'));

commit;
