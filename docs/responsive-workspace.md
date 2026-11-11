# Responsive Academy: gemeinsames Layout und Prüfung

Stand: 11. November 2026. Prüfung im lokalen Browser mit isolierten synthetischen Projekten, Gruppen, Materialien und gespeicherten Laborarbeiten. Keine Änderungen an Produktionsdaten oder echten KI-Zugängen.

## Gemeinsame Regeln

- Rasterspalten und ihre Inhalte dürfen auf die verfügbare Breite schrumpfen. Lange Überschriften, Beschreibungen und Namen verbreitern keine komplette Seite.
- Auf schmalen Displays können beschriftete Aktionen umbrechen; Buttons wachsen mit ihrem Inhalt und behalten mindestens 44 Pixel Höhe. Formularschrift verwendet dort 16 Pixel, um automatischen Fokus-Zoom auf mobilen Browsern zu vermeiden.
- Dialoge sind an dynamische Viewporthöhen gebunden. Kopf und Aktionen bleiben im Dialograhmen, der Inhalt scrollt separat. Lange Titel können selbst scrollen; die Schließen-Taste bleibt erreichbar. Die gleichen Grundregeln gelten für Frontend und Administration.
- Breite Datentabellen scrollen innerhalb ihrer eigenen Arbeitsfläche. `watchTableOverflow` erkennt auch später erzeugte oder ersetzte Tabellen, ergänzt nur bei tatsächlichem Überlauf einen Hinweis und einen benannten Tastaturstopp und reagiert auf Größenänderungen. Bereits vorhandene Lab-Beschriftungen und Tastaturstopps bleiben erhalten. Beim Seitenwechsel werden Beobachter und Hinweise entfernt sowie ursprüngliche Attribute wiederhergestellt.
- Große Diagramme, Canvas-Flächen und mehrspaltige Datenansichten behalten ihre eigenen Navigations- und Scrollbereiche. Seitenüberlauf wird nicht global mit `overflow-x:hidden` kaschiert.
- Die Mitgliederliste im Chat ist am gesamten Chatkopf ausgerichtet und bleibt innerhalb seiner Breite, auch im schmalen schwebenden Chat.
- Im niedrigen mobilen Querformat ist der Navigationskopf verdichtet. Nur die Linkliste scrollt; Profil und Abmelden bleiben am unteren Rand sichtbar. Reduzierte Bewegung wird für Shell, Navigation, Dialog und Buttons respektiert.

## Prüfraster

| Format | CSS-Pixel |
| --- | --- |
| Schmales Smartphone | 320 × 844 |
| Smartphone | 390 × 844 |
| Niedriges Querformat | 568 × 320 |
| Tablet hoch | 768 × 1024 |
| Tablet / kleiner Desktop | 1024 × 768 |
| Desktop | 1440 × 1050 |

**180 Frontend-Prüfungen:** 30 gespeicherte Seiten-/Arbeitszustände in allen sechs Formaten, ohne horizontalen Seitenüberlauf. Abgedeckt sind Übersicht, Projekte, Dateien, Datenbank-Verbindung, Coding, Lab-Übersicht, Materialien, Gruppenchat, Team und sämtliche Labs. Im KI Lab wurden Prompt, RAG und neuronales Netz separat geladen. Die anderen Labs enthalten bearbeitbare Beispiele; Landscape und Journey verwenden die verknüpfte Maschinenbau-Landschaft mit 25 Systemen, 25 Datenbeständen und 46 Flüssen.

**66 Admin-Prüfungen:** Übersicht, Benutzer, Gruppen, Projekttypen, Freigaben, Systemeinstellungen, Labore & KI, Readiness, Materialien, Mail und Nutzungsstatistik in allen sechs Formaten, ohne horizontalen Seitenüberlauf.

**72 weitere Ansichten:** alle sieben Governance-Reiter, vier Journey-Ansichten, acht Canvas-Modelle sowie die SQL-Aktionen. Die Unteransichten wurden auf 320, 568 und 768 Pixeln geprüft; die SQL-Startansicht zusätzlich in allen sechs Formaten. Breite Qualitäts-/Datenmatrizen bleiben eigenständig scrollbar.

**78 Dialogzustände:** 13 Formular-/Tabzustände in allen sechs Formaten: neues Projekt, Profil, Profil/KI-Zugänge, persönlicher KI-Zugang, Landscape-Systemprofil, Landscape-Datenfluss, Visualisation-Gestaltung, Archiv-Dokument, Benutzeranlage, Gruppe/Mitglieder, Gruppenzeiträume, Gruppenfreigaben und Materialien. Dialog, Inhalt und Fußleiste bleiben innerhalb ihres Rahmens; kein seitlicher Inhaltsüberlauf. Es wurden keine Zugangsdaten gespeichert oder Nachrichten versendet.

Zusätzlich bedient: seitliches Scrollen der Benutzerverwaltung bei 768 Pixeln und eines Datensatzes bei 320 Pixeln mit Pfeiltasten; die Tabelle bewegt sich, die Seite bleibt stehen. Bei ausreichender Breite verschwinden zusätzlicher Hinweis und Tastaturstopp. Die niedrige Navigation lässt 183 Pixel für die Linkliste und hält das Konto sichtbar. Browserkonsole ohne Warnungen oder Fehler.

## Gefundene und korrigierte Fehler

1. Datenbank-Verbindung bei 320 Pixeln: langer Aktionsbutton erzwang eine 373 Pixel breite Seite. Schrumpfbares Raster und umbruchfähige Aktionen beheben die Ursache.
2. Gruppenchat bei 320 Pixeln: die am kleinen Mitglieder-Trigger ausgerichtete Liste verbreiterte die Seite auf 370 Pixel. Die Liste ist jetzt innerhalb des Chatkopfs verankert.
3. Benutzertabelle bei 768 Pixeln: Überlauf vorhanden, aber kein Tastaturstopp oder Scrollhinweis. Die gemeinsame Tabellenbeobachtung schließt diese Lücke und funktioniert ebenso für dynamisch geladene Lab-Tabellen.
4. Allgemeine Frontend-Dialoge verwendeten bislang teilweise den gesamten Dialog als Scrollbereich. Der gemeinsame Rahmen hält jetzt Abschlussaktionen erreichbar und orientiert sich an `dvh`.

## Weiterentwicklung und Grenzen der Prüfung

Neue Arbeitsbereiche verwenden die vorhandenen Layout-, Formular- und Dialogbausteine. Bei breiten Tabellen den lokalen `.table-wrap` einsetzen; Diagramme und Canvas-Flächen benötigen eigene verständliche Navigation. Bei neuen Bedienelementen mindestens das schmale Hochformat und niedrige Querformat mit gefüllten, langen Inhalten prüfen. Reine Messungen der Dokumentbreite reichen nicht: auch Dialogaktionen, Tab-Erreichbarkeit, unabhängige Scrollbereiche und Auswahl-/Bearbeitungszustände ansehen.

Die dokumentierten Prüfungen wurden in Chromium ausgeführt. Physische Geräte, Safari/Firefox, eingeblendete Bildschirmtastaturen und Betriebssystem-Textvergrößerung sind damit nicht vollständig abgenommen. Dynamische Viewporthöhen und flexible Inhaltsgrößen bilden die gemeinsame Grundlage dafür; eine unbegrenzte Zusicherung für alle Browser-/Gerätekombinationen wäre durch diesen Test nicht belegt.

Validierung: Produktionsbuild, Integrität der 77 ausgelieferten Assets, vollständige bestehende Lab-Regressionssuite und Diff-Prüfung; zusätzliche API-/SQL-/Migrationsprüfungen laufen in der Pull-Request-CI.
