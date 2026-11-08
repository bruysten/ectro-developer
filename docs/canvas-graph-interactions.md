# Canvas-, Graph- und Formular-Korrekturen

Stand: 8. November 2026. Eigene HTML-/CSS-/JavaScript-Implementierung ohne neue Bibliotheken oder externe Dienste.

## Karten auf dem Canvas

Empathy Map und Value Proposition Canvas waren bisher auswählbare Diagrammübersichten; die eigentlichen Karten erschienen erst darunter. Beide zeigen jetzt echte HTML-Karten innerhalb der geometrischen Arbeitsfläche. Bearbeiten, Ziehgriff und Hinzufügen liegen direkt im jeweiligen Bereich. In der Empathy Map behalten Denken/Fühlen sowie Sagen/Handeln ihre getrennten Datenfelder; die Karten kennzeichnen das jeweilige Unterfeld. Offene Fragen und Erkenntnisse bleiben ein gesonderter Forschungsbereich.

Die Karte wird über ihren Griff oder mit der Maus über ihren Text in einen anderen Bereich gezogen. Eine Vorschau folgt dem Zeiger, das Ziel wird hervorgehoben und die bestätigte Feldänderung gespeichert. Bei zusammengesetzten Bereichen wird das genaue Zielfeld gewählt. Ein Klick auf den Griff bietet dieselbe Bewegung ohne Ziehen an. Escape, Pointer-Abbruch und Ablegen außerhalb eines Felds ändern keine Daten. Autoscroll unterstützt die Arbeitsfläche und Notizstapel. Eine verworfene oder unterbrochene Übertragung behält den vorhandenen Wiederholungs- und Versionsschutz.

Die ursprüngliche Geometrie bleibt erhalten. Für lesbare Karten hat die Empathy-Arbeitsfläche eine Mindestbreite von 1.000 px, der VPC von 1.120 px. Ein begrenzter eigener Scrollbereich verhindert Seitenüberlauf. Auf kleinen Displays startet die Ansicht mit denselben echten Karten als Felder; „Canvas“ öffnet auch dort die geometrische Arbeitsfläche. „Felder“ und die Bereichsauswahl bieten eine vergrößerte Bearbeitung ohne eine zweite Kartenkopie. Die Vorschau kürzt lange Kartentexte visuell; Editor und Export enthalten den vollständigen Text. Scrollpositionen bleiben bei Kartenupdates erhalten.

Die sechs übrigen Typen – Business Model Canvas, Lean Canvas, Experiment Canvas, SMART Goals, SWOT und PESTEL – enthielten bereits echte Karten direkt in ihren Feldern. Alle acht Typen werden darauf geprüft, dass jede Karte genau einmal als bedienbare Karte erscheint. Archivierte Karten bieten keine Ziehgriffe.

## Löschen, Neuanlegen und Synchronisation

Nach dem Löschen wurde bislang automatisch auf „Papierkorb“ umgeschaltet. Dadurch verschwanden auch die übrigen aktiven Arbeiten aus der Ansicht; beim Neuanlegen sah es aus, als wären sie wiederhergestellt worden. Löschen und Archivieren bleiben jetzt im bisherigen Bereich. Die Auswahl wird aufgehoben, andere aktive Arbeiten bleiben sichtbar. Der Bereichsfilter nennt die Anzahl aktiver, archivierter und gelöschter Arbeiten. Ein Filterwechsel entfernt eine nicht mehr zum Bereich passende Arbeitsansicht; auch beim Neuladen wird eine Arbeit aus dem tatsächlich gewählten Bereich geöffnet.

Zusätzlich verwaltet die Bibliothek einen Lesestand und Revisionsschutz für **alle** Boards. Antworten aus einer Zeit vor einer Änderung sowie überholte Listenanfragen werden verworfen; ältere Boardrevisionen ersetzen keine bestätigten neueren Revisionen. Erstellen, Löschen, Wiederherstellen und endgültiges Entfernen entwerten vorherige Leseanfragen. Ein fehlgeschlagener Listenabruf nach erfolgreicher Anlage löst keinen zweiten Anlageversuch aus.

Der HTTP-Vertrag bestätigt, dass das Anlegen eines Boards weder alte Papierkorbmarkierungen noch deren Revisionen verändert. Tests simulieren außerdem verspätete Antworten nach Löschen/Neuanlegen und endgültigem Entfernen. Wiederherstellen bleibt eine ausdrückliche Aktion.

## Graph: Ziehen und Eigenschaften

Knoten waren auf Koordinaten ab 45 begrenzt. Durch Einpassen und Verschieben waren oberhalb und links davon trotzdem Arbeitsbereiche sichtbar. Knoten können nun auch in diesen negativen Koordinatenraum gezogen werden; ein symmetrischer Schutz bei ±100.000 verhindert extreme Zeigerwerte. Beim tatsächlichen Beginn einer Knotenbewegung wird der Viewport fixiert, damit automatisches Neueinpassen den sichtbaren Ablageort nicht verändert. Kanten, Beschriftungen, Abbruch, Undo und Speicherung bleiben erhalten.

Jede Knoteneigenschaft hat im Inspektor direkte Aktionen für Bearbeiten und Entfernen:

- Eine freie Eigenschaft betrifft nur den ausgewählten Knoten. Name, Datentyp und Wert können geändert werden.
- Eine Modelleigenschaft gehört zum Knotentyp. Name, Typ und Pflichtstatus betreffen alle Knoten dieses Typs; der Wert im Inspektor betrifft nur den ausgewählten Knoten. Die Oberfläche nennt diesen Umfang.
- Umbenennen prüft Namenskollisionen in Definitionen und betroffenen Knoten. Typwechsel konvertieren nur gültige Werte. Ungültige Konvertierungen oder fehlende Pflichtwerte verwerfen die gesamte Änderung.
- Das Entfernen einer Modelleigenschaft benennt die betroffenen Knoten und entfernt Definition und Werte gemeinsam. Freie Eigenschaften anderer Knotentypen bleiben erhalten. Die gleiche Logik gilt unter „Modell & Ontologie“.

Ein geöffneter Grapheditor pausiert Hintergrundübernahmen; eine zuvor gestartete Aktualisierung wird ebenfalls nicht während der Bearbeitung übernommen. Der bestehende serverseitige Versionsschutz gilt beim Speichern weiterhin.

Kanteneigenschaften stehen als nummerierte, abgegrenzte Gruppen mit Name, Typ und Wert im Dialog. Weitere Gruppen werden gezielt hinzugefügt; Entfernen ist eine eigene Aktion. Leere Namen überschreiben oder entfernen keine gefüllten Werte stillschweigend. Ja/Nein verwendet einen echten Auswahlwert; `false`, `0` und `null` bleiben unterscheidbar. Höchstens 30 Eigenschaften, sichere eindeutige Namen und einfache typisierte Werte werden geprüft.

## Einheitliches Formularraster

Feldinhalte beginnen an der oberen Kante; kurze Eingaben werden nicht neben Textareas vertikal verteilt. Allgemeine Zweispaltenraster haben begrenzbare Spalten und obere Ausrichtung. Das Landscape-Systemprofil zeigt den Namen breit, dann Typ/Status und Owner/Bereich als Paare; Beschreibung und Standort erhalten eigene breite Zeilen, Version/Anbieter eine gemeinsame Zeile.

Die gemeinsam verwendeten Landscape-/Blueprint-Formulare haben einen begrenzten Rahmen mit intern scrollbarem Inhalt und sichtbaren Kopf-/Fußleisten. Auf schmalen Displays werden die Raster einspaltig. Die neuen Graph-Eigenschaftseditoren verwenden denselben Rahmen.

## Prüfung

- Canvas: alle acht Modelle in sieben Formaten von 320 × 844 bis 1440 × 1000 einschließlich 568 × 320; zusätzlich die geometrischen Mobilansichten: 62 Kombinationen ohne horizontalen Seitenüberlauf. Jeder Beispielkartensatz blieb vollständig als bedienbare Karten erhalten.
- Browserregression: fünf private Boards einzeln gelöscht, danach genau ein neues erstellt und neu geladen: ein aktives Board, fünf unveränderte Boards im Papierkorb. Der aktive Bereich blieb bei jedem Löschschritt ausgewählt.
- Empathy-Karte direkt von Hören nach Sehen gezogen und gespeichert; VPC-Karte direkt auf dem Canvas bearbeitet. Bedienung nach dem Speichern blieb verfügbar. Papierkorbauswahl und Neuladen ergaben weiterhin eine schreibgeschützte gelöschte Arbeit.
- Graph: Knoten in verschobener Ansicht auf `y = -61` gezogen, ohne Änderung des Viewports; gespeichert und nach Neuladen bestätigt.
- Knoteneigenschaften: anlegen, umbenennen, Zahl/Ja-Nein, Wert ändern, entfernen; Typdefinition mit Pflichtstatus umbenennen und gezielt entfernen. Kanteneigenschaften mit Zahl und `false` gespeichert und neu geladen; Entfernen und Neunummerieren einer Gruppe geprüft.
- Alle sieben geöffneten Landscape-Abschnitte sowie ein gefüllter Eigenschaftsdialog in sechs Formaten ohne Seiten-/Dialogüberlauf, mit sichtbarer Fußleiste. Das Systemprofil hat nachgemessene gemeinsame Feldkanten.
- `tests/canvas-library.mjs`, `tests/canvas-board.mjs`, `tests/canvas-drag.mjs`, `tests/canvas-http.py`, `tests/graph-properties.mjs` und `tests/graph-view.mjs` prüfen die Regressionen, Typen, sichere Texte, Strukturen und Abbrüche. Die neuen Tests laufen über bestehende CI-Einstiege.

Die Browserprüfung erfolgte mit synthetischen Daten in lokalem Chromium. Physische Touchgeräte und Safari/Firefox sind damit nicht pauschal abgenommen.
