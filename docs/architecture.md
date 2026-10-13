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

Der Tabellen-Dialog erzeugt ausschließlich ausdrücklich definierte Spalten. Pro Spalte sind Primärschlüssel, UNIQUE oder ein Suchindex möglich; mehrere Primärspalten bilden einen zusammengesetzten Schlüssel. NULL und optionales AUTO_INCREMENT werden explizit konfiguriert. Automatisches Hochzählen benötigt in diesem Dialog einen einzelnen Primärschlüssel vom Typ INT oder BIGINT UNSIGNED. VARCHAR hat eine explizite Zeichenlänge (1–16383, bei Schlüsseln höchstens 768), DECIMAL explizite Gesamtstellen (1–65) und Nachkommastellen (0–30, höchstens Gesamtstellen) für MySQL-/MariaDB-Kompatibilität. Parameter werden nur bei passenden Typen akzeptiert; alte VARCHAR(255)-/DECIMAL(10,2)-Anfragen behalten ihre Standardwerte. Spaltennamen, Typen, Schlüsselarten und Optionen werden serverseitig validiert; es gibt keine versteckte ID-Spalte.

Die SQL-Konsole erlaubt einzelne Lernabfragen und Tabellen-DDL. Kommentare, Dateisystemzugriffe, Administration, UDFs, Systemschemata und bekannte Ressourcenfallen sind gesperrt. Ergebnisse werden auf 200 Zeilen gekürzt; Tabellenansichten paginieren in 100er-Schritten. MariaDB `max_statement_time` bzw. MySQL `MAX_EXECUTION_TIME` wird gesetzt, sofern unterstützt. Diese Limits garantieren nicht für jede MySQL-Version eine Frist für beliebige schreibende SQL-Anfragen.

**Die eigentliche Datenbankgrenze sind MySQL-GRANTs.** Jede Kursdatenbank muss einen eigenen eingeschränkten MySQL-Benutzer erhalten. Die SQL-Policy ersetzt diese Rechte nicht. Lokale Datenbankverbindungen über localhost sind vorgesehen. Entfernte Hosts benötigen TLS mit CA- und Hostprüfung; zusätzlich wird ein ausgehandelter TLS-Cipher kontrolliert. Für einzelne `*.your-database.de`-Hosts wird die offizielle mitgelieferte Hetzner-CA verwendet (`mysql_hetzner_tls_ca` überschreibt sie bei Bedarf). Für andere Hosts ist der CA-Pfad über `mysql_tls_ca` in der privaten Konfiguration einstellbar, standardmäßig `/etc/ssl/certs/ca-certificates.crt`. Es gibt keinen Rückfall auf Klartext. Ein Server mit selbstsigniertem Zertifikat benötigt eine passende vertrauenswürdige CA.

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

## Chat-Anhänge und Moderation

`chat_attachments` speichert Metadaten und Binärdaten als SQLite-BLOB mit Löschkaskade auf die Nachricht. Es gibt keine Uploads im öffentlichen Webverzeichnis und keine Serverausführung von Anhängen. Die neue Tabelle wird auf bestehenden Installationen automatisch angelegt. Multipart-Uploads benötigen gültige Sitzung, CSRF, Chatfreigabe und Gruppenmitgliedschaft. Dateiname, Endung, Inhaltgröße und Gruppenquota werden geprüft; maßgeblich ist die konfigurierte Endung, nicht der vom Browser gemeldete MIME-Typ. Dateien sind keine vertrauenswürdigen Inhalte.

`chat-file.php` prüft aktuelle Sitzung, Passwortwechselpflicht und Gruppenrechte bei jedem Download. Administratoren dürfen Gruppenverläufe prüfen. Standard ist ein Download als `application/octet-stream`, mit `nosniff`, restriktiver CSP und sicher kodiertem Dateinamen. Das Abschalten der Dateifreigabe oder Entfernen eines Dateityps verhindert neue Uploads; vorhandene Anhänge bleiben für berechtigte Mitglieder lesbar. Gruppenmitgliedschaftsentzug oder Chat-Sperre entzieht auch Zugriff auf bereits bekannte URLs.

Die Vorschau arbeitet lokal: PDF.js zeichnet PDF-Seiten ohne PDF-Scripting oder XFA; Bilder als Bild, Code/Text ausschließlich über `textContent`. Office-ZIPs werden in einem eigenen Worker auf bekannte Dokument-XMLs begrenzt (20 Teile, 2 MB pro Teil, 4 MB insgesamt, Zeitlimit). DTDs und Entity-Deklarationen werden vor der XML-Textauswertung abgelehnt. Makros, HTML und PHP werden nicht ausgeführt. Alte binäre Office-Dateien und Archive werden zum Download angeboten; die Office-Textvorschau ersetzt keine layoutgetreue Originalansicht.

Moderation verlangt Adminrolle und CSRF. Einzel- und Gesamtlöschung erfolgen in einer Transaktion mit Anhänge-Kaskade und Audit-Ereignis. `chat_state` erhöht die Revision; offene Chats verwerfen den alten Verlauf beim nächsten Poll und laden die aktuelle Ansicht. Verläufe sind in 100er-Seiten erreichbar, ältere Nachrichten lassen sich nachladen. `chat_presence` zeigt aktive Chatmitglieder anhand der letzten Anfrage innerhalb von 60 Sekunden. Die Anzeige ist eine ungefähre Präsenzanzeige, keine garantierte Online-Erkennung.

Die Datenbankansicht öffnet neu angelegte Tabellen unmittelbar. Nach SQL-Abfragen werden Tabellenliste und ausgewählte Datensätze erneut geladen. Im sichtbaren Datenbankbereich wird die Tabellenliste alle zehn Sekunden abgeglichen; bei offenen Dialogen oder laufenden SQL-Abfragen pausiert der Hintergrundabgleich. Auswahl und SQL-Entwurf bleiben erhalten; eine gelöschte Auswahl wird durch eine verfügbare Tabelle ersetzt. Die Tabellenauswahl wird pro Benutzer und Verbindung in der Browsersitzung gespeichert. Antwortfolgen und DOM-Referenzen verhindern, dass alte Antworten einen neueren Tabellen-/Seitenwechsel überschreiben.

## SQL Training

`/#sql-training` wird über „SQL Training“ in der Datenbankansicht geöffnet. Der Composer startet mit INSERT und bietet kontextabhängige Werte, Mehrfachdatensätze, NULL, SELECT/DISTINCT, WHERE/AND/OR, ORDER BY und LIMIT. Spalten lassen sich ziehen oder per Klick hinzufügen. SQL wird unmittelbar angezeigt; die debouncte Live-Auswahl liest nur. Schreibende Abfragen werden ausschließlich mit „Ausführen“ gestartet; UPDATE/DELETE benötigen einen Filter und eine Bestätigung.

Standardmäßig liegen persönliche Beispieldaten in `APP_DATA_DIR/sql-training/<user-id>.sqlite` (inklusive SQLite-WAL/SHM außerhalb des Webroots). Der Ordner wird automatisch mit Modus 0700 angelegt und gehört zum Backup des Datenverzeichnisses. Beim Benutzerlöschen werden seine Übungsdateien entfernt. Grenzen: 1000 Datensätze pro Übungstabelle, 20 MB Speicher, zehn Zeilen pro INSERT und höchstens 100 gelesene/geänderte Datensätze pro Abfrage. „Startdaten“ setzt nur den persönlichen Übungsbereich zurück. Die Übung verwendet SQLite; SQL-Anzeige und eigener Datenbankmodus verwenden MySQL-Syntax, UPDATE-/DELETE-Limits werden für SQLite über eine Rowid-Unterauswahl ausgeführt. MySQL-spezifische Funktionen und Datentypsemantik sind kein Bestandteil der SQLite-Übung.

Optional arbeitet der Composer mit der bereits verbundenen eigenen MySQL-/MariaDB-Datenbank und deren echten Spalten. Die API erzeugt eine einzelne Abfrage aus einem validierten Modell, erlaubt nur vier Operationen und bindet sämtliche Werte als Parameter. Tabellen/Spalten werden anhand der aktuellen Metadaten geprüft. Bestehende Host-, TLS-, Feature-, Session-, CSRF- und Ratenbeschränkungen gelten auch hier. Es sind keine neuen Pakete oder Installationen auf dem Server nötig.

## Lehrer und betreute Workspaces

Die dritte Benutzerrolle `teacher` („Lehrer“) verwendet den normalen Frontend-Login. Nur Administratoren vergeben diese Rolle und Gruppenmitgliedschaften. Die vorhandene SQLite-Rollenbedingung wird automatisch in einer Transaktion erweitert; Benutzer-IDs, Passwort-Hashes, Freigaben, Sessions und Fremdschlüsselbeziehungen bleiben erhalten. Fremdschlüssel werden vor dem Commit geprüft und danach wieder aktiviert.

Lehrer wählen in Projekte, Dateien und Editor eine eigene Gruppe und einen Teilnehmer. Die Auswahl gilt über diese Ansichten hinweg; „Mein Workspace“ zeigt wieder eigene Projekte. Bei mehr als zwölf Teilnehmern gibt es zusätzlich eine Namenssuche. Der Eigentümer bleibt sichtbar, und beim Wechsel schützt die Rückfrage ungespeicherte Änderungen. Das Anlegen neuer Projekte erfolgt weiterhin im eigenen oder gemeinsamen Workspace.

Die Auswahl liefert persönliche Projekte des Teilnehmers und Gruppenprojekte der ausgewählten gemeinsamen Gruppe. Die zentrale Projektprüfung erlaubt Lehrern persönliche Projekte anderer Benutzer/Lehrer ausschließlich bei aktuell gemeinsamer Gruppenzugehörigkeit. Damit gelten dieselben Regeln für Dateiliste, Lesen, Speichern, Umbenennen, Dateiverwaltung, Vorschau-Bundles und Ausführung. Andere Gruppen des Teilnehmers und persönliche Adminprojekte bleiben ausgeschlossen. Lehrer können betreute persönliche Projekte umbenennen und Dateien bearbeiten, aber das Projekt weder löschen noch auf eine Gruppe übertragen. Eigene Featurefreigaben und CSRF gelten unverändert. Fremde persönliche Dateiänderungen werden unter dem Lehrerzugang mit Projekt-/Eigentümerkennung protokolliert; Inhalte werden nicht im Protokoll gespeichert.

Gruppenmitgliedschaften werden bei jeder Anfrage und innerhalb schreibender Transaktionen geprüft. Rollenänderungen widerrufen bestehende Sessions. Persönliche Dateien behalten ihre Versionsprüfung: konkurrierende Änderungen von Lehrer und Teilnehmer werden mit 409 abgewiesen, ohne fremde Änderungen still zu überschreiben; Gruppenprojekte verwenden weiterhin die vorhandene CodeMirror-Synchronisation. Lehrer erhalten keine zusätzlichen Rechte auf Administration, fremde Datenbankzugänge oder fremde Chats.

## Projekt-Uploads

Der Dateimanager bietet „Hochladen“ für persönliche Projekte, Gruppenprojekte und berechtigte Lehrerzugriffe. Der Dialog enthält Dateiauswahl und editierbaren relativen Projektpfad. Vorhandene Dateien werden nicht überschrieben. PDF, Office, Raster-/Vektorbilder, RAW- und Grafikformate sind standardmäßig großzügig freigegeben; Administratoren steuern „Projekt-Uploads“ getrennt vom Chat unter Funktionen. Einstellbar sind Aktivierung, bis zu 160 konkrete Endungen und 1–20 MB Dateigröße. Das effektive Limit berücksichtigt zusätzlich die PHP-Einstellungen. Die bestehende Gesamtquote von 20 MB je persönlichem oder Gruppen-Workspace umfasst sowohl Code als auch Uploads.

Uploads erhalten `files.kind=asset` und einen privaten BLOB in `workspace_uploads` mit Fremdschlüssel auf die Datei. Die Tabelle wird automatisch eingerichtet. Dateizähler und Speicherstatistik berücksichtigen die Binärdateien; Umbenennen erhält das Format, Datei-/Ordner-/Projekt-/Benutzer-/Gruppenlöschung entfernt die Originale durch die vorhandenen Kaskaden. Keine Pakete oder Installation auf dem Server sind nötig; das bestehende SQLite-Backup enthält auch Projekt-Uploads.

`workspace-file.php` prüft Session, Passwortwechsel, Dateifreigabe und zentrale Projektrechte bei jedem Abruf. Originale werden ausschließlich mit Attachment-Disposition, `application/octet-stream`, `nosniff` und restriktiver CSP ausgeliefert. Die Vorschau nutzt den vorhandenen PDF-/Office-Renderer und native Bilddekodierung für unterstützte Formate. SVG wird als Text angezeigt; weitere Formate erhalten Originaldownload. Die Typfreigabe betrifft neue Uploads; vorhandene Originale bleiben für berechtigte Benutzer zugänglich. Aktivierungs-, Typ-, Größen-, Quoten- und Zugriffsregeln werden beim Schreiben erneut innerhalb der Transaktion geprüft.

Binärdateien sind Dokument-/Bildmaterial und werden nicht als Textcode gespeichert oder in ausführbare Projekt-Bundles übernommen. Uploads gelangen weder als ausführbare Dateien in den Webroot noch in PHP-/Python-Serverprozesse. Bildmaterial für ausgeführte Webseiten ist damit noch kein Bestandteil der isolierten Code-Laufzeit.
