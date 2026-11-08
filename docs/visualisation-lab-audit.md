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
