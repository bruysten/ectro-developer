<?php
declare(strict_types=1);
function allowedHosts(): array { return settings()['db_allowed_hosts'] ?? config()['db_allowed_hosts']; }
function mysqlTlsCa(string $host, ?array $cfg = null): ?string {
    if (in_array($host,['localhost','127.0.0.1'],true)) return null;
    $cfg ??= config();
    // Trust the provider CA only for its database hostname namespace.
    $hetzner = preg_match('/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.your-database\.de$/i',$host) === 1;
    $ca = $hetzner ? ($cfg['mysql_hetzner_tls_ca'] ?? APP_ROOT.'/app/certs/hetzner-mysql-ca.pem') : ($cfg['mysql_tls_ca'] ?? null);
    if (!is_string($ca) || !is_file($ca) || !is_readable($ca)) fail(503,'Das TLS-CA-Zertifikat für diesen Datenbank-Host ist nicht verfügbar. Bitte die Kursleitung informieren.');
    return $ca;
}
function mysqlConnectionFailure(PDOException $e): array {
    $code = (int)($e->errorInfo[1] ?? $e->getCode());
    // Some mysqlnd versions report certificate failures as transport error 2002.
    if ($code===2026 || ($code===2002 && preg_match('/\b(SSL|TLS|certificate|certificates)\b/i',$e->getMessage()))) {
        return [503,'Die verschlüsselte Datenbankverbindung ist fehlgeschlagen. Bitte TLS-Zertifikat und Datenbank-Hostname prüfen. (MySQL '.$code.')'];
    }
    $message = match ($code) {
        1045,1698 => 'Der Datenbankserver hat die Anmeldung abgelehnt. Bitte Datenbankbenutzer und das zugehörige Passwort prüfen.',
        1044 => 'Der Datenbankbenutzer hat keinen Zugriff auf diese Datenbank. Bitte die Zuordnung in der Hosting-Verwaltung prüfen.',
        1049 => 'Die angegebene Datenbank wurde auf diesem Server nicht gefunden. Bitte den Datenbanknamen prüfen.',
        2005 => 'Der Datenbank-Hostname konnte nicht aufgelöst werden. Bitte Hostname und DNS prüfen.',
        2002,2003 => 'Der Datenbankserver ist auf Port 3306 nicht erreichbar. Bitte Hostname, Netzwerkfreigabe und Serverstatus prüfen.',
        2006,2013 => 'Die Verbindung zum Datenbankserver wurde unterbrochen. Bitte erneut versuchen.',
        default => 'Die Datenbankverbindung konnte nicht hergestellt werden. Bitte die Kursleitung informieren.',
    };
    return [in_array($code,[2002,2003,2005,2006,2013],true)?503:422,$message.($code>0?' (MySQL '.$code.')':'')];
}
function mysqlConnection(array $u, ?array $conn = null): PDO {
    $conn ??= one('SELECT * FROM connections WHERE user_id=?', [$u['id']]);
    if (!$conn) fail(422, 'Bitte hinterlegen Sie zuerst Ihre Datenbankverbindung.');
    if (!in_array($conn['host'], allowedHosts(), true)) fail(403, 'Dieser Datenbank-Host ist nicht freigegeben.');
    if (!preg_match('/^[a-zA-Z0-9_-]{1,64}$/', $conn['db_name']) || !preg_match('/^[a-zA-Z0-9_.@-]{1,80}$/', $conn['username'])) fail(422, 'Ungültige Verbindungsdaten.');
    if (!in_array('mysql',PDO::getAvailableDrivers(),true)) fail(503,'Der PHP-MySQL-Treiber ist auf dem Server nicht verfügbar. Bitte PDO-MySQL in der Hosting-Verwaltung aktivieren.');
    $ca=mysqlTlsCa($conn['host']);
    $options=[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC, PDO::ATTR_TIMEOUT=>5, PDO::ATTR_EMULATE_PREPARES=>false, PDO::MYSQL_ATTR_MULTI_STATEMENTS=>false, PDO::MYSQL_ATTR_LOCAL_INFILE=>false];
    if ($ca !== null) {
        $options[PDO::MYSQL_ATTR_SSL_CA]=$ca;$options[PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT]=true;
    }
    try {
        $pdo = new PDO('mysql:host=' . $conn['host'] . ';port=3306;dbname=' . $conn['db_name'] . ';charset=utf8mb4', $conn['username'], decryptSecret($conn['secret']),
            $options);
        if (!in_array($conn['host'],['localhost','127.0.0.1'],true)) {
            $ssl=$pdo->query("SHOW STATUS LIKE 'Ssl_cipher'")->fetch(PDO::FETCH_NUM);
            if (!$ssl || empty($ssl[1])) fail(403,'Der entfernte Datenbankserver hat keine TLS-Verbindung hergestellt.');
        }
        try { $pdo->exec('SET SESSION max_statement_time=5'); } catch (PDOException) { try { $pdo->exec('SET SESSION MAX_EXECUTION_TIME=5000'); } catch (PDOException) {} }
        return $pdo;
    } catch (PDOException $e) { [$status,$message]=mysqlConnectionFailure($e);fail($status,$message); }
}
function identifier(string $value): string {
    if (!preg_match('/^[a-zA-Z_][a-zA-Z0-9_]{0,63}$/', $value)) fail(422, 'Bitte verwenden Sie Buchstaben, Zahlen und Unterstriche für Tabellen- und Spaltennamen.'); return '`' . $value . '`';
}
function mysqlError(PDOException $e): never {
    $code = (int)($e->errorInfo[1] ?? 0);
    $message = match ($code) { 1071 => 'Der gemeinsame Schlüssel ist zu lang. Bitte kürzere VARCHAR-Längen wählen.', 1118,1074 => 'Die Tabellenzeile ist zu groß. Bitte kürzere VARCHAR-Längen oder TEXT verwenden.', 1064 => 'Die SQL-Syntax ist nicht gültig.', 1062 => 'Dieser eindeutige Wert existiert bereits.', 1146 => 'Die Tabelle existiert nicht.', 1054 => 'Die Spalte existiert nicht.', 1044,1142,1227 => 'Der Datenbankbenutzer hat dafür keine Berechtigung.', 1451,1452 => 'Eine Fremdschlüssel-Beziehung verhindert diese Änderung.', 1205,1317,1969,3024 => 'Die Abfrage wurde wegen Zeitüberschreitung beendet.', default => 'Die Datenbank konnte diese Anfrage nicht ausführen.' };
    fail(422, $message . ' (MySQL ' . $code . ')');
}
function columnSqlType(array $field): string {
    $type=$field['type']??'';
    if (in_array($type,['VARCHAR','VARCHAR(255)'],true)) {
        $length=array_key_exists('length',$field)?$field['length']:255;
        if (!is_int($length)||$length<1||$length>16383) fail(422,'Max. Zeichen muss eine ganze Zahl zwischen 1 und 16383 sein.');
        if (($field['key']??'none')!=='none' && $length>768) fail(422,'Für eine VARCHAR-Spalte mit Schlüssel bitte höchstens 768 Zeichen verwenden.');
        if (array_key_exists('precision',$field)||array_key_exists('scale',$field)) fail(422,'VARCHAR benötigt nur eine Zeichenlänge.');
        return 'VARCHAR('.$length.')';
    }
    if (in_array($type,['DECIMAL','DECIMAL(10,2)'],true)) {
        $precision=array_key_exists('precision',$field)?$field['precision']:10;$scale=array_key_exists('scale',$field)?$field['scale']:2;
        if (!is_int($precision)||$precision<1||$precision>65||!is_int($scale)||$scale<0||$scale>30||$scale>$precision) fail(422,'DECIMAL benötigt 1–65 Stellen insgesamt und 0–30 Nachkommastellen, höchstens so viele wie Stellen insgesamt.');
        if (array_key_exists('length',$field)) fail(422,'DECIMAL benötigt Stellen insgesamt und Nachkommastellen.');
        return 'DECIMAL('.$precision.','.$scale.')';
    }
    if (!in_array($type,['TEXT','INT','BIGINT UNSIGNED','DATE','DATETIME','BOOLEAN'],true)) fail(422,'Ungültiger Spaltentyp.');
    foreach(['length','precision','scale'] as $option) if(array_key_exists($option,$field)) fail(422,'Dieser Datentyp benötigt keine Längenangabe.');
    return $type;
}
function createTableSql(string $table, mixed $fields): string {
    $table=identifier($table);
    if (!is_array($fields) || !array_is_list($fields) || count($fields)<1 || count($fields)>30) fail(422,'Bitte definieren Sie 1 bis 30 Spalten.');
    $defs=[];$primary=[];$indexes=[];$names=[];$auto=[];
    foreach ($fields as $field) {
        if (!is_array($field)) fail(422,'Ungültige Spalte.');
        $raw=textField($field,'name',64);$name=identifier($raw);$folded=strtolower($raw);
        if (isset($names[$folded])) fail(422,'Spaltennamen dürfen nicht doppelt vorkommen.');$names[$folded]=true;
        $type=columnSqlType($field);$key=$field['key']??'none';
        if (!in_array($key,['none','primary','unique','index'],true)) fail(422,'Ungültiger Schlüsseltyp.');
        if ($type==='TEXT' && $key!=='none') fail(422,'Für Schlüssel bitte VARCHAR statt TEXT verwenden.');
        $nullable=$field['nullable']??($key!=='primary');$increment=$field['auto_increment']??false;
        if (!is_bool($nullable)||!is_bool($increment)) fail(422,'Ungültige Spaltenoptionen.');
        if ($key==='primary' && $nullable) fail(422,'Primärschlüssel dürfen nicht leer (NULL) sein.');
        if ($increment && ($key!=='primary'||!in_array($type,['INT','BIGINT UNSIGNED'],true))) fail(422,'Automatisches Hochzählen benötigt einen ganzzahligen Primärschlüssel.');
        $defs[]=$name.' '.$type.($nullable?' NULL':' NOT NULL').($increment?' AUTO_INCREMENT':'');
        if ($key==='primary') $primary[]=$name;
        if ($increment) $auto[]=$name;
        if ($key==='unique') $indexes[]='UNIQUE KEY ('.$name.')';
        if ($key==='index') $indexes[]='KEY ('.$name.')';
    }
    if ($auto && (count($auto)>1||count($primary)!==1)) fail(422,'Automatisches Hochzählen ist nur mit einem einzelnen Primärschlüssel möglich.');
    if ($primary) $defs[]='PRIMARY KEY ('.implode(',',$primary).')';
    return 'CREATE TABLE '.$table.' ('.implode(',',array_merge($defs,$indexes)).') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4';
}
function tableColumns(PDO $pdo, string $table): array {
    try { return $pdo->query('SHOW COLUMNS FROM ' . identifier($table))->fetchAll(); } catch (PDOException $e) { mysqlError($e); }
}
function validateSql(string $sql): string {
    $sql = trim($sql); if (strlen($sql)>16000) fail(422, 'Die Abfrage ist zu lang.');
    // Strip quoted strings before inspecting tokens. Native prepares still enforce one statement.
    $tokens = preg_replace("/'(?:[^'\\\\]|\\\\.|'')*'|\"(?:[^\"\\\\]|\\\\.|\"\")*\"/s", "''", $sql);
    if (preg_match('~--|/\*|\*/|#~', $tokens)) fail(422, 'SQL-Kommentare sind in dieser Konsole nicht erlaubt.');
    $tokens = rtrim(trim($tokens), ';');
    if (str_contains($tokens,';') || !preg_match('/^(SELECT|WITH|INSERT|UPDATE|DELETE|CREATE\s+TABLE|ALTER\s+TABLE|DROP\s+TABLE|SHOW\s+(TABLES|COLUMNS|INDEX)|DESCRIBE|EXPLAIN)\b/i', $tokens)) fail(422, 'Bitte verwenden Sie eine einzelne Abfrage oder eine Tabellenoperation.');
    if (preg_match('/\b(OUTFILE|DUMPFILE|LOAD_FILE|LOAD|SLEEP|BENCHMARK|GET_LOCK|RELEASE_LOCK|GRANT|REVOKE|USE|INSTALL|UNINSTALL|FUNCTION|PROCEDURE|TRIGGER|EVENT|ATTACH|INTO\s+@|GLOBAL|INFORMATION_SCHEMA|PERFORMANCE_SCHEMA|MYSQL|SYS)\b/i', $tokens)) fail(403, 'Diese SQL-Operation ist in der Lernumgebung gesperrt.');
    return $sql;
}
