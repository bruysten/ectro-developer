<?php
// Only a disposable local test server can enable this synthetic transport.
if(getenv('ECTRO_LOOP_UI_TEST')==='1'&&getenv('APP_ENV')==='development'&&str_contains((string)getenv('APP_DATA_DIR'),'ectro-loop-ui-')&&($_GET['action']??'')==='studio.loop.step'){
    require_once __DIR__.'/../app/bootstrap.php';require_once __DIR__.'/../app/templates.php';require_once __DIR__.'/../app/mysql.php';require_once __DIR__.'/../app/lab-api.php';secureHeaders();
    try{if($_SERVER['REQUEST_METHOD']!=='POST')fail(405,'POST required.');$data=input();csrf();$u=requireUser();if(!str_ends_with($u['email'],'@loop.example.test'))fail(403,'Synthetic accounts only.');$transport=function($conn,$path,$payload){$input=$payload['input']??$payload['messages'][0]['content'];$text='Synthetische Testantwort · '.mb_substr($input,0,700);if(str_contains($input,'[FAIL_TEST]'))fail(503,'Synthetischer Modellfehler');return $conn['provider']==='anthropic'?['content'=>[['type'=>'text','text'=>$text]],'usage'=>['input_tokens'=>10,'output_tokens'=>20]]:['output'=>[['content'=>[['type'=>'output_text','text'=>$text]]]],'usage'=>['total_tokens'=>30]];};jsonOut(loopDispatch($u,'studio.loop.step',$data,$transport));}catch(ApiError $e){jsonOut(['error'=>$e->getMessage()],$e->status);}return true;
}
return require __DIR__.'/../scripts/router.php';
