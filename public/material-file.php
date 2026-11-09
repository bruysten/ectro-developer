<?php
declare(strict_types=1);
require_once __DIR__.'/../app/bootstrap.php';require_once __DIR__.'/../app/materials.php';secureHeaders();
try{
    if($_SERVER['REQUEST_METHOD']!=='GET')fail(405,'Methode nicht erlaubt.');$u=requireUser();if($u['must_change_password'])fail(403,'Bitte zuerst das Passwort ändern.');$id=textField($_GET,'id',32);$file=materialGet($u,$id);if($file['kind']!=='document')fail(404,'Dokument nicht verfügbar.');$content=query('SELECT content FROM material_files WHERE material_id=?',[$id])->fetchColumn();if($content===false)fail(404,'Dokument nicht verfügbar.');session_write_close();
    header("Content-Security-Policy: default-src 'none'; sandbox; frame-ancestors 'none'");header('Cache-Control: private, no-store');header('Content-Type: application/octet-stream');header('Content-Length: '.strlen($content));header('Content-Disposition: attachment; filename="download"; filename*=UTF-8\'\''.rawurlencode($file['filename']));echo $content;
}catch(ApiError $e){jsonOut(['error'=>$e->getMessage()],$e->status);}catch(Throwable){jsonOut(['error'=>'Das Dokument konnte nicht geladen werden.'],503);}
