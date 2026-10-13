# Verifikation

Stand: 13.10.2026. Lokale PHP-CLI 8.5.5; Entwicklung über den eingebauten PHP-Webserver. Die Assets werden zusätzlich auf Integrität geprüft. Produktion benötigt PHP 8.2+.

Automatisch geprüft:

- 218 HTTP-API-/Sicherheitschecks gegen ein temporäres, unabhängig erzeugtes SQLite-Datenverzeichnis: Setup, CSRF, Portale, Passwortwechsel, Rollen, fremde Projekte, Traversal, Versionskonflikte, Ordner-Umbenennen, Gruppenrechte, globale und gruppenbezogene Sperren, Datenbank-Hostbeschränkung, Session-Widerruf, Statistik und editierbare Projekttypen. Die zusätzlichen Vorlagenprüfungen decken Initialisierung, Metadaten und Startdateien, unveränderte Bestandsprojekte, veraltete Adminänderungen, ungültige Pfade und Größen, eigene Typen in Gruppenprojekten, Sprachsperren, Deaktivierung und Löschung ohne Wiederherstellung der Defaults ab.
- 36 Checks für Gruppenprojekte und zwei echte CodeMirror-Zustände gegen eine isolierte PHP-API: gleichzeitige und überlappende Änderungen, Offline-Nachlauf, Unicode, Wiederherstellung nach verlorener Bestätigung, Zugriffsisolation, Mitgliedschaftsentzug, Umbenennen und Lebensdauer von Gruppenprojekten sowie vollständige Projektlöschung einschließlich Änderungsverlauf und Editor-Präsenz.
- 300 deterministische Vergleiche des PHP-ChangeSet-Protokolls mit CodeMirror, einschließlich Emoji, mehrzeiligem Text, Einfügungen und Löschungen.
- Migration einer bestehenden SQLite-Datenbank mit unveränderten persönlichen Projekt- und Dateidaten, gültigen Fremdschlüsseln und Löschkaskaden.
- 16 SQL-Policy-Checks, einschließlich Multi-Statements, Dateisystemzugriff, Systemschemata, UDFs und Ressourcenfallen.
- PHP-Syntaxprüfung aller ausgelieferten PHP-Dateien.
- SHA-256-Prüfung der mitgelieferten Frontend-/Runtime-/Font-/Lizenzassets.
- Syntaxprüfung des Remote-Deployment-Scripts mit `bash -n`.

Im Codex-In-App-Browser praktisch geprüft:

- Benutzer- und Admin-Login mit ausschließlich lokalen synthetischen Demo-Zugängen.
- Dashboard, Editor, Gruppenchat-Ansicht, Adminübersicht, Benutzerformular mit persönlichen Freigaben, Dialog-Abbruch und Nutzungsstatistik.
- Projektübersicht: Löschaktion auf den Karten, Bestätigungsdialog mit Projektname und Hinweis auf sämtliche Dateien/Ordner, Fokus auf „Nein, behalten“ und Abbruch ohne Datenänderung. Die tatsächliche Löschung und Zugriffsrechte wurden gegen isolierte Testdaten geprüft.
- Neue Projektnavigation und gemeinsame Datei in zwei getrennten Editor-Tabs: beide Beiträge erreichen identische Inhalte.
- Simulierter Netzwerkausfall in einem Tab, parallele Änderungen im anderen Tab, Wiederverbindung und Neuladen: der lokale Entwurf bleibt erhalten und beide Editoren gleichen sich ab.
- Einklappbare Navigation im Lernenden- und Adminbereich: 76-Pixel-Icon-Leiste, Tastaturbedienung und Beschriftungen, Auf-/Zuklappen im offenen Editor, gespeicherte Ansicht nach Neuladen, getrennte Einstellungen je Portal und vollständiges mobiles Menü.
- Admin-Projekttypverwaltung: Standardtypen öffnen, eigene Vorlage anlegen, Code bearbeiten, Startdateien ergänzen und umbenennen, speichern und erneut öffnen. Ein daraus im Frontend angelegtes Projekt enthält die geprüften HTML- und CSS-Startdateien. Mobile Verwaltung bei 390 Pixeln ohne horizontalen Überlauf.
- Code-Schriftgröße im Lernenden-Editor: Plus/Minus verändern Schrift und Zeilennummern gemeinsam; Dateiwechselsicherheit und gespeicherte Größe nach erneutem Öffnen, Grenzen bei 10/28 Pixeln mit gesperrten Buttons, Rücksetzen auf 13 Pixel und unveränderter Speicherstatus praktisch geprüft.
- Verschiebbare Grenzen zwischen Dateiliste/Arbeitsbereich und Editor/Run-Ausgabe: Mausziehen und Pfeiltasten, gespeicherte Größen nach Neuladen, Doppelklick zum Zurücksetzen, breite Aufteilung bei 1700 Pixeln, Ziehen neben laufender Website-Vorschau sowie mobile Mindestgrößen ohne Seitenüberbreite.
- Responsive Darstellung bei 390 Pixeln Breite: Navigation bedienbar, keine horizontale Seitenüberbreite.
- PHP-Projekt: tatsächliche PHP-8.4-Ausführung, dynamische HTML-Liste und lokale CSS-Datei.
- Python-Projekt: tatsächliche Python-3.13-Ausführung mit Datum und Schleife, lesbarer Output.
- HTML/CSS/JS: gerenderte Website und funktionierender JavaScript-Button in der isolierten Vorschau.

Nicht verifiziert: Live-Deployment auf dem individuellen MA130, echte MySQL/MariaDB-Tabellenoperationen, Verhalten unter hoher paralleler Last, unabhängiges Penetrationstest-Audit und alle Browser-/Gerätekombinationen. Der MySQL-Treiber war lokal vorhanden; ein echter Datenbankserver und produktive Zugangsdaten lagen nicht vor. Keine Aussage „maximal sicher“ ersetzt ein solches Betriebsaudit.
