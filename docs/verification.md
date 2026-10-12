# Verifikation

Stand: 12.10.2026. Lokale PHP-CLI 8.5.5; Entwicklung über den eingebauten PHP-Webserver. Die Assets werden zusätzlich auf Integrität geprüft. Produktion benötigt PHP 8.2+.

Automatisch geprüft:

- 76 HTTP-API-/Sicherheitschecks gegen ein temporäres, unabhängig erzeugtes SQLite-Datenverzeichnis: Setup, CSRF, Portale, Passwortwechsel, Rollen, fremde Projekte, Traversal, Versionskonflikte, Ordner-Umbenennen, Gruppenrechte, globale und gruppenbezogene Sperren, Datenbank-Hostbeschränkung, Session-Widerruf und Statistik.
- 16 SQL-Policy-Checks, einschließlich Multi-Statements, Dateisystemzugriff, Systemschemata, UDFs und Ressourcenfallen.
- PHP-Syntaxprüfung aller ausgelieferten PHP-Dateien.
- SHA-256-Prüfung der mitgelieferten Frontend-/Runtime-/Font-/Lizenzassets.
- Syntaxprüfung des Remote-Deployment-Scripts mit `bash -n`.

Im Codex-In-App-Browser praktisch geprüft:

- Benutzer- und Admin-Login mit ausschließlich lokalen synthetischen Demo-Zugängen.
- Dashboard, Editor, Gruppenchat-Ansicht, Adminübersicht, Benutzerformular mit persönlichen Freigaben, Dialog-Abbruch und Nutzungsstatistik.
- Responsive Darstellung bei 390 Pixeln Breite: Navigation bedienbar, keine horizontale Seitenüberbreite.
- PHP-Projekt: tatsächliche PHP-8.4-Ausführung, dynamische HTML-Liste und lokale CSS-Datei.
- Python-Projekt: tatsächliche Python-3.13-Ausführung mit Datum und Schleife, lesbarer Output.
- HTML/CSS/JS: gerenderte Website und funktionierender JavaScript-Button in der isolierten Vorschau.

Nicht verifiziert: Live-Deployment auf dem individuellen MA130, echte MySQL/MariaDB-Tabellenoperationen, Verhalten unter hoher paralleler Last, unabhängiges Penetrationstest-Audit und alle Browser-/Gerätekombinationen. Der MySQL-Treiber war lokal vorhanden; ein echter Datenbankserver und produktive Zugangsdaten lagen nicht vor. Keine Aussage „maximal sicher“ ersetzt ein solches Betriebsaudit.
