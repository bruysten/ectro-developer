<?php
require __DIR__.'/../app/bootstrap.php';
require __DIR__.'/../app/collaboration.php';
$cases=json_decode(stream_get_contents(STDIN),true,512,JSON_THROW_ON_ERROR);
echo json_encode(array_map(fn($case)=>applyEditorChanges($case['content'],$case['changes']),$cases),JSON_THROW_ON_ERROR);
