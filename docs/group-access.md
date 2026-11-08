# Gruppen und Zugriff im Lernbereich

Die Anmeldung setzt keine Gruppenzuordnung voraus. Konten ohne jede Gruppe behalten ihren persönlichen Workspace. Bestehen Zuordnungen, benötigt der Lernbereich mindestens eine Gruppe mit offenem Zugriffszeitraum.

| Mitgliedschaften | Persönliche Arbeiten | Geteilte Arbeiten und Gruppenauswahl |
| --- | --- | --- |
| Keine Gruppe | Zugänglich | Keine Gruppen |
| Mindestens eine aktive Gruppe | Zugänglich, auch wenn andere Gruppen abgelaufen sind | Nur über die jeweils aktive Mitgliedsgruppe |
| Ausschließlich abgelaufene oder zukünftige Gruppen | Lernzugang derzeit geschlossen; Daten bleiben gespeichert | Keine zugänglichen Gruppen |

Ein persönliches Projekt bleibt Eigentum seines Users. Es erhält **keinen** einzelnen Gruppen-Fremdschlüssel: Sein Zugriff folgt indirekt den aktuell offenen Mitgliedschaften des Eigentümers. Ein Gruppenprojekt gehört dagegen genau einer Gruppe. Eine weitere aktive Mitgliedschaft öffnet niemals die Arbeiten einer abgelaufenen Gruppe. Dasselbe gilt für gemeinsam bearbeitete Canvases. Laborobjekte, Personas, Dateien, Vorschauen und projektbezogene Datenbankzugriffe erben die Projektberechtigung.

Lehrkräfte sehen private Teilnehmerprojekte nur über eine gemeinsam zugängliche Gruppe. Gruppenspezifische Projektvorlagen sind nur über eine aktive zugeordnete Mitgliedschaft verfügbar. Individuelle Freigaben und die Freigaben aktiver Gruppen bestimmen weiterhin die verfügbaren Funktionen; abgelaufene Gruppen schränken einen anderen aktiven Kurs nicht ein.

## Zeiträume und Administration

Für Sichtbarkeit und Berechtigungen zählen **Zugriff ab/bis**, einschließlich des Endtags in `Europe/Berlin`. Sommerzeitwechsel werden über Kalendergrenzen berechnet. Leere Grenzen sind unbeschränkt. **Kursbeginn/Kursende** bestimmen die Auswahl der Ansprache, nicht die Zugriffsfreigabe. Siehe [Ansprache nach Lerngruppe](group-address.md).

Auch Administratorkonten verwenden im Frontend ihre aktiven Mitgliedschaften. Im Adminbereich bleiben alle Gruppen, Zuordnungen und ihre Inhalte zur Verwaltung erreichbar. Dadurch können abgelaufene Zeiträume korrigiert werden, ohne dass sie als Lern-Workspace angeboten werden.

Frontend-Anfragen kennzeichnen ihre Oberfläche mit `X-Workspace-Portal: frontend`, Backend-Anfragen mit `admin`. Native Datei- und Bildlinks transportieren den Kontext als `workspace_portal`. Dieser Kontext gewährt niemals eine Administratorrolle: Der Verwaltungszugriff setzt immer ein authentifiziertes Administratorkonto voraus. Bestehende administrative API-Clients ohne Kontext behalten ihren bisherigen Verwaltungszugriff.

## Bereits geöffnete Sitzungen

Jede API-Anfrage prüft die aktuellen Berechtigungen serverseitig. Die Oberfläche aktualisiert zusätzlich Gruppen und Funktionen an der angekündigten Zeitgrenze, beim Fensterfokus und spätestens nach einer Minute. Die Sichtbarkeit wird unabhängig von der gewählten Ansprache verglichen.

Bei einer offenen Eingabe bleibt der Entwurf erhalten. Ungültige Gruppen-/Projektauswahlen werden entfernt. War eine solche Auswahl ausgewählt, fordert der Dialog ausdrücklich eine neue Auswahl an und verhindert das Absenden, statt still zu einem persönlichen Workspace zu wechseln. Entfällt der Zugriff auf die geöffnete Projektansicht, wird sie ausgeblendet und gesperrt; private Arbeiten über eine andere aktive Gruppe bleiben zugänglich. Canvas-Listen aktualisieren sich ebenfalls bei einer geänderten Gruppenzuordnung.

## Prüfung

`node tests/group-periods.mjs` prüft Kalendergrenzen, Ansprache, Änderungen der Sichtbarkeit ohne Ansprachewechsel, ungültig gewordene Auswahlen und die Weitergabe von HTTP-Fehlerstatus und Oberflächenkontext.

`python3 tests/group-periods-integration.py` verwendet eine isolierte Datenbank und prüft aktive, zukünftige und abgelaufene Gruppen, Konten ohne Gruppe, mehrere Mitgliedschaften, private und geteilte Projekte/Canvases, Laborobjekte, Projektvorlagen, Team/Profile, Dateilinks und getrennte Frontend-/Backend-Rechte für Administratoren. Die bestehenden API-, Labor- und Kollaborationstests sichern die übrigen Berechtigungen ab.
