<?php
declare(strict_types=1);

const PASSWORD_RECOVERY_MESSAGE = 'Wenn für diese E-Mail-Adresse ein aktiver Zugang besteht, erhalten Sie einen Link zum Zurücksetzen. Bitte prüfen Sie auch Ihren Spamordner.';

function passwordRecoveryOrigin(string $url): ?string {
    $url = rtrim(trim($url), '/');
    $parts = parse_url($url);
    return filter_var($url, FILTER_VALIDATE_URL) && $parts && !empty($parts['host'])
        && !isset($parts['user']) && !isset($parts['pass']) && !isset($parts['query']) && !isset($parts['fragment'])
        && ($parts['path'] ?? '') === '' && ($parts['scheme'] ?? '') === 'https' ? $url : null;
}

// Global readiness only: no addresses, credentials or per-account information.
function passwordRecoveryProblems(): array {
    $c = mailConfig();
    $problems = [];
    if (empty($c['enabled'])) $problems[] = 'mail_disabled';
    if (empty($c['api_key']) || empty($c['api_secret'])) $problems[] = 'mail_credentials_missing';
    if (!extension_loaded('curl')) $problems[] = 'curl_unavailable';
    if (!filter_var($c['sender_email'] ?? '', FILTER_VALIDATE_EMAIL)) $problems[] = 'sender_invalid';
    if (passwordRecoveryOrigin($c['app_url'] ?? '') === null) $problems[] = 'app_url_invalid';
    return $problems;
}

function passwordRecoveryReady(): bool { return passwordRecoveryProblems() === []; }

function issuePasswordRecoveryToken(array $u): string {
    $token = bin2hex(random_bytes(32));
    query('INSERT INTO password_resets(token_hash,user_id,email,auth_version,expires_at) VALUES(?,?,?,?,?)', [hash('sha256',$token),$u['id'],$u['email'],$u['auth_version'],time()+1800]);
    return $token;
}

// Reserve a send slot for every submitted address, even if no account exists.
// This limit applies across IP addresses and never changes the public response.
function preparePasswordRecovery(array $data): ?array {
    $email = emailField($data);
    return transaction(function () use ($email) {
        query('DELETE FROM password_resets WHERE expires_at<=?', [time()]);
        query('DELETE FROM rate_limits WHERE expires<?', [time()]);
        $key = hash_hmac('sha256', 'password-recovery-email|'.$email, keyBytes());
        $limit = one('SELECT * FROM rate_limits WHERE key=?', [$key]);
        if (($limit && (int)$limit['hits'] >= 3) || one('SELECT 1 FROM rate_limits WHERE key=?', [$key.'-cooldown'])) return null;
        query('INSERT INTO rate_limits(key,hits,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET hits=hits+1', [$key, time()+3600]);
        query('INSERT INTO rate_limits(key,hits,expires) VALUES(?,1,?)', [$key.'-cooldown',time()+60]);
        $u = one('SELECT * FROM users WHERE email=? AND active=1', [$email]);
        if (!$u) return null;
        $token = issuePasswordRecoveryToken($u);
        $hash = hash('sha256', $token);
        $url = passwordRecoveryOrigin(mailConfig()['app_url']).($u['role']==='admin'?'/admin/':'/').'#reset-password='.$token;
        $text = "Für Ihren Zugang zu Entrosphere Developer wurde ein neues Passwort angefordert.\n\nPasswort zurücksetzen:\n".$url."\n\nDieser Link ist 30 Minuten gültig und kann einmal verwendet werden. Wenn Sie die Anfrage nicht gestellt haben, ignorieren Sie diese Nachricht. Ihr Passwort bleibt unverändert.";
        $escaped = htmlspecialchars($url, ENT_QUOTES|ENT_SUBSTITUTE, 'UTF-8');
        return ['hash'=>$hash,'user_id'=>$u['id'],'message'=>[
            'To'=>[['Email'=>$email,'Name'=>$u['name']]], 'Subject'=>'Ihr Passwort zurücksetzen · Entrosphere Developer',
            'TextPart'=>$text, 'HTMLPart'=>'<p>Für Ihren Zugang wurde ein neues Passwort angefordert.</p><p><a href="'.$escaped.'">Passwort zurücksetzen</a></p><p>Dieser Link ist 30 Minuten gültig und einmal verwendbar. Falls Sie die Anfrage nicht gestellt haben, ignorieren Sie diese Nachricht. Ihr Passwort bleibt unverändert.</p>',
            // Tracking must not rewrite the fragment containing the secret.
            'TrackClicks'=>'disabled','TrackOpens'=>'disabled',
        ]];
    });
}

function deliverPasswordRecovery(?array $job, ?callable $transport=null): void {
    if (!$job) return;
    $result = mailjetSend(mailConfig(), $job['message'], false, $transport);
    if ($result['status']==='failed') query('DELETE FROM password_resets WHERE token_hash=?', [$job['hash']]);
    audit($job['user_id'], 'password.recovery.request', ['delivery'=>$result['status']]);
}

function resetForgottenPassword(array $data): array {
    $token = $data['token'] ?? '';
    if (!is_string($token) || !preg_match('/^[a-f0-9]{64}$/D', $token)) fail(422, 'Der Link ist ungültig oder abgelaufen. Bitte fordern Sie einen neuen Link an.');
    $password = passwordField($data);
    if (!is_string($data['confirmation'] ?? null) || $password !== $data['confirmation']) fail(422, 'Die beiden Passwörter stimmen nicht überein.');
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
    return transaction(function () use ($token,$passwordHash) {
        $u = one('SELECT u.* FROM password_resets r JOIN users u ON u.id=r.user_id WHERE r.token_hash=? AND r.expires_at>? AND u.active=1 AND u.email=r.email AND u.auth_version=r.auth_version', [hash('sha256',$token),time()]);
        if (!$u) fail(422, 'Der Link ist ungültig oder abgelaufen. Bitte fordern Sie einen neuen Link an.');
        query('UPDATE users SET password=?,must_change_password=0,auth_version=auth_version+1 WHERE id=?', [$passwordHash,$u['id']]);
        query('DELETE FROM password_resets WHERE user_id=?', [$u['id']]);
        // Erase pending welcome mail credentials immediately, too.
        cleanWelcomeMails();
        audit($u['id'], 'password.recovery.complete');
        return $u;
    });
}

function notifyPasswordRecovery(array $u, ?callable $transport=null): void {
    if (!passwordRecoveryReady()) return;
    $result = mailjetSend(mailConfig(), ['To'=>[['Email'=>$u['email'],'Name'=>$u['name']]],
        'Subject'=>'Ihr Passwort wurde geändert · Entrosphere Developer',
        'TextPart'=>'Ihr Passwort wurde über die Passwort-Wiederherstellung geändert. Alle bisherigen Sitzungen und Wiederherstellungslinks wurden ungültig. Falls Sie diese Änderung nicht vorgenommen haben, wenden Sie sich bitte umgehend an die Kursleitung oder den Betreiber.',
        'TrackClicks'=>'disabled','TrackOpens'=>'disabled'], false, $transport);
    audit($u['id'], 'password.recovery.notification', ['delivery'=>$result['status']]);
}

// PHP-FPM can acknowledge every request before contacting the mail provider.
// Other SAPIs use a fixed response floor covering Mailjet's 12-second timeout.
function passwordRecoveryResponse(array $response, callable $after, float $started, bool $uniform=false): never {
    session_write_close();
    ignore_user_abort(true);
    if (function_exists('fastcgi_finish_request')) {
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        echo json_encode($response, JSON_UNESCAPED_UNICODE);
        fastcgi_finish_request();
        try { $after(); } catch (Throwable $e) { error_log('ectro password recovery delivery failed'); }
        exit;
    }
    try { $after(); } catch (Throwable $e) { error_log('ectro password recovery delivery failed'); }
    if ($uniform) usleep((int)(max(0,13-(microtime(true)-$started))*1000000));
    jsonOut($response);
}
