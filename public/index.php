<?php
require_once __DIR__ . '/../app/bootstrap.php';
secureHeaders();
?><!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#111213">
  <title>Developer — Entrosphere</title>
  <link rel="icon" href="/assets/brand/logo-icon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/app.css">
  <script src="/assets/app.js" type="module"></script>
</head>
<body>
  <div id="app"><div class="boot"><img src="/assets/brand/logo.svg" alt="Entrosphere"><p class="meta">DEVELOPER // WIRD GELADEN</p></div></div>
  <div id="notifications" aria-live="polite" aria-atomic="true"></div>
  <dialog id="modal"></dialog>
  <noscript>Bitte aktivieren Sie JavaScript, um die Entwicklungsumgebung zu verwenden.</noscript>
</body>
</html>
