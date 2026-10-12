<?php
$host = $_SERVER['HTTP_HOST'] ?? '';
if (!preg_match('/^[a-zA-Z0-9.:-]+$/', $host)) { http_response_code(400); exit; }
$origin = (($_SERVER['HTTPS'] ?? '') === 'on' ? 'https://' : 'http://') . $host;
header('Access-Control-Allow-Origin: *');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
header('Cache-Control: no-store');
header("Content-Security-Policy: default-src 'none'; script-src 'unsafe-eval' 'wasm-unsafe-eval' blob: $origin/sandbox/ $origin/assets/runtime/; connect-src $origin/assets/runtime/; worker-src blob:; style-src 'unsafe-inline'; frame-ancestors 'self'; base-uri 'none'; form-action 'none'");
?><!doctype html><html><head><meta charset="utf-8"><title>Isolierte Laufzeit</title><script type="module" crossorigin="anonymous" src="/sandbox/sandbox.js"></script></head><body></body></html>
