<?php
require_once __DIR__.'/../app/bootstrap.php';
secureHeaders();
?><!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Website-Vorschau</title><link rel="stylesheet" href="/assets/app.css"><script type="module" src="/assets/preview.js"></script></head><body><header class="topbar"><div class="meta">ENTROSPHERE // VORSCHAU</div><div id="preview-status" class="meta">Wird geladen</div><button class="icon-btn" id="refresh-preview" aria-label="Vorschau neu laden"><span class="icon" aria-hidden="true">refresh</span></button></header><main id="preview-content" style="height:calc(100vh - 72px)"></main></body></html>
