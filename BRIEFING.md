# Projekt: Stundenbuch Tanz-Fabrik

Dieses Dokument ist der Auftrag. Es liegt im Projektordner, damit du jederzeit
nachlesen kannst, was gebaut wird und warum.

## Ziel

Eine Web-App (PWA), mit der 36 Tanzlehrpersonen an 8 Standorten ihre gehaltenen
Lektionen bestätigen und das Backoffice daraus die Monatsabrechnung erstellt.
Ersetzt ein Excel-File, das heute monatlich von jeder Lehrperson ausgefüllt wird.

## Ausgangslage im Ordner

- `prototyp.jsx` — lauffähiger Prototyp mit der vollständigen Fachlogik.
  **Das ist die Spezifikation.** Fachlogik nicht neu erfinden, sondern übernehmen.
- `01_schema.sql` — Datenbankschema, bereits in Supabase eingespielt.
- `02_stammdaten.sql` — 36 Lehrpersonen, 103 Kurse, 8 Standorte, bereits importiert.
- `03_lehrer_saetze.sql` — Satz-Historie (siehe Regel 10), bereits in Supabase eingespielt.

## Rollen (kombinierbar, eine Person kann mehrere haben)

- **r_lehrer:** eigene Stunden, offene Stunden, eigener Lohn.
- **r_anlaesse:** Anlässe anlegen und zuteilen, **inklusive der Pauschale des
  jeweils selbst angelegten Anlasses.** Sieht sonst keine Löhne, keine Sätze,
  keine Pauschalen ausser den eigenen (als Lehrperson) und den selbst
  erfassten Anlass-Pauschalen. (Korrigiert: ursprünglich durfte r_anlaesse
  keine Pauschalen setzen — das wurde bewusst geändert, siehe unten.)
- **r_lohn:** Abrechnung, Sätze, Pauschalen (aller Anlässe, nicht nur eigene),
  Zusatzpositionen, Export, Abschluss, Lektionen umverteilen/streichen.
- **r_admin:** zusätzlich Stammdaten (Kurse, Personen) und Rollenvergabe.

Reine Büro-Personen haben `r_lehrer = false` und erscheinen nicht in der
Stunden- oder Kurszuteilung. Der Zugriffsschutz sitzt in der Datenbank (RLS),
nicht nur im Frontend – Sätze und Pauschalen dürfen nicht über die API abfliessen.

**Nachträgliche Korrektur zu r_anlaesse/Pauschale:** Sowohl r_anlaesse als
auch r_lohn/r_admin dürfen die Pauschale eines Anlasses setzen — r_anlaesse
nur für die von ihr/ihm selbst angelegten bzw. verwalteten Anlässe, r_lohn/
r_admin für alle. Betrifft die Umsetzung in Etappe 6: die RLS-Leseregel
`lesen_anlass` auf `anlaesse` muss dafür auch für `darf_anlaesse()` freigegeben
werden (aktuell nur `darf_lohn()` oder eigene Zeile) — sonst kann eine
Anlass-Verwalterin die von ihr gesetzte Pauschale nicht einmal selbst sehen.

**Nachträgliche Korrektur zu r_lohn/Lektionen:** Die RLS-Schreibregel auf
`lektion_status` erlaubte ursprünglich nur `r_admin`, eine Lektion einer
anderen Person zuzuweisen oder als «ausgefallen» zu markieren (nötig für
«Ferienwoche streichen» und das Ist-Lehrer-Feld in Etappe 4). Wurde erweitert:
neu darf das auch reines `r_lohn` (nicht nur `r_admin`).

## Fachliche Regeln (nicht verhandelbar)

1. **Lektionen werden abgeleitet, nicht gespeichert.** Aus `kurse` (Wochentag,
   Zeit, gueltig_von/bis) ergibt sich für jeden Monat die Menge der Lektionen.
   Nur Abweichungen stehen in `lektion_status`.
2. **Lohnstunden:** 55 Minuten = 1.0, 85 Minuten = 1.5.
3. **Regulärer Ansatz:** `kurse.ansatz` falls gesetzt, sonst `lehrer.satz`.
   Zwei reguläre Sätze einer Person werden über den Kurs-Ansatz abgebildet,
   nicht über zwei Personeneinträge.
4. **Vertretung** = `ist_lehrer <> kurse.lehrer_id`. Wird automatisch erkannt.
   Abgerechnet mit dem **persönlichen** `vertretungssatz` der einspringenden
   Person, nicht mit einem globalen Satz.
5. **Ausgefallene Lektionen und Anlässe werden nie vergütet.**
6. **Weiche Bestätigung:** Nur bestätigte («gehalten») Lektionen werden
   ausbezahlt. Eine vergangene, unbestätigte Lektion zählt **nicht** für den
   Lohn, wird aber als «unbestätigt» ausgewiesen, damit sie nicht vergessen
   geht. Nachträgliches Bestätigen ist jederzeit möglich, solange der Monat
   offen ist — die Lektion fliesst dann rückwirkend in den Lohn dieses
   Monats ein. (Achtung: `prototyp.jsx` zählt unbestätigte Lektionen
   fälschlich mit — das ist bei der Umsetzung zu korrigieren, nicht zu
   übernehmen.)
   **«Vergangen» heisst hier nicht Tagesende:** Der «Gehalten»-Knopf
   erscheint ab 30 Minuten vor dem rechnerischen Kursende (Startzeit +
   Dauer), nicht erst ab Mitternacht — damit Lehrpersonen direkt nach der
   eigenen Stunde und vor dem Verlassen der Lokalität bestätigen können,
   auch wenn sie ein paar Minuten früher fertig sind.
7. **Bilateraler Tausch:** Auch eine bereits vergangene Stunde kann freigegeben
   und neu zugeteilt werden, solange der Monat offen ist («Doch nicht gegeben»).
8. **Abrechnungsperiode:** Kalendermonat. Der Abschluss erfolgt manuell durch
   eine Person mit `r_lohn` (Backoffice), nicht automatisch. Abgeschlossene
   Monate sind gesperrt.
9. **Kursänderungen wirken nie rückwirkend.** Lektionen werden live aus
   `kurse` abgeleitet — ändert man `lehrer_id`, `ansatz`, `dauer_min`,
   `wochentag`, `zeit`, `standort_code` oder `gueltig_von` eines bestehenden
   Kurses direkt, würde das auch bereits vergangene Lektionen dieses Kurses
   im offenen Monat verändern (u.a. rückwirkend andere Lohnstunden, da
   55′/85′ die Lohnstunden bestimmen). Das ist nicht erlaubt — diese Felder
   sind nach dem Anlegen eines Kurses **nicht mehr editierbar**. Ein Wechsel
   läuft stattdessen über **Kurs-Versionierung**: den bestehenden Kurs mit
   `gueltig_bis` = Stichtag abschliessen und einen neuen Kurs mit
   `gueltig_von` = Folgetag und den neuen Werten anlegen. So bleiben
   vergangene Lektionen am alten Kurs (und damit an den alten Werten)
   hängen, künftige laufen über den neuen Kurs. Einzige direkt änderbare
   Aktion an einem bestehenden Kurs ist «Beenden» (setzt `gueltig_bis`).
10. **Satz-Änderungen wirken nie rückwirkend.** Wie Kurs-Ansätze werden auch
    `lehrer.satz` und `lehrer.vertretungssatz` sonst live nachgeschlagen —
    eine Lohnerhöhung hätte sonst auch bereits vergangene, sogar
    **abgeschlossene** Monate rückwirkend neu berechnet, da der
    Monatsabschluss nur `lektion_status` sperrt, nicht die Sätze selbst.
    Deshalb gibt es `lehrer_saetze`: eine datierte Satz-Historie. Jede
    Lektion wird mit dem an ihrem Datum gültigen Satz abgerechnet, nicht mit
    dem aktuellen. Eine Satz-Änderung in der Personen-Verwaltung legt einen
    neuen Eintrag mit `gueltig_von` = heute an und gilt nur ab dann; `lehrer.
    satz`/`vertretungssatz` bleiben als «aktueller Satz» (Anzeige, Fallback)
    bestehen und werden dabei synchron nachgeführt.

## Rollen im Detail

Siehe Abschnitt «Rollen» oben. Wichtig für die Umsetzung: Der Schutz muss über
Row Level Security in Supabase erfolgen (Funktionen `darf_lohn()`,
`darf_anlaesse()`, `ist_admin()` sind im Schema definiert). Das Frontend blendet
Bereiche nur zusätzlich aus – es ist nicht die Sicherheitsschicht.

## Auftrag in Etappen

Bitte Etappe für Etappe, jeweils mit Rückfrage zur Abnahme.

### Etappe 1 — Gerüst und Login
Vite + React, Supabase-Client, Login per Magic Link (E-Mail). Nach dem Login
Rolle aus `lehrer` laden. Kein Passwort. Mobile zuerst.

### Etappe 2 — Lehrer-Ansicht
Lektionen des laufenden Monats aus `kurse` ableiten, `lektion_status`
darüberlegen. Bestätigen / austragen / doch übernehmen. Optimistisches Update.

### Etappe 3 — Offene Stunden
Alle offenen Lektionen, Übernahme mit einem Tap.

### Etappe 4 — Backoffice
Auswertung pro Lehrperson, Lektionsliste mit Filter, Ferienwoche streichen,
Zusatzpositionen, Excel-Export (SheetJS) mit den drei Blättern aus dem Prototyp.

### Etappe 5 — Stammdaten
Kurse und Lehrpersonen verwalten wie im Prototyp, mit zwei Abweichungen
gegenüber dem Prototyp wegen Regel 9/10:
- Kurse: bestehende Kurse sind bis auf «Beenden» nicht editierbar (Regel 9).
  Ein Wechsel läuft über Kurs-Versionierung («Kurs beenden» + neuen Kurs ab
  Folgetag anlegen).
- Personen: eine Satz-/Vertretungssatz-Änderung legt einen neuen Eintrag in
  `lehrer_saetze` an (gültig ab heute), statt `lehrer.satz` direkt zu
  überschreiben (Regel 10).

### Etappe 6 — Anlässe und Abwesenheit
Beide sind im Prototyp bereits umgesetzt, hier die Regeln:

**Abwesenheit von–bis:** Lehrperson oder Backoffice wählt einen Zeitraum. Alle
künftigen, nicht ausgefallenen Lektionen dieser Person im Zeitraum werden auf
einmal freigegeben (ist_lehrer = null) und erscheinen unter «Offene Stunden».

**Anlässe** (`anlaesse`): einmalige, datierte Termine mit Pauschale – Workshop,
Camp, Auftritt. Backoffice legt sie an, entweder direkt zugewiesen oder offen.
Offene Anlässe erscheinen bei den Lehrpersonen zum Eintragen. Nach Durchführung
bestätigt die eingetragene Person («Gehalten»). Ein bestätigter Anlass fliesst
automatisch als Zusatzposition in die Abrechnung – er wird nicht mehr von Hand
erfasst. Ausgefallene Anlässe werden nicht vergütet. Gleiche weiche
Bestätigungslogik wie bei Lektionen.

Damit sind Zusatzpositionen (`zusatzpositionen`) nur noch Spesen und Abzüge –
also Positionen, für die sich niemand «einträgt».

### Etappe 7 — PWA und Deployment
Manifest, Icons, Installierbarkeit auf iOS und Android. Deployment auf
Cloudflare Pages.

## Technische Leitplanken

- Kein serverseitiger Code ausser Supabase. Keine eigenen API-Server.
- Schweizer Formate: Datum `TT.MM.JJJJ`, Beträge `1'234.50`, Sprache Deutsch.
- Kein `service_role`-Key im Frontend. Nur der `anon`-Key, RLS macht den Rest.
- Erkläre bei jeder Etappe kurz, was du getan hast — der Auftraggeber ist kein
  Entwickler und muss die App in zwei Jahren noch warten können.
