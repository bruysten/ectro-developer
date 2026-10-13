# Entrosphere Developer

Eine Entwicklungsumgebung für Schulungen und Online-Trainings. HTML/CSS/JavaScript im Frontend, PHP-JSON-API, SQLite als privater Anwendungsspeicher und ein MySQL/MariaDB-Manager für eigene Kursdatenbanken. Python wird für die standardbibliotheksbasierte Deployment-Prüfung verwendet. Alle fertigen Browser-Assets liegen im Repository.

## Umfang

- `/`: Benutzer-Login und persönlicher Workspace.
- `/admin/`: eigener Admin-Login, Benutzer, optionale Mehrfach-Gruppenzuordnung, Projekttypen mit editierbaren Startdateien, globale und gruppenbezogene Funktionsfreigaben und Nutzungsstatistik.
- Dashboard mit realen Projekten und Nutzungsereignissen.
- Eigener Navigationsbereich „Projekte“ mit persönlichen und optionalen Gruppenprojekten. Neue Projekte können direkt in einer eigenen Gruppe entstehen; persönliche Projekte lassen sich in deren Workspace verschieben.
- Gruppenprojekte mit automatisch synchronisiertem Editor, paralleler Bearbeitung, Anzeige aktiver Mitglieder und Entwurfswiederherstellung im selben Browser-Tab. Sie überstehen das Löschen ihres Erstellers.
- Datenbankgestützte Projekttypen auf Basis von Web, PHP oder Python; Admins können Typen anlegen, bearbeiten, deaktivieren und löschen sowie Startdateien hinzufügen, bearbeiten, umbenennen und entfernen. Änderungen gelten für neue Projekte.
- Projekte mit Web-, PHP- und Python-Vorlagen; Text-Dateimanager mit Ordnern, Umbenennen, Löschen und Download.
- CodeMirror-Editor mit Syntaxhervorhebung, Zeilennummern, Suche, Undo/Redo, `Ctrl/⌘ S`, `Ctrl/⌘ Enter` und Konflikterkennung beim Speichern.
- Verschiebbare Trennlinien zwischen Dateiliste, Editor und Ausgabe, gespeicherte Größen, Tastaturbedienung und Doppelklick zum Zurücksetzen.
- HTML/CSS/JavaScript-Vorschau, PHP 8.4 und Python 3.13 über mitgeliefertes WebAssembly; Run, Stop, Ausgabe und Website-Vorschau in einem eigenen Fenster.
- MySQL-Verbindung, Tabellenanlage mit expliziten Spalten und Primär-/UNIQUE-/Suchschlüsseln (keine automatisch ergänzte ID), SQL-Konsole und Datensätze anlegen, bearbeiten und löschen. Bearbeiten/Löschen benötigt einen Primärschlüssel; zusammengesetzte Schlüssel werden berücksichtigt.
- Gruppenchat mit inkrementeller AJAX-Aktualisierung.

## Ausführung und bewusste Grenzen

Lernenden-Code läuft **im Browser**, in einem Worker innerhalb eines Iframes ohne gemeinsame Origin. HTML/JavaScript-Ausgaben erhalten eine weitere isolierte Vorschau. Die Anwendung führt keine hochgeladenen PHP-/Python-Dateien mit den Serverrechten der Anwendung aus.

Damit sind keine Docker-Installation, Rootrechte, Prozessdienste, npm, Composer oder pip auf dem Hetzner-Server nötig. Es handelt sich um eine Lernumgebung, nicht um einen öffentlichen Hostingdienst für beliebige Serveranwendungen. [Details zu Laufzeiten und Sicherheit](docs/architecture.md).

**MySQL ist im Datenbankmanager live nutzbar. Die Browser-PHP-/Python-Scripts haben keine direkte PDO-/TCP-Verbindung zu MySQL.** Server-Netzwerk, Shell, Python-Pakete von pip, persistente Laufzeit-Dateiänderungen, PHP-Sessions über mehrere Runs und POST-Formulare in der Vorschau sind nicht Teil dieser Ausführung. GET-Formulare, Links zwischen lokalen HTML/PHP-Seiten und PHP-Includes innerhalb eines Projekts werden unterstützt. Die Vorschau bündelt lokale klassische CSS-/JS-Dateien; npm-/ES-Modul-Projekte benötigen einen vorherigen Build.

Aktuell werden UTF-8-Textdateien bis 512 KB, 300 Einträge pro Projekt, jeweils 30 Projekte und 20 MB pro persönlichem oder Gruppen-Workspace unterstützt. Binäre Medienuploads sind nicht implementiert. Python bringt die Standardbibliothek mit. Ein frischer Run startet eine frische Laufzeit; Änderungen aus Scripts werden nicht automatisch in die gespeicherten Dateien zurückgeschrieben.

## Deployment auf Hetzner

Die App ist als fertiges PHP-Paket auslieferbar. Einmalig werden Domain, HTTPS, PHP-Version, Dokumentenwurzel und SSH-Zugang in konsoleH sowie GitHub-Secrets gesetzt. Danach genügt ein Push auf `main` oder der Button **Run workflow**.

[Die vollständige kurze Deployment-Anleitung](docs/deploy-hetzner.md)

Es wurden keine Serverzugangsdaten bereitgestellt; ein Live-Deployment ist noch nicht erfolgt. Der MySQL-Manager benötigt separat eingerichtete Kursdatenbanken und zugehörige Benutzer mit ausschließlich deren Datenbankrechten.

## Lokal öffnen

PHP 8.2+ mit `pdo_sqlite`, `pdo_mysql`, `mbstring` und `sodium` genügt. Fertige Assets sind bereits vorhanden.

```sh
APP_SETUP_TOKEN='hier-einen-zufaelligen-schluessel-mit-32-zeichen-eintragen' php scripts/prepare.php --development
php -S 127.0.0.1:8080 -t public scripts/router.php
```

Im Browser `/admin/` öffnen und den ersten Admin mit dem Einrichtungsschlüssel anlegen. Für eine rein lokale Demo: `php scripts/demo.php`. Die drei Demo-Zugänge `admin@example.test`, `alex@example.test` und `robin@example.test` nutzen `development-demo-2026!`. Die Demo lässt sich ausschließlich in der Entwicklungsumgebung anlegen und wird nicht beim Deployment aufgerufen.

## Prüfen und weiterentwickeln

```sh
python3 tests/integration.py
php tests/sql-policy.php
php tests/project-migration.php
python3 scripts/preflight.py
```

Nur bei Änderungen am JavaScript-Quellcode sind lokale Build-Abhängigkeiten nötig:

```sh
npm ci --ignore-scripts
npm run build
node tests/collaboration.mjs
node tests/editor-changes.mjs
```

Bestehende SQLite-Datenbanken werden beim ersten Zugriff automatisch und transaktional erweitert. Auf dem Server sind keine zusätzlichen Installations- oder Migrationskommandos nötig.

Die generierten Dateien unter `public/assets/` und `docs/asset-integrity.json` anschließend mit versionieren. Ein Build auf dem Server findet nicht statt. Schriften lassen sich bei Bedarf lokal mit `python3 scripts/vendor-fonts.py` neu bündeln.

Das Entrosphere-Design-System wird mit originalen Farb-, Typografie-, Abstands-, Effekt- und Komponententokens verwendet. Die Website-Layoutvorgaben wurden für eine kompakte, responsive Lernanwendung interpretiert. Schriften und Icons werden selbst gehostet. [Drittanbieter und Lizenzen](docs/third-party.md).

### Chat-Dateien und Moderation

Im Gruppenchat lassen sich Dateien mit optionaler Nachricht teilen. Jeder Anhang bietet Vorschau und Originaldownload. PDF-Seiten werden lokal über PDF.js dargestellt; Code, CSV/JSON und andere Textdateien als Text, moderne Office-/OpenDocument-Dateien als begrenzte Textvorschau. Für alte binäre Office-Formate und Archive steht der Download bereit. Dateien und Nachrichten sind nur der Gruppe und Administratoren zugänglich.

Unter **Admin → Freigaben → Chat-Dateien** lassen sich Teilen, erlaubte Endungen und Uploadgröße einstellen. Das effektive Limit berücksichtigt die PHP-Uploadgrenzen; je Gruppe stehen 100 MB für Anhänge zur Verfügung. Die Gruppenkarte führt zur Chatverwaltung: einzelne Nachrichten samt Anhang löschen oder den gesamten Verlauf mit Rückfrage zurücksetzen. Es wird kein Serverpaket benötigt.

### Lehrerzugang

Im Adminbereich beim Anlegen oder Bearbeiten eines Benutzers die Rolle **Lehrer** wählen und die zu betreuenden Gruppen zuordnen. Lehrer melden sich am normalen Benutzer-Login an. In Projekte, Dateien und Editor wählen sie Gruppe und Teilnehmer, sehen deren persönliche Projekte und bearbeiten Dateien direkt im vorhandenen Editor. „Mein Workspace“ führt zurück zu den eigenen Projekten. Der Zugriff endet mit dem Entzug der gemeinsamen Gruppenzugehörigkeit; konkurrierende Änderungen werden durch die Versionsprüfung geschützt. Die Rollen-Erweiterung wird beim nächsten App-Aufruf automatisch auf bestehenden Installationen eingerichtet.
