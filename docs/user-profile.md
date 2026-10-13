# Eigenes Profil

Ein Klick auf Name oder Bild im Benutzerbereich öffnet den Profileditor. Auch bei minimierter Navigation bleibt das Profil über das Bild erreichbar. Die Rollenanzeige verwendet den tatsächlichen Backend-Wert: Lernender, Lehrer oder Administrator.

Das Profil enthält Vorname, Nachname, Anzeigename, eine Bio und bis zu acht beschriftete Links, beispielsweise LinkedIn, Blog oder Firmenwebsite. Der Anzeigename bleibt unabhängig vom Vor-/Nachnamen und erscheint im Workspace und Chat. Bestehende Namen bleiben erhalten; beim Upgrade werden keine Namen automatisch aufgeteilt. Rolle und Login-E-Mail können im Profileditor nicht geändert werden.

## Profilbild

Ein Bild kann ausgewählt oder in den Bildbereich gezogen werden. JPG, PNG, WebP, GIF und AVIF bis 10 MB werden im Browser verarbeitet. Der Ausschnitt lässt sich verschieben, zoomen, drehen und zurücksetzen. Pfeiltasten verschieben ihn ebenfalls. Bei GIF wird ein statisches Bild gespeichert. Der Browser muss das Ausgangsformat unterstützen.

Erst „Profil speichern“ übernimmt das Bild. „Abbrechen“ verwirft Änderungen. Das Original wird nicht hochgeladen: Der Browser erzeugt ein quadratisches JPEG mit 512 Pixeln. Entfernen des Profilbildes wird ebenfalls erst beim Speichern übernommen. Ein bereits gespeichertes Bild kann erneut zugeschnitten werden; das Original wird nicht aufbewahrt.

Das Backend validiert Bildformat, MIME-Typ, Größe und Abmessungen. Bilder liegen als private SQLite-Blobs vor, ohne zusätzliche GD-/ImageMagick-Installation. Der Bild-Endpunkt benötigt Anmeldung; nur der Eigentümer und Administratoren können ein Bild abrufen. Öffentliche Profildaten oder neue Gruppenfreigaben werden nicht angelegt.

## Bestehende Funktionen und Sicherheit

Der Passwortwechsel bleibt im Profil erreichbar. Noch nicht gespeicherte Profiländerungen müssen vorher gespeichert werden. Der Editor bleibt beim Öffnen und Speichern eines Profils bestehen; Codeentwürfe werden nicht verworfen. Anzeigename, Bild und Rolle aktualisieren sich in der Seitenleiste nach dem Speichern.

Profiländerungen verwenden CSRF-Schutz und eine Versionsnummer gegen das Überschreiben paralleler Bearbeitung. URLs erlauben nur HTTP/HTTPS ohne eingebettete Zugangsdaten. Bio und Namen werden als Text behandelt. Der API-Endpunkt akzeptiert ausschließlich eigene Profilfelder; IDs, Rollen, Freigaben, Passwort und Login-E-Mail sind ausgeschlossen. Benutzerlöschung entfernt Profil und Bild automatisch.

Die zusätzliche Profiltabelle entsteht automatisch über die vorhandene Datenbankinitialisierung. Keine manuelle Migration oder Serverinstallation nötig.

## Prüfung

`python3 tests/integration.py` prüft Profile, Rechte/CSRF, unveränderte Rolle und Login-E-Mail, sichere Links, Versionskonflikte, private Bildauslieferung, ungültige Bilder, Entfernung und Benutzerlöschung. `node tests/profile-picture.mjs` prüft Ausschnitte für verschiedene Bildformen, Drehungen und Zoomwerte sowie die Vorschau-/Export-Skalierung. Im Browser wurden Dateiauswahl, Drehen, Zoom, Tastatur und Mausverschiebung, Speichern/Wiederöffnen, Abbrechen, Passwortdialog und die 390-Pixel-Ansicht mit einem Lehrer-Testkonto geprüft. Native Datei-Drag-and-drop wurde nicht automatisch geprüft.
