<?php
// Local PHP development server only. Production uses Apache's public/ document root.
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if ($path === '/api' || $path === '/api/') { require __DIR__ . '/../public/api/index.php'; return true; }
if ($path === '/admin' || $path === '/admin/') { require __DIR__ . '/../public/admin/index.php'; return true; }
if (str_starts_with($path, '/assets/runtime/') || str_starts_with($path, '/sandbox/')) {
    header('Access-Control-Allow-Origin: *');
    if ($path === '/sandbox/' || $path === '/sandbox/index.php') { require __DIR__.'/../public/sandbox/index.php'; return true; }
    if ($path === '/sandbox/view.php') { require __DIR__.'/../public/sandbox/view.php'; return true; }
    $file=realpath(__DIR__.'/../public'.$path);
    if ($file && str_starts_with($file,realpath(__DIR__.'/../public').'/') && is_file($file) && !str_ends_with($file,'.php')) {
        $mime=['wasm'=>'application/wasm','js'=>'text/javascript','mjs'=>'text/javascript','json'=>'application/json','zip'=>'application/zip','txt'=>'text/plain'];
        header('Content-Type: '.($mime[pathinfo($file,PATHINFO_EXTENSION)]??'application/octet-stream'));
        readfile($file);return true;
    }
}
return false;
