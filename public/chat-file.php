<?php
declare(strict_types=1);
require_once __DIR__.'/../app/bootstrap.php';require_once __DIR__.'/../app/chat.php';secureHeaders();
try {
    if($_SERVER['REQUEST_METHOD']!=='GET')fail(405,'Methode nicht erlaubt.');
    $u=requireUser();if($u['must_change_password'])fail(403,'Bitte zuerst Ihr Passwort ändern.');
    $file=one('SELECT a.id,a.name,a.extension,a.size,m.group_id FROM chat_attachments a JOIN messages m ON m.id=a.message_id WHERE a.id=?',[textField($_GET,'id',32)]);
    if(!$file)fail(404,'Datei nicht gefunden.');chatAccess($u,$file['group_id'],$u['role']==='admin');
    $content=query('SELECT content FROM chat_attachments WHERE id=?',[$file['id']])->fetchColumn();if($content===false)fail(404,'Datei nicht gefunden.');session_write_close();
    $inline=($_GET['preview']??'')==='1';$mime=match($file['extension']){'pdf'=>'application/pdf','png'=>'image/png','jpg','jpeg'=>'image/jpeg','gif'=>'image/gif','webp'=>'image/webp',default=>'application/octet-stream'};
    header("Content-Security-Policy: default-src 'none'; sandbox; frame-ancestors 'self'");
    header('Content-Type: '.($inline?$mime:'application/octet-stream'));header('Content-Length: '.strlen($content));
    header('Content-Disposition: '.($inline&&$mime!=='application/octet-stream'?'inline':'attachment').'; filename="download"; filename*=UTF-8\'\''.rawurlencode($file['name']));echo $content;
} catch(ApiError $e){jsonOut(['error'=>$e->getMessage()],$e->status);} catch(Throwable){jsonOut(['error'=>'Die Datei konnte nicht geladen werden. Bitte erneut versuchen.'],503);}
