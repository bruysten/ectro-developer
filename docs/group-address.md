# Ansprache nach Lerngruppe

Unter **Backend → Gruppen → Gruppe bearbeiten → Gruppe & Mitglieder → Ansprache im Frontend** sind **Siezen · Standard** und **Duzen** wählbar. Eine Vorschau zeigt die gewählte Form. Neue und bisherige Gruppen verwenden ohne ausdrückliche Änderung **Siezen**. Die Gruppenübersicht zeigt die gespeicherte Ansprache.

## Welche Gruppe zählt?

Die bereits vorhandenen Datumsfelder haben getrennte Aufgaben:

- **Zugriff ab/bis** bestimmt, ob eine Gruppe zugänglich ist.
- **Kursbeginn/Kursende** bestimmt, ob ihr Kurs aktuell läuft. Beide Kurstage sind einschließlich; maßgeblich ist die bestehende Kurszeitzone `Europe/Berlin`.

Für die Ansprache berücksichtigt die Anwendung zunächst nur zugängliche Mitgliedsgruppen. Läuft mindestens einer ihrer Kurse heute, werden ausschließlich diese laufenden Kurse ausgewertet. Andernfalls zählen die zugänglichen Mitgliedsgruppen ohne weiteren Vorrang. Haben die so bestimmten Gruppen dieselbe Ansprache, gilt diese im gesamten Frontend. Bei unterschiedlichen Einstellungen oder ohne passende Gruppe gilt **Siezen**. Es gibt keine willkürliche Auswahl nach Gruppenname, Anlagezeit oder Projektwechsel.

Damit verdrängt ein gerade laufender Kurs beispielsweise eine dauerhaft offene organisatorische Gruppe. Zwei parallel laufende Kurse mit derselben Ansprache sind ebenfalls eindeutig. Zwei parallel laufende Kurse mit unterschiedlicher Ansprache führen zum dokumentierten Standard **Siezen**. Die bisher mögliche Nutzung ohne Gruppenzuordnung bleibt erhalten und verwendet ebenfalls diesen Standard.

## Einheitliche Oberfläche

Die Ansprache gilt zusammenhängend für Übersicht, Projekte, Dateien, Coding Lab, Datenbank und SQL Training, Gruppenchat, Team, Profil einschließlich KI-Zugängen und alle Projektlabore. Dazu gehören Überschriften, Hilfetexte, Platzhalter, Auswahllisten, Rückfragen, Status- und bekannte API-Fehlermeldungen. Der Verwaltungsbereich bleibt in der Sie-Form; seine Gruppen-Vorschau zeigt die ausdrücklich gewählte Form.

`app/address-copy.json` enthält die redaktionell abgestimmten Varianten. `src/address.js` übersetzt ausschließlich ausdrücklich markierte Oberflächentexte. Bei `ui`-Templates werden die statischen Textteile übersetzt, während interpolierte Werte unverändert durchgereicht werden. Daher bleiben Projektnamen, Dateiinhalte, Chatnachrichten, Persona-Daten, Zitate, Diagrammdaten und Modellantworten erhalten. Eigene Assistentenanweisungen und E-Mail-Vorlagen sind bearbeitbare Inhalte mit eigener Ansprache, keine automatisch umgeschriebenen Oberflächentexte. Es gibt keine globale Ersetzung im DOM oder in gespeicherten Dokumenten.

Die aktuelle Zuordnung wird serverseitig ermittelt. `safeUser().address` enthält die wirksame Form, die eindeutige Gruppe soweit vorhanden, Kurs-/Gruppenbasis, einen Konflikthinweis und den nächsten Datumswechsel. Der Browser gleicht sie mindestens einmal pro Minute und an Kurs-/Zugriffsgrenzen anhand der Serverzeit ab. Ein sicherer Aktualisierungspunkt übernimmt eine geänderte Ansprache; offene Dialoge, ungespeicherte Labor-/Editorarbeit und geöffnete Chats werden dabei geschützt. Spätestens beim nächsten sicheren Seitenwechsel gilt die neue Form. Der Anmeldebereich ohne identifizierte Lerngruppe verwendet **Siezen**.

## Speicherung und Rechte

`group_preferences` ergänzt Gruppen um `address_mode` mit Datenbank-Constraint und Fremdschlüssel. Die vorhandene Schema-Initialisierung legt die Tabelle idempotent an; vorhandene Gruppen benötigen keine Umschreibung. Die Präferenz wird beim Löschen der Gruppe mit entfernt.

Speichern erfolgt über `admin.group.save` innerhalb der vorhandenen Transaktion und Versionsprüfung. Nur Administratoren mit gültigem CSRF-Token können die Einstellung ändern. Ausschließlich `formal` und `informal` sind zulässig. Clients, die das neue Feld nicht mitsenden, behalten die bestehende Einstellung. Gruppenfreigaben und Zugriffsrechte bleiben eigenständige Einstellungen.

## Neue Oberflächentexte

Neue direkte Ansprachen als abgestimmtes Paar in den Katalog aufnehmen und mit `ui('statischer Text')` oder einem `ui`-Template ausgeben. Nutzerdaten als interpolierte Werte behandeln; nicht `ui(userText)` aufrufen. Bekannte Serverfehler werden als vollständige Meldung oder ausdrücklich gekennzeichneter fester Präfix übersetzt, niemals durch freie Wortersetzungen in unbekannten Anbieterantworten.

## Validierung

`node tests/group-periods.mjs` führt auch die neuen Anspracheprüfungen aus: Standard, aktuelle und zukünftige Kurse, Überschneidungen, abgeschlossene und noch gesperrte Gruppen, Kalendergrenzen einschließlich Sommerzeit, erlaubte Werte, Fremdschlüssel und Fehlermeldungen. Der gemeinsame Katalog wird in beiden Formen geprüft; dynamische Inhalte und Drittpersonenbeschreibungen bleiben unverändert.

`python3 tests/group-periods-integration.py` prüft zusätzlich die HTTP-Einstellung, Rollen, CSRF, Versionskonflikte, atomare Ablehnung ungültiger Werte, ältere Clients, Vorrang des laufenden Kurses und Isolation fremder Gruppen. Browserprüfungen decken die Gruppenauswahl mit Vorschau und beide Ansprachen in den zentralen Frontend-Bereichen sowie auf schmalen Bildschirmen ab.
