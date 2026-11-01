<?php
declare(strict_types=1);
$private=sys_get_temp_dir().'/academy-ai-'.bin2hex(random_bytes(8));mkdir($private,0700);putenv('APP_DATA_DIR='.$private);putenv('APP_ENV=development');putenv('APP_KEY='.base64_encode(random_bytes(32)));
register_shutdown_function(function()use($private){$it=new RecursiveIteratorIterator(new RecursiveDirectoryIterator($private,FilesystemIterator::SKIP_DOTS),RecursiveIteratorIterator::CHILD_FIRST);foreach($it as $entry)$entry->isDir()?rmdir($entry->getPathname()):unlink($entry->getPathname());rmdir($private);});
require __DIR__.'/../app/bootstrap.php';require __DIR__.'/../app/templates.php';require __DIR__.'/../app/mysql.php';require __DIR__.'/../app/lab-api.php';
$checks=0;function checkAi(bool $v,string $message):void{global $checks;if(!$v)throw new RuntimeException($message);$checks++;}
function expectAi(int $status,callable $fn):void{try{$fn();throw new RuntimeException('Expected status '.$status);}catch(ApiError $e){checkAi($e->status===$status,'Unexpected API status '.$e->status);}}
$uid=id();query('INSERT INTO users(id,name,email,password,role,created_at) VALUES(?,?,?,?,?,?)',[$uid,'Test','test@example.test','not-a-password','admin',now()]);$u=one('SELECT * FROM users WHERE id=?',[$uid]);$pid=createProject($u,'Test','web');
$calls=0;
$transport=function($c,$path,$payload)use(&$calls){$calls++;checkAi(!isset($payload['key'])&&!isset($payload['secret']),'No key in provider payload');return match($path){'/responses'=>['output'=>[['type'=>'message','content'=>[['type'=>'output_text','text'=>'OpenAI Antwort']]]],'usage'=>['total_tokens'=>14]],'/messages'=>['content'=>[['type'=>'text','text'=>'Claude Antwort']],'usage'=>['input_tokens'=>10,'output_tokens'=>4]],'/chat/completions'=>['choices'=>[['message'=>['content'=>'Daimon Antwort']]],'usage'=>['total_tokens'=>8]],'/embeddings'=>['data'=>[['index'=>1,'embedding'=>[0,1]],['index'=>0,'embedding'=>[1,0]]]],'/rerank'=>['results'=>[['index'=>1,'relevance_score'=>.9],['index'=>0,'relevance_score'=>.1]]],default=>throw new RuntimeException('Unexpected provider path '.$path)};};
$connections=[];foreach([['openai','chat'],['anthropic','chat'],['daimon','chat'],['daimon','embedding'],['daimon','rerank']] as [$provider,$cap]){
    $c=aiConnectionSave($u,['name'=>$provider.' '.$cap,'provider'=>$provider,'base_url'=>'https://knowledge-core-001.daimon.intelligence-gmbh.com/vllm/knowledge-embedding/v1','model'=>'test-model','capability'=>$cap,'key'=>'synthetic-not-a-real-key','shared'=>true]);$connections[]=$c;
    $request=['project'=>$pid,'connection'=>$c['id'],'request'=>id(),'operation'=>$cap,...match($cap){'chat'=>['prompt'=>'Test','system'=>'Kurz antworten.'],'embedding'=>['input'=>['eins','zwei']],default=>['query'=>'zwei','documents'=>['eins','zwei']]}];$r=aiRun($u,$request,$transport);
    if($cap==='chat')checkAi(str_contains($r['text'],'Antwort'),'Chat normalized');elseif($cap==='embedding')checkAi($r['vectors']===[[1,0],[0,1]],'Embedding order normalized');else checkAi($r['results'][0]['index']===1,'Reranker normalized');
    $before=$calls;$cached=aiRun($u,$request,$transport);checkAi($calls===$before&&$cached===$r,'Idempotent replay does not call provider twice');
}
$chat=$connections[0];expectAi(422,fn()=>aiConnectionSave($u,[...$chat,'provider'=>'anthropic','key'=>'','shared'=>true]));
$learnerId=id();query('INSERT INTO users(id,name,email,password,role,created_at) VALUES(?,?,?,?,?,?)',[$learnerId,'Lernender','learner@example.test','not-a-password','user',now()]);$learner=one('SELECT * FROM users WHERE id=?',[$learnerId]);$learnerProject=createProject($learner,'Freigegebenes Modell','web');$daimon=$connections[2];
expectAi(403,fn()=>aiConnectionSave($learner,['name'=>'Verboten','provider'=>'daimon','model'=>'test','key'=>'synthetic-not-a-real-key']));
$request=['project'=>$learnerProject,'connection'=>$daimon['id'],'request'=>id(),'operation'=>'chat','prompt'=>'Test'];
expectAi(403,fn()=>aiRun($learner,$request,$transport));
query('INSERT INTO ai_grants VALUES(?,?,?)',[$learnerProject,$daimon['id'],10]);
$available=aiAvailable($learner,$learnerProject);checkAi(count($available)===1&&!array_intersect(['secret','key','base_url','user_id'],array_keys($available[0])),'Learner receives usage metadata only');
$answer=aiRun($learner,$request,$transport);checkAi($answer['text']==='Daimon Antwort'&&!str_contains(json_encode($answer),'synthetic-not-a-real-key'),'Learner can use granted Daimon without receiving credentials');
query('DELETE FROM ai_grants WHERE project_id=?',[$learnerProject]);expectAi(403,fn()=>aiRun($learner,$request,$transport));
$updated=aiConnectionSave($u,[...$daimon,'name'=>'Aktualisiert','key'=>'','shared'=>true]);expectAi(409,fn()=>aiConnectionSave($u,[...$daimon,'name'=>'Veralteter Entwurf','key'=>'','shared'=>true]));
$embedding=$connections[3];$bad=['project'=>$pid,'connection'=>$embedding['id'],'request'=>id(),'operation'=>'embedding','input'=>['one','two']];expectAi(502,fn()=>aiRun($u,$bad,fn()=>['data'=>[['index'=>0,'embedding'=>[1]],['index'=>0,'embedding'=>[1]]]]));
checkAi(one('SELECT state FROM ai_calls WHERE id=?',[$bad['request']])['state']==='failed','Invalid upstream reply recorded as failed');
for($i=0;$i<labLimits()['parallel'];$i++)query('INSERT INTO ai_calls(id,user_id,project_id,connection_id,state,created) VALUES(?,?,?,?,?,?)',[id(),$uid,$pid,$chat['id'],'running',time()]);
expectAi(429,fn()=>aiRun($u,['project'=>$pid,'connection'=>$chat['id'],'request'=>id(),'operation'=>'chat','prompt'=>'test'],$transport));query("DELETE FROM ai_calls WHERE state='running'");
query('INSERT INTO ai_grants VALUES(?,?,?)',[$pid,$chat['id'],1]);expectAi(403,fn()=>aiRun($u,['project'=>$pid,'connection'=>$chat['id'],'request'=>id(),'operation'=>'chat','prompt'=>'test'],$transport));
query('UPDATE ai_connections SET active=0 WHERE id=?',[$chat['id']]);expectAi(403,fn()=>aiRun($u,['project'=>$pid,'connection'=>$chat['id'],'request'=>id(),'operation'=>'chat','prompt'=>'test'],$transport));
query('UPDATE lab_project_config SET config=? WHERE project_id=?',[json_encode(['tools'=>['graph']]),$pid]);expectAi(403,fn()=>aiRun($u,['project'=>$pid,'connection'=>$connections[2]['id'],'request'=>id(),'operation'=>'chat','prompt'=>'test'],$transport));
echo "$checks provider-contract, replay, queue, budget and revocation checks passed (synthetic transport, no external requests).\n";
