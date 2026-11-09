# Digital Readiness Lab

`/#readiness-lab` ist ein geführter Selbstcheck nach der bereitgestellten Kursgrafik. Die sieben Bereiche bleiben erhalten: Analoge Organisation, Die ersten Schritte, Digitales Bauchgefühl, Digital Literacy, Digital Culture, Digitales Ökosystem und AI Organisation. Der Übergang zur AI Organisation ist im Ergebnis als eigener Bruch markiert.

## Ablauf

Zuerst werden Organisation, Bezugsbereich (gesamte Organisation oder ein benanntes Team/ein Bereich) und ein grobes Bild des Arbeitsalltags gewählt. Anschließend folgen zehn neutrale Fragebereiche mit jeweils drei konkreten Aussagen. Jede Aussage hat vier native Radio-Auswahlen: **Etabliert**, **Teilweise / Pilot**, **Noch nicht**, **Weiß ich nicht**. Die dreißig positiven Kriterien der Vorlage werden genau einmal abgefragt; die fünf analogen Merkmale bleiben als beschreibendes Ausgangsbild erhalten.

Vor dem Abschluss befinden sich weder die Stufengrafik noch die Ergebnis-Karten im DOM. Vor/Zurück und die direkte Fragebereichsauswahl erhalten die Antworten. Wer zur letzten Frage springt, wird bei fehlenden Antworten zu den offenen Bereichen geführt. Erst mit allen dreißig Einschätzungen wird das Ergebnis freigeschaltet. Unbekannte Angaben sind gültige Antworten. Auch dann erscheint ein konkreter vorsichtiger Wert, ergänzt um die mögliche Bandbreite nach Klärung.

Der Zwischenstand lässt sich über den gemeinsamen Projektkopf speichern und später fortsetzen. Der Abschluss speichert den Check. Beim Wechsel des Bezugsbereichs müssen die bisherigen Antworten ausdrücklich zurückgesetzt werden; für einen Vergleich kann über **Neu** ein weiterer Check angelegt werden. Antworten lassen sich aus dem Ergebnis erneut prüfen. Dabei verschwindet das Modell bis zum erneuten Abschluss. JSON-Import/-Export, Umbenennen und Löschen verwenden die vorhandene Studio-Verwaltung. Ein CSV-Export enthält Kontext, Zeitpunkt, Berechnungsversion, Readiness-Wert, obere Grenze und alle dreißig Kriterien mit den ausgewählten Zuständen.

## Einordnungsregeln und Grenzen

Die Auswertung ist ein transparentes Orientierungsmodell für den Unterricht, keine normierte oder empirisch validierte Zertifizierung. **Berechnungsversion 2** ersetzt das frühere Alles-oder-nichts-Verfahren. Jeder abgeschlossene Check erhält einen konkreten Wert von **1,0 bis 7,0** und einen Marker auf der Skala. Der Wert ist ein Index nach den folgenden festen Regeln, keine bestätigte Zertifizierungsstufe.

1. **Etabliert = 1**, **Teilweise / Pilot = 0,5**, **Noch nicht = 0**. Ein Pilot zählt somit als Teilfortschritt, nicht als voll etablierte Fähigkeit. Die Halbgewichtung ist eine offen gelegte Modellannahme.
2. Für jede der fünf positiven digitalen Entwicklungsstufen wird der Erfüllungsanteil berechnet: Summe der Punkte geteilt durch die Zahl ihrer Kriterien. Jede Stufe hat gleiches Gewicht, obwohl ihre Kriterienzahl verschieden ist. Die analoge Organisation ist das Ausgangsbild, kein zusätzlich zu erfüllendes Ziel.
3. Der angerechnete Anteil einer digitalen Stufe ist das **Minimum aus ihrem eigenen Anteil und allen vorhergehenden Anteilen**. Höhere Fähigkeiten können frühere Grundlagenlücken dadurch nicht einfach ausgleichen. Eine einzelne Lücke lässt den Standort aber auch nicht mehr vollständig verschwinden.
4. **Position = 1 + Summe der fünf angerechneten digitalen Anteile.** Erst wenn alle fünf digitalen Anteile 100 Prozent erreichen, wird zusätzlich der Erfüllungsanteil der sechs KI-Kriterien addiert. Ein einzelner Chatbot führt ohne diese Grundlagen nicht zur AI Organisation. Die 7 ist nur mit sämtlichen dreißig Kriterien auf „Etabliert“ erreichbar.
5. Der sichtbare Wert wird auf eine Nachkommastelle **abgerundet**, damit keine noch nicht erreichte Stufe durch Rundung erreicht erscheint. Der Marker verwendet die ungerundete Position. Werte zwischen zwei ganzen Zahlen werden ausdrücklich als Zwischenstand benannt. Ein Startwert 1 wird bei unbekannten oder widersprüchlichen Angaben nicht als Beleg für einen analogen Arbeitsalltag ausgegeben.
6. **Weiß ich nicht** zählt im vorsichtigen Wert zunächst 0 und bleibt von „Noch nicht“ getrennt. Für eine obere Grenze wird derselbe Algorithmus mit 1 für unbekannte Kriterien erneut berechnet; eine tatsächlich abweichende Grenze wird nach oben auf eine Nachkommastelle gerundet. Ohne Unsicherheit bleibt die exportierte obere Grenze mit dem Wert identisch. Der Ergebnistext zeigt bekannte Angaben und Bandbreite, die Skala den möglichen Bereich gestrichelt. Das ist ein Bereich aufgrund fehlenden Wissens, kein statistisches Konfidenzintervall. Bei ausschließlich unbekannten Angaben steht deshalb **1,0 mit möglicher Bandbreite bis 7,0**, ausdrücklich ohne bestätigte Fähigkeiten zu behaupten.
7. Der grob beschriebene Arbeitsalltag liefert Kontext und Widerspruchshinweise, verändert aber keine Punkte. Schwer vereinbare Angaben werden zur Prüfung markiert, ohne Antworten stillschweigend zu ändern. Einzelne fortgeschrittene Stärken bleiben sichtbar.
8. Die nächsten Schritte beziehen sich auf die **früheste noch nicht vollständig etablierte Entwicklungsstufe**, auch wenn der Gesamtwert bereits weiter rechts liegt. Unbekannte Kriterien werden zuerst zur Klärung vorgeschlagen. Der in der Kursgrafik genannte kontinuierliche KI-Wissensaufbau bleibt als überprüfter Aktualisierungs- und Feedbackprozess konkretisiert.

Beispiele (alle nicht erwähnten Kriterien „Noch nicht“):

| Antwortprofil | Wert | Begründung |
| --- | --- | --- |
| Alle Kriterien „Noch nicht“ | 1,0 | Ausgangswert ohne positive Beiträge |
| Erste drei Entwicklungsstufen: 3/4, 2/5, 1/5 etabliert | 2,3 | 1 + 0,75 + 0,40 + 0,20 = 2,35, abgerundet |
| Alle Kriterien teilweise / Pilot | 3,5 | Fünf digitale Beiträge von je 0,5; noch kein KI-Beitrag |
| Alle Kriterien etabliert, nur Prozessdigitalisierung „Noch nicht“ | 4,7 | Erste Grundlage 0,75 begrenzt alle fünf digitalen Beiträge; kein KI-Beitrag |
| Digitale Grundlagen vollständig, alle KI-Kriterien teilweise | 6,5 | Digitale Basis 6 + KI-Anteil 0,5 |
| Alle Kriterien etabliert | 7,0 | Digitale und KI-Kriterien vollständig |

Die geschlossene Berechnungserklärung enthält die erfüllten und tatsächlich angerechneten Anteile je Entwicklungsstufe. Gespeicherte Antworten bleiben unverändert und werden auch bei vorhandenen Checks mit Version 2 neu eingeordnet. Die Berechnungsversion steht in Erklärung und CSV; ein Vergleich mit früheren Screenshots aus Version 1 muss die geänderte Methode berücksichtigen.

Die Ergebnisansicht zeigt Standort, nächste Stufe, Unsicherheit, das vollständige Sieben-Stufen-Modell mit allen Kriterien und die nächsten Schritte. Auf breiten Arbeitsflächen stehen sieben Spalten nebeneinander. Bei weniger Platz werden die sechs digitalen Stufen in ein Raster umgebrochen und der AI-Übergang als eigener Bereich gezeigt; auf kleinen Displays stehen die Stufen untereinander. Es gibt keine seitlich abgeschnittenen Karten.

## Speicherung, Freigaben und autarker Betrieb

Das Labor ist ein Studio-Objekt `readiness`, gehört zu einem privaten oder gemeinsamen Projekt und erhält die separate Gruppen-/System-/Kontofreigabe `readiness_lab`. Voraussetzung ist Projektzugriff (`files`), kein KI-Zugang. Gesperrte Funktionen, fremde Projekte und abgelaufene Gruppen folgen denselben serverseitigen Prüfungen wie die übrigen Labore. Gemeinsame Projekte verwenden die bestehende Versionsprüfung; fremde Änderungen überschreiben keinen ungespeicherten Entwurf.

Schema-Version 1 speichert Kontext, Einzelantworten, aktiven Schritt, Bildschirmzustand und Abschlusszeitpunkt. Ergebniswerte werden aus den Antworten abgeleitet und nicht vom Client als Wahrheit übernommen. Unbekannte Kriterien, ungültige Zustände, unvollständige Ergebnisse und ungültige Zeitpunkte werden serverseitig abgewiesen. Der gemeinsame Katalog liegt in `app/readiness-catalog.json`, wird in die lokalen Frontend-Assets eingebunden und ist Teil des bestehenden App-Deployments. Es gibt keine neue Bibliothek, kein CDN und keinen Anbieteraufruf.

Die Migration erweitert die frühere Labor-Typbeschränkung ohne Änderung vorhandener Inhalte, IDs oder Revisionen. Nur die früher vollständigen Standard-Werkzeugkataloge (5, 11 oder 12 Typen) werden einmalig erweitert; eingeschränkte Projekte und Vorlagen bleiben eingeschränkt.

## Validierung

`node tests/readiness.mjs` prüft Kriterienabdeckung, alle Stufen, die separate AI-Schwelle, alle unbekannten Antworten, gemischte Profile, Teilfortschritte, konservative Rundung, durch Grundlagen begrenzte Beiträge und monotone Werte, widersprüchliche Aussagen, sichere Ausgabe und die echte Antwortbehandlung mit dem leeren API-Objekt. Dazu kommen 35 PHP-Prüfungen für Validierung, Speicherung, Versionen, private/gemeinsame Projekte, Freigaben und Ablaufzeiten. Der Test ist in der Lab-Testsuite enthalten. Die Migration ist für alte 5-, 11- und 12-Typ-Installationen geprüft.

Die Studio-HTTP-Suite umfasst 142 Checks einschließlich CSRF, Versionskonflikten, privater Isolation, Zwischenständen, unvollständigen Ergebnissen, ausdrücklichen unbekannten Antworten, Gruppenentzug und Unabhängigkeit vom KI-Zugang. Die übrigen Lab-/API-Prüfungen einschließlich 25 Sitzungen bleiben erfolgreich.

Browserprüfung der ursprünglichen Version: vollständiger gemischter Check, einzelne etablierte KI-Nutzung bleibt als Einzelkriterium sichtbar. Speichern/Neuladen setzt den Fragebereich und die Antworten fort; Ergebnis und CSV (30 Zeilen) stimmen überein. Direkte Navigation zu offenen Fragen, Tastaturbedienung, Bereichspflichtfeld und bewusstes Zurücksetzen sind geprüft. Fragen/Ergebnisse sind bei 320, 375, 600, 768, 1024, 1201, 1440 und 1920 Pixeln sowie im 667×375-Querformat ohne Seiten-/Kriterienüberlauf bedienbar.

Berechnungsversion 2 prüft zusätzlich 300 reproduzierbare gemischte Profile mit jeder möglichen Verbesserung eines Einzelkriteriums sowie Auflösungen unbekannter Angaben innerhalb der ausgewiesenen Bandbreite. Die PHP-Speicherung benötigt keine Migration; Ergebnisse werden weiterhin aus den unveränderten Antworten abgeleitet.

Browserprüfung der Version 2: synthetisches gemischtes Profil ergibt 2,3; ausschließlich unbekannte Angaben ergeben vorsichtige 1,0 mit Bandbreite bis 7,0; vollständige Kriterien ergeben 7,0. Die geöffnete Berechnung ist bei 320, 768 und 1440 Pixeln ohne Seitenüberlauf geprüft. CSV enthält 30 Antwortzeilen, Berechnungsversion und Ergebnisgrenzen; Rundung erzeugt bei bekannten Antworten keine künstliche Unsicherheit.

## Administrative Auswertung

Unter `/admin/#readiness` (Navigation „Readiness“, zusätzlich aus „Labore & KI“ erreichbar) sind gespeicherte Checks und ihre Antworten ausschließlich für Administratoren auswertbar. Gruppe, Person und Abschlussstatus lassen sich kombinieren. Die Übersicht zeigt bis zu 50 Checks je Seite; Kennzahlen und Verteilung berücksichtigen sämtliche passenden Checks, unabhängig von der Seite. Die Personenansicht enthält auch Teilnehmende ohne Check. Bei mehreren persönlichen Abschlüssen wird dort das zuletzt gespeicherte abgeschlossene Ergebnis gezeigt. Gruppenchecks zählen einmal und werden keinem Mitglied als persönliches Ergebnis zugerechnet.

Private Checks folgen der aktuellen Gruppenzugehörigkeit des Projektinhabers, gemeinsame Checks der Gruppe des Projekts. Ein Personenfilter findet persönliche Checks des Inhabers sowie gemeinsame Checks, an denen die Person nachweislich über einen erfassten Speicherstand beteiligt war. Ausgelaufene Gruppen bleiben für die Administration auswertbar; daraus entstehen keine zusätzlichen Frontend-Rechte. Namen, Bezugsbereiche, Speicherzeitpunkte, Versionen und tatsächliche speichernde Personen werden getrennt dargestellt.

Bei jedem erfolgreichen Readiness-Speichervorgang wird in derselben Transaktion eine unveränderliche Revision mit serverseitiger Benutzerzuordnung abgelegt (`readiness_revisions`). Konflikte und abgelehnte Schreibvorgänge erzeugen keine Revision. Die Detailansicht zeigt einzelne Speicherstände, alle 30 Antworten und Änderungen gegenüber der vorherigen erfassten Version. Die Auswahl bietet die jüngsten 100 erfassten Versionen; ältere bleiben gespeichert. Nicht gespeicherte Klicks werden nicht überwacht. Für Altbestände wird kein Bearbeiter erfunden; bei der nächsten Speicherung bleibt der bisherige Stand mit unbekannter Zuordnung erhalten. Die Erfassung beginnt mit dieser Erweiterung. Das Löschen des Checks/Projekts entfernt auch seine Revisionen; beim Löschen eines Kontos wird die Bearbeiterreferenz gelöscht, während ein anderweitig fortbestehender Gruppencheck erhalten bleibt.

Ergebnisse werden aus den Antworten neu berechnet (v2), nicht aus einem übermittelten Score. 164 Vergleichsfälle sichern die identische Berechnung zwischen PHP-Backend und Frontend-Labor. Entwürfe erscheinen ohne Ergebnisscore und gehen nicht in die Skalenverteilung ein. Unbekannte Angaben bleiben mit konservativem Wert und möglicher Obergrenze sichtbar. Die Verteilung zählt aktuelle Checks, keine früheren Revisionen; sie ist weder eine Personenrangliste noch ein Durchschnitt über unterschiedliche Organisationen und Bezugsbereiche.
