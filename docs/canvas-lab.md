# Canvas Lab

Stand: 07.11.2026. Einstieg: **Labore → Canvas Lab** (`/#canvas-lab`).

## Modelle und Einsatz

| Modell | Wozu? | Anschluss an bestehende Labore |
| --- | --- | --- |
| Business Model Canvas | Neun Bausteine eines Geschäftsmodells zusammen betrachten | Strategiekurve und Datenanalyse zur Prüfung des Modells |
| Value Proposition Canvas | Angebot und Kundenprofil in sechs Feldern aufeinander beziehen | Persona-Designer und Customer Journey zur Kundenperspektive |
| Lean Canvas | Frühe Geschäftsideen auf Probleme, Lösung und wirtschaftliche Annahmen verdichten | Business Model Canvas für die weitere Ausarbeitung |
| Empathy Map | Aussagen, Gedanken, Verhalten, Gefühle und offene Forschungsfragen trennen | Personas und Journeys mit Beobachtungen fundieren |
| Experiment Canvas | Annahmen, Auswahl, Versuchsaufbau, Messung und Entscheidungsregel dokumentieren; Ergebnisse und Konsequenzen festhalten | Analysefehler-Labor für Interpretation und Stichprobenrisiken |

Die Modelle erhalten dieselbe Bedienlogik. Karten unterstützen Text, Feldzuordnung,
vier Farben, Priorität und die Typen **Annahme**, **Beleg** und **Entscheidung**.
Ein Beleg erfordert einen Quellen-/Beobachtungstext. Die Markierung allein ist keine
inhaltliche Validierung. Ein bearbeitbares synthetisches Beispiel ist optional.
Die Feldzählung zeigt nur die Befüllung, keine fachliche Qualitätsbewertung.

## Private und gemeinsame Arbeiten

Canvases sind eigenständige Arbeiten, keine Projektdateien oder Projektvorlagen.
Eine Person kann mehrere private Boards und mehrere Boards in ihren zugänglichen
Gruppen haben. Auch die Administration erhält über diese API keinen Zugriff auf
private Boards anderer Personen. Gruppenboards sind für Mitglieder mit offenem
Gruppenzugriff und entsprechender Laborfreigabe les- und bearbeitbar; die
Administration kann Gruppenboards verwalten. Abgelaufene Kurs-/Zugriffsfenster,
Mitgliedschaftsentzug, Konto- und Werkzeugfreigaben werden bei jeder Anfrage geprüft.

Beim Anlegen wird der Bereich ausdrücklich gewählt. Der Bereich eines bestehenden
Boards ist unveränderlich. **Mehr → Kopie anlegen / teilen** erstellt eine unabhängige
Kopie im gewählten privaten oder gemeinsamen Bereich. Ein privates Original wird
dabei nicht freigegeben. Kartenkennungen und Revisionen der Kopie sind unabhängig.
Erstellende Person und Administration können Gruppenboards umbenennen oder
archivieren; alle freigegebenen Mitglieder können Karten bearbeiten. Archivierung
ist reversibel und gilt für das ganze Board, bei Gruppen entsprechend für alle.

Die Administration steuert **Canvas Lab** über `canvas_lab` in Gruppenfreigaben und
Systemeinstellungen. Wie die anderen Labore benötigt es `files`. Die standalone
Modelle werden bewusst nicht als ungültige Projekt-Startinhalte angeboten.

## Synchronisation und Konflikte

- Ein offenes, sichtbares Board fragt etwa alle vier Sekunden den Serverstand ab.
  Die Bibliothek wird zusätzlich regelmäßig aktualisiert. Fokus, Online-Rückkehr
  und Sichtbarkeitswechsel stoßen einen Abgleich an. Beim Verlassen werden Timer
  und Listener entfernt; verspätete Antworten wechseln keine andere Arbeit aus.
- Karten werden mit **Übernehmen** unmittelbar gespeichert. Es gibt keinen zweiten
  globalen Speicherknopf und keine Übertragung unfertiger Texte während des Tippens.
- Schreiboperationen laufen in einer SQLite-Transaktion mit `BEGIN IMMEDIATE`.
  Jede Karte hat eine eigene Revision. Parallele Änderungen verschiedener Karten
  werden zusammengeführt, auch wenn die Boardrevision inzwischen weitergelaufen ist.
- Änderungen derselben Karte oder eine parallele Entfernung ergeben HTTP 409.
  Der Editor behält den Entwurf, zeigt den aktuellen Kartentext und bietet bewusstes
  Laden des aktuellen Standes oder die Vorbereitung einer zusätzlichen Karte an.
  Bestehende Änderungen werden dabei nicht automatisch überschrieben.
- Wiederholungen derselben Änderungskennung und identischen Anfrage sind idempotent,
  auch nach einer verlorenen Antwort. Die letzten 300 Kennungen je Board bleiben
  gespeichert. Entfernte Kartenkennungen bleiben zusätzlich als Tombstones erhalten,
  damit verspätete Neuanlagen gelöschte Karten nicht wiederherstellen.
- Ein bearbeiteter Entwurf wird im `sessionStorage` desselben Browser-Tabs unter
  Benutzer- und Canvaskennung gesichert. Nach Neuladen lässt er sich fortsetzen;
  außerdem ist ein Export direkt aus dem Editor möglich. Das ist kein vollständiger
  Offlinebetrieb: Tab-Schließen oder gelöschte Browserdaten können diese Sicherung
  entfernen. Die bestätigten Karten liegen dauerhaft auf dem eigenen Server.

## Autarker Betrieb, Export und Quellen

Frontend und Backend sind eigene Implementierungen in JavaScript, CSS, PHP und
SQLite. Keine neuen Pakete, externen Skripte, CDN-Ressourcen, eingebetteten Tools,
KI-Aufrufe oder externen Synchronisationsdienste. Quellenlinks sind normale Links;
sie werden nicht zum Betrieb des Boards geladen. Die Druckansicht ist eine
herunterladbare HTML-Datei mit eingebettetem CSS, ohne JavaScript und ohne externe
Ressourcen. JSON-Export/-Import erhält Modell und Karten; ein Import erstellt ein
neues Board mit ausdrücklich gewähltem Bereich. Besitzer-/Gruppenkennungen werden
nicht als Freigabeanweisung exportiert oder importiert. Importdaten werden erneut
serverseitig validiert.

Methodenquellen und Credits erscheinen unter dem Board und in Exporten:

- [Business Model Canvas, Strategyzer](https://www.strategyzer.com/library/the-business-model-canvas),
  Alexander Osterwalder / Yves Pigneur; [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/).
- [Value Proposition Canvas, Strategyzer AG](https://www.strategyzer.com/library/the-value-proposition-canvas).
  Der Betreiber hat die erforderliche Erlaubnis für die Softwareeinbindung am
  07.11.2026 bestätigt; die [Nutzungsbedingungen](https://www.strategyzer.com/legal/usage-of-our-tools)
  unterscheiden diese Einbindung von der allgemeinen methodischen Nutzung.
- [Lean Canvas, Ash Maurya / LEANSTACK](https://leanstack.s3.amazonaws.com/templates/lean-canvas-v4.pdf),
  adaptiert vom Business Model Canvas; CC BY-SA 3.0.
- Empathy Map und Experiment Canvas sind eigene Lernansichten, keine kopierten
  Poster oder fremden Softwarekomponenten.

Grenzen: 100 Boards je privatem Bereich bzw. Gruppe einschließlich Archiv,
300 Karten pro Board, 2.000 Zeichen Kartentext, 1.000 Zeichen Belegtext, 1 MB
Inhalt/Import. Die Kartenansicht verwendet auf kleinen Geräten einspaltige Felder;
eine Feldauswahl erlaubt konzentriertes Arbeiten. Breite Geräte zeigen beim BMC
und Lean Canvas die strukturierte Gesamtsicht, beim VPC Angebot und Kundenprofil
nebeneinander. Farbe ist immer durch Textstatus ergänzt.

## Prüfung

- `node tests/canvas-models.mjs`: alle fünf Frontend-Beispiele gegen PHP-Validierung;
  43 Prüfungen für private Isolation, Gruppenrechte, Kartenrevisionen, unabhängige
  Änderungen, Replay, Tombstones, Archivierung, Kopien, Feld-/Textgrenzen und Entzug.
- `python3 tests/canvas-http.py`: echte unabhängige HTTP-Sitzungen, CSRF-/Methodenschutz,
  parallele Kartenanlagen, konkurrierende Änderung derselben Karte (200/409),
  idempotente Wiederholung und unmittelbare Sperre nach Freigabenentzug.
- Beide Tests sind über bestehende CI-Einstiege eingebunden. Die vollständigen
  lokalen API- und Laborprüfungen liefen erfolgreich (597 bzw. 309 Checks, zusätzlich
  Passwort-/Studio- und Canvas-HTTP-Prüfungen).
- Browser: fünf Modelle in sechs Formaten (320×844, 390×844, 568×320, 768×844,
  1280×844, 1440×900), ohne horizontalen Seitenüberlauf. Anlage- und Karteneditor
  einschließlich Querformat mit sichtbarer Fußleiste geprüft. Live-Empfang einer
  zweiten Person, Konfliktvergleich und Kopiesicherung, Wiederaufnahme nach Reload,
  Belegpflicht, Verschiebung, private Kopie, Archiv/Wiederherstellung und
  JSON-Export/Import wurden durch die Oberfläche geprüft.

Die Browserprüfung erfolgte in lokalem Chromium mit synthetischen Daten. Native
Mobilgeräte, Safari/Firefox und Bildschirmtastaturen sind damit nicht pauschal
abgenommen. Automatische Verknüpfungen von Karten zu Personas, Journeys oder
Messdaten, versionierte Rückblicke und Kommentare sind mögliche spätere Erweiterungen.
