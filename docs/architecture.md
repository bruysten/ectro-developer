# Architektur und Betriebsgrenzen

## Datenfluss

```text
Browser-Oberfläche → /api/ → PHP → private SQLite-Datei
                             └─→ freigegebener MySQL-Host / eigene Kursdatenbank

Projektdateien → MessageChannel → opaque Iframe → Worker → PHP.wasm / Pyodide
                                                        └→ Ausgabe
Ausgabe → weiteres Iframe ohne gemeinsame Origin → Website-Vorschau
```

PHP- und Python-Lernenden-Code läuft nicht auf dem Hostbetriebssystem. Python auf dem Server führt ausschließlich die fest ausgelieferte Asset-Prüfung aus. Die Anwendung benötigt keinen Python-Daemon.

## Vertrauensgrenzen

- Authentifizierte PHP-API: jede Projekt-/Dateioperation filtert mit der Benutzer-ID aus der Session. IDs aus Anfragen sind keine Autorisierung.
- Admin-API: zusätzliche Rollenprüfung bei jeder Anfrage. Der Benutzer-Login akzeptiert keine Adminzugänge und umgekehrt.
- Gruppenchat: Gruppenmitgliedschaft wird bei jedem Lesen und Schreiben geprüft. Inhalte werden im UI als escaped Text dargestellt.
- Rechte: globale Sperren, Sperren aus jeder Gruppe und benutzerbezogene Sperren werden verknüpft. Eine Gruppenzuordnung kann keine globale Sperre aufheben.
- Dateien: Inhalte liegen als Daten in SQLite, außerhalb des Webroots. Keine Benutzerdatei wird als Server-PHP eingebunden. Relative Pfade werden validiert; versteckte Dateien und Traversal sind gesperrt. Persönliche Dateien verwenden eine Versionsnummer und liefern bei Konflikten HTTP 409. Gruppendateien verwenden das nachfolgend beschriebene Änderungsprotokoll.
- Browser-Laufzeit: Iframe mit `sandbox="allow-scripts"`, ohne `allow-same-origin`. Der Controller akzeptiert ausschließlich die Elternseite seiner eigenen App-Origin. Der Elternteil überprüft die tatsächliche Frame-Quelle und nutzt einen MessageChannel. Im Lernenden-Worker gibt es keine App-Session, keinen CSRF-Schlüssel und keine Datenbankpasswörter.
- Sandbox-CSP: Netzwerkzugriff ist nur zum öffentlichen Runtime-Asset-Verzeichnis möglich. Die Ausgabe-CSP sperrt Netzwerk, Frames, Plugins und Formularübertragung. HTML-Output wird niemals in das App-Dokument geschrieben.
- Laufzeitgrenzen: maximal 60 Sekunden für Initialisierung, danach 8 Sekunden bis zur Worker-Terminierung; expliziter Stop. Python-Ausgabe wird auf 100 KB begrenzt. PHP hat ein 64-MB-Speicherlimit und zusätzlich die Worker-Frist; zurückgegebene Ausgabe wird auf 100 KB gekürzt. Die Frist gilt für Worker-Ausführungen; JavaScript mit DOM-Zugriff in der HTML-Vorschau läuft im Frame und besitzt keine durchsetzbare CPU-Frist. Eine Endlosschleife dort kann den Browser-Tab blockieren. Browserressourcen sind nicht mit einer Betriebssystem-Sandbox oder serverseitigen RAM-Quota gleichzusetzen.
- Virtuelle Dateien: Scripts sehen ausschließlich die mitgegebenen Projektdateien und die virtuelle Standardbibliothek. Writes sind flüchtig. Nach jedem Run wird die Laufzeit entfernt.

## Authentifizierung und Speicherung

Passwörter nutzen PHP `password_hash`/`password_verify`. Sessions werden beim Login und Passwortwechsel erneuert. Cookies sind HttpOnly, SameSite Strict und in Produktion Secure. Sessions verfallen nach 60 Minuten ohne API-Aktivität bzw. 12 Stunden absolut. Eine geänderte `auth_version` widerruft bereits angemeldete Sessions bei der nächsten Anfrage; Sperren wirken ebenfalls unmittelbar. Vorläufige Benutzerpasswörter müssen vor Nutzung ersetzt werden.

Schreiboperationen benötigen einen Session-CSRF-Token im Header und POST. Login/Setup, Chat, Runs und MySQL haben Ratenlimits; IPs werden hierfür mit dem privaten Schlüssel gehasht. Fehlerantworten enthalten keine Treiber-Zugangsdaten oder Stacktraces.

`config.local.php`, `var/app.sqlite`, SQLite-WAL-Dateien und Sessions liegen außerhalb von `public/`. Der zufällige 32-Byte-Schlüssel verschlüsselt MySQL-Passwörter mit libsodium Secretbox. Den Schlüssel mit dem Speicher sichern; ohne ihn lassen sich gespeicherte Datenbankpasswörter nicht wiederherstellen. Die SQLite-Datei als Ganzes wird nicht verschlüsselt. Dateisystemrechte, HTTPS und Serverbackups gehören zur Betriebsumgebung.

## MySQL

Nur explizit freigegebene Hosts auf Port 3306 sind erreichbar. Host und Benutzer werden nicht als Shellkommandos verwendet; Datenbanknamen können keine DSN-Zusätze enthalten. Zugangsdaten werden nach einer erfolgreichen Verbindung gespeichert. PDO nutzt native Prepared Statements, deaktivierte Multi-Statements und deaktivierte LOCAL INFILE.

Die SQL-Konsole erlaubt einzelne Lernabfragen und Tabellen-DDL. Kommentare, Dateisystemzugriffe, Administration, UDFs, Systemschemata und bekannte Ressourcenfallen sind gesperrt. Ergebnisse werden auf 200 Zeilen gekürzt; Tabellenansichten paginieren in 100er-Schritten. MariaDB `max_statement_time` bzw. MySQL `MAX_EXECUTION_TIME` wird gesetzt, sofern unterstützt. Diese Limits garantieren nicht für jede MySQL-Version eine Frist für beliebige schreibende SQL-Anfragen.

**Die eigentliche Datenbankgrenze sind MySQL-GRANTs.** Jede Kursdatenbank muss einen eigenen eingeschränkten MySQL-Benutzer erhalten. Die SQL-Policy ersetzt diese Rechte nicht. Lokale Datenbankverbindungen über localhost sind vorgesehen. Entfernte Hosts benötigen TLS mit CA- und Hostprüfung; zusätzlich wird ein ausgehandelter TLS-Cipher kontrolliert. Der CA-Pfad ist über `mysql_tls_ca` in der privaten Konfiguration einstellbar, standardmäßig `/etc/ssl/certs/ca-certificates.crt`. Es gibt keinen Rückfall auf Klartext. Ein Server mit selbstsigniertem Zertifikat benötigt eine passende vertrauenswürdige CA.

Der Editor besitzt keine Netzwerkbrücke zu MySQL. Direkte serverseitige PHP/Python-Apps mit PDO, HTTP-Netzwerk und persistenten Sessions benötigen zusätzlich eine pro Benutzer isolierte Ausführungsplattform. Eine solche Plattform kann nicht durch eine sichere PHP-`exec`-Funktion unter demselben Hostingkonto ersetzt werden.

## Betrieb

SQLite verwendet WAL, Fremdschlüssel und eine Busy-Frist. Kritische Änderungen verwenden Transaktionen; Registrierung des ersten Admins wird gegen parallele Einrichtung abgesichert. Dashboard und Statistik stammen aus gespeicherten Ereignissen; `run` zählt vom Client bestätigte Ausführungen, keine Prüfungsleistung. Ein Benutzer kann eigene Run-Ereignisse über die API melden; die Statistik ist kein manipulationssicherer Leistungsnachweis.

Chat und Statistik haben in dieser Version keine automatische Löschfrist. Für den Betrieb in Schulungen Aufbewahrung und Löschung festlegen. Das Löschen eines Benutzers entfernt persönliche Projekte, Zugangsdaten und dessen Chatnachrichten; Nutzungsereignisse behalten ihren Typ und Zeitpunkt mit leerer Benutzerzuordnung. Das Löschen einer Gruppe entfernt deren Chat sowie sämtliche Gruppenprojekte und deren Dateien. Gruppenprojekte gehören der Gruppe und bleiben beim Löschen ihres Erstellers bestehen. Es gibt keine Wiederherstellungsfunktion für solche Löschungen; tägliche Serverbackups und anwendungsspezifische Snapshots bereitstellen.

Unterstützt werden aktuelle Desktop-Browser mit ES-Modulen, WebAssembly und Web Workers. Für intensive Entwicklung ist ein Desktop-Bildschirm vorgesehen; Navigation und übrige Bereiche passen sich kleineren Bildschirmen an. Die Oberfläche setzt keine externen Font-/Runtime-CDNs voraus.

## Gruppenprojekte und gemeinsame Bearbeitung

Ein Projekt hat genau einen persönlichen oder einen Gruppen-Workspace. `created_by` bezeichnet den Ersteller, ohne Gruppenprojekte an dessen Lebensdauer zu binden. Nur aktuelle Mitglieder sehen Gruppenprojekte, Dateien, Bundles und Synchronisationsdaten. Mitgliedschaft wird bei jeder Anfrage und innerhalb schreibender Transaktionen geprüft. Bestehende Funktionssperren gelten weiter. Mitglieder dürfen Dateien verwalten; nur Ersteller oder ein Administrator darf das ganze Gruppenprojekt umbenennen oder löschen. Das Teilen eines persönlichen Projekts verschiebt es dauerhaft in den Gruppen-Workspace, einschließlich seiner Dateien. Ein Zurückziehen in einen persönlichen Workspace ist nicht vorgesehen.

Die Zusammenarbeit verwendet CodeMirrors offizielles `@codemirror/collab`-Protokoll mit operationaler Transformation: [Prinzipien und Referenzimplementierung](https://codemirror.net/examples/collab/). SQLite speichert die verbindliche Dateiversion und akzeptierte ChangeSets. PHP validiert und wendet deren UTF-16-Offsets Unicode-sicher an. Eine veraltete Einreichung wird nicht geschrieben; der Client erhält die zwischenzeitlichen Änderungen, transformiert seine noch unbestätigten Änderungen dagegen und reicht sie erneut ein. Beide Editoren folgen derselben Reihenfolge. Paralleles Bearbeiten derselben Textstelle kann beide Einfügungen enthalten und erfordert gegebenenfalls eine fachliche Nachbearbeitung des Codes.

Der Editor überträgt Änderungen nach ungefähr 400 ms Tipp-Pause, empfängt Änderungen anderer Teilnehmer üblicherweise alle 1,5 Sekunden und nutzt in versteckten Tabs einen längeren Abstand. Es gibt keine WebSocket- oder zusätzliche Dienstinstallation. Speichern und Run warten auf die Bestätigung ausstehender Änderungen. Aktive Mitglieder werden über kurze Heartbeats angezeigt. Cursorpositionen anderer Nutzer werden nicht dargestellt.

Unbestätigte Änderungen werden mit Ausgangstext, Version, ursprünglicher Client-Kennung und einzelnen ChangeSets im `sessionStorage` des Browser-Tabs gesichert. Dadurch können sie nach einem Verbindungsabbruch und Neuladen desselben Tabs fortgesetzt werden; verlorene Bestätigungen erzeugen keine doppelten Änderungen. Das setzt verfügbaren Browser-Speicher voraus und ist kein Backup nach dem Schließen des Tabs. Nach Bestätigung wird der Entwurf entfernt. Bei gelöschten Dateien, entzogenem Zugriff oder abgelaufenem Verlauf wird die Synchronisation angehalten und der Entwurf kann heruntergeladen werden. Die Wiederherstellung überschreibt nicht automatisch den Serverstand.

Das Journal behält höchstens 2.000 Änderungen bzw. 8 MB pro Datei und insgesamt 32 MB pro Gruppe. Zu lange getrennte Editoren erhalten einen ausdrücklichen Wiederherstellungszustand. Inhalt und alle Änderungen eines Batches werden atomar gespeichert. Dateiumbenennungen erhalten die Datei-ID und die Synchronisationsversion; offene Editoren folgen dem neuen Pfad. Die Dateiliste lässt sich über die Aktualisieren-Schaltfläche neu laden. Ein vollständiges `file.save` auf vorhandene Gruppendateien wird abgewiesen, um das Änderungsprotokoll nicht zu umgehen. Persönliche Editoren behalten die bisherige manuelle Speicherung.

Vorhandene Datenbanken werden beim ersten Zugriff unter einer SQLite-Schreibsperre migriert. Persönliche Besitzverhältnisse, IDs und Dateien bleiben erhalten; Fremdschlüssel und Löschkaskaden werden beibehalten. Es gibt keine neue Serverabhängigkeit.

## Gepflegte Projekttypen und Startdateien

`project_types` und `project_type_files` speichern die Vorlagen unabhängig von angelegten Projekten. Die bisherigen Web-, PHP- und Python-Vorlagen werden bei der ersten Verwendung einmalig unter einer Schreibsperre initialisiert. Ein Marker verhindert, dass bewusst gelöschte Standardtypen bei späteren Aufrufen oder Deployments wieder erscheinen. Die zusätzlichen Tabellen werden automatisch angelegt; vorhandene Projekte bleiben unverändert.

Unter `/admin/#templates` können Admins Name, Beschreibung, Projektart, Aktivstatus und die Startdateien gemeinsam bearbeiten. Die Projektart bestimmt die notwendige Sprachfreigabe für neue Projekte; es werden weiterhin die drei vorhandenen Browser-Laufzeiten verwendet. Dateiinhalte sind ausschließlich UTF-8-Text. Die Vorlagen werden nicht auf dem Server ausgeführt.

Das Speichern ersetzt Metadaten und Startdateien atomar und prüft eine Vorlagenversion. Veraltete Admin-Änderungen und Löschungen werden mit HTTP 409 abgewiesen. Der Editor behält den Entwurf und bietet einen JSON-Download an. Eingaben während einer laufenden Speicherung bleiben als ungespeichert markiert. Dateipfade werden auf Traversal, versteckte Dateien, doppelte Namen und Kollisionen zwischen Dateien und virtuellen Ordnern geprüft. Grenzen: 100 Typen, 100 Startdateien je Typ, 512 KB je Datei und 1 MB je Vorlage. Eine Vorlage ohne Startdateien ist möglich.

Die Lernenden erhalten über `templates` nur verfügbare Typen mit Metadaten und Dateizähler. Gesperrte Projektarten und deaktivierte Typen werden ausgeschlossen; die Projektanlage prüft diese Bedingungen nochmals innerhalb der Transaktion. Neue persönliche und Gruppenprojekte kopieren einen konsistenten Stand der Startdateien in ihren eigenen Speicher. Änderungen, Deaktivierung oder Löschen des Typs verändern keine vorhandenen Projekte.
