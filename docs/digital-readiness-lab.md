# Digital Readiness Lab

`/#readiness-lab` ist ein geführter Selbstcheck nach der bereitgestellten Kursgrafik. Die sieben Bereiche bleiben erhalten: Analoge Organisation, Die ersten Schritte, Digitales Bauchgefühl, Digital Literacy, Digital Culture, Digitales Ökosystem und AI Organisation. Der Übergang zur AI Organisation ist im Ergebnis als eigener Bruch markiert.

## Ablauf

Zuerst werden Organisation, Bezugsbereich (gesamte Organisation oder ein benanntes Team/ein Bereich) und ein grobes Bild des Arbeitsalltags gewählt. Anschließend folgen zehn neutrale Fragebereiche mit jeweils drei konkreten Aussagen. Jede Aussage hat vier native Radio-Auswahlen: **Etabliert**, **Teilweise / Pilot**, **Noch nicht**, **Weiß ich nicht**. Die dreißig positiven Kriterien der Vorlage werden genau einmal abgefragt; die fünf analogen Merkmale bleiben als beschreibendes Ausgangsbild erhalten.

Vor dem Abschluss befinden sich weder die Stufengrafik noch die Ergebnis-Karten im DOM. Vor/Zurück und die direkte Fragebereichsauswahl erhalten die Antworten. Wer zur letzten Frage springt, wird bei fehlenden Antworten zu den offenen Bereichen geführt. Erst mit allen dreißig Einschätzungen wird das Ergebnis freigeschaltet. Unbekannte Angaben sind gültige Antworten und erzeugen ausdrücklich einen unsicheren Stand.

Der Zwischenstand lässt sich über den gemeinsamen Projektkopf speichern und später fortsetzen. Der Abschluss speichert den Check. Beim Wechsel des Bezugsbereichs müssen die bisherigen Antworten ausdrücklich zurückgesetzt werden; für einen Vergleich kann über **Neu** ein weiterer Check angelegt werden. Antworten lassen sich aus dem Ergebnis erneut prüfen. Dabei verschwindet das Modell bis zum erneuten Abschluss. JSON-Import/-Export, Umbenennen und Löschen verwenden die vorhandene Studio-Verwaltung. Ein CSV-Export enthält Kontext, Zeitpunkt und alle dreißig Kriterien mit den ausgewählten Zuständen.

## Einordnungsregeln und Grenzen

Die Auswertung ist ein transparentes Orientierungsmodell für den Unterricht, keine normierte oder empirisch validierte Zertifizierung. Sie berechnet keinen scheinpräzisen Durchschnittsscore.

- Eine positive digitale Entwicklungsstufe gilt als durchgängig bestätigt, wenn alle Kriterien dieser und der vorhergehenden positiven Stufen als **Etabliert** angegeben sind. Das analoge Ausgangsbild ist kein zusätzlich zu erfüllendes Ziel.
- **Teilweise / Pilot** wird nicht mit etabliert gleichgesetzt. **Weiß ich nicht** bleibt von **Noch nicht** getrennt.
- Ein analoger Standort wird nur bei einem entsprechend beschriebenen Arbeitsalltag und ohne etablierte positive Kriterien bzw. unbekannte Angaben angezeigt. Sonst heißt es bei fehlenden Grundlagen **Noch keine durchgängige Stufe bestätigt**.
- Fortgeschrittene etablierte Einzelkriterien bleiben zusätzlich sichtbar. Ein Chatbot oder andere einzelne KI-Anwendungen überspringen die digitalen Grundlagen nicht.
- **AI Organisation** benötigt die bestätigten digitalen Grundlagen sowie alle sechs KI-Kriterien. Der in der Grafik genannte kontinuierliche Wissensaufbau wird als überprüfter Aktualisierungs- und Feedbackprozess für Modelle/Wissensbasis konkretisiert; ein Modell wird nicht als automatisch selbstlernend dargestellt.
- Offensichtlich schwer vereinbare Aussagen werden zur gemeinsamen Prüfung markiert, ohne Antworten stillschweigend zu verändern.
- Drei nächste Schritte beziehen sich auf die unmittelbar nächste offene Stufe. Unbekannte Einschätzungen werden zuerst zur Klärung vorgeschlagen; für bekannte Lücken gibt es konkrete Arbeitsvorschläge.

Die Ergebnisansicht zeigt Standort, nächste Stufe, Unsicherheit, das vollständige Sieben-Stufen-Modell mit allen Kriterien und die nächsten Schritte. Auf breiten Arbeitsflächen stehen sieben Spalten nebeneinander. Bei weniger Platz werden die sechs digitalen Stufen in ein Raster umgebrochen und der AI-Übergang als eigener Bereich gezeigt; auf kleinen Displays stehen die Stufen untereinander. Es gibt keine seitlich abgeschnittenen Karten.

## Speicherung, Freigaben und autarker Betrieb

Das Labor ist ein Studio-Objekt `readiness`, gehört zu einem privaten oder gemeinsamen Projekt und erhält die separate Gruppen-/System-/Kontofreigabe `readiness_lab`. Voraussetzung ist Projektzugriff (`files`), kein KI-Zugang. Gesperrte Funktionen, fremde Projekte und abgelaufene Gruppen folgen denselben serverseitigen Prüfungen wie die übrigen Labore. Gemeinsame Projekte verwenden die bestehende Versionsprüfung; fremde Änderungen überschreiben keinen ungespeicherten Entwurf.

Schema-Version 1 speichert Kontext, Einzelantworten, aktiven Schritt, Bildschirmzustand und Abschlusszeitpunkt. Ergebniswerte werden aus den Antworten abgeleitet und nicht vom Client als Wahrheit übernommen. Unbekannte Kriterien, ungültige Zustände, unvollständige Ergebnisse und ungültige Zeitpunkte werden serverseitig abgewiesen. Der gemeinsame Katalog liegt in `app/readiness-catalog.json`, wird in die lokalen Frontend-Assets eingebunden und ist Teil des bestehenden App-Deployments. Es gibt keine neue Bibliothek, kein CDN und keinen Anbieteraufruf.

Die Migration erweitert die frühere Labor-Typbeschränkung ohne Änderung vorhandener Inhalte, IDs oder Revisionen. Nur die früher vollständigen Standard-Werkzeugkataloge (5, 11 oder 12 Typen) werden einmalig erweitert; eingeschränkte Projekte und Vorlagen bleiben eingeschränkt.

## Validierung

`node tests/readiness.mjs` prüft Kriterienabdeckung, alle Stufen, die separate AI-Schwelle, unbekannte Angaben, gemischte Profile, monotone Grundlagen, widersprüchliche Aussagen, sichere Ausgabe und die echte Antwortbehandlung mit dem leeren API-Objekt. Dazu kommen 35 PHP-Prüfungen für Validierung, Speicherung, Versionen, private/gemeinsame Projekte, Freigaben und Ablaufzeiten. Der Test ist in der Lab-Testsuite enthalten. Die Migration ist für alte 5-, 11- und 12-Typ-Installationen geprüft.

Die Studio-HTTP-Suite umfasst 142 Checks einschließlich CSRF, Versionskonflikten, privater Isolation, Zwischenständen, unvollständigen Ergebnissen, ausdrücklichen unbekannten Antworten, Gruppenentzug und Unabhängigkeit vom KI-Zugang. Die übrigen Lab-/API-Prüfungen einschließlich 25 Sitzungen bleiben erfolgreich.

Browserprüfung: vollständiger gemischter Check ergibt Digital Literacy, einzelne etablierte KI-Nutzung bleibt als Einzelkriterium sichtbar. Speichern/Neuladen setzt den Fragebereich und die Antworten fort; Ergebnis und CSV (30 Zeilen) stimmen überein. Direkte Navigation zu offenen Fragen, Tastaturbedienung, Bereichspflichtfeld und bewusstes Zurücksetzen sind geprüft. Fragen/Ergebnisse sind bei 320, 375, 600, 768, 1024, 1201, 1440 und 1920 Pixeln sowie im 667×375-Querformat ohne Seiten-/Kriterienüberlauf bedienbar.
