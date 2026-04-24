# To-Do bis Montag

## Reihenfolge nach Codeflow

### 1) Fragebogen nur einmal ausfüllbar + sauberer Rückfall in normalen Besuchsflow
Im aktuellen Verhalten soll ein Fragebogen pro Marktbesuch nur ein einziges Mal ausfüllbar sein und danach aus der aktiven Liste verschwinden. Der Fix sollte auf Response-Status-Ebene greifen, damit ein bereits abgeschlossener Lauf nicht direkt wieder als aktiv angeboten wird. Gleichzeitig darf der normale Besuchsflow nicht blockiert werden, wenn kein weiterer aktiver Fragebogen mehr vorhanden ist. Wichtig ist ein eindeutiger Übergang von `in_progress` zu `completed`, inklusive sauberem Reload der aktiven Besuche. Zusätzlich sollte geprüft werden, ob Legacy-Constraints unbeabsichtigt ein Reopening auslösen.
> "Fragebogen 1 mal ausfüllbar dann weg nur normaler besuchsflow"

### 2) Fragebogen nachbearbeiten (Post-Completion Edit)
Es braucht eine klar definierte Nachbearbeitung, damit ein bereits ausgefüllter Fragebogen gezielt korrigiert werden kann. Dafür sollte entschieden werden, ob nur Admins nachbearbeiten dürfen oder auch GLs innerhalb eines Zeitfensters. Technisch muss verhindert werden, dass durch Nachbearbeitung doppelte Antwortläufe entstehen oder Historie überschrieben wird, ohne Nachvollziehbarkeit. Sinnvoll ist ein expliziter Status/Flag wie `editable_after_completion` oder ein separater Edit-Mode. Jeder Edit sollte mit `updated_by` und Zeitstempel auditierbar bleiben.
> "fragebogen nachbearbeiten"

### 3) Regeln speichern nicht zuverlässig / Regel-Engine allgemein stabilisieren
Der Fehler deutet darauf hin, dass Regeldefinitionen zwar im UI gesetzt werden, aber nicht konsistent persistiert oder wieder geladen werden. Der Fix sollte zuerst das Datenmodell und die Serialisierung prüfen (z. B. JSON-Struktur, Null-Felder, Mapping zwischen Frontend und Backend). Danach muss die Auswertung der Regeln beim Rendern und Speichern reproduzierbar und deterministisch gemacht werden. Es sollte einen Validator geben, der ungültige oder unvollständige Regeln früh abfängt. Abschließend braucht es mindestens einen End-to-End-Test für Erstellen, Bearbeiten und Anwenden von Regeln.
> "fehler in fragebogen es speichert nicht wenn regel und regeln generell cooked"

### 4) Fehler beim Löschen (Fragebogen/abhängige Daten)
Beim Löschen scheint es aktuell einen inkonsistenten Zustand zu geben, vermutlich durch abhängige Datensätze oder unvollständige Cascade-Pfade. Der Fix sollte zuerst differenzieren, ob der Fehler bei Soft-Delete, Hard-Delete oder bei verknüpften Tabellen auftritt. Danach müssen Foreign-Key-Strategien und Backend-Delete-Flow aufeinander abgestimmt werden, damit es keine halben Löschzustände gibt. Wichtig ist auch eine klare Nutzer-Rückmeldung, warum ein Löschen ggf. blockiert ist. Idealerweise wird vorab geprüft, ob abhängige Einträge existieren, und dann ein sicherer Ablauf angeboten.
> "fehler beim löschen"

### 5) Foto-Frage: bei "Nein" muss Grund Pflichtfeld sein
Die Bedingung soll sicherstellen, dass bei einer negativen Fotoantwort ein verpflichtender Begründungstext erfasst wird. Der Fix sollte sowohl im Frontend (sofortige Validierung) als auch im Backend (harte Validierung) umgesetzt werden, damit keine Umgehung über API-Calls möglich ist. Die UX sollte klar zeigen, warum nicht weitergeklickt werden kann, bis das Grund-Feld befüllt ist. Falls es mehrere "Nein"-Varianten gibt, muss die Pflichtlogik auf alle relevanten Werte gemappt werden. Zusätzlich sollte gespeichert werden, dass der Grund kontextbezogen zur jeweiligen Fotoantwort gehört.
> "bei foto frage wenn nein dann grund feld als pflichtfeld"

### 6) PY-Export für Fragebogen: Quartal ergänzen
Im Python-Export fehlt aktuell die saubere Quartalslogik für periodische Auswertung. Der Fix sollte die Zeiträume eindeutig nach Quartalen aggregieren, inklusive Jahr-Übergängen (Q4 -> Q1). Dabei muss die gleiche Datengrundlage wie bei den bestehenden Exportkennzahlen genutzt werden, um Abweichungen zu vermeiden. Sinnvoll ist ein eigenes Quartalsfeld im Export-Tab, damit Filter und Charting konsistent funktionieren. Zusätzlich sollte geprüft werden, ob Zeitzone (Wien) die Periodenzuordnung beeinflusst.
> "bei fragebogen py export auch quartal"

### 7) Pagination für Vorbesteller
Die Vorbesteller-Liste zeigt vermutlich nicht alle Datensätze, weil die Abfrage an einem Default-Limit hängt. Der Fix sollte auf Backend-Seite vollständiges Paging in Batches (z. B. 1000er Blöcke) einführen und im Frontend korrekt zusammenführen. Wichtig ist eine stabile Sortierung, damit keine Duplikate oder Lücken zwischen Seiten entstehen. Zusätzlich sollte das UI bei großen Datenmengen weiterhin performant bleiben (lazy rendering / virtuelle Liste falls nötig). Ein kurzer Datenvollständigkeits-Check gegen DB-Count sollte den Fix absichern.
> "pagination auf vorbesteller"

### 8) Vorverkauf: neue Einträge ohne Produktwerte
Neue Vorverkaufseinträge scheinen ohne zugehörige Produktwerte angelegt zu werden, was auf Initialisierungs- oder Mapping-Fehler hindeutet. Der Fix sollte beim Anlegen eines Eintrags sofort die erwarteten Produktfelder defaulten oder verpflichtend mitgeben. Falls Produkte dynamisch geladen werden, muss sichergestellt werden, dass der Save erst nach erfolgreichem Laden möglich ist. Backend-seitig sollte eine Validierung verhindern, dass unvollständige Datensätze persistiert werden. Bestehende fehlerhafte Einträge brauchen eventuell ein Repair-Skript oder einen Fallback im UI.
> "vorverkauf neue eintrâge keine produkt werte"

### 9) Vorverkauf-Export: Umsatz auf 2 Spalten aufteilen
Der aktuelle Export kombiniert offenbar Werte, die fachlich in zwei getrennte Umsatzspalten gehören. Der Fix sollte die fachliche Definition der beiden Umsatzarten klar abbilden und die Exportstruktur entsprechend erweitern. Dabei muss sichergestellt werden, dass Summenformeln und Downstream-Reports nicht brechen. Sinnvoll ist eine rückwärtskompatible Benennung mit eindeutigen Spaltentiteln, damit Nutzer die Werte sofort verstehen. Vor Rollout sollte ein Vergleichsexport mit Altdaten gemacht werden.
> "vorverkauf export von zu umsatz aufteilen auf 2 spalten"

### 10) KW-Handling bei Wellen: Frames eingeben statt manuell
Aktuell scheint die KW-Erfassung zu manuell und fehleranfällig zu sein, besonders wenn mit Frames/Intervallen gearbeitet wird. Der Fix sollte eine Eingabemaske für KW-Frames anbieten (z. B. Start-KW bis End-KW) und daraus die Einzelwerte automatisch ableiten. Damit sinkt die Fehlerquote und wiederkehrende Eingaben werden deutlich schneller. Wichtig ist eine robuste Validierung für Jahreswechsel und ungültige Bereiche. Zusätzlich sollte die Speicherung so erfolgen, dass Reporting weiterhin auf eindeutige Wochenwerte zugreifen kann.
> "Kw habdling bei wellen so dass man frames eingeben kann und nicht händisch"

