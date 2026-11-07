# Erweiterte Projektlabore

Stand: 07.11.2026. Die neuen Bereiche ergänzen die vorhandenen Daten-, Graph- und KI-Werkstätten. Der gemeinsame Einstieg liegt unter **Labore** (`/#labs`). Die bestehenden Einstiege bleiben erreichbar. Die Projektlabore gehören zu einem persönlichen oder gemeinsamen Projekt. Das eigenständige [Canvas Lab](canvas-lab.md) ergänzt sie mit privaten und gruppenweiten Boards ohne Projektvoraussetzung.

## Bedienung und Speicherung

Jeder Bereich verwendet dieselbe Reihenfolge: Projekt auswählen, gespeicherte Arbeit öffnen oder mit **Neu** ein bearbeitbares Beispiel anlegen, bearbeiten und **Speichern**. **Mehr** enthält Umbenennen, JSON-Import/-Export, Neu laden und Löschen. Bei Versionskonflikten bleibt der lokale Entwurf erhalten. Neu laden und Arbeitswechsel schützen ungespeicherte Änderungen. Gespeicherte Arbeiten anderer Projektmitglieder werden bei sauberem Entwurf regelmäßig abgeglichen. Das ist keine gleichzeitige Zeichen-für-Zeichen-Bearbeitung der Labore.

Die Oberfläche verwendet vorhandene Entrosphere-Tokens, native beschriftete Formulare und einen gemeinsamen Projektkopf. Detailoptionen liegen in aufklappbaren Bereichen. Auf kleinen Bildschirmen werden Formulare einspaltig. Breite Diagramme, Journey-Phasen und Tabellen scrollen innerhalb ihrer eigenen Bereiche; Diagrammwerte stehen zusätzlich als Tabelle bereit.

## Canvas Lab

`/#canvas-lab` bietet Business Model Canvas, Value Proposition Canvas, Lean Canvas, Empathy Map und Experiment Canvas mit mehreren privaten oder gemeinsamen Boards. Kartenänderungen werden unmittelbar gespeichert und regelmäßig synchronisiert; getrennte Karten lassen sich parallel bearbeiten, Konflikte derselben Karte bleiben explizit. Die Details zu Sichtbarkeit, Wiederherstellung, Export und autarkem Betrieb stehen in [Canvas Lab](canvas-lab.md).

## Chatbot-Labor

`/#chat-lab` speichert fortlaufende Gespräche als Laborobjekte vom Typ `conversation`. Frage und Antwort werden als vollständiger Schritt gespeichert. Jeder Modellaufruf enthält die bisherigen Fragen und Antworten mit ihren tatsächlichen Rollen. OpenAI, Anthropic und Daimon verwenden die vorhandene Zugangsverwaltung; es gibt keine neuen API-Schlüssel oder Browserzugänge.

Ein Gespräch kann frei geführt oder an einen gespeicherten Projektassistenten gebunden werden. Änderungen eines verwendeten Assistenten erfordern ein neues Gespräch, damit Regeln und Wissen nicht unbemerkt mitten im Verlauf wechseln. Ein Modellwechsel wird durch die Modellangabe je Antwort nachvollziehbar.

Projektgespräche folgen den bestehenden Projekt- und Dozentenrechten. Gruppenprojekte sind keine privaten Einzelchats. Eine Nachricht darf 4.000 Zeichen enthalten; ein Gespräch höchstens 20 Antworten. Der an das Modell gesendete Nachrichtenkontext ist auf 30.000 Zeichen begrenzt. Bei Erreichen einer Grenze erscheint eine Aufforderung, ein neues Gespräch zu beginnen. Der Kontext wird nicht stillschweigend abgeschnitten.

Wiederholungen eines bereits gespeicherten Gesprächsschritts liefern dieselbe gespeicherte Antwort. Bei unklarer Netzwerkbestätigung bleibt die Anfragekennung für den erneuten Versuch erhalten. Ein bewusst neuer Auftrag kann weiterhin einen neuen Anbieteraufruf verursachen.

## Assistenten-Builder

`/#assistant-lab` bündelt Kurzbeschreibung, Anweisungen, bis zu vier Gesprächseinstiege, einen optionalen Standard-Modellzugang, eigene Wissensbausteine, Projektquellen und eine ausdrückliche Werkzeugauswahl.

Die drei erlaubten Werkzeuge sind:

- **Wissen durchsuchen:** eigene Wissensbausteine und relevante Absätze aus verknüpften Textdateien bereitstellen. Auszüge werden als solche gekennzeichnet.
- **Tabellen auswerten:** gelesene Zeilen und numerische Kennzahlen berechnen, NULL-Werte getrennt behandeln und Beispielzeilen bereitstellen. Begrenzte Quellen werden ausdrücklich als Ausschnitt gekennzeichnet.
- **Graphbeziehungen lesen:** die gewählte Knoten- oder Beziehungstabelle eines Projektgraphen lesen und ihre Inhalte bereitstellen.

Diese Werkzeuge werden kontrolliert durch die Anwendung ausgeführt. Das Modell erhält keine SQL-Schreibrechte, beliebigen URLs, Shell- oder Codeausführung. Die Ergebnisse erscheinen bei der jeweiligen Antwort unter **Verwendete Quellen und Werkzeuge**. Projektquellen werden bei jeder Frage erneut autorisiert und gelesen. Eine Modellreferenz ist kein automatischer Wahrheitsnachweis.

**Im Gespräch ausprobieren** speichert den Assistenten und legt ein zugehöriges Gespräch an. Projektassistenten sind wiederverwendbare lokale Konfigurationen; eine Veröffentlichung als GPT in einem externen Verzeichnis gehört nicht zu diesem Ablauf. Änderungen am Standardmodell oder Import in ein anderes Projekt können eine erneute Modellauswahl benötigen.

## Quellenprüfungs-Labor

`/#evaluation-lab` enthält vier vorbereitete synthetische Fälle: belegbare Fakten, fehlendes Wissen, widersprüchliche Quellen und eine eingeschleuste Anweisung im Quellenmaterial. Eigene Fälle und Quellen lassen sich ergänzen, bearbeiten und entfernen.

Eine Antwort kann manuell eingefügt oder mit einem freigegebenen Modell erzeugt werden. Die Referenzantwort und Prüfkriterien werden bei einem Modelltest nicht mitgesendet. Die letzten zehn Versuche je Fall behalten Antwort, Modell, Frage, Quellenauswahl und die tatsächlich verwendeten Quellentexte. Späteres Bearbeiten einer Quelle verändert diese archivierten Quellentexte nicht.

Die Prüfung erfolgt pro Behauptung: Aussage, Quelle, wörtliches Zitat, fachliche Bewertung und Begründung. Die Anwendung prüft, ob das Zitat exakt im gewählten Quellentext vorkommt. **Gestützt** oder **widerlegt** ist nur mit einer nichtleeren Behauptung und einer tatsächlich vorhandenen Belegstelle speicherbar. Ob das Zitat die Aussage fachlich trägt, bleibt eine menschliche Bewertung. Eine bearbeitete Antwort setzt alte Aussagenbewertungen zurück; veränderte oder entfernte Quellen machen nicht mehr passende Belege wieder offen.

Vorhandene RAG-Antworten lassen sich über **Antwort im Quellenprüfungs-Labor prüfen** samt den ausgewählten Kontextabschnitten übernehmen. Für einen Prüffall gelten höchstens acht Quellen mit jeweils 8.000 Zeichen und 20 Aussagen.

## Analysefehler-Labor

`/#reasoning-lab` vermittelt vier unterschiedliche Mechanismen mit synthetischen Daten:

1. **Kausalität:** eine gemeinsame Einflussgröße bei gleichzeitig steigenden Größen sichtbar machen.
2. **Stichprobenverzerrung:** ungewichtete Umfrage und nach Gruppenanteilen gewichtete Grundgesamtheit vergleichen.
3. **Mittelwerte:** einen extremen Auftragswert verändern und die unterschiedliche Reaktion von Mittelwert und Median beobachten.
4. **Simpson-Paradox:** Gesamtraten mit den aus Erfolgen und Fällen berechneten Segmentraten vergleichen.

Jede Übung verbindet Beobachtung, veränderbare Datensicht, Interpretationsfrage, erklärendes Feedback und eine eigene Transfernotiz. Antworten und Notizen werden gespeichert; die experimentellen Ansichtsparameter bleiben in der aktuellen Sitzung. Das Labor führt keinen Kausalnachweis für eigene Unternehmensdaten durch.

## Visualisation Lab

`/#visualization-lab` trennt **Daten wählen**, **Eine Frage stellen** und **Ergebnis**. Der Zweck schlägt passende Datensichten vor; weitere Ansichten bleiben ausdrücklich auswählbar. Hinweise erklären sinnvolle Einsatzfälle und Grenzen.

Vorhanden sind 15 Datensichten: Tabelle, horizontale Balken, Säulen, gestapelte Säulen, Linien, Flächen, Streudiagramm, Histogramm, Boxplot, Heatmap, Ringdiagramm, Flächenanteile, Kennzahlen, Beziehungsnetz und Blue-Ocean-Strategiekurve. Die Strategiekurve verwendet die gemeinsame Skala 0–5 und ergänzt vier bearbeitbare Handlungsfelder: Eliminieren, Reduzieren, Steigern und Neu schaffen.

Kategorien und eine zusätzliche Reihe/Dimension sind wählbar. Berechnungen umfassen Anzahl, Summe, Mittelwert, Median, Minimum, Maximum und Einzelwerte. Fehlende numerische Werte werden nicht zu Null. Ungültige Kombinationen erhalten eine konkrete Erklärung. Negative Werte werden beispielsweise nicht als Ringanteile dargestellt. Zu viele Kategorien werden nicht stillschweigend abgeschnitten; ein Hinweis fordert zum Filtern oder Wechseln der Sicht auf.

Die Datenquellen sind:

- Gespeicherte Datensätze desselben Projekts.
- JSON-Projektdateien als Objektliste, einzelnes Objekt oder Objekt mit `rows`.
- Knoten- und Beziehungstabellen des vorhandenen SQLite-Property-Graphs. Standardmäßig bleiben Knoten-IDs getrennt, auch wenn Bezeichnungen gleich sind. Eine native Cypher-Datenbank wird dadurch nicht eingeführt.
- Tabellen der ausdrücklich mit dem Projekt verbundenen MySQL-/MariaDB-Datenbank. Die Quellenfunktion liest nur eine ausgewählte, anhand der Metadaten geprüfte Tabelle; sie nimmt keine frei formulierte SQL-Abfrage entgegen.
- Eigene JSON-Importe und bearbeitbare Beispiele als ausdrücklich im Laborobjekt gespeicherte Daten.

Projektquellen sind Live-Referenzen und werden erneut gelesen. Nur eigene Importe sind eingebettete Daten. Ein gespeicherter Entwurf ist somit kein unveränderlicher Snapshot einer externen Datenbank. Aus jeder Quelle werden höchstens `min(1000, eingestellte Zeilengrenze)` Zeilen gelesen. Ausschnitte werden angezeigt. Für MySQL-Ausschnitte wird keine erfundene Gesamtzahl angegeben.

Die Ergebnistabelle bietet Seitenwechsel für alle gelesenen bzw. berechneten Zeilen. CSV exportiert die aktuelle Auswertung, SVG die vorhandene Grafik. CSV-Textzellen mit möglichem Formelbeginn werden für das Öffnen in Tabellenprogrammen entschärft. Histogramme und Boxplots bieten zusätzlich die berechneten Klassen bzw. Quartile als Tabelle.

Direkte Einstiege bestehen aus dem Daten-Labor, dem Graph-Labor und der projektgebundenen Datenbankansicht. Sie übernehmen den aktuellen Datensatz, Graphen oder die gewählte Tabelle als Quelle einer neuen Visualisierung.

## Customer Journey Lab

Der integrierte **Persona-Designer** verwaltet bis zu 20 projektweit wiederverwendbare Personas einschließlich Archiv. Fünf verlustfrei wechselbare Modelle reichen vom Kurzprofil über Ziele & Verhalten, Jobs-to-be-done und Empathie bis zum umfassenden Profil. Zwei oder drei Personas lassen sich feldweise vergleichen, optional nur mit Unterschieden; fehlende Angaben bleiben sichtbar. Die Bibliothek bietet Suche, Duplizieren, Archivieren/Wiederherstellen und CSV-Export. Forschung, Bedienung, Sicherheitsgrenzen und Prüfungen sind in [Persona-Designer](persona-designer.md) dokumentiert.

Eine Journey übernimmt einen vollständigen Persona-Stand als gespeicherte Kopie. Bibliotheksänderungen überschreiben ihn nicht; ein neuerer Stand lässt sich ausdrücklich übernehmen. Eine neue Journey startet leer oder mit ausdrücklich als Annahmen kopierten Phasen. Der Designer verwendet dieselben Projekt- und Gruppenfreigaben wie das Journey-Labor.

`/#journey-lab` verbindet Persona, übergeordnetes Ziel, Kontext, geordnete Phasen und eine Stimmungskurve. Jede Phase enthält Ziel, Handlung, Touchpoint, Kanal, Stimmung, Hürde, Verbesserung, Verantwortliche, Erfolgskriterium und Belegtext. Annahmen und dokumentierte Beobachtungen werden unterschieden. Offene Belege, Verantwortliche und Erfolgskriterien erscheinen als Handlungshinweise, ohne einen künstlichen Qualitätsscore zu vergeben.

Bis zu 20 Phasen lassen sich anlegen, bearbeiten, duplizieren, mit beschrifteten Buttons umordnen und entfernen. Es gibt ein vollständig bearbeitbares Weiterbildungsbeispiel und einen CSV-Export.

Die gemeinsame Quellenauswahl kann Projekttabellen, JSON, Graphdaten und MySQL-/MariaDB-Tabellen als Ausgangspunkt verwenden. Eine explizite Spaltenzuordnung übernimmt nach Bestätigung eine Kopie als Journey-Phasen. Unvollständige Quellenausschnitte oder mehr als 20 Zeilen werden dabei abgelehnt. Die kopierten Phasen aktualisieren sich nicht automatisch mit der Quelle. Das Labor ersetzt keine eigenständige Interview- oder Nutzertestdurchführung.

## Administration, Rechte und Migration

Gruppen können die Frontend-Ansprache **Siezen** oder **Duzen** festlegen; Standard ist **Siezen**. Bei Mehrfachzuordnung hat der aktuell laufende Kurs Vorrang. Die Ansprache gilt einheitlich im Frontend und ist unabhängig vom gerade geöffneten Projekt. Regeln, Schutz eigener Inhalte und Prüfungen sind in [Ansprache nach Lerngruppe](group-address.md) beschrieben.

Neue unabhängige Gruppenrechte: `chat_lab`, `assistant_lab`, `evaluation_lab`, `reasoning_lab`, `visualization_lab`, `journey_lab`. Sie erscheinen in beiden bestehenden Wegen der Gruppenfreigabe. Globale und individuelle Sperren gelten zusätzlich. Laborobjekt-API, Quellen-API und Modellaktionen prüfen die Freigaben serverseitig; das Verstecken der Navigation ist keine Zugriffskontrolle.

Projektvorlagen und Projektwerkzeuge können die neuen Arten einzeln freigeben, mit Startinhalten ausstatten und als Startbereich verwenden. Quellzugriff benötigt zusätzlich die Rechte der Quelle (`files`, `data_lab`, `graph` oder `database`). Modellaufrufe benötigen weiterhin `ai` sowie einen tatsächlich verfügbaren persönlichen oder freigegebenen Projektzugang. API-Schlüssel sind weder Bestandteil der neuen Objekte noch ihrer Exporte.

Die bestehende Laborobjekt-Tabelle wird automatisch transaktional erweitert. IDs, Inhalte und Revisionen bleiben erhalten. Frühere Projekte mit der vollständigen alten Werkzeugausstattung erhalten auch die neuen Werkzeuge; ausdrücklich beschränkte Teilmengen werden nicht erweitert. Die bisherigen Grenzen von 1 MB je Laborobjekt und 20 MB je Workspace bleiben bestehen. Es werden keine zusätzlichen Serverdienste oder Pakete benötigt.

## Prüfung

```sh
node tests/studio-models.mjs
php tests/studio-migration.php
php tests/studio-mysql.php
python3 tests/studio-integration.py
php tests/lab-ai.php
python3 tests/labs-integration.py
python3 tests/integration.py
npm run build
python3 scripts/preflight.py
```

Die Modelltests führen auch die PHP-Vertragsprüfungen gegen die tatsächlichen Frontend-Beispiele aus. KI-Tests verwenden einen synthetischen Transport und prüfen zusätzlich rollengetrennte Gesprächshistorien für alle drei Anbieter. Der optionale MariaDB-Quellentest läuft ausschließlich gegen den isolierten CI-Service `ectro_schema_test`; ohne diesen Service wird er ausdrücklich als übersprungen ausgegeben.

Die lokale Browserprüfung umfasst die neuen Bereiche, Quellenwahl aus JSON und Graphen, Speichern mit anschließender Weiterbearbeitung, Journey-Bearbeitung, Belegprüfung, interaktive Interpretation sowie schmale Viewports. Reale KI-Anbieter, Produktionsdatenbanken und ein Live-Deployment sind damit nicht abgenommen.

Die neuen Prüfungen sind in die vorhandenen CI-Einstiege eingebunden: `tests/integration.py` führt die Studio-HTTP-Suite aus, `tests/lab-models.mjs` die Studio-Modelle und PHP-Verträge, `tests/project-migration.php` die Studio-Migration und `tests/sql-training.php` den echten MariaDB-Quellenvertrag. Die Workflowdatei benötigt dafür keine Änderung.

## Gestaltung im Visualisation Lab

Unter Ergebnis → Gestaltung lassen sich Farben, Typografie, Formen, Rundungen, Linien, Ringbreite und Kontrast je Arbeit bearbeiten. Die SVG-Ausgabe enthält Titel, Legende und eingebettete Gestaltung. Umfang, geprüfte Datensichten und Grenzen stehen in [Gestaltung und Prüfbericht](visualisation-lab-audit.md).

## Stichprobenverzerrung sichtbar machen

Die Übung zeigt den Kundenmix (200 aktive / 800 selten aktive Kunden) und den Antwortmix (80 / 20) direkt als zwei gleich große Anteilsbalken mit absoluten Zahlen. Die Ja-/Nein-Frage, die beobachteten Gruppenquoten (72/80 = 90 % und 8/20 = 40 %) sowie die Annahme gleicher Gruppenquoten beim Hochrechnen sind unmittelbar sichtbar. „Anteile aller Kunden verwenden“ wechselt zwischen 72 + 8 = 80 von 100 Antworten und 180 + 320 = 500 von 1.000 Kunden. Die 50 % werden als Hochrechnung bezeichnet.

Browsergeprüft: beide Zustände bei 320/390/768/1024 Pixeln ohne Seitenüberlauf; Tastaturumschaltung mit erhaltenem Fokus; Auswahl einer Interpretation, Speichern und Neuladen; Wechsel zu den übrigen drei Übungen. Die Antwortzuordnung wird beim Auswählen als JSON-Objekt aufgebaut, damit eine zunächst leere, aus der API als Array gelesene Zuordnung nicht beim Speichern verloren geht. Modelltests prüfen Gruppenanteile, unveränderte Gruppenquoten und beide sichtbaren Rechenwege.
