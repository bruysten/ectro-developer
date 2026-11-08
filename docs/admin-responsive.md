# Responsive Prüfung des Adminbereichs

Stand: 8. November 2026. Lokale Browserprüfung mit isolierten synthetischen Daten.

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


## Nachprüfung nach den Labor-Erweiterungen · 8. November 2026

Die zehn Hauptansichten wurden erneut in allen sechs oben genannten Formaten geprüft:
**60/60 ohne horizontalen Seitenüberlauf**. Zusätzlich wurden zehn Dialogzustände
jeweils in diesen sechs Formaten vermessen: Benutzeranlage, die drei Gruppentabs,
Mailvorlage, KI-Verbindung mit Daimon-Feldern, Gruppenbudget, Administratorprofil,
Profil/KI-Zugänge und Startdateianlage. **60/60 Dialogzustände** blieben innerhalb des
Viewports, mit sichtbarer Fußleiste, intern scrollbarem Inhalt und ohne seitlichen
Überlauf des Dialoginhalts. Speichern und externe Provider wurden dafür nicht aufgerufen.

Neu gefundene und korrigierte Details:

- **Offene Projekttyp-Freigaben:** Ein langer Gruppenname verbreiterte die Seite
  bei 320 Pixeln auf 399 Pixel. Lange Bezeichnungen und Summary-Texte brechen nun um;
  die Checkbox behält ihre Größe. Die korrigierte Seite bleibt bei 320 Pixeln.
- **Gruppentabs:** Der dritte Tab war auf schmalen Displays nur teilweise sichtbar.
  Alle drei Tabs stehen jetzt in gleich breiten Spalten, mit umbruchfähigen Titeln
  und einer eigenen Zeile für den Freigabenzähler.
- **Rechtefilter:** Bis 480 Pixel stehen die beiden Filter untereinander, sodass
  die Auswahl lesbar bleibt.
- **Querformat-Navigation:** Bei 568 × 320 Pixeln blieb zuvor nur eine 47 Pixel hohe
  Navigationsfläche. Ein kompakter Kopf schafft jetzt 180 Pixel, während Profil
  und Abmeldung unten sichtbar bleiben. Logo und Schließen-Taste überlappen nicht.
- **Mobile Bedienung:** Symbolschaltflächen, Schalter-Labels und Dialogaktionen
  erhalten mindestens 44 Pixel hohe Trefferflächen. Formularfelder verwenden auf
  schmalen Displays 16 Pixel Schrift, um Fokus-Zoom auf mobilen Browsern vorzubeugen.
  Die Dialogüberschrift passt sich an den Platz neben der Schließen-Taste an.

Gefüllte KI-Verbindungs- und Budgetkarten wurden mit langen ungetrennten Namen
geprüft. Der aufgeklappte Projekttyp-Editor einschließlich Gruppenverfügbarkeit und
JSON-Startdaten, die geöffneten globalen Werkzeugfreigaben sowie die
Gruppenchat-Verwaltung passen jeweils in allen sechs Formaten. Eine überlaufende
Labortabelle blieb per Pfeiltasten scrollbar, ohne die Seite seitlich zu verschieben.
Die Browserkonsole enthielt keine Warnungen oder Fehler. Zusätzliche Testgruppen
und inaktive Verbindungsattrappen wurden nach der Prüfung entfernt.

Die Änderungen betreffen ausschließlich `admin.css`; das Frontend erhält keine
zusätzlichen Regeln. Build, Asset-Integrität sowie bestehende Regressionstests für
Benutzerverzeichnis, Gruppenzeiträume/Freigaben, Mailvorlagen und ausgelieferte
Vorschau-Assets wurden geprüft. Die oben genannten Grenzen der Browserprüfung
gelten weiterhin; insbesondere ist dies keine Abnahme auf physischen iOS-Geräten.
