# Einfaches GitHub-Deployment auf dem Hetzner MA130

## Einmalige Einstellungen

Der MA130 wird als Managed Server mit SSH und konsoleH angeboten; Rootzugang ist bei Managed Servern nicht vorgesehen. PHP-Versionen können in konsoleH gewählt werden; Hetzner beschreibt FCGI/FPM-Anbindung an Apache. Die App benötigt davon ausschließlich Apache und PHP sowie das bereits vorhandene Python für den Integritätscheck. Quellen: [MA130](https://www.hetzner.com/de/managed-server/ma130/), [Managed Server](https://www.hetzner.com/managed-server/), [PHP-Konfiguration](https://docs.hetzner.com/managed/webserver/php-configuration/). Stand: 12.10.2026.

1. In konsoleH eine Domain oder Subdomain einrichten, HTTPS aktivieren und **PHP 8.2 oder neuer** wählen. HTTPS für die gesamte Anwendung erzwingen. Die PHP-CLI für den SSH-Benutzer muss ebenfalls mindestens 8.2 sein. Prüfen: `php -v`.
2. SSH-Zugang mit einem eigenen Deployment-Schlüssel bereitstellen. Bei konsoleH ist SSH laut [Hetzner-Dokumentation](https://docs.hetzner.com/managed/administration-on-konsoleh/access-details/ssh/) auf **Port 222** verfügbar, ausschließlich für den Haupt-FTP-Benutzer. Der Workflow verwendet diesen Port standardmäßig. Die Anwendung und Daten sollen in einem eigenen Hostingkonto liegen. Als Beispiel dient `/usr/home/IHR_BENUTZER/developer`. Dieser Pfad darf keine Leerzeichen enthalten.
3. Dokumentenwurzel der Domain auf `/usr/home/IHR_BENUTZER/developer/current/public` setzen. **Nur `public/` ist öffentlich.** Die ganze Repository-Wurzel darf nicht zum Dokumentenverzeichnis werden.
4. PHP-Erweiterungen `pdo_sqlite`, `pdo_mysql`, `mbstring`, `sodium`, `session` müssen vorhanden sein. Der Deployment-Preflight bricht bei fehlenden Voraussetzungen ab. Keine Erweiterungen werden eigenständig installiert. Apache muss die mitgelieferten `.htaccess`-Dateien für `Options`, `Require`, `AddType` und `Header` erlauben; `mod_headers` wird für die CORS-Header der isolierten Laufzeit benötigt.
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

Ein weiterer Push auf `main` startet dasselbe Deployment. Daten und Schlüssel in `shared/` bleiben erhalten. Falls ein Preflight fehlschlägt, bleibt der vorherige Release aktiv. Der HTTPS-Check läuft nach Aktivierung; schlägt ausschließlich dieser Check fehl, meldet GitHub einen Fehler, rollt aber nicht automatisch zurück.

Ein früherer Release kann per SSH über den `current`-Symlink wieder aktiviert werden. Beispielsweise aus dem Basisverzeichnis:

```sh
ln -s releases/FRUEHERE_COMMIT_SHA current.rollback
mv -Tf current.rollback current
```

Nur bekannte, geprüfte Release-IDs einsetzen. Alte Releases werden bewusst nicht automatisch gelöscht. Bei zukünftigen Schemaänderungen müssen Rollback-Kompatibilität und Datenmigration separat geprüft werden.

## MySQL-Kurse

In konsoleH pro Lernendem eine eigene Datenbank und einen Benutzer mit Rechten ausschließlich auf dieser Datenbank anlegen. Im Adminbereich unter **Freigaben** den benötigten Host freigeben. Der Lernende trägt seine Verbindung unter **Datenbanken** ein. Für den vorgesehenen lokalen Betrieb `localhost` verwenden. Für entfernte Hosts ist TLS samt vertrauenswürdigem CA-Zertifikat erforderlich; `mysql_tls_ca` kann in der privaten Konfiguration angepasst werden. Direktes MySQL aus PHP-/Python-Browser-Scripts ist nicht enthalten; siehe README.

## Prüfen nach dem ersten Deployment

Mit einem echten Lernenden-Zugang HTML/JS, PHP und Python ausführen und eine HTML/PHP-Datei in der Browser-Vorschau öffnen. Eine Kursdatenbank verbinden, Tabelle und Datensatz anlegen und editieren. Zwei Benutzer einer Gruppe und einen Benutzer einer fremden Gruppe für den Chat verwenden. Sicherstellen, dass `/app/`, `/var/` und `/config.local.php` über die Domain nicht erreichbar sind. Die aktuelle automatisierte Suite prüft die API mit SQLite; eine echte MySQL-Instanz und der konkrete Hetzner-Server sind lokal nicht verifiziert worden.
