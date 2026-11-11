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
foreach(array_slice($connections,0,3) as $connection){
    $observed=[];$capture=function($c,$path,$payload)use($transport,&$observed){$observed=$payload;return $transport($c,$path,$payload);};
    aiRun($u,['project'=>$pid,'connection'=>$connection['id'],'operation'=>'chat','request'=>id(),'system'=>'Keep context.','messages'=>[['role'=>'user','content'=>'Remember apple.'],['role'=>'assistant','content'=>'Apple remembered.'],['role'=>'user','content'=>'What did I say?']]],$capture);
    $messages=$connection['provider']==='openai'?$observed['input']:$observed['messages'];if($connection['provider']==='daimon')array_shift($messages);
    checkAi(count($messages)===3&&$messages[0]['content']==='Remember apple.'&&$messages[1]['role']==='assistant','Provider keeps full role-separated conversation history.');
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

// Atomic project dialog: shared providers stay restricted to their owner/administrators.
$settings=labProjectSettings($u,$pid);$preserved=$settings['config'];$preserved['governanceContributions']=['schemaVersion'=>1,'items'=>[]];query('UPDATE lab_project_config SET config=? WHERE project_id=?',[labJson($preserved),$pid]);
$teacherId=id();query('INSERT INTO users(id,name,email,password,role,created_at) VALUES(?,?,?,?,?,?)',[$teacherId,'Teacher','teacher-settings@example.test','not-a-password','teacher',now()]);$teacher=one('SELECT * FROM users WHERE id=?',[$teacherId]);$owned=aiConnectionSave($teacher,['name'=>'Teacher embedding','provider'=>'openai','model'=>'synthetic-embedding','capability'=>'embedding','key'=>'synthetic-not-a-real-key','shared'=>true]);
$teacherSettings=labProjectSettings($teacher,$pid);checkAi(array_column($teacherSettings['connections'],'id')===[$owned['id']],'Teacher can manage own shared connection only');
$settingsInput=['project'=>$pid,'revision'=>$teacherSettings['revision'],'config'=>['tools'=>LAB_KINDS,'entry'=>'rag'],'grants'=>[['connection'=>$owned['id'],'max_calls'=>50]]];$saved=labProjectSettingsSave($teacher,$settingsInput);checkAi($saved['config']['governanceContributions']===$preserved['governanceContributions'],'Project metadata survives AI grant editing');
expectAi(409,fn()=>labProjectSettingsSave($teacher,$settingsInput));expectAi(403,fn()=>labProjectSettingsSave($teacher,[...$settingsInput,'revision'=>$saved['revision'],'grants'=>[['connection'=>$connections[3]['id'],'max_calls'=>50]]]));
checkAi(labProjectSettings($teacher,$pid)['revision']===$saved['revision'],'Forbidden grant leaves all settings unchanged');
expectAi(403,fn()=>labProjectSettings($learner,$learnerProject));
echo "Atomic project settings: owner/admin ACL, stale revisions, rollback and preserved metadata verified.\n";

$source=aiConnectionSave($u,['name'=>'Provisioning source','provider'=>'openai','model'=>'synthetic-chat','capability'=>'chat','key'=>'synthetic-provisioning-key','shared'=>true]);$copyInput=['source'=>$source['id'],'version'=>$source['version'],'model'=>'text-embedding-3-small'];$copy=aiEmbeddingCreate($u,$copyInput,true);
checkAi($copy['capability']==='embedding'&&$copy['model']==='text-embedding-3-small'&&!isset($copy['secret']),'Embedding shortcut returns metadata, never the reused key');
checkAi(one('SELECT secret FROM ai_connections WHERE id=?',[$copy['id']])['secret']===one('SELECT secret FROM ai_connections WHERE id=?',[$source['id']])['secret'],'Encrypted credential reused on server without browser round trip');
checkAi(aiEmbeddingCreate($u,$copyInput,true)['id']===$copy['id'],'Repeated submission reuses the same embedding connection');
checkAi(!one('SELECT connection_id FROM ai_grants WHERE connection_id=?',[$copy['id']])&&!one('SELECT connection_id FROM ai_group_grants WHERE connection_id=?',[$copy['id']]),'Creating embedding connection never copies project or group grants');
expectAi(404,fn()=>aiEmbeddingCreate($learner,$copyInput));expectAi(409,fn()=>aiEmbeddingCreate($u,[...$copyInput,'version'=>0],true));expectAi(422,fn()=>aiEmbeddingCreate($u,[...$copyInput,'model'=>'arbitrary-chat-model'],true));expectAi(422,fn()=>aiEmbeddingCreate($u,['source'=>$connections[2]['id'],'version'=>1],true));
checkAi(one('SELECT capability FROM ai_connections WHERE id=?',[$source['id']])['capability']==='chat','Original chat connection remains unchanged');
echo "Embedding provisioning: encrypted reuse, ACL, model allowlist, revision, idempotence and no automatic grants verified.\n";
