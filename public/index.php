<?php
require_once __DIR__ . '/../app/bootstrap.php';
secureHeaders();
header('Cache-Control: no-store');
// Stable content fingerprints keep a browser from mixing old UI code with a new API.
$styleVersion=substr(hash_file('sha256',__DIR__.'/assets/app.css'),0,16);
$scriptVersion=substr(hash_file('sha256',__DIR__.'/assets/app.js'),0,16);
?><!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#111213">
  <title>Developer — Entrosphere</title>
  <link rel="icon" href="/assets/brand/logo-icon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/app.css?v=<?= $styleVersion ?>">
  <script src="/assets/app.js?v=<?= $scriptVersion ?>" type="module"></script>
</head>
<body>
  <div id="app"><div class="boot"><img src="/assets/brand/logo.svg" alt="Entrosphere"><p class="meta">DEVELOPER // WIRD GELADEN</p></div></div>
  <div id="notifications" aria-live="polite" aria-atomic="true"></div>
  <dialog id="modal"></dialog>
  <noscript>Bitte aktivieren Sie JavaScript, um die Entwicklungsumgebung zu verwenden.</noscript>
</body>
</html>
