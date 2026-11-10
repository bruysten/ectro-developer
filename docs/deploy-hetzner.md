# Einfaches GitHub-Deployment auf dem Hetzner MA130

## Einmalige Einstellungen

Der MA130 wird als Managed Server mit SSH und konsoleH angeboten; Rootzugang ist bei Managed Servern nicht vorgesehen. PHP-Versionen können in konsoleH gewählt werden; Hetzner beschreibt FCGI/FPM-Anbindung an Apache. Die App benötigt davon ausschließlich Apache und PHP sowie das bereits vorhandene Python für den Integritätscheck. Quellen: [MA130](https://www.hetzner.com/de/managed-server/ma130/), [Managed Server](https://www.hetzner.com/managed-server/), [PHP-Konfiguration](https://docs.hetzner.com/managed/webserver/php-configuration/). Stand: 12.10.2026.

1. In konsoleH eine Domain oder Subdomain einrichten, HTTPS aktivieren und **PHP 8.2 oder neuer** wählen. HTTPS für die gesamte Anwendung erzwingen. Die PHP-CLI für den SSH-Benutzer muss ebenfalls mindestens 8.2 sein. Prüfen: `php -v`.
2. SSH-Zugang mit einem eigenen Deployment-Schlüssel bereitstellen. Bei konsoleH ist SSH laut [Hetzner-Dokumentation](https://docs.hetzner.com/managed/administration-on-konsoleh/access-details/ssh/) auf **Port 222** verfügbar, ausschließlich für den Haupt-FTP-Benutzer. Der Workflow verwendet diesen Port standardmäßig. Die Anwendung und Daten sollen in einem eigenen Hostingkonto liegen. Als Beispiel dient `/usr/home/IHR_BENUTZER/developer`. Dieser Pfad darf keine Leerzeichen enthalten.
3. Dokumentenwurzel der Domain auf `/usr/home/IHR_BENUTZER/developer/current/public` setzen. **Nur `public/` ist öffentlich.** Die ganze Repository-Wurzel darf nicht zum Dokumentenverzeichnis werden.
4. PHP-Erweiterungen `pdo_sqlite`, `pdo_mysql`, `mbstring`, `sodium`, `session` müssen vorhanden sein. Der Deployment-Preflight bricht bei fehlenden Voraussetzungen ab. Keine Erweiterungen werden eigenständig installiert. Apache muss die mitgelieferten `.htaccess`-Dateien für `Options`, `Require`, `AddType` und `Header` erlauben; `mod_headers` wird für die CORS-Header der isolierten Laufzeit benötigt. Für MCP/OAuth muss `mod_rewrite` aktiv sein; `CGIPassAuth On` reicht den Bearer-Header an CGI/FastCGI weiter. Die mitgelieferte, auf Protokoll-Endpunkte begrenzte `DirectorySlash`-Ausnahme und interne Rewrite-Regeln müssen erhalten bleiben: `/mcp` und `/mcp/` dürfen POST-Anfragen nicht per 301/302 umleiten.
5. Im GitHub-Repository ein Environment **production** und folgende Repository-/Environment-Secrets setzen:

| Secret | Inhalt |
|---|---|
| `HETZNER_HOST` | SSH-Hostname des Hostingkontos |
| `HETZNER_USER` | SSH-Benutzer |
| `HETZNER_SSH_PORT` | optional, standardmäßig `222` |
| `HETZNER_SSH_KEY` | privater Deployment-Schlüssel ohne Passphrase, mit engem Zugriff |
| `HETZNER_KNOWN_HOSTS` | verifizierter SSH-Hostschlüssel als known_hosts-Zeile, für Port 222 mit `[HOST]:222`; über vertrauenswürdigen Kanal gegenprüfen |
| `HETZNER_APP_ROOT` | privater Basispfad, z. B. `/usr/home/IHR_BENUTZER/developer` |
| `APP_SETUP_TOKEN` | zufälliger Einrichtungsschlüssel mit mindestens 32 Zeichen, z. B. aus einem Passwortmanager |
| `APP_URL` | HTTPS-Origin ohne Unterpfad, z. B. `https://developer.example.de` |

## Start

Den fertigen Repository-Inhalt auf `main` pushen und in GitHub unter **Actions → Deploy to Hetzner → Run workflow** starten. Der Workflow prüft PHP, API/Sicherheit, SQL-Policy und Asset-Integrität. Anschließend überträgt er die fertigen Dateien über SSH/rsync, legt einmalig die private Konfiguration und SQLite an und aktiviert den Release atomar. Es werden keine Systempakete oder Laufzeitabhängigkeiten installiert.

Solange die nötigen Secrets fehlen, laufen die Prüfungen bereits auf GitHub; das Server-Deployment wird mit einem Hinweis in der Workflow-Zusammenfassung übersprungen. Nach dem Hinterlegen der Secrets den Workflow erneut starten oder einen weiteren Push auf `main` ausführen.

Danach `https://IHRE-DOMAIN/admin/` öffnen, `APP_SETUP_TOKEN` eingeben und den ersten Administrator erstellen. Anschließend ist die Einrichtung gesperrt, auch wenn der Token bekannt bleibt. Benutzer und Gruppen können jetzt im Adminbereich angelegt werden; die Kursleitung übergibt vorläufige Passwörter auf einem passenden Kanal. Es gibt keinen E-Mail-Versand und keine Selbstregistrierung.

Die produktive Verzeichnisstruktur:

```text
developer/
  current -> releases/COMMIT_SHA
  releases/COMMIT_SHA/
    app/
    public/                  ← Dokumentenwurzel
    scripts/
    docs/
    config.local.php -> shared/config.local.php
    var -> shared/var
  shared/
    config.local.php         ← Schlüssel und Einrichtungstoken, 0600
    var/                     ← SQLite und Sessions, 0700
```

Der Server braucht `php`, `python3`, `bash`, `rsync` und die üblichen Linux-Kommandos. Diese Voraussetzungen und die Domain-Konfiguration sind vor dem ersten Deployment zu prüfen. Ein erfolgreicher lokaler Test bestätigt nicht automatisch die individuelle Hostingkonfiguration.

## Weitere Releases und Rollback

Ein weiterer Push auf `main` startet dasselbe Deployment. Daten und Schlüssel in `shared/` bleiben erhalten. `APP_URL` wird bei jedem Deployment als öffentliche MCP-/OAuth-Basisadresse übernommen; die bestehende private Konfiguration und ihr Verschlüsselungsschlüssel werden dabei nicht ersetzt. Falls ein Preflight fehlschlägt, bleibt der vorherige Release aktiv. Der HTTPS-Check prüft nach Aktivierung neben dem Bootstrap auch die OAuth-Discovery für MCP; schlägt ausschließlich dieser Check fehl, meldet GitHub einen Fehler, rollt aber nicht automatisch zurück.

Ein früherer Release kann per SSH über den `current`-Symlink wieder aktiviert werden. Beispielsweise aus dem Basisverzeichnis:

```sh
ln -s releases/FRUEHERE_COMMIT_SHA current.rollback
mv -Tf current.rollback current
```

Nur bekannte, geprüfte Release-IDs einsetzen. Alte Releases werden bewusst nicht automatisch gelöscht. Bei zukünftigen Schemaänderungen müssen Rollback-Kompatibilität und Datenmigration separat geprüft werden.

## MySQL-Kurse

In konsoleH pro Lernendem eine eigene Datenbank und einen Benutzer mit Rechten ausschließlich auf dieser Datenbank anlegen. Im Adminbereich unter **Freigaben → Systemeinstellungen → Datenbank-Hosts** den benötigten Host freigeben. Der Lernende trägt seine Verbindung unter **Datenbanken** ein. Für den vorgesehenen lokalen Betrieb `localhost` verwenden. Für Hosts wie `mj7p.your-database.de` wird automatisch das mitgelieferte offizielle Hetzner-Datenbank-CA-Zertifikat verwendet; dafür ist keine Serverinstallation nötig. Optional kann `mysql_hetzner_tls_ca` in der privaten Konfiguration überschrieben werden. Andere entfernte Hosts benötigen TLS samt vertrauenswürdigem CA-Zertifikat über `mysql_tls_ca`. Zertifikat- und Hostprüfung bleiben aktiv. Browser-Scripts verwenden für projektgebundenes SQL die serverseitig autorisierte `academy`-API; Zugangsdaten werden dabei nicht an den Scriptkontext übertragen. Siehe [Lernlabore](learning-labs.md).

## Prüfen nach dem ersten Deployment

Mit einem echten Lernenden-Zugang HTML/JS, PHP und Python ausführen und eine HTML/PHP-Datei in der Browser-Vorschau öffnen. Eine Kursdatenbank verbinden, Tabelle und Datensatz anlegen und editieren. Zwei Benutzer einer Gruppe und einen Benutzer einer fremden Gruppe für den Chat verwenden. Sicherstellen, dass `/app/`, `/var/` und `/config.local.php` über die Domain nicht erreichbar sind. Die aktuelle automatisierte Suite prüft die API mit SQLite; eine echte MySQL-Instanz und der konkrete Hetzner-Server sind lokal nicht verifiziert worden.

### Fehler beim Verbinden

Die App unterscheidet Anmeldung (1045/1698), fehlende Datenbankrechte (1044), unbekannte Datenbank (1049), DNS (2005), Erreichbarkeit (2002/2003), Verbindungsabbruch (2006/2013) und TLS (2026 bzw. mysqlnd-SSL-Fehler). Die Meldungen zeigen keinen rohen Treiberfehler und keine Zugangsdaten. Ein fehlender PDO-MySQL-Treiber wird gesondert gemeldet. Bei Hetzner die Verbindungsdaten in konsoleH verwenden; das Hauptpasswort wird benötigt, wenn Lernende auch Tabellenstrukturen verwalten sollen.

Quelle der mitgelieferten CA: [Hetzner MariaDB/MySQL](https://docs.hetzner.com/de/managed/databases/mariadb-mysql/), abgerufen am 13.10.2026. SHA-256-Zertifikatfingerprint: `0C:2F:66:73:68:A8:03:14:E2:45:5E:1D:FF:FE:89:64:85:4D:9D:11:2F:C6:F5:A3:68:CF:D2:AE:93:6A:74:27`; gültig bis 04.06.2032. Das Zertifikat wird mit dem Release ausgeliefert und zur Laufzeit nicht heruntergeladen.

### Chat-Uploads

Die vorgefertigten PDF-/Office-Vorschauen sind mitgeliefert. Anhänge liegen privat in der bestehenden SQLite-Datenbank; sie gehören zum Datenbankbackup. Keine zusätzliche Installation ist erforderlich. Für größere Uploads bei Bedarf `upload_max_filesize` und `post_max_size` in den PHP-Einstellungen des Hostings erhöhen; die App zeigt das aktuell wirksame Limit an und berücksichtigt einen Multipart-Puffer. Die Adminfreigabe ist auf 1–25 MB pro Datei begrenzt, der Dateispeicher auf 100 MB je Gruppe.

### MCP-Verbindungsaufbau prüfen

Bei „authorized, but … error when connecting“ auch den HTTP-Transport prüfen: Ein unauthentifizierter JSON-POST an **beide** Adressen `/mcp` und `/mcp/` muss direkt `401` mit JSON und `WWW-Authenticate` liefern, ohne `Location`-Header. Ein `301` auf das Verzeichnis mit Slash kann den POST in GET verwandeln und den Anfrageinhalt verlieren lassen. Die Discovery-Endpunkte unter `/.well-known/` antworten ebenfalls direkt. Die kanonische OAuth-Audience bleibt `/mcp/`; ausschließlich `/mcp` ist ein gleichwertiger Alias, kein anderer Pfad oder Host.

`python3 tests/apache-mcp.py` stellt die ursprüngliche Apache-Umleitung nach und prüft anschließend die ausgelieferte Konfiguration mit echten HTTP-Anfragen. `node tests/agent.mjs` prüft zusätzlich OAuth mit Claude-/ChatGPT-Callbacks, PKCE, Token-Erneuerung, Benutzer-/Gruppenrechte und MCP-Initialisierung. Die Apache-Prüfung arbeitet isoliert auf Loopback mit synthetischen Daten und ändert keine Systemkonfiguration.
