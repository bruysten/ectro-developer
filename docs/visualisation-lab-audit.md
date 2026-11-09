# Visualisation Lab: Gestaltung und Prüfung

Stand: 7. November 2026. Die Browserprüfungen verwenden ausschließlich synthetische Projektdaten.

## Gestaltung

Unter **Ergebnis → Gestaltung** stehen vier Vorlagen (Klar, Sanft, Dunkel, Kontrastreich), acht frei bearbeitbare Datenfarben, Hintergrund und Textfarbe bereit. Hinzu kommen drei lokale Schriftfamilien, Schriftgröße und -stärke sowie zur Datensicht passende Optionen für Rundungen, Punktform/-größe, Linien- und Ringbreite, Gitternetz und Legende. Auf breiten Fenstern steht der Editor neben der Vorschau; schmale Fenster ordnen beide untereinander an. Nur für die jeweilige Ansicht wirksame Formoptionen werden angeboten.

Die Kontrastrückmeldung berechnet das Verhältnis von Text/Hintergrund und weist auf schwach abgesetzte Palettenfarben hin. Sie ist eine Gestaltungshilfe; die vollständige Zugänglichkeit einer Darstellung hängt zusätzlich von Beschriftungen, Größe, Kontext und alternativen Darstellungen ab. Heatmap-Zellen und Flächenanteile erhalten automatisch eine zum tatsächlichen Untergrund passende Textfarbe.

Einstellungen gelten je gespeicherter Arbeit. Alte Arbeiten ohne `style` erhalten kompatible Standardwerte. Die API akzeptiert nur vollständige HEX-Farben, begrenzte Zahlenwerte und festgelegte Schrift-/Formauswahlen. Externe Fonts, CSS-URLs und freie CSS-Fragmente werden nicht übernommen. Unvollständige HEX-Eingaben werden markiert; bis zur Korrektur bleibt die letzte gültige Farbe wirksam.

SVG-Grafiken enthalten ihre Gestaltung direkt, einen sichtbaren Titel, die zugeschaltete Legende sowie Quellen-/Berechnungsangaben als SVG-Beschreibung. CSV bleibt ein Export der berechneten Werte; Styling ändert keine Daten. Tabelle und Kennzahlen sind HTML-Ansichten mit CSV-Export, keine SVG-Grafiken.

## Prüfung der 15 Datensichten

Alle Ansichten wurden im tatsächlichen Labor geöffnet. Bei 320, 390, 768 und 1024 Pixeln wurden zusätzlich alle 15 Ansichten mit geöffnetem Editor geprüft: 60 Kombinationen ohne horizontalen Seitenüberlauf. Breite Grafiken dürfen innerhalb ihrer eigenen Zeichenfläche scrollen; die Wertetabelle bleibt verfügbar. Auf Desktop wurde zusätzlich die gemeinsame Vorschau der Diagrammformen visuell kontrolliert.

| Ansicht | Daten und Verhalten |
|---|---|
| Tabelle | Gefilterte Einzelwerte, alle Spalten; Wertetabelle öffnet sich automatisch. |
| Balken | Aggregierte Kategorien, Nullwerte und negative Werte; frei einstellbare Rundungen. |
| Säulen | Mehrere Reihen, gemeinsame Nullachse und Legende. |
| Gestapelte Säulen | Beiträge und Gesamthöhen; negative Werte werden mit Hinweis abgewiesen. |
| Linien | Geordnete Kategorien, getrennte Reihen; fehlende Werte unterbrechen die Linie. |
| Flächen | Nichtnegative Entwicklungen; negative Werte werden mit Hinweis abgewiesen. |
| Streudiagramm | Zwei numerische Größen, konstante X-Werte, ausgeschlossene ungültige Koordinaten. |
| Histogramm | Numerische Klassen und Häufigkeiten; konstante Werte und Bereichsgrenzen. |
| Boxplot | Quartile, Median, Whisker und Ausreißer; fehlende Werte werden ausgelassen. |
| Heatmap | Zwei Dimensionen; 0 und fehlende Kombinationen bleiben unterscheidbar; Zelltext mit passender Kontrastfarbe. |
| Ringdiagramm | Positive Anteile, Summe und Legende; Ringbreite und Farben funktionieren auch im Export. |
| Flächenanteile | Flächen proportional zu positiven Werten; automatische Textfarbe. |
| Kennzahlen | Aggregierte Werte in responsiven Karten; Farben, Schrift und Rundungen. |
| Beziehungsnetz | Quell-/Zielspalten, Selbstbeziehungen, Knotengröße/-form und gerichtete Kanten; unvollständige Beziehungen werden gezählt und ausgelassen. |
| Strategiekurve | Gemeinsame Skala 0–5, mehrere Angebote und vier Handlungsfelder. |

Automatisiert geprüft: 180 Kombinationen aus 15 Ansichten, vier Gestaltungsvorlagen und drei Punktformen; 156 erzeugte SVGs zusätzlich mit einem unabhängigen XML-Parser. Summe, Anzahl, Mittelwert, Median, Minimum und Maximum, leere Quellen, erfolglose Filter, Nullwerte, negative Werte, numerische Überläufe, ungültige Spaltenrollen und sichere Text-/Styleausgabe haben eigene Prüfungen.

Im Browser zusätzlich geprüft: Tabellen-Paginierung mit 45 Zeilen (20/20/5) und vollständigem CSV-Export; freie Farbe, Schrift und Punktform speichern und neu laden; ungültige HEX-Eingabe; Änderung der Ringbreite; tatsächlicher SVG-Download mit Titel, Legende, Quelle und eigenem Stil. Projekt-JSON, Daten-Labor-Tabelle sowie Graphknoten/-beziehungen wurden mit bestehender Gestaltung geöffnet. MySQL/MariaDB bleibt im vorhandenen Integrationstest mit einer echten CI-MariaDB abgedeckt; die lokale Browserprüfung verwendet keine produktive Datenbankverbindung.

## Korrekturen

- Die Tabellenansicht versteckt ihre Werte nicht mehr hinter einem geschlossenen Prüfbereich.
- Kategorie/zweite Dimension können den aggregierten Wert nicht mehr durch identische Spaltennamen überschreiben. Die Auswahl zeigt fehlende Spalten ausdrücklich an.
- Fehlende Filterspalten werden beim Quellenwechsel zurückgesetzt. Streudiagramme bieten numerische X-Spalten an; Histogramme und Tabellen zeigen keine wirkungslosen Zuordnungsfelder.
- Ein fehlender Netzwerk-Endpunkt erzeugt keine Phantomkante zu einem Knoten namens `null`. Pfeile enden passend zu Knotengröße/-form am Knotenrand; Selbstbeziehungen bleiben sichtbar.
- Heatmap-Text berücksichtigt die tatsächliche Zellfarbe. Eine konstante Farbskala bleibt sichtbar. Zu viele Spalten führen zu einem erklärenden Hinweis statt unlesbarer Felder.
- Sehr große Zahlen werden wissenschaftlich formatiert; dichte X-Achsen beschriften nur eine Auswahl, während alle Datenpunkte und Tabellenwerte erhalten bleiben.
- Numerisch nicht mehr auflösbare Histogrammklassen werden mit einem verständlichen Hinweis abgewiesen.
- SVG-Exporte verlieren ihre sichtbare Legende nicht mehr.

## Grenzen

Eine Datensicht muss zur Frage und zu den gewählten Spalten passen. Nichtpositive Gesamtsummen für Anteile, Werte außerhalb der Strategieskala, negative Stapel/Flächen oder mehrere Einzelwerte je Matrixfeld werden bewusst abgewiesen. Die Oberfläche erläutert die nötige Anpassung. Diagramme haben Kategorien-/Reihenlimits; die Heatmap unterstützt bis zu zwölf Kategorien pro Dimension. Der bestehende Quellenleser markiert begrenzte Daten-Ausschnitte. Farben allein ersetzen keine Beschriftung oder fachliche Interpretation.

## Reproduzieren

```sh
node tests/studio-models.mjs
python3 tests/integration.py
python3 tests/labs-integration.py
npm run build
python3 scripts/preflight.py
```

Der Node-Einstieg enthält `tests/studio-visualization.mjs` und die PHP-Vertragsprüfungen. Die reguläre CI führt außerdem die bestehenden MariaDB-, SQL-, Migrations- und Berechtigungstests aus.

## Überarbeitung vom 08.11.2026

Datenquelle und Berechnung liegen im kompakten Bereich „Daten & Darstellung“. Die Datensicht bleibt direkt am Ergebnis wählbar. „Gestaltung“ öffnet einen responsiven Dialog mit Live-Vorschau und den Bereichen Farben, Form & Abstand und Schrift. Erst Übernehmen ändert die Arbeit; Abbrechen verwirft die Vorschau. Das Öffnen verschiebt das Diagramm nicht. Exporte sind in einem gemeinsamen Menü gebündelt.

Der gespeicherte Parameter `elementGap` (0–20) erzeugt Ringsegmentabstände, Abstände bei Balken/Säulen, Trennungen in gestapelten Säulen, Histogrammen, Treemaps und Heatmaps sowie Abstände zwischen Kennzahlen. Kleine Ringsegmente bleiben sichtbar, ein einzelner Vollring bleibt ungeteilt. Datenwerte und Berechnungen ändern sich dadurch nicht. Bei Linien- und Punktdiagrammen werden stattdessen die dazu passenden Linien- und Punktparameter angeboten.

## Listen und Datenbanktabellen ab 09.11.2026

„JSON importieren“ erkennt Objektlisten auch innerhalb verschachtelter Objekte und zeigt ihren vollständigen Pfad sowie die Zeilenanzahl. Eine Ausgangsliste kann allein übernommen werden. Bis zu fünf weitere Listen lassen sich in der Reihenfolge ihrer Auswahl ergänzen:

- **Über Schlüsselspalten verknüpfen:** Je weitere Liste werden eine Spalte aus dem bisherigen Ergebnis, die Zielspalte und die Verknüpfungsart ausgewählt. „Alle bisherigen Zeilen behalten“ entspricht einem Left Join, „Nur passende Zeilen behalten“ einem Inner Join. Namen wie `verkaeufe.umsatz_netto_eur` und `kunden.firma` verhindern Spaltenkollisionen. Leere Schlüssel treffen nicht aufeinander; Zahl, Text und Boolean bleiben unterschiedliche Schlüsseltypen. Mehrfachtreffer erzeugen mehrere Zeilen und werden wegen möglicher Summenvervielfachung kenntlich gemacht.
- **Zum Vergleich untereinanderstellen:** Gleichnamige Spalten werden ausgerichtet, fehlende Zellen bleiben NULL. Eine zusätzliche Herkunftsspalte `quelle` (bei Namenskollision mit führendem Unterstrich) erlaubt Vergleiche als Kategorien oder Datenreihen. Die Visualisierung startet mit Säulen und Herkunft als Datenreihe.

Die Vorschau zeigt fünf Ergebniszeilen, die vollständige Ergebnisgröße und fehlende Treffer. Die vorhandenen Grenzen gelten weiter: höchstens sechs Listen/Tabellen, 50 Ergebnisspalten und min(1000, konfiguriertes Zeilenlimit) Ergebniszeilen. Verknüpfungen, die diese Grenzen überschreiten, werden mit Hinweis abgewiesen. Einzelne verschachtelte Zellwerte bleiben als JSON-Text erhalten. JSON-Importe speichern das ausgewählte Ergebnis als eigene Daten; die ursprüngliche Datei wird nicht verändert.

Das Quellenverzeichnis unterscheidet ausdrücklich Projektverbindung und eigene persönliche Verbindung. Sobald mindestens eine eingerichtet ist, erscheint „Datenbanktabellen auswählen“ anstelle von „Projektdatenbank verbinden“. Die Tabellen zeigen ihren Verbindungskontext. Ein Fehler in einer Verbindung blockiert die erreichbaren Tabellen einer anderen Verbindung nicht. Auch „Visualisieren“ in der Datenbankansicht öffnet diese Auswahl. Bei einer persönlichen Verbindung wird zunächst das Zielprojekt für die gespeicherte Arbeit gewählt.

Datenbanktabellen werden ausschließlich lesend geladen. Gespeicherte Auswertungen behalten Tabellennamen, Verbindungskontexte und Beziehungen; „Quelle neu lesen“ führt diese erneut auf den aktuell gelesenen Tabellen aus. Persönliche Quellen werden immer über die persönliche Verbindung des aktuell angemeldeten Benutzers gelesen. Projektquellen verwenden nur die Verbindung des jeweiligen Projekts. Zugangsdaten sind nicht Teil der Auswertung. Begrenzte Tabellenausschnitte werden in Vorschau und Ergebnis kenntlich gemacht; gerade fehlende Join-Treffer können bei solchen Ausschnitten unvollständig sein. Leere Tabellen und ausschließlich leere numerische Spalten behalten ihr SQL-Schema. Hochpräzise Werte bleiben Text, falls die Konvertierung in JavaScript-Zahlen Genauigkeit verlieren würde.

Zusätzliche Prüfungen: `tests/studio-source-tables.mjs` vergleicht Vorschau und PHP-Ausführung auf denselben Fixtures, einschließlich mehrstufiger Beziehungen, gemischter Schlüsseltypen, fehlender und mehrfacher Treffer, leerer Schemata und Größenbegrenzungen. `tests/studio.php` prüft Verbindungskatalog, Berechtigungen, sichere Quellenvalidierung und Speichern der Beziehungen. `tests/studio-mysql.php` enthält Live-Tabellenverknüpfungen, Vergleich, persönliche Verbindung und erneutes Lesen geänderter Werte für den isolierten MariaDB-Dienst in CI.

## Hierarchische Datensichten (9. November 2026)

Fünf zusätzliche, eigenständig implementierte Sichten ohne CDN oder externe Laufzeitbibliothek:

- **Hyperbolic Tree:** Poincaré-Scheibe mit hyperbolischen Kreisbögen. Knotenauswahl verschiebt den Fokus durch eine Möbius-Isometrie in die Mitte; die übrige Hierarchie bleibt erhalten. Winkel und Abstände beschreiben die Struktur, keine Mengen.
- **Star Tree:** radialer Teilbaum mit gleichmäßigem Platz je Blatt, geraden oder gebogenen Verbindungen.
- **Spaltennavigation:** aufeinander aufbauende Spalten, markierter Auswahlpfad und kontrollierter horizontaler Scrollbereich. SVG-Export bildet die gerade geöffneten Spalten ab.
- **Sunburst:** additive Gewichte als Winkel über verschachtelte Ringe; Auswahl öffnet einen Teilbaum.
- **Icicle / Ebenenbänder:** dieselbe Partition als rechteckige Ebenen mit proportionaler Breite.

Alle nutzen dieselbe Datenzuordnung: bis zu sechs geordnete Spalten oder Eltern-Kind-Beziehungen. Tabellenspalten kommen aus den vorhandenen JSON-, Datensatz-, MySQL-/MariaDB- und Graphquellen. Eine Hierarchie ist keine automatische semantische Erkennung: die gewählten Spalten bzw. Beziehungen definieren die Struktur ausdrücklich. In Beziehungstabellen bezeichnet eine leere Elternkennung einen Wurzelknoten. Mehrfach-Eltern, widersprüchliche Wurzelzuordnungen und Kreise werden mit einer Korrekturmeldung abgewiesen; es wird kein beliebiger Spannbaum erfunden.

Bei Spaltenhierarchien zählen Gewichte Quellzeilen oder summieren eine nichtnegative numerische Spalte. Bei Eltern-Kind-Strukturen zählen sie Blätter; doppelte Beziehungen werden dedupliziert. Elternwerte enthalten die Unterpunkte und dürfen in der Ergebnistabelle nicht nochmals aufsummiert werden. Fehlende Kategorien bleiben als eigene Zuordnung sichtbar, fehlende Gewichte tragen nichts bei. Nullgewichte verschwinden nicht aus der Navigation. Schutzgrenzen: 500 Knoten, sechs Spaltenebenen bzw. zwölf Beziehungsebenen. Vorhandene Quellbegrenzungen werden weiterhin angezeigt.

Fokuspfad, Zurück-Taste, Knotensuche, Tastaturbedienung und lesbare Unterpunkt-Listen ergänzen jede Grafik. Auf kleinen Bildschirmen ist zunächst die Gesamtstruktur eingepasst; eine lokale Vergrößerung ermöglicht Detailarbeit, ohne die Seite seitlich aufzuziehen. Spalten scrollen innerhalb ihrer eigenen Fläche. Die Gestaltung enthält je nach Sicht Segment-/Feldabstände, Rundungen, Knotengröße und -form, Linienstärke, Verdichtung, Ebenenzahl, Sortierung und Beschriftungen. Stiländerungen beeinflussen keine Werte. Die bestehende Freigabe `visualization_lab` und Quellenrechte gelten unverändert.

Fachliche Grundlagen (keine übernommenen Bibliotheken): [Lamping, Rao & Pirolli: Focus + Context / CHI 1995](https://chi1995.acm.org/proceedings/papers/jl_bdy.htm), [Partition-Layout und additive Hierarchiegewichte](https://d3js.org/d3-hierarchy/partition).

Prüfung: `tests/hierarchy-models.mjs`, erweitert um alle fünf Sichten, drei Themen, mehrere Fokuspositionen, Summenerhaltung, XML-Exporte, Poincaré-Distanzerhaltung, Wälder, Einzelwurzeln, Duplikate, Kreise, Mehrfach-Eltern, Grenzen, Nullwerte, fehlende und feindliche Inhalte. `tests/studio.php` prüft Persistenz und Eingabevalidierung; `tests/studio-integration.py` deckt HTTP, CSRF und Quellenrechte ab. Browserprüfung mit synthetischer Organisation einschließlich Drilldown, Suche, Tastatur, Gestaltung, Speichern/Neuladen und echtem SVG-Download.
