# Responsive Prüfung des Adminbereichs

Stand: 7. November 2026. Lokale Browserprüfung mit isolierten synthetischen Daten.

## Prüfraster

Alle zehn Hauptansichten wurden nach den Korrekturen jeweils mit **320 × 844,
390 × 844, 568 × 320, 768 × 844, 1024 × 844 und 1280 × 844 CSS-Pixeln** geprüft.
Ergebnis: **60 von 60 Ansichten ohne horizontalen Seitenüberlauf**. Breite Tabellen
behalten einen eigenen Scrollbereich; zehn der geprüften Kombinationen benötigen
diesen. In allen zehn Fällen sind Scrollhinweis und Tastaturfokus vorhanden.

| Bereich | Zusätzlich geprüfte Inhalte / Bedienung |
| --- | --- |
| Anmeldung | Formular auf 320 Pixeln |
| Übersicht | Kennzahlen, Aktionsleiste, Systemstatus, Aktivitäten und lange Namen |
| Benutzer | Mobile Tabellenkarten, Filter mit langem Gruppennamen, Bearbeitung mit langem Namen und langer E-Mail-Adresse, Löschdialog geöffnet und abgebrochen |
| Gruppen | Lange Titel und Beschreibungen, fünf erreichbare Kartenaktionen, Mitgliederliste |
| Freigaben | Gruppenauswahl, Rechteübersicht und Werkzeugbereiche |
| Systemeinstellungen | Auch aufgeklappte systemweite Werkzeugfreigaben, Betriebsgrenzen, Host- und Dateityp-Eingaben |
| Projekttypen | Neue und vorhandene Vorlage, langer Dateipfad, Code-Editor, aufgeklappte JSON-Startdaten und Gruppenverfügbarkeit, Dateidialog, Verwerfen eines Entwurfs |
| Labore & KI | Projekt-/Nutzungstabellen, leere Zugangsansicht und Limits |
| Mail: Verbindung & Versand | Formular, Aktionsleiste, Fehlerprotokoll mit langer Adresse und Fehlermeldung, horizontales Scrollen mit Pfeiltasten |
| Mail: Vorlagen | Karten, neuer Vorlagendialog, Variablen und Vorschau |
| Nutzungsstatistik | Kennzahlen, Datumsbeschriftung der Aktivitätsgrafik und Tabellen |
| Gruppenchat-Verwaltung | Langer Gruppentitel, ununterbrochene Nachricht, langer Anhangname und Textvorschau |
| Profil | Profilformular, KI-Zugänge und verschachtelter leerer Zugangs-Editor |
| Navigation | Mobiles Menü öffnen/schließen, scrollbar auch bei 568 × 320 Pixeln |

Benutzeranlage und Mailvorlagendialog wurden in fünf Formaten einschließlich
568 × 320 geprüft. Alle drei Gruppentabs wurden auf 320, 568 (Querformat), 768
und 1280 Pixeln geprüft. Die Aktionen blieben jeweils innerhalb des sichtbaren
Dialogs. Auch ein 234 Zeichen langer Vorschautitel lässt im Querformat Platz
für Inhalt und Aktionen. Es wurden keine echten Zugangsdaten hinterlegt,
Provider aufgerufen oder E-Mails versendet. Testinhalte wurden anschließend entfernt.

## Gefundene und behobene Probleme

- Übersicht bei 320 Pixeln: Seite war 327 Pixel breit. Intrinsische Mindestbreiten
  der Raster, Karten und Inhalte sind nun begrenzt.
- „Systemeinstellungen“ bei 320 Pixeln: Seite war 361 Pixel breit. Lange
  Überschriften können umbrechen; deutsche Silbentrennung ist erlaubt.
- Mail-Aktionsleiste bei 320 Pixeln: Seite war 325 Pixel breit. Abschnittsköpfe
  und Aktionen umbrechen gemeinsam innerhalb ihres Bereichs.
- Lange Benutzerformulare: Fußleiste lag teilweise mehr als 1700 Pixel unterhalb
  des Anfangs. Dialoge haben nun einen begrenzten Rahmen mit separat scrollbarem
  Inhalt und sichtbaren Kopf-/Fußleisten.
- Mailvorlagen: Fußleistenaktionen konnten links abgeschnitten werden. Die
  Aktionen umbrechen nun innerhalb des Dialogs.
- Vorschau mit sehr langem Dateinamen: Der Kopf verdrängte im Querformat die
  Fußleiste. Die Titelhöhe ist nun begrenzt und der Titel selbst scrollbar.
- Gruppenkarten: Mobile Symbolaktionen erhalten 44 × 44 Pixel und eine eigene
  umbruchfähige Zeile.
- Breite Tabellen: Ein Hinweis erscheint nur bei tatsächlichem Überlauf. Der
  Scrollbereich erhält dann einen zugänglichen Namen und einen Tastaturstopp;
  bei ausreichender Breite entfällt der zusätzliche Stopp wieder. ResizeObserver
  reagieren auf Größenänderungen und werden beim Routenwechsel getrennt.
- Aktivitätsgrafik: Auf sehr schmalen Geräten erscheinen vier Datumsmarken statt
  überlappender Tagesbeschriftungen. Jeder Balken behält Datum und Wert in seinem
  zugänglichen Namen und Tooltip.

Die Regeln sind auf `.admin-surface` begrenzt. Das Frontend erhält dadurch keine
neuen Dialog- oder Rasterregeln. Seitenüberlauf wird nicht global versteckt.

## Validierung und Grenzen

Build und Asset-Prüfung sowie die bestehenden Tests für Benutzerverzeichnis,
Mailvorlagen, Profil-/Dialoglebenszyklus, Chatvorschau, Preview-Assets und
Gruppenzeiträume/Ansprache wurden ausgeführt. Die Browserkonsole blieb bei der
Prüfung ohne Warnungen und Fehler. Die Tastaturprüfung bewegte eine überlaufende
Tabelle mit zwei Pfeiltasten um 80 Pixel, ohne die Seite seitlich zu verschieben.

Diese Prüfung deckt den lokalen Chromium-Browser und die genannten Formate ab.
Sie ersetzt keine Geräteprüfung in Safari/Firefox oder mit eingeblendeter
Bildschirmtastatur. Die Dialoggrenzen verwenden dynamische Viewporthöhen (`dvh`),
damit sie sich an Änderungen des verfügbaren Platzes anpassen können.
