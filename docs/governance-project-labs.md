# Governance und Project Lab

Stand: 11. November 2026. Eigenständige Academy-Implementierung mit lokal gebauten Assets; keine zusätzliche Cloud, kein externer Dienst und kein neues Laufzeitpaket.

## Governance Lab

`/#governance-lab` speichert mehrere versionierte Arbeiten im vorhandenen Projekt. Ein Entwurf kann ohne Landscape beginnen oder eine gespeicherte Landscape desselben Projekts als Arbeitsgrundlage verwenden. Ein veränderbares, ausdrücklich synthetisches Lernbeispiel erleichtert den Einstieg.

Sieben Arbeitsansichten:

- **Überblick:** fehlende Zuständigkeiten, auffällige Messungen, ungeprüfte Regeln und offene Lebenszyklusschritte als anklickbare nächste Aufgaben.
- **Rollen:** 22 bearbeitbare Rollen sowie eigene Rollen. Personen, Teams und externe Stellen werden pro Organisation, System, Datenbestand oder Datenfluss mit A/R/C/I zugeordnet. Mehrere aktive A-Zuordnungen werden als Klärungsbedarf sichtbar. Modellrollen verleihen keine Academy-Rechte.
- **Qualität:** sechs Dimensionen je Datenfluss: Vollständigkeit, Eindeutigkeit, Konsistenz, Aktualität, Gültigkeit, Richtigkeit. Ganze Fallzahlen, Zielwert, fachliche Eignung, Messdatum, toleriertes Alter, Methode und Nachweis bleiben getrennte Angaben. Eine Stichprobe aus dem Daten Lab zeigt einzelne Fälle und überträgt die tatsächlich berechneten Zahlen mit Datensatz-ID und Version in eine überprüfbare Bewertung. E-Mail-Prüfung prüft nur das Format; Richtigkeit wird nicht aus einem Format abgeleitet.
- **Regeln:** interne Vorgaben und regulatorische Referenzen mit Geltungsbereich, begründeter Anwendbarkeit, verantwortlicher Stelle, Prüfung, Nachweis und Wiederprüfung. Eine Qualitätskontrolle kann eine Dimension eines konkreten Flusses gegen einen eigenen Grenzwert prüfen. Keine automatische Rechts- oder Compliance-Zertifizierung.
- **Legal & Compliance:** geführte Einordnung von GDPR, DMA, DSA und AI Act je Datenzweck und Ressource; passende Prüfschritte, Nachweise, Abweichungen, Zuständigkeiten und Termine. Einzel-/Gesamtmatrix und Aufgaben mit expliziter Prüfungsabdeckung. [Fachmodell, Quellen und Grenzen](governance-legal-checks.md).
- **Lebenszyklus:** einen Datengegenstand vom Ausgangsbestand über ausdrücklich ausgewählte, gerichtete Flüsse verfolgen. Erheben, Speichern, Verarbeiten, Nutzen, Weitergeben, Archivieren und Löschen werden als Schritte pro System modelliert. Zuständigkeit, Fristannahme, Umsetzung, Beleg und Aufbewahrungsgrund gehören an den jeweiligen Schritt. Eine Löschsimulation zeigt fehlende Wege, geplante/belegte Schritte und Holds, ohne Produktionsdaten zu löschen. Nicht verbundene Systeme werden als solche benannt; Zyklen erzeugen keine Endlosschleifen.
- **AI-Readiness:** acht ausdrücklich eigene, gleich gewichtete Dimensionen. Unbekannt/noch nicht = 0, geplant = 25, Pilot = 50, Betrieb = 75, nachweislich wirksam = 100; der Mittelwert bildet den Standort. Einschätzungs- und Nachweisabdeckung stehen neben dem Wert, kritische Grundlagen bleiben als Hinweise sichtbar. „Nachweislich wirksam“ benötigt Nachweis und Datum. Der Wert ist kein NIST-Score.

Eine schlechte Dimension wird nicht mit guten Dimensionen weggemittelt. Fehlende Nachweise/Daten und unvollständige Dimensionsabdeckung erzeugen kein vollständiges Grün. Veraltete Messungen und fällige Regelprüfungen bleiben erkennbar. Der synthetische Fristwert des Beispiels ist ausdrücklich keine gesetzliche Aufbewahrungsfrist.

## Verzahnung statt zweiter Datenhaltung

Landscape und Journey zeigen Governance nur bei freigegebenem Governance Lab und freigegebenem Projektwerkzeug. Ein aufklappbarer Kontext zeigt zugeordnete Rollen, Qualitätsdimensionen und Links zur Bearbeitung. Qualitätsfarben in der Karte sind optional. Die eigene Governance-Arbeit bleibt eine gespeicherte Quelle; in den beiden anderen Labs entstehen keine parallelen Rollen- oder Messungseditoren.

Journey-Prüfbezüge in einer Governance-Arbeit dokumentieren den Prüfkontext. Die technischen Abhängigkeiten werden weiterhin im Journey Lab unter **Systeme & Daten** gepflegt. Dort lassen sich jetzt Datenflüsse auch ausdrücklich einem Element zuordnen, zusätzlich zu Systemen und Datenbeständen.

Unabhängig von Governance zeigt Landscape bei freigegebenem Journey Lab optional **Journeys**: Persona, Phase, Element und Herkunft des Bezugs. Direkte System-, Bestands- oder Flusszuordnung und Ableitungen über Datenbestände/Flüsse werden unterschieden. Benachbarte Systeme erzeugen keine erfundene direkte Flusszuordnung. Bezüge erscheinen in Karte, Listen und Details; Links führen zur betreffenden Phase. Standardmäßig bleiben die Zusatzmarkierungen aus.

Der Landscape-Kopf ist verdichtet: kürzere Abstände, gemeinsame Bedienbasis, Such-/Bereichsfelder auf gleicher Höhe und kompakte Kartenwerkzeuge. Zusätzliche Kontextinformationen werden aufgeklappt. Der vorhandene Fokusmodus erhält die linke Academy-Navigation.

## Project Lab

`/#project-lab`, gespeicherte Objektart `rollout`, Freigabe `project_lab`.

1. In Readiness, Landscape oder Governance unter **Mehr → Projekt planen** einen gespeicherten Stand festhalten oder im Project Lab **Zustand festhalten** wählen.
2. Ausgangsbild und Zielbild je freigegebenem Bereich auswählen. Beide dürfen nicht dieselbe Momentaufnahme sein. Jede Momentaufnahme enthält Quell-ID, Quellversion, Datum und kopierten Inhalt. Spätere Quellenänderungen und Quellenlöschung verändern diesen Inhalt nicht.
3. Die eingefrorenen Inhalte einschließlich zugeordneter Rollen/Stakeholder sind über **Momentaufnahme ansehen** lesbar. Für Readiness wird die Governance-Arbeit über **Mehr → Rollen & Governance zuordnen** oder im Governance-Kontext ausdrücklich verknüpft. Landscape nimmt ihre zugeordneten Governance-Arbeiten mit auf; Governance hält ihre erreichbare Landscape als Kontext mit fest.
4. Der Vergleich erkennt neue, geänderte und abzulösende Systeme, Bestände und Flüsse, Readiness-Antworten und Governance-Einträge. Zugeordnete Governance-Arbeiten fließen auch in Landscape-/Readiness-Vergleiche ein. Reine Kartenpositionen zählen nicht als Infrastrukturveränderung.
5. Veränderungen ausdrücklich als bearbeitbare Arbeitspakete vorschlagen lassen oder mit **Pilot → Rollout** einen offenen Ablauf beginnen. Start, Ziel, Planung und tatsächlicher Fortschritt bleiben getrennt.
6. Vier Veränderungsspuren: IT/Systeme, Prozesse/Fähigkeiten, KI/Automatisierung und Menschen/Veränderung. Fünf Etappen: Klären, Pilot, Prüfen, Ausrollen, Verankern. Verantwortung, Dauer, Abhängigkeiten, Abnahmekriterium, Ergebnisnachweis und Risiken gehören zum Paket. Entscheidungspunkte halten Go/Hold/Stop und Belege fest.
7. Stakeholder mit ihren Modellrollen aus den ausgewählten Momentaufnahmen als bearbeitbare Kopien übernehmen oder eigene Beteiligte anlegen. Eine Übernahme ändert keine technischen Zugriffsrechte.

Die Zeitansicht berechnet den frühesten Ablauf aus Dauern und Abhängigkeiten. Sie ist eine Lernplanung in Planungstagen, kein Kalender mit Feiertagen, Ressourcenabgleich oder automatischer Kapazitätsplanung. Vorschlagsdauern von einem Tag sind offene Annahmen, keine Aufwandsschätzung. Zirkuläre/fehlende Abhängigkeiten werden abgewiesen. Höchstens 300 Pakete, 200 Beteiligte, 30 Entscheidungspunkte und 120 Momentaufnahmen pro Projekt; Momentaufnahmen zählen zum Workspace-Speicher.

## Rechte, Bestand und Sicherheit

- Beide Labs sind einzeln pro Gruppe und als Projektwerkzeug steuerbar. Die Rechte aktiver Gruppen werden addiert; abgelaufene Gruppen gewähren nichts. Backend-APIs prüfen jede Anfrage erneut.
- Verknüpfte Arbeiten und Momentaufnahmen stammen ausschließlich aus demselben berechtigten Projekt. Fremde/private Projekte bleiben ausgeschlossen.
- Entzogene Quellfreigaben redigieren die Inhalte der betreffenden Momentaufnahmen und ihrer Begleitobjekte. Gespeicherte Verweise bleiben erhalten, damit ein Entzug keine fremden Arbeitsergebnisse zerstört.
- Nach Quellenlöschung/-entzug sind gewöhnliche Änderungen an vorhandenen Arbeiten weiter möglich; neue ungültige Ressourcenverweise werden abgelehnt. Die Oberfläche behauptet keine verfügbare Quelle.
- Bestehende Journey-Zuordnungen benötigen kein neues `flows`-Feld. Vorhandene Inhalte, IDs und Versionen bleiben erhalten. Die atomare SQLite-Migration erweitert nur frühere vollständige Werkzeugkataloge; absichtlich eingeschränkte Kataloge bleiben eingeschränkt. Readiness-Revisionshistorien bleiben erhalten.
- POST/CSRF, bestehende Projektzugriffe, optimistische Objektversionen, Text-/Listen-/Speichergrenzen und HTML-Escaping gelten weiterhin. JSON-Objekte mit anfangs leeren Antworten/Auswahlen bleiben beim Speichern Objekte.

## Fachliche Grundlage und Abgrenzung

Die folgenden Primärquellen haben das Arbeitsmodell informiert; die Academy-Fragen, Rollenerweiterungen und Punkteskala sind eine eigene didaktische Umsetzung:

- [UK Government Data Ownership Model](https://www.gov.uk/government/publications/data-ownership-in-government/data-ownership-model): fachliche Verantwortung, Stewardship und technische Custody trennen. Die konkrete Organisationsgestaltung bleibt kontextabhängig.
- [Government Data Quality Framework](https://www.gov.uk/government/publications/the-government-data-quality-framework/the-government-data-quality-framework): sechs Dimensionen und Eignung für den Verwendungszweck statt eines pauschalen Qualitätsmittels.
- [NIST AI RMF Core 1.0](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/): Govern, Map, Measure und Manage sowie fortlaufende Beobachtung. Kein normierter Acht-Fragen-Score wird behauptet; NIST arbeitet an einer Aktualisierung des Frameworks.
- [GDPR, insbesondere Art. 5, 17, 19, 30 und 39](https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng): Zweckbindung, Speicherbegrenzung, Nachvollziehbarkeit, Löschrechte mit Ausnahmen und unabhängige Datenschutzkontrolle. Ein modellierter Hold ist keine automatisch wirksame Rechtsausnahme.
- [AI Act Art. 10](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-10): Daten-Governance insbesondere im Kontext der dort geregelten Hochrisiko-KI. Keine pauschale Einstufung aller Systeme als Hochrisiko; DSA/DMA/GDPR/NIS2-Anwendbarkeit wird nicht aus der Auswahl eines Labels abgeleitet.

## Prüfung und Selbstreview

`tests/governance-project.mjs`, `tests/governance-project.php` und `tests/governance-migration.php` prüfen Berechnungen, unbekannte/veraltete Qualität, Teilabdeckung, qualitative Gegenbefunde, Stichprobeneinzelfälle, gerichtete/Zyklus-Routen, Holds, AI-Abdeckung, semantische Vergleiche, DAG-Planung, Persistenz, Konflikte, Quellverweise, Projektisolation, additive Gruppenrechte, Entzug, unveränderliche Momentaufnahmen und Migration. Die Suite ist in `tests/lab-models.mjs` eingebunden.

Im Selbstreview wurden insbesondere korrigiert: kein vollständiges Qualitätsgrün bei nur einer bewerteten Dimension; keine verlorenen Eigenschaften leerer JSON-Arrays; keine Kartenbewegung als fachliche Transformation; keine vermeintlich direkte Journey-Verbindung nur durch Nachbarschaft; keine neuen Verweise auf gesperrte/gelöschte Quellen; Zustandsvergleich einschließlich Governance-Zuordnungen; sichtbare Etappen und Lebenszyklusfelder statt abgeschnittener Spalten auf kleinen Bildschirmen.

Browserprüfung mit synthetischem Projekt: alle sechs Governance-Ansichten und alle drei Project-Ansichten bei 320/768 px; Desktopprüfung bei 1440 px; Rollenpflege, Messung aus Datenprobe, Speicherung, Löschsimulation, AI-Antwort, Stakeholder-Übernahme, Aufgabenbearbeitung, Readiness-Zuordnung und Quellen-Momentaufnahme durchlaufen. Die vollständigen bestehenden API- und Lab-Suiten bleiben zusätzlich erforderlich.

### Datenbestand als Ausgangspunkt des Lebenszyklus

„Datenbestand verfolgen“ wählt einen vorhandenen Bestand aus der freigegebenen Landscape. Der neue Datenweg übernimmt dessen Identität, Namen, Zweck und ausschließlich die Datenflüsse, die diesen Bestand bereits ausdrücklich als Quelle nennen. Weitere Übergaben werden bewusst ausgewählt; bloße Erreichbarkeit im Systemgraphen ist kein Nachweis, dass dort dieselben Daten verarbeitet werden. Die Systemroute steht vor der Bewertung der Lebenszyklus-Aktionen. Neue Schritte beginnen standardmäßig im Ausgangssystem, ohne Umsetzung oder Nachweise zu erfinden.

`nameFromSource` ist ein optionales, streng boolesches Metadatum. Neue Datenwege verwenden es standardmäßig; der Server übernimmt den Namen beim Speichern aus der zugänglichen Landscape, die Oberfläche zeigt den aktuellen Bestandsnamen. Ältere Datenwege ohne dieses Feld behalten ihre eigene Bezeichnung. Eigene Bezeichnungen bleiben ausdrücklich möglich. Bei entfernten oder entzogenen Quellen bleiben gespeicherte Namen und Referenzen als Rückfall erhalten; bestehende Berechtigungsprüfungen verhindern neue unzulässige Verknüpfungen. Ein Bestandswechsel entfernt keine vorhandenen Schritte oder Übergaben.

### Datenaustausch je Landscape-Datenfluss

Austauschformat, Übertragungsweg, Frequenz/Auslöser und Datenmenge stehen sichtbar im Hauptteil des Datenfluss-Dialogs. Vorschläge ergänzen die bisherigen Freitextfelder; bestehende Werte und das Speicherschema bleiben erhalten. Das Bestandsformat einer Quelle ist ein eigener Hinweis und wird nicht als Austauschformat unterstellt. Technische Änderungen eines dokumentierten Austauschs setzen die Grundlage zur erneuten Prüfung auf „Annahme“, ohne den bisherigen Beleg zu löschen.

Liste, Systemdetails, Kartentitel und Governance-Datenwege verwenden dieselbe Austausch-Zusammenfassung. Zusatzbeschriftungen der Karte sind einblendbar und verändern keine Projektdaten. Die Vollständigkeitshinweise führen zu Datenflüssen mit fehlendem Format, Übertragungsweg oder Takt; sie ersetzen keine Qualitätsprüfung. Angedockte Plus-Anschlüsse behalten eine große Ziehfläche, die auch bei kleinem Zoom den anklickbaren Mittelpunkt des Systems freilässt.

### Projektweite Beitragsbereiche

Unter **Governance Lab → Rollen → Beiträge anpassen** lassen sich Kürzel,
Bezeichnung, Erklärung und Reihenfolge der bisherigen A/R/C/I-Bereiche ändern.
Pro Projekt sind 1–12 Bereiche möglich. Die optionale Bedeutung
„Zählt als Gesamtverantwortung“ steuert die Verantwortungsprüfung unabhängig vom
sichtbaren Kürzel. Ohne diese Bedeutung wird die fehlende Definition offen
angezeigt; es wird keine Gesamtverantwortung aus dem Kürzel geraten.

Das Modell liegt versioniert in `lab_project_config.governanceContributions`.
Projektmitglieder mit Governance-Freigabe können es bearbeiten; es ändert keine
technischen Zugriffsrechte. Bestehende IDs bleiben bei Umbenennungen stabil.
Beim Entfernen belegter Bereiche ist ein explizites neues Ziel erforderlich.
Alle Governance-Arbeiten eines Projekts werden gemeinsam in einer Transaktion
aktualisiert. Würden doppelte Zuordnungen entstehen, wird der gesamte Vorgang
abgelehnt. Personen, Rollen, Planungsstände und Notizen werden nie stillschweigend
zusammengeführt oder gelöscht. Die offene Arbeit wird vor der Änderung gespeichert.

Jede betroffene Arbeit erhält eine neue Version, damit parallele alte Entwürfe
keine gelöschten Bereiche zurückschreiben. Die Konfiguration hat zusätzlich eine
eigene Konfliktprüfung. Project-Lab-Momentaufnahmen speichern ihr damaliges
Beitragsmodell unveränderlich mit; bestehende Momentaufnahmen ohne Modell verwenden
weiterhin das ursprüngliche A/R/C/I-Modell. Landscape-, Journey- und Readiness-
Governance-Einblendungen zeigen dieselben projektweiten Bezeichnungen.

### AI-Readiness mit konkreten Ressourcen

Jede der acht Dimensionen bietet neben der bisherigen Gesamtbewertung die
Grundlage **Konkrete Ressourcen**. Aus der verknüpften Landscape (oder dem eigenen
Lernmodell) lassen sich Datenbestände, Datenflüsse und Systeme anhand einer
Such- und Typauswahl hinzufügen. Jede Ressource hat eine eigene Einschätzung,
einen Nachweis und ein Datum. Die aktive Grundlage wird explizit gespeichert;
eine alte Gesamtbewertung bleibt beim Wechsel erhalten, wird im Ressourcenmodus
aber nicht zur Berechnung verwendet. Auch das Entfernen des letzten Bezugs
aktiviert die alte Gesamtbewertung nicht automatisch wieder.

„Datenqualität & Herkunft“ zeigt vorhandene Qualitätsmessungen der konkret
zugeordneten Datenflüsse im Bewertungsdialog. Bestandsbezüge folgen ausschließlich
expliziten `flow.stores`-Verweisen, niemals einer vermuteten Verbindung über dasselbe
System. Messungen unterstützen die fachliche Einschätzung; Herkunft,
Repräsentativität und Eignung für den KI-Anwendungsfall sind gesondert zu prüfen.

Pro Dimension zählt der Mittelwert aller ausgewählten Ressourcen, offene und
aktuell nicht verfügbare Ressourcen mit null. Die acht Dimensionen behalten ihr
bisheriges gleiches Gewicht. Vollständig eingeschätzt ist eine Dimension erst,
wenn alle ausgewählten Ressourcen verfügbar und bewertet sind. Die Oberfläche
zeigt den ausgewählten Umfang und seine Nachweisabdeckung ausdrücklich an;
nicht ausgewählte Ressourcen werden nicht als geprüft dargestellt. Einzelne
Lücken in Verantwortung, Rechten und Evaluation bleiben trotz hohem Mittelwert
als kritischer Hinweis sichtbar. Die Bewertung bleibt ein Lern- und Arbeitsmodell,
kein standardisiertes Audit oder automatisch erzeugter Compliance-Nachweis.

Neue Referenzen werden serverseitig gegen die autorisierte Landscape geprüft.
Nach Quellenlöschung oder Rechteentzug bleiben bestehende Bezüge mit dem zuletzt
aufgelösten Titel erhalten; neue oder umgebogene Referenzen sind gesperrt.
Beim explizit bestätigten Wechsel der Landscape werden ihre Einzelbewertungen
geleert. Project-Lab-Momentaufnahmen frieren Einzelbewertungen und damalige
Ressourcentitel mit ein; Zustandsvergleiche erkennen Änderungen der Bezüge und
Bewertungen auch ohne Änderung der alten Gesamtbewertungsfelder.
