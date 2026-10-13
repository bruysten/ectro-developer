<?php
declare(strict_types=1);
require_once __DIR__.'/../app/bootstrap.php';secureHeaders();
try{
    if($_SERVER['REQUEST_METHOD']!=='GET')fail(405,'Methode nicht erlaubt.');$u=requireUser();if($u['must_change_password'])fail(403,'Bitte zuerst Ihr Passwort ändern.');needFeature($u,'files');
    $file=one('SELECT f.project_id,f.path,a.size FROM files f JOIN workspace_uploads a ON a.file_id=f.id WHERE f.id=?',[textField($_GET,'id',32)]);if(!$file)fail(404,'Datei nicht gefunden.');project($u,$file['project_id']);
    $content=query('SELECT content FROM workspace_uploads WHERE file_id=?',[textField($_GET,'id',32)])->fetchColumn();session_write_close();
    header("Content-Security-Policy: default-src 'none'; sandbox; frame-ancestors 'none'");header('Content-Type: application/octet-stream');header('Content-Length: '.strlen($content));header('Content-Disposition: attachment; filename="download"; filename*=UTF-8\'\''.rawurlencode(basename($file['path'])));echo $content;
}catch(ApiError $e){jsonOut(['error'=>$e->getMessage()],$e->status);}catch(Throwable){jsonOut(['error'=>'Die Datei konnte nicht geladen werden.'],503);}
