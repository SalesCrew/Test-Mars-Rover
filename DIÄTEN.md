# Diäten (Reisekostenberechnung)

Nach Kollektivvertrag Wien — Angestellte

---

## Grundlage

Taggeld entschädigt den persönlichen Mehraufwand für Verpflegung bei Dienstreisen außerhalb des Dienstortes.

**Berechnungsgrundlage:**
- Zählt: Gesamte ununterbrochene Abwesenheit **inkl. Fahrzeit**
- Zählt nicht: Mittagspause wird **abgezogen**

---

## Taggeld-Staffelung (pro Tag)

| Abwesenheit         | Betrag                                          |
|---------------------|-------------------------------------------------|
| Unter 6 Stunden     | € 0,00                                          |
| Genau 6 Stunden     | € 9,77                                          |
| Über 6 Stunden      | € 9,77 + € 4,03 je volle Stunde über der 6. Std |
| Maximum pro Tag     | € 31,77                                         |

**Beispiele:**

| Abwesenheit | Berechnung                        | Taggeld  |
|-------------|-----------------------------------|----------|
| 5h 59min    | unter 6h                          | € 0,00   |
| 6h          | Basis                             | € 9,77   |
| 7h          | 9,77 + 1 × 4,03                   | € 13,80  |
| 8h          | 9,77 + 2 × 4,03                   | € 17,83  |
| 9h          | 9,77 + 3 × 4,03                   | € 21,86  |
| 10h         | 9,77 + 4 × 4,03                   | € 25,89  |
| 11h         | 9,77 + 5 × 4,03                   | € 29,92  |
| ≥ 12h       | 9,77 + 6 × 4,03 = 33,95 → capped  | € 31,77  |

Das Maximum von € 31,77 wird ab 12h Abwesenheit erreicht (6 volle Stunden über der 6. = 6 × 4,03 = 24,18 + 9,77 = 33,95 → gedeckelt auf 31,77).

---

## Steuerfreier Anteil / Steuerpflichtiger Überschuss

Die gesetzliche Steuerfreigrenze für Tagesdiäten liegt bei **€ 30,00 pro Tag**.

| Taggeld       | Steuerfrei | Steuerpflichtig |
|---------------|------------|-----------------|
| ≤ € 30,00     | voll       | € 0,00          |
| € 30,01–31,77 | € 30,00    | Differenz (max. **€ 1,77**) |

**Praktisch:** Da das gesetzliche Maximum € 31,77 ist, beträgt der maximal steuerpflichtige Anteil pro Tag **€ 1,77**.

> **Nächtigungsgeld** (max. € 39,58): Auch hier gilt die € 30,00-Freigrenze — der überschreitende Betrag wäre steuerpflichtig. Da Nächtigungsgeld aber nicht im System erfasst wird, ist das nur für manuelle Berechnungen relevant.

---

## Nächtigungsgeld

Selten anwendbar — wird separat berechnet, nicht im System erfasst.

Gilt nur wenn:
- Abwesenheit > 11 Stunden **und**
- Übernachtung außer Haus erforderlich

Sondertarife für Hin-/Rückreisetag:
- Abreise vom Dienstort **vor 12 Uhr** → € 39,58
- Abreise vom Dienstort **nach 12 Uhr** → € 23,30
- Rückreise Ankunft **vor 17 Uhr** → € 23,30
- Rückreise Ankunft **nach 17 Uhr** → € 39,58

---

## Kategorien-Übersicht (ZE-Tool)

Alle Zeiterfassungs-Kategorien und ob sie Diäten auslösen:

| Kategorie             | Diäten: ja | Diäten: nein | Anmerkung                                              |
|-----------------------|:----------:|:------------:|--------------------------------------------------------|
| Marktbesuch           | ✓          |              |                                                        |
| Sonderaufgabe         | ✓          |              |                                                        |
| Arztbesuch            |            | ✓            |                                                        |
| Werkstatt/Autoreinigung | ✓        |              |                                                        |
| Homeoffice            |            | ✓            |                                                        |
| Schulung/Meeting      | (bedingt)  | (bedingt)    | Nur wenn Ort = **Auto** → zählt; Büro/Homeoffice → nein |
| Lager                 | ✓          |              |                                                        |
| Hotel-Übernachtung    | ✓          |              |                                                        |
| Dienstreise           | ✓          |              |                                                        |
| Unterbrechung         |            | ✓            |                                                        |
| Heimfahrt             | ✓          |              |                                                        |

### Schulung — Sonderregel

Beim Einreichen einer Schulung muss der GL einen Ort auswählen (`Auto`, `Büro`, `Homeoffice`):

- **Auto** (unterwegs/auswärts) → zählt **für Diäten**
- **Büro** → zählt **nicht** für Diäten (kein Aufenthalt außerhalb des Dienstortes)
- **Homeoffice** → zählt **nicht** für Diäten (kein Aufenthalt außerhalb des Dienstortes)

Das Ort-Feld (`schulung_ort`) ist in `fb_zusatz_zeiterfassung` gespeichert und muss bei der Diäten-Berechnung ausgewertet werden.

---



GL-Einträge in **ZusatzZeiterfassung** mit `reason = 'dienstreise'`:
- Felder: `zeit_von` (HH:MM), `zeit_bis` (HH:MM), `entry_date`
- Dauer = zeit_bis − zeit_von (Mittagspause noch nicht automatisch abgezogen)
- Tabelle: `fb_zusatz_zeiterfassung`

---

## Offene Fragen / TODO

- [x] Wie wird die Mittagspause erfasst / abgezogen? -> zählt nicht, wird ignoriert
- [x] Ab welchem Datum soll die Berechnung starten? -> immer (kein Startdatum)
- [x] Ausgabe: -> Excel Export pro GL
- [x] Nächtigungsgeld: -> nein, zu selten, wird manuell gemacht

---

## Berechnungsplan (Code-Logik)

### Datenbasis

Für jeden GL werden Einträge aus zwei Tabellen zusammengeführt:

**1. `fb_zeiterfassung_submissions`** (Marktbesuche + Sonderaufgaben + Marktbesuch via Zusatz)
- Felder: `gebietsleiter_id`, `created_at` (→ Datum), `start_time` (HH:MM), `end_time` (HH:MM), `reason`
- Zählt immer für Diäten (alle reasons in dieser Tabelle sind außer Haus)

**2. `fb_zusatz_zeiterfassung`** (Zusatzeinträge)
- Felder: `gebietsleiter_id`, `entry_date`, `zeit_von` (HH:MM), `zeit_bis` (HH:MM), `reason`, `schulung_ort`
- Nur folgende `reason`-Werte zählen für Diäten:
  - `marktbesuch`, `sonderaufgabe`, `werkstatt`, `lager`, `hotel`, `dienstreise`, `heimfahrt`
  - `schulung` **nur wenn** `schulung_ort = 'auto'`
  - Ausgeschlossen: `arztbesuch`, `homeoffice`, `büro`, `unterbrechung`
  - `schulung` mit `schulung_ort = 'büro'` oder `'homeoffice'` → ausgeschlossen

**3. `fb_day_tracking`** (Anfahrt / Heimfahrt via Tag-Start/Ende)
- Felder: `gebietsleiter_id`, `date`, `day_start_time` (HH:MM), `day_end_time` (HH:MM)
- Anfahrt = `day_start_time` bis erster Marktbesuch → zählt für Diäten
- Heimfahrt = letzter Marktbesuch bis `day_end_time` → zählt für Diäten
- Diese sind bereits implizit in der Gesamtdauer des Tages enthalten wenn man vom `day_start_time` bis `day_end_time` rechnet

---

### Schritt 1 — Einträge pro Tag gruppieren

```
für jeden GL:
  alle relevanten Einträge (aus beiden Tabellen) nach entry_date gruppieren
  → Map<date, Eintrag[]>
```

---

### Schritt 2 — Tagesabwesenheit berechnen

Für jeden Tag mit mindestens einem relevanten Eintrag:

```
falls day_tracking vorhanden (day_start_time + day_end_time):
  frühester_start = day_start_time
  spätestes_ende  = day_end_time

sonst:
  frühester_start = MIN(start_time aller Einträge des Tages)
  spätestes_ende  = MAX(end_time aller Einträge des Tages)

gesamtminuten = zeitDifferenzInMinuten(frühester_start, spätestes_ende)

// Mittagspause wird NICHT abgezogen (Entscheidung: zählt nicht = Pause zählt mit)
abwesenheitsminuten = gesamtminuten
```

---

### Schritt 3 — Taggeld berechnen

```
function berechneDiaet(abwesenheitsminuten):
  stunden = abwesenheitsminuten / 60  // float

  if stunden < 6:
    return 0.00

  if stunden == 6:
    return 9.77

  volleStundenUeber6 = floor(stunden - 6)  // nur volle Stunden zählen
  betrag = 9.77 + (volleStundenUeber6 × 4.03)

  return min(betrag, 31.77)  // Cap bei 31,77
```

---

### Schritt 4 — Steueraufteilung

```
function berechneSteuern(diaet):
  steuerfrei     = min(diaet, 30.00)
  steuerpflichtig = max(0, diaet - 30.00)  // max. 1,77
  return { steuerfrei, steuerpflichtig }
```

---

### Schritt 5 — Monat aggregieren

```
für jeden GL, für jeden Monat im Zeitraum:
  tage = alle Tage mit Diäten-Einträgen in diesem Monat
  für jeden Tag:
    diaet = berechneDiaet(abwesenheitsminuten[tag])
    { steuerfrei, steuerpflichtig } = berechneSteuern(diaet)

  monatsTotal_diaet          = sum(diaet aller Tage)
  monatsTotal_steuerfrei     = sum(steuerfrei aller Tage)
  monatsTotal_steuerpflichtig = sum(steuerpflichtig aller Tage)
```

---

### Schritt 6 — Output pro Zeile (Excel)

Eine Zeile = ein Tag eines GL (Details werden später mit dem Excel-Format definiert).

Felder die berechnet werden müssen:
- GL Name
- Datum
- Wochentag
- Frühester Start / Spätestes Ende
- Gesamtdauer (HH:MM)
- Berechnete Diät (€)
- Davon steuerfrei (€)
- Davon steuerpflichtig (€)
- Eintragstypen des Tages (welche Kategorien waren aktiv)

→ **Excel-Format wird separat definiert.**

---

## Excel-Output Plan (basierend auf Referenz-Excel 02_2026_Diäten_Unterkreuter Dominik.xlsx)

### Dateistruktur

- **1 Datei pro GL pro Export-Zeitraum**
- Dateiname: `MM_YYYY_Diäten_[Vorname] [Nachname].xlsx`
- **1 Sheet**: `Diätendokumentation`

---

### Sheet-Aufbau (Zeile für Zeile)

#### Block 1 — Header (Zeilen 1–9)

| Zeile | Spalte A                | Spalte C / H                                         |
|-------|-------------------------|------------------------------------------------------|
| 1     | "Diäten Dokumentation"  | —                                                    |
| 3     | "Name"                  | `GL Vorname + Nachname` / Spalte H: `GL Adresse Zeile 1` |
| 4     | —                       | Spalte H: `GL PLZ + Ort`                             |
| 5     | "Abrechnungszeitraum"   | Erster Tag des Exportmonats (als Excel-Datum)        |
| 7     | "Firma"                 | "Merchandising - Institut für Verkaufsförderung"     |
| 9     | —                       | "Bitte Legende unterhalb der Abrechnung beachten!"   |

> GL-Adresse kommt aus der `gebietsleiter`-Tabelle (Felder werden noch bestätigt).

---

#### Block 2 — Spalten-Header (Zeilen 11–12)

Fixe Header-Zeilen, exakt wie im Referenz-Excel:

| Spalte | Feldname (Zeile 11)                   | Feldname (Zeile 12)         |
|--------|---------------------------------------|-----------------------------|
| A      | Datum                                 | Datum                       |
| B      | Dienstreise: Beginn                   | Uhrzeit                     |
| C      | Dienstreise: Ende                     | Uhrzeit                     |
| D      | Pause                                 | Zeit                        |
| E      | Dienstreise Dauer                     | Zeit                        |
| F      | Ort (genaue Adresse angeben)          | —                           |
| G      | Kunde und/oder Grund                  | —                           |
| H      | bezahlte Nächtigung?                  | ":H=Hinfahrt / M=Mitteltag / R=Rückfahrt" |
| I      | Taggeld Inland                        | —                           |
| J      | Taggeld Inland steuerfrei             | —                           |
| K      | Taggeld Inland zu Versteuern          | —                           |
| L      | KM-Stand Beginn                       | —                           |
| M      | KM-Stand Ende                         | —                           |
| N      | erstattungsfähige Nächtigung? (ohne Beleg) | "X"                    |
| O      | pauschales Nächtigungsgeld Inland     | —                           |
| P      | Abwesenheit in h                      | —                           |

---

#### Block 3 — Datenzeilen (eine Zeile pro Kalendertag des Monats, Zeilen 13–43)

Für **jeden Kalendertag 1–31** des Monats eine Zeile.
- Hat der GL an diesem Tag relevante Einträge → Felder befüllen
- Hat der GL keinen Eintrag → leere Zeile (nur Datum)

**Feldberechnung pro Zeile:**

```
A: Datum         = Kalendertag (Excel-Datumsformat, wird als DD.MM.YYYY angezeigt)

B: Beginn        = früheste start_time des Tages
                   Quelle: fb_day_tracking.day_start_time (wenn vorhanden)
                   Fallback: MIN(start_time) aus fb_zeiterfassung_submissions für diesen Tag
                   Format: Excel-Dezimalbruch (HH:MM / 24 → z.B. 07:00 = 0.2917)

C: Ende          = späteste end_time des Tages
                   Quelle: fb_day_tracking.day_end_time (wenn vorhanden)
                   Fallback: MAX(end_time) aus fb_zeiterfassung_submissions für diesen Tag
                   Format: Excel-Dezimalbruch

D: Pause         = 0.020833 (= 30 Minuten fix)
                   NUR befüllen wenn Abwesenheit > 6h (sonst kein Taggeld, Pause irrelevant)
                   (Entscheidung: 30min Fixpauschale, wird nicht aus DB gelesen)

E: Dauer         = C - B - D  (Excel-Dezimalbruch, als Zeitspanne formatiert)

F: Ort           = Liste aller Märkte des Tages, kommagetrennt
                   Quelle: markets.name + markets.address + markets.city
                   aus fb_zeiterfassung_submissions + fb_zusatz_zeiterfassung (mit market_id)

G: Grund         = kommagetrennte Liste der reasons des Tages
                   (z.B. "Marktbesuch, Sonderaufgabe")

H: Nächtigung    = leer (wir verfolgen keine Übernachtungen)

I: Taggeld       = berechneDiaet(abwesenheitsminuten)  [siehe Schritt 3 oben]

J: Steuerfrei    = min(Taggeld, 30.00)

K: Steuerpflichtig = max(0, Taggeld - 30.00)  → "-" anzeigen wenn 0

L: KM-Stand Beginn = fb_day_tracking.km_stand_start (wenn vorhanden, sonst leer)

M: KM-Stand Ende   = fb_day_tracking.km_stand_end (wenn vorhanden, sonst leer)

N: erstattungsf. Nächtigung = leer

O: Nächtigungsgeld = 0 (leer lassen wenn 0)

P: Abwesenheit in h = (C - B - D) × 24  → als Dezimalzahl, 2 Nachkommastellen
```

---

#### Block 4 — Summenzeile (Zeile 44)

```
A:  "Gesamt"
I:  SUM(Taggeld aller Tage)
J:  SUM(Steuerfrei aller Tage)
K:  SUM(Steuerpflichtig aller Tage)
O:  SUM(Nächtigungsgeld) = 0
```

---

#### Block 5 — Footer-Zusammenfassung (Zeilen 46–49)

```
Zeile 46: "Gesamtsumme Taggelder Inland:"                                | Spalte O: SUM(Taggeld)
Zeile 47: "Gesamtsumme der pauschalen Nächtigungsgelder:"               | Spalte O: 0
Zeile 49: "Auszahlungsbetrag für Verpflegungsmehraufwendungen..."        | Spalte O: SUM(Taggeld)
```

---

#### Block 6 — Signatur + Datum (Zeilen 51–52)

```
Zeile 51: Letzter Tag des Monats (Datum)
Zeile 52: "Datum" | "Unterschrift Mitarbeiter" | "Stempel/Unterschrift Zeichner"
```

---

#### Block 7 — Legende (Zeilen 55–61, fix)

Fester Text exakt wie im Referenz-Excel (Taggeld-Regeln, Nächtigungsgeld-Regeln).

---

### Daten-Quellen Zusammenfassung

| Feld                | Tabelle / Quelle                                        |
|---------------------|---------------------------------------------------------|
| GL Name             | `gebietsleiter.first_name + last_name`                  |
| GL Adresse          | `gebietsleiter` (Adress-Felder, noch zu bestätigen)     |
| Tag-Beginn / Ende   | `fb_day_tracking.day_start_time / day_end_time`         |
| Fallback Zeiten     | `fb_zeiterfassung_submissions.start_time / end_time`    |
| Märkte des Tages    | `markets.name/address/city` via `fb_zeiterfassung_submissions.market_id` |
| Zusatzeinträge      | `fb_zusatz_zeiterfassung` (gefiltert nach Diäten-Kategorien) |
| KM-Stand            | `fb_day_tracking.km_stand_start / km_stand_end`         |

---

### Export-Trigger

- Button "Diäten" im `ZeiterfassungExportModal` (bereits angelegt, disabled "Coming Soon")
- Modal fragt: **Zeitraum** (Monat + Jahr) + optional **GL-Filter**
- Pro GL wird eine separate `.xlsx`-Datei generiert und als ZIP heruntergeladen (falls mehrere GLs)
