# Mailjet und Zugangsmails

## Einrichten

1. Im Adminbereich **Mailjet** öffnen.
2. Mailjets API-Key und Secret-Key, Absendername und bestätigte Absender-E-Mail eintragen. Die HTTPS-Adresse der Anwendung ohne Unterpfad angeben, beispielsweise `https://dev-academy.ectrosphere.com`.
3. Speichern und **Verbindung prüfen** verwenden. Diese Prüfung nutzt Mailjets [Sandbox-Modus](https://dev.mailjet.com/docs/email-api/send-api-v31/sandbox.mode): Daten werden validiert, aber keine Mail zugestellt.
4. Den Schalter **Mailversand aktivieren** einschalten und speichern.

Der Versand erfolgt im PHP-Backend per cURL über Mailjets [Send API v3.1](https://dev.mailjet.com/docs/email-api/send-api-v31/send-basic-email), mit HTTP Basic Auth über verifiziertes HTTPS. Keine SDK-/Composer-Installation und kein Cronjob erforderlich. PHP-cURL muss verfügbar sein; ohne diese Erweiterung bleibt die restliche App nutzbar, der Mailversand kann jedoch nicht aktiviert werden. Ausgehendes HTTPS zu `api.mailjet.com:443` muss erreichbar sein.

API-Key und Secret-Key werden mit dem bestehenden APP_KEY verschlüsselt im privaten SQLite-Speicher abgelegt und niemals wieder an den Browser ausgeliefert. Leere Schlüssel-Felder behalten die gespeicherte Verbindung bei. Zum Wechseln beide Schlüssel gemeinsam eingeben. APP_KEY und privaten Speicher zusammen sichern.

## Vorlagen

**Mailvorlagen** enthält automatisch einmalig zwei editierbare Standards: „Willkommen · Du“ und „Willkommen · Sie“. Weitere Vorlagen lassen sich anlegen, duplizieren und löschen. Du-/Sie-Standards stehen auch als Ausgangspunkt für neue Vorlagen bereit. Betreff und Text werden direkt bearbeitet; die Vorschau verwendet ausschließlich Beispieldaten.

| Variable | Inhalt |
| --- | --- |
| `{name}` | Name des Benutzers |
| `{email}` | Login-E-Mail |
| `{password}` | Vorläufiges Passwort |
| `{login_url}` | Benutzer-Login oder bei Administratoren `/admin/` |
| `{groups}` | Zugeordnete Gruppennamen, durch Komma getrennt |
| `{role}` | Lernender, Lehrer oder Administrator |
| `{app_name}` | Entrosphere Developer |

Zugangsvorlagen müssen `{email}`, `{password}` und `{login_url}` im Nachrichtentext enthalten. Unbekannte Variablen werden abgewiesen. Das Passwort ist im Betreff nicht erlaubt. Der Text erzeugt automatisch eine HTML-Mail mit sicher maskierten Werten und anklickbarem Login-Link sowie eine Textversion. Änderungen an Vorlagen und Verbindung werden über Versionsnummern vor gegenseitigem Überschreiben geschützt.

## Benutzer anlegen und senden

Im Dialog **Benutzer anlegen** optional **Zugangsdaten per E-Mail senden** aktivieren und eine Vorlage wählen. Die Aktion heißt dann **Anlegen & Mail senden**. Die Mail geht an die angegebene E-Mail-Adresse; der Benutzer muss sein Passwort beim ersten Login ändern. Ohne ausgewählte Versandoption wird keine Mail vorbereitet oder gesendet. Bei gesperrten Benutzern ist kein Versand möglich.

Benutzer und verschlüsselte Zugangsmail werden gemeinsam gespeichert. Anschließend erfolgt ein einzelner Versandversuch, außerhalb der Datenbanktransaktion. Ein Mailfehler löscht den angelegten Benutzer nicht. Wiederholte identische Anlegeanfragen verwenden den vorhandenen Vorgang und lösen keinen zweiten Versand aus.

## Status und Wiederholung

Unter **Mailjet → Zugangsmails** stehen die letzten 50 Vorgänge:

- **Von Mailjet angenommen** bestätigt die Übergabe, nicht die Zustellung. Zustellung und Bounces sind in Mailjet zu prüfen.
- **Abgelehnt** kann nach Korrektur der Verbindung gezielt erneut gesendet werden.
- **Status unklar** entsteht beispielsweise bei einer unterbrochenen Netzwerkantwort. Es erfolgt keine automatische Wiederholung. Vor manuellem Wiederholen zuerst Mailjet prüfen, um doppelte Mails zu vermeiden.
- **Abgelaufen** / **Zugang geändert** können nicht mehr gesendet werden. Neue Zugangsdaten müssen über die Benutzerverwaltung festgelegt und gegebenenfalls separat übermittelt werden.

Nach Annahme werden die vorbereiteten Zugangsdaten entfernt. Nicht angenommene Mails sind höchstens 24 Stunden lang wiederholbar. Bereinigung erfolgt bei Zugriff auf die Mailverwaltung und vor jedem Versand. Ein geändertes Passwort, eine veränderte E-Mail, Sperrung oder andere Zugangsänderung macht die vorbereitete Mail ungültig und löscht deren Inhalt. Benutzerlöschung entfernt zugehörige Vorgänge. Protokolle enthalten weder Mailtexte noch Passwörter oder API-Schlüssel.

## Prüfung

`php tests/mail.php`, `node tests/mail-templates.mjs` und `python3 tests/integration.py` prüfen Ersetzung, HTML-Maskierung, Verschlüsselung, API-Rechte/CSRF, Versionen, idempotente Anlegeanfragen, Annahme/Fehler/unklaren Status, explizite Wiederholung, Ablauf und Widerruf. Der Transport wird für die PHP-Prüfungen simuliert; die Tests senden keine echten E-Mails. Der Browser prüft Vorlage, Live-Vorschau, Speichern, Auswahl beim Benutzeranlegen und schmale Ansichten. Ein echter Mailjet-Test benötigt die konfigurierten Schlüssel und einen dort bestätigten Absender.
