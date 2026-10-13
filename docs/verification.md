# Verifikation

Stand: 13.10.2026. Lokale PHP-CLI 8.5.5; Entwicklung über den eingebauten PHP-Webserver. Die Assets werden zusätzlich auf Integrität geprüft. Produktion benötigt PHP 8.2+.

Automatisch geprüft:

- 429 HTTP-API-/Sicherheitschecks gegen ein temporäres, unabhängig erzeugtes SQLite-Datenverzeichnis: Setup, CSRF, Portale, Passwortwechsel, Rollen, fremde Projekte, Traversal, Versionskonflikte, Ordner-Umbenennen, Gruppenrechte, globale und gruppenbezogene Sperren, Datenbank-Hostbeschränkung, Session-Widerruf, Statistik und editierbare Projekttypen. Die zusätzlichen Vorlagenprüfungen decken Initialisierung, Metadaten und Startdateien, unveränderte Bestandsprojekte, veraltete Adminänderungen, ungültige Pfade und Größen, eigene Typen in Gruppenprojekten, Sprachsperren, Deaktivierung und Löschung ohne Wiederherstellung der Defaults ab.
- 36 Checks für Gruppenprojekte und zwei echte CodeMirror-Zustände gegen eine isolierte PHP-API: gleichzeitige und überlappende Änderungen, Offline-Nachlauf, Unicode, Wiederherstellung nach verlorener Bestätigung, Zugriffsisolation, Mitgliedschaftsentzug, Umbenennen und Lebensdauer von Gruppenprojekten sowie vollständige Projektlöschung einschließlich Änderungsverlauf und Editor-Präsenz.
- 9 Office-Worker-Prüfungen für unterstützte Paketpfade, ausgeschlossene Dateien, ungültige ZIPs und Größen-/Anzahlgrenzen.
- 300 deterministische Vergleiche des PHP-ChangeSet-Protokolls mit CodeMirror, einschließlich Emoji, mehrzeiligem Text, Einfügungen und Löschungen.
- Migration einer bestehenden SQLite-Datenbank mit unveränderten persönlichen Projekt- und Dateidaten, gültigen Fremdschlüsseln und Löschkaskaden.
- 35 MySQL-Verbindungskonfigurations-/Fehlerchecks: Auswahl und Gültigkeit der offiziellen Hetzner-CA, Schutz gegen ähnlich benannte fremde Hosts, explizite CA-Konfiguration, lokaler Betrieb, fehlende CA und getrennte Fehlermeldungen ohne Offenlegung roher Treibertexte. Eine echte Verbindung zur produktiven Hetzner-Datenbank wurde nicht geprüft.
- 51 Validierungschecks für explizite Tabellenspalten und Schlüssel; zusätzlich 10 echte MariaDB-Ausführungschecks im isolierten CI-Service: ausschließlich gewählte Spalten, Primär-/UNIQUE-/Suchindizes, AUTO_INCREMENT und zusammengesetzte Schlüssel einschließlich abgelehnter Duplikate, variabler VARCHAR-Länge und DECIMAL-Genauigkeit.
- 20 SQL-Training-Compilerchecks und 11 kontextabhängige Vorschauchecks; zusätzlich vier Ausführungschecks für INSERT, SELECT, UPDATE und DELETE im isolierten MariaDB-CI-Service. Die HTTP-Tests prüfen echte SQLite-Ausführung, Mehrfach-INSERT, Rollback bei UNIQUE-Konflikten, verpflichtende Filter, LIMIT, Benutzerisolation, CSRF, Freigaben und Rücksetzen.
- 16 SQL-Policy-Checks, einschließlich Multi-Statements, Dateisystemzugriff, Systemschemata, UDFs und Ressourcenfallen.
- PHP-Syntaxprüfung aller ausgelieferten PHP-Dateien.
- SHA-256-Prüfung der 63 mitgelieferten Frontend-/Runtime-/Font-/Lizenzassets und des Datenbank-CA-Zertifikats.
- Syntaxprüfung des Remote-Deployment-Scripts mit `bash -n`.

Im Codex-In-App-Browser praktisch geprüft:

- Benutzer- und Admin-Login mit ausschließlich lokalen synthetischen Demo-Zugängen.
- Dashboard, Editor, Gruppenchat-Ansicht, Adminübersicht, Benutzerformular mit persönlichen Freigaben, Dialog-Abbruch und Nutzungsstatistik.
- Projektübersicht: Löschaktion auf den Karten, Bestätigungsdialog mit Projektname und Hinweis auf sämtliche Dateien/Ordner, Fokus auf „Nein, behalten“ und Abbruch ohne Datenänderung. Die tatsächliche Löschung und Zugriffsrechte wurden gegen isolierte Testdaten geprüft.
- Neue Projektnavigation und gemeinsame Datei in zwei getrennten Editor-Tabs: beide Beiträge erreichen identische Inhalte.
- Simulierter Netzwerkausfall in einem Tab, parallele Änderungen im anderen Tab, Wiederverbindung und Neuladen: der lokale Entwurf bleibt erhalten und beide Editoren gleichen sich ab.
- Einklappbare Navigation im Lernenden- und Adminbereich: 76-Pixel-Icon-Leiste, Tastaturbedienung und Beschriftungen, Auf-/Zuklappen im offenen Editor, gespeicherte Ansicht nach Neuladen, getrennte Einstellungen je Portal und vollständiges mobiles Menü.
- Admin-Projekttypverwaltung: Standardtypen öffnen, eigene Vorlage anlegen, Code bearbeiten, Startdateien ergänzen und umbenennen, speichern und erneut öffnen. Ein daraus im Frontend angelegtes Projekt enthält die geprüften HTML- und CSS-Startdateien. Mobile Verwaltung bei 390 Pixeln ohne horizontalen Überlauf.
- Gruppenchat mit eigener temporärer Demo-Datenbank: Office-Anhang mit Nachricht und PDF ohne Nachricht hochladen, DOCX-Textvorschau und tatsächliche PDF-Darstellung, HTML ausschließlich als Quelltext, bytegenauer Originaldownload, Mitgliederanzeige, mobiles Layout bei 390 Pixeln ohne Überlauf. Admin-Gruppenverlauf, beide Moderationsdialoge mit Abbruch sowie Speichern/Neuladen des Uploadlimits geprüft. Tatsächliche Löschung und Freigaberegeln sind gegen isolierte API-Testdaten geprüft.
- Dynamische Tabellenanzeige mit synthetischer DB-Testdatenquelle und echtem App-Formular: neue Tabelle sofort ausgewählt mit geladenen Spalten, SQL-CREATE automatisch geöffnet, Auswahl nach Neuladen erhalten, externe Tabellen nach zehn Sekunden in der Liste, Auswahl/SQL-Entwurf erhalten, entfernte Auswahl ersetzt und leere Datenbank ohne veraltete Ansicht.
- Kontextabhängige Datentypfelder: VARCHAR-Zeichenlänge und DECIMAL-Stellen/Nachkommastellen, Typwechsel mit ausgeblendeten und deaktivierten Zusatzfeldern, erhaltene Eingabewerte und Prüfung „Nachkommastellen ≤ Stellen insgesamt“ im lokalen Browser.
- Tabellen-Dialog mit lokalen synthetischen Verbindungsmetadaten: leere Startspalte ohne implizite ID, selbst definierte ID mit Primärschlüssel und Hochzählen, UNIQUE, NULL-Regeln, zusammengesetzter Primärschlüssel, Entfernen von Spalten und Abbruch.
- Code-Schriftgröße im Lernenden-Editor: Plus/Minus verändern Schrift und Zeilennummern gemeinsam; Dateiwechselsicherheit und gespeicherte Größe nach erneutem Öffnen, Grenzen bei 10/28 Pixeln mit gesperrten Buttons, Rücksetzen auf 13 Pixel und unveränderter Speicherstatus praktisch geprüft.
- Verschiebbare Grenzen zwischen Dateiliste/Arbeitsbereich und Editor/Run-Ausgabe: Mausziehen und Pfeiltasten, gespeicherte Größen nach Neuladen, Doppelklick zum Zurücksetzen, breite Aufteilung bei 1700 Pixeln, Ziehen neben laufender Website-Vorschau sowie mobile Mindestgrößen ohne Seitenüberbreite.
- Responsive Darstellung bei 390 Pixeln Breite: Navigation bedienbar, keine horizontale Seitenüberbreite.
- PHP-Projekt: tatsächliche PHP-8.4-Ausführung, dynamische HTML-Liste und lokale CSS-Datei.
- Python-Projekt: tatsächliche Python-3.13-Ausführung mit Datum und Schleife, lesbarer Output.
- HTML/CSS/JS: gerenderte Website und funktionierender JavaScript-Button in der isolierten Vorschau.

Nicht verifiziert: Live-Deployment auf dem individuellen MA130, produktive MySQL/MariaDB-Tabellenoperationen, Verhalten unter hoher paralleler Last, unabhängiges Penetrationstest-Audit und alle Browser-/Gerätekombinationen. Der MySQL-Treiber war lokal vorhanden; ein echter Datenbankserver und produktive Zugangsdaten lagen nicht vor. Keine Aussage „maximal sicher“ ersetzt ein solches Betriebsaudit.

SQL Training im lokalen Browser: Spalten per Mausgeste ziehen und per Klick hinzufügen; mobile Ansicht bei 390 Pixeln ohne horizontalen Überlauf; INSERT und UPDATE mit sofortiger Tabellenaktualisierung, kontextabhängige Filter, Live-SELECT mit Sortierung, Datensatz als Schlüsselfilter und DELETE-Rückfrage mit Abbruch.

Lehrerrolle: Rollen-Constraint und automatische Bestandsmigration, Teilnehmerauswahl ohne Zugangsdaten, Beschränkung auf gemeinsame Gruppen, persönliche Projekt-/Dateibearbeitung, Versionskonflikte, CSRF, gesperrte Projektlöschung/Übertragung, Rechteentzug bei Entfernen von Lehrer oder Teilnehmer und Session-Widerruf bei Rollenwechsel. Im lokalen Browser wurden Gruppenauswahl, Teilnehmerprojekte, Editor-Speichern abgebrochener Teilnehmerwechsel mit erhaltenem Entwurf, Namenssuche bei 13 Teilnehmern, leere Teilnehmer-Workspaces, dritte Rolle im Adminformular und mobiles Layout bei 390 Pixeln ohne Seitenüberlauf geprüft.

Projekt-Uploads: Originalbytes und Sicherheitsheader, persönliche/Lehrer-/Gruppenrechte, CSRF, Traversal, Typ-/Größenfreigaben, Konflikte ohne Überschreiben, Ausschluss von Texteditor und Code-Bundle, Umbenennen, Löschkaskaden, Dateizähler und gemeinsame Speicherquote mit echtem 20-MB-Testblob. Im lokalen Browser: DOCX-, PNG- und PDF-Uploads mit sofortiger Liste, Office-Text, tatsächlich dekodiertes Bild, gerenderte PDF-Seite, mobile Ansicht ohne Seitenüberlauf und Admin-Uploadabschnitt.

Anmeldedauer: 21 isolierte PHP-Checks für den Acht-Stunden-Standard, exakte Ablaufgrenze, Inaktivität innerhalb der Laufzeit, lange konfigurierte Sitzungen, Verkürzung bei laufenden Sitzungen, fehlende Zeitstempel, keine Wiederbelebung abgelaufener Authentifizierung, PHP-Garbage-Collection und Eingabegrenzen. HTTP-Tests prüfen Adminrechte, Speichern, Auslesen, ungültige Werte und unveränderte Einstellung bei älteren Clients. Im lokalen Browser wurde der Standardwert 8 gespeichert und nach Neuladen erneut geprüft.

Upload-Dialog: Dateiauswahl über die Dropzone per Enter und Klick, Upload in ein anderes Zielprojekt mit tatsächlicher Datei im Ziel, Vorauswahl in einer neuen Browser-Tab, getrennte Vorauswahl für zwei Demo-Benutzer, Entfernen der Auswahl, verpflichtendes Zielprojekt und mobiles Layout bei 390 Pixeln geprüft. Native Betriebssystem-Datei-Drags wurden nicht automatisiert; die HTML-Drag-/Drop-Handler verwenden die abgelegten Dateien aus DataTransfer und dieselbe Dateiprüfung wie die Klickauswahl.

Projektbilder in der Website-Vorschau: 15 Pfad-/Sicherheitsprüfungen für Unterordner, Rootpfade, URL-kodierte Namen, Query/Fragment, CSS-Quellpfade, fehlende/externe Ressourcen und MIME-Ablehnung. Die API prüft autorisierte Bildmetadaten getrennt von ausführbaren Textdateien und unterdrückt sie bei Dateisperren. Im lokalen Browser wurde ein echtes PNG im Editor mit Run und im separaten Vorschaufenster dekodiert (160 Pixel Originalbreite); der CSS-Hintergrund verwendet ebenfalls die geladenen Bilddaten.
