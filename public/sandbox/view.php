<?php
$host=$_SERVER['HTTP_HOST']??'';
if(!preg_match('/^[a-zA-Z0-9.:-]+$/',$host)){http_response_code(400);exit;}
$origin=(($_SERVER['HTTPS']??'')==='on'?'https://':'http://').$host;
header('Access-Control-Allow-Origin: *');
header('Referrer-Policy: no-referrer');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
header("Content-Security-Policy: sandbox allow-scripts; default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' blob: $origin/sandbox/; style-src 'unsafe-inline'; img-src data: blob:; connect-src 'none'; frame-src 'none'; object-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors 'self'");
?><!doctype html><html><head><meta charset="utf-8"><title>Website-Vorschau</title><script type="module" crossorigin="anonymous" src="/sandbox/view.js"></script></head><body></body></html>
