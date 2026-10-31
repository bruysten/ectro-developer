<?php
declare(strict_types=1);
// This operator tool is intentionally unavailable through HTTP. Possession of
// the hosting account is required; the public reset endpoint remains unchanged.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once __DIR__.'/../app/bootstrap.php';
require_once __DIR__.'/../app/mail.php';
require_once __DIR__.'/../app/password-recovery.php';

$options = getopt('', ['check','email:','url:']);
try {
    keyBytes();
    if (isset($options['check'])) {
        echo json_encode(['available'=>passwordRecoveryReady(),'blockers'=>passwordRecoveryProblems()], JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES)."\n";
        exit;
    }
    if (!isset($options['email'])) {
        fwrite(STDERR,"Maildiagnose: php scripts/recover-admin.php --check\nWiederherstellen: php scripts/recover-admin.php --email=ADMIN-EMAIL --url=https://IHRE-DOMAIN\nDer erzeugte Link ist geheim, gilt 30 Minuten und darf nicht weitergegeben werden.\n");
        exit(1);
    }
    $email = emailField(['email'=>$options['email']]);
    $origin = passwordRecoveryOrigin($options['url'] ?? (mailConfig()['app_url'] ?? ''));
    if ($origin === null) throw new RuntimeException('Bitte die HTTPS-Adresse der Academy ohne Unterpfad mit --url angeben.');
    $token = transaction(function () use ($email) {
        $u = one("SELECT * FROM users WHERE email=? AND role='admin' AND active=1", [$email]);
        if (!$u) throw new RuntimeException('Kein aktiver Administrator mit dieser E-Mail-Adresse gefunden.');
        query('DELETE FROM password_resets WHERE expires_at<=?', [time()]);
        $token = issuePasswordRecoveryToken($u);
        audit($u['id'], 'password.recovery.operator');
        return $token;
    });
    echo "Geheimer Wiederherstellungslink (30 Minuten gültig, einmal verwendbar):\n".$origin.'/admin/#reset-password='.$token."\n";
    echo "Öffnen Sie den Link selbst im Browser und legen Sie Ihr neues Passwort fest.\n";
} catch (Throwable $e) {
    // Deliberately omit raw DB, filesystem and configuration errors.
    fwrite(STDERR,($e instanceof ApiError || $e instanceof RuntimeException && !($e instanceof PDOException) ? $e->getMessage() : 'Die private App-Konfiguration oder Datenbank konnte nicht gelesen werden.')."\n");
    exit(1);
}
