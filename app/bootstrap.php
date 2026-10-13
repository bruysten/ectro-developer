<?php
declare(strict_types=1);

const APP_ROOT = __DIR__ . '/..';
const FEATURES = ['files', 'editor', 'html', 'php', 'python', 'database', 'chat'];
const FILE_LIMIT = 524288;
const SPACE_LIMIT = 20971520;

final class ApiError extends RuntimeException {
    public function __construct(public int $status, string $message) { parent::__construct($message); }
}
function fail(int $status, string $message): never { throw new ApiError($status, $message); }
function config(): array {
    static $config;
    if ($config !== null) return $config;
    $local = is_file(APP_ROOT . '/config.local.php') ? require APP_ROOT . '/config.local.php' : [];
    $config = array_merge(['data_dir' => APP_ROOT . '/var', 'environment' => 'production',
        'db_allowed_hosts' => ['localhost', '127.0.0.1'], 'mysql_tls_ca' => '/etc/ssl/certs/ca-certificates.crt', 'setup_token' => '', 'key' => ''], $local);
    foreach (['APP_ENV' => 'environment', 'APP_SETUP_TOKEN' => 'setup_token', 'APP_KEY' => 'key', 'APP_DATA_DIR' => 'data_dir'] as $env => $key) {
        if (getenv($env) !== false) $config[$key] = getenv($env);
    }
    return $config;
}
function keyBytes(): string {
    $key = base64_decode(config()['key'], true);
    if ($key === false || strlen($key) !== 32) fail(503, 'Die Anwendung ist noch nicht konfiguriert. Bitte den Deployment-Check ausführen.');
    return $key;
}
function dataDir(): string {
    $dir = config()['data_dir'];
    if (!is_dir($dir) && !mkdir($dir, 0700, true) && !is_dir($dir)) fail(503, 'Der private Speicher ist nicht verfügbar.');
    if (!is_writable($dir)) fail(503, 'Der private Speicher ist nicht beschreibbar.');
    return $dir;
}
function db(): PDO {
    static $pdo;
    if ($pdo) return $pdo;
    $pdo = new PDO('sqlite:' . dataDir() . '/app.sqlite', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
    $pdo->exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;');
    $pdo->exec(file_get_contents(__DIR__ . '/schema.sql'));
    // Rebuild the role constraint without changing user IDs or dependent records.
    if(!str_contains($pdo->query("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'")->fetchColumn(), "'teacher'")){
        $pdo->exec('PRAGMA foreign_keys=OFF; BEGIN IMMEDIATE');
        try{
            if(!str_contains($pdo->query("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'")->fetchColumn(), "'teacher'")){
                $pdo->exec("CREATE TABLE users_upgrade (id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL UNIQUE,password TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('user','teacher','admin')),active INTEGER NOT NULL DEFAULT 1,features TEXT NOT NULL DEFAULT '{}',auth_version INTEGER NOT NULL DEFAULT 1,must_change_password INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,last_login TEXT)");
                $pdo->exec('INSERT INTO users_upgrade SELECT id,name,email,password,role,active,features,auth_version,must_change_password,created_at,last_login FROM users; DROP TABLE users; ALTER TABLE users_upgrade RENAME TO users');
                if($pdo->query('PRAGMA foreign_key_check')->fetch())throw new RuntimeException('Role migration foreign key validation failed.');
            }$pdo->exec('COMMIT');
        }catch(Throwable $e){$pdo->exec('ROLLBACK');throw $e;}finally{$pdo->exec('PRAGMA foreign_keys=ON');}
    }
    // Upgrade existing installations without a separate deployment command.
    if (!in_array('group_id',array_column($pdo->query('PRAGMA table_info(projects)')->fetchAll(),'name'),true)) {
        $pdo->exec('PRAGMA foreign_keys=OFF; BEGIN IMMEDIATE');
        try {
            if (!in_array('group_id',array_column($pdo->query('PRAGMA table_info(projects)')->fetchAll(),'name'),true)) {
                $pdo->exec('CREATE TABLE projects_upgrade (id TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id) ON DELETE CASCADE, group_id TEXT REFERENCES groups(id) ON DELETE CASCADE, created_by TEXT REFERENCES users(id) ON DELETE SET NULL, name TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, CHECK ((user_id IS NULL) != (group_id IS NULL)))');
                $pdo->exec('INSERT INTO projects_upgrade(id,user_id,created_by,name,created_at,updated_at) SELECT id,user_id,user_id,name,created_at,updated_at FROM projects; DROP TABLE projects; ALTER TABLE projects_upgrade RENAME TO projects');
            }
            $pdo->exec('COMMIT');
        } catch(Throwable $e) { $pdo->exec('ROLLBACK'); throw $e; }
        finally { $pdo->exec('PRAGMA foreign_keys=ON'); }
    }
    $pdo->exec('CREATE INDEX IF NOT EXISTS projects_group ON projects(group_id); CREATE INDEX IF NOT EXISTS projects_user ON projects(user_id)');
    return $pdo;
}
function query(string $sql, array $params = []): PDOStatement {
    $s = db()->prepare($sql); $s->execute($params); return $s;
}
function one(string $sql, array $params = []): ?array { return query($sql, $params)->fetch() ?: null; }
function all(string $sql, array $params = []): array { return query($sql, $params)->fetchAll(); }
function transaction(callable $fn): mixed {
    db()->exec('BEGIN IMMEDIATE');
    try { $result = $fn(); db()->exec('COMMIT'); return $result; }
    catch (Throwable $e) { db()->exec('ROLLBACK'); throw $e; }
}
function now(): string { return gmdate('Y-m-d\TH:i:s\Z'); }
function id(): string { return bin2hex(random_bytes(16)); }
function jsonOut(array $data, int $status = 200): never {
    http_response_code($status); header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store'); echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE); exit;
}
function secureHeaders(): void {
    header('X-Content-Type-Options: nosniff'); header('Referrer-Policy: no-referrer');
    header('Permissions-Policy: camera=(), microphone=(), geolocation=()');
    header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; connect-src 'self'; frame-src 'self' blob:; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    if (($_SERVER['HTTPS'] ?? '') === 'on') header('Strict-Transport-Security: max-age=31536000');
    header('Cache-Control: no-store');
}
function sessionStart(): void {
    if (session_status() === PHP_SESSION_ACTIVE) return;
    $path = dataDir() . '/sessions'; if (!is_dir($path)) mkdir($path, 0700, true);
    ini_set('session.use_strict_mode', '1'); ini_set('session.use_only_cookies', '1');
    // PHP garbage collection must not shorten any supported login duration.
    ini_set('session.gc_maxlifetime',(string)max((int)ini_get('session.gc_maxlifetime'),168*3600));
    session_save_path($path); session_name('ectro_session');
    session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => config()['environment'] !== 'development', 'httponly' => true, 'samesite' => 'Strict']);
    session_start();
    $_SESSION['csrf'] ??= bin2hex(random_bytes(32));
}
function currentUser(): ?array {
    sessionStart();
    if (empty($_SESSION['uid'])) return null;
    $u = one('SELECT * FROM users WHERE id=?', [$_SESSION['uid']]);
    if (!$u || !$u['active'] || (int)$u['auth_version'] !== ($_SESSION['auth_version'] ?? -1)
        || time() - ($_SESSION['created'] ?? 0) >= sessionHours()*3600) {
        unset($_SESSION['uid'],$_SESSION['auth_version'],$_SESSION['created'],$_SESSION['last_seen']); return null;
    }
    $_SESSION['last_seen'] = time(); return $u;
}
function requireUser(bool $admin = false): array {
    $u = currentUser(); if (!$u) fail(401, 'Bitte melden Sie sich erneut an.');
    if ($admin && $u['role'] !== 'admin') fail(403, 'Dieser Bereich ist Administratoren vorbehalten.'); return $u;
}
function csrf(): void {
    sessionStart(); $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!$token || !hash_equals($_SESSION['csrf'], $token)) fail(403, 'Die Sicherheitsprüfung ist fehlgeschlagen. Bitte laden Sie die Seite neu.');
}
function input(): array {
    if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 4194304) fail(413, 'Die Anfrage ist zu groß.');
    $raw = file_get_contents('php://input', false, null, 0, 4194305);
    if (strlen($raw) > 4194304) fail(413, 'Die Anfrage ist zu groß.');
    try { $data = json_decode($raw ?: '{}', true, 32, JSON_THROW_ON_ERROR); }
    catch (JsonException) { fail(400, 'Die Anfrage enthält kein gültiges JSON.'); }
    if (!is_array($data)) fail(400, 'Ungültige Anfrage.'); return $data;
}
function textField(array $data, string $field, int $max = 120, bool $required = true): string {
    if (isset($data[$field]) && !is_string($data[$field])) fail(422, 'Ungültiges Feld: ' . $field);
    $v = trim($data[$field] ?? '');
    if (($required && $v === '') || mb_strlen($v) > $max) fail(422, 'Bitte prüfen Sie das Feld „' . $field . '“.'); return $v;
}
function passwordField(array $data, bool $required = true): string {
    $p = $data['password'] ?? '';
    if (!is_string($p) || strlen($p) > 72 || (($required || $p !== '') && strlen($p) < 12)) fail(422, 'Das Passwort muss 12 bis 72 Bytes lang sein.'); return $p;
}
function emailField(array $data): string {
    $v = strtolower(textField($data, 'email', 254)); if (!filter_var($v, FILTER_VALIDATE_EMAIL)) fail(422, 'Bitte geben Sie eine gültige E-Mail-Adresse ein.'); return $v;
}
function safeUser(array $u): array {
    return ['id' => $u['id'], 'name' => $u['name'], 'email' => $u['email'], 'role' => $u['role'], 'active' => (bool)$u['active'],
        'features' => json_decode($u['features'], true),
        'created_at' => $u['created_at'], 'last_login' => $u['last_login'], 'must_change_password' => (bool)$u['must_change_password'],
        'groups' => all('SELECT g.id,g.name FROM groups g JOIN group_members m ON m.group_id=g.id WHERE m.user_id=? ORDER BY g.name', [$u['id']])];
}
function sessionHours(): int {
    $hours=settings()['session_hours']??8;
    return is_int($hours)&&$hours>=1&&$hours<=168?$hours:8;
}
function sessionHoursInput(mixed $hours): int {
    if(!is_int($hours)||$hours<1||$hours>168)fail(422,'Die Anmeldedauer muss zwischen 1 und 168 Stunden liegen.');return $hours;
}
function settings(): array {
    $out = []; foreach (all('SELECT * FROM settings') as $r) $out[$r['key']] = json_decode($r['value'], true); return $out;
}
function features(array $u): array {
    $s = settings(); $flags = array_fill_keys(FEATURES, true);
    foreach (($s['features'] ?? []) as $f => $v) if (array_key_exists($f, $flags)) $flags[$f] = (bool)$v;
    foreach (all('SELECT g.features FROM groups g JOIN group_members m ON g.id=m.group_id WHERE m.user_id=?', [$u['id']]) as $g)
        foreach (json_decode($g['features'], true) as $f => $v) if (isset($flags[$f]) && !$v) $flags[$f] = false;
    foreach (json_decode($u['features'], true) as $f => $v) if (isset($flags[$f]) && !$v) $flags[$f] = false;
    return $flags;
}
function needFeature(array $u, string $feature): void {
    if (!features($u)[$feature]) fail(403, 'Diese Funktion ist für Ihren Zugang nicht freigegeben.');
}
function featureInput(mixed $flags): string {
    if (!is_array($flags) || array_diff(array_keys($flags), FEATURES)) fail(422, 'Ungültige Funktionsauswahl.');
    foreach ($flags as $v) if (!is_bool($v)) fail(422, 'Funktionen müssen ein- oder ausgeschaltet sein.'); return json_encode((object)$flags);
}
function rateLimit(string $bucket, int $limit, int $window): void {
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'local'; $key = hash_hmac('sha256', $bucket . '|' . $ip, keyBytes());
    transaction(function () use ($key, $limit, $window) {
        query('DELETE FROM rate_limits WHERE expires < ?', [time()]);
        $r = one('SELECT * FROM rate_limits WHERE key=?', [$key]);
        if ($r && (int)$r['hits'] >= $limit) fail(429, 'Zu viele Anfragen. Bitte versuchen Sie es in wenigen Minuten erneut.');
        query('INSERT INTO rate_limits(key,hits,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET hits=hits+1', [$key, time() + $window]);
    });
}
function audit(?string $uid, string $event, array $details = []): void {
    query('INSERT INTO events(user_id,event,details,created_at) VALUES(?,?,?,?)', [$uid, $event, json_encode($details), now()]);
}
function teacherTarget(array $u,string $target,string $gid): void {
    if($u['role']!=='teacher'||!one("SELECT 1 FROM users t JOIN group_members student ON student.user_id=t.id JOIN group_members teacher ON teacher.group_id=student.group_id WHERE t.id=? AND t.role IN ('user','teacher') AND teacher.user_id=? AND student.group_id=?",[$target,$u['id'],$gid]))fail(403,'Dieser Teilnehmer gehört keiner Ihrer ausgewählten Gruppen an.');
}
function teacherParticipants(array $u): array {
    if($u['role']!=='teacher')fail(403,'Diese Ansicht ist Lehrern vorbehalten.');
    $groups=all('SELECT g.id,g.name FROM groups g JOIN group_members m ON m.group_id=g.id WHERE m.user_id=? ORDER BY g.name',[$u['id']]);
    foreach($groups as &$group)$group['members']=all("SELECT u.id,u.name,u.role FROM users u JOIN group_members m ON m.user_id=u.id WHERE m.group_id=? AND u.id<>? AND u.role IN ('user','teacher') ORDER BY u.name,u.id",[$group['id'],$u['id']]);unset($group);return $groups;
}
function project(array $u, string $pid): array {
    $p=one("SELECT p.*,g.name group_name,owner.name owner_name FROM projects p LEFT JOIN groups g ON g.id=p.group_id LEFT JOIN users owner ON owner.id=p.user_id WHERE p.id=? AND (p.user_id=? OR EXISTS(SELECT 1 FROM group_members m WHERE m.group_id=p.group_id AND m.user_id=?) OR (?='teacher' AND owner.role IN ('user','teacher') AND EXISTS(SELECT 1 FROM group_members student JOIN group_members teacher ON teacher.group_id=student.group_id WHERE student.user_id=p.user_id AND teacher.user_id=?)))",[$pid,$u['id'],$u['id'],$u['role']==='teacher'&&features($u)['files']?'teacher':'user',$u['id']]);if(!$p)fail(404,'Projekt nicht gefunden.');return $p;
}
function visibleProjects(array $u,string $target='',string $gid=''): array {
    if($target&&$target!==$u['id']){teacherTarget($u,$target,$gid);return all("SELECT p.*,g.name group_name,owner.name owner_name,(SELECT COUNT(*) FROM files f WHERE f.project_id=p.id AND f.kind IN ('file','asset')) file_count FROM projects p LEFT JOIN groups g ON g.id=p.group_id LEFT JOIN users owner ON owner.id=p.user_id WHERE p.user_id=? OR p.group_id=? ORDER BY p.updated_at DESC",[$target,$gid]);}
    return all("SELECT p.*,g.name group_name,(SELECT COUNT(*) FROM files f WHERE f.project_id=p.id AND f.kind IN ('file','asset')) file_count FROM projects p LEFT JOIN groups g ON g.id=p.group_id WHERE p.user_id=? OR EXISTS(SELECT 1 FROM group_members m WHERE m.group_id=p.group_id AND m.user_id=?) ORDER BY p.updated_at DESC",[$u['id'],$u['id']]);
}
function projectManager(array $u,array $p,bool $deleting=false): void {
    if(!$p['group_id']&&$p['user_id']!==$u['id']&&$deleting)fail(403,'Nur der Eigentümer kann dieses persönliche Projekt löschen.');
    if ($p['group_id'] && $u['role']!=='admin' && $p['created_by']!==$u['id']) fail(403,'Nur der Ersteller oder ein Administrator kann dieses Gruppenprojekt umbenennen oder löschen.');
}
function workspaceBytes(array $p): int {
    return (int)query('SELECT COALESCE(SUM(length(CAST(f.content AS BLOB))+COALESCE(a.size,0)),0) FROM files f JOIN projects p ON p.id=f.project_id LEFT JOIN workspace_uploads a ON a.file_id=f.id WHERE '.($p['group_id']?'p.group_id=?':'p.user_id=?'),[$p['group_id']?:$p['user_id']])->fetchColumn();
}
function filePath(string $path): string {
    if (!$path || strlen($path) > 240 || !preg_match('~^[\pL\pN _./-]+$~u', $path) || str_starts_with($path, '/') || str_contains($path, '//')) fail(422, 'Bitte verwenden Sie einen relativen Dateinamen ohne Sonderzeichen.');
    foreach (explode('/', $path) as $part) if ($part === '' || $part === '.' || $part === '..' || str_starts_with($part, '.')) fail(422, 'Dieser Dateipfad ist nicht erlaubt.'); return $path;
}
function checkParents(string $projectId,string $path): void {
    $parts=explode('/',$path);array_pop($parts);$parent='';
    foreach($parts as $part){$parent=ltrim($parent.'/'.$part,'/');$entry=one('SELECT kind FROM files WHERE project_id=? AND path=?',[$projectId,$parent]);if($entry&&$entry['kind']!=='directory')fail(409,'Ein übergeordneter Pfad ist bereits eine Datei.');}
}
function encryptSecret(string $plain): string {
    $nonce = random_bytes(SODIUM_CRYPTO_SECRETBOX_NONCEBYTES);
    return base64_encode($nonce . sodium_crypto_secretbox($plain, $nonce, keyBytes()));
}
function decryptSecret(string $cipher): string {
    $raw = base64_decode($cipher, true);
    if (!$raw || strlen($raw) < 40) fail(503, 'Die Verbindung konnte nicht entschlüsselt werden.');
    $plain = sodium_crypto_secretbox_open(substr($raw, 24), substr($raw, 0, 24), keyBytes());
    if ($plain === false) fail(503, 'Die Verbindung konnte nicht entschlüsselt werden.'); return $plain;
}
