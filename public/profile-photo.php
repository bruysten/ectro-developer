<?php
declare(strict_types=1);
require_once __DIR__.'/../app/bootstrap.php';secureHeaders();
try{
    if($_SERVER['REQUEST_METHOD']!=='GET')fail(405,'Methode nicht erlaubt.');$u=requireUser();if($u['must_change_password'])fail(403,'Bitte zuerst Ihr Passwort ändern.');
    $uid=textField($_GET,'id',32);if($uid!==$u['id']&&$u['role']!=='admin')fail(404,'Profilbild nicht gefunden.');
    $p=one('SELECT picture,picture_mime FROM user_profiles WHERE user_id=?',[$uid]);if(!$p||$p['picture']===null)fail(404,'Profilbild nicht gefunden.');session_write_close();
    header('Cache-Control: private, no-store');header("Content-Security-Policy: default-src 'none'; sandbox; frame-ancestors 'self'");header('Content-Type: '.$p['picture_mime']);header('Content-Length: '.strlen($p['picture']));header('Content-Disposition: inline; filename="profile"');echo $p['picture'];
}catch(ApiError $e){jsonOut(['error'=>$e->getMessage()],$e->status);}catch(Throwable){jsonOut(['error'=>'Das Profilbild konnte nicht geladen werden.'],503);}
