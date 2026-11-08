<?php
declare(strict_types=1);
// Reuse the isolated provider fixture; no production keys or outbound calls.
require __DIR__.'/lab-ai.php';
query('DELETE FROM ai_grants');query('UPDATE ai_connections SET active=1');
$group=id();$otherGroup=id();foreach([$group,$otherGroup] as $g)query('INSERT INTO groups(id,name,created_at) VALUES(?,?,?)',[$g,$g===$group?'Active group':'Other group',now()]);
query('INSERT INTO group_members(group_id,user_id) VALUES(?,?)',[$group,$learnerId]);
$grant=['group'=>$group,'connection'=>$chat['id'],'version'=>0,'max_calls'=>10,'max_tokens'=>10000,'max_output_tokens'=>128];
expectAi(403,fn()=>aiGroupSave($learner,$grant));$g=aiGroupSave($u,$grant);expectAi(409,fn()=>aiGroupSave($u,$grant));
checkAi(count(aiAvailable($learner,$learnerProject))===1,'Active group grants available in personal project');
$available=aiAvailable($learner,$learnerProject)[0];checkAi($available['group_name']==='Active group'&&!isset($available['base_url'])&&$available['budget']['tokens_remaining']===10000,'Safe group budget metadata');
$request=['project'=>$learnerProject,'connection'=>$chat['id'],'request'=>id(),'operation'=>'chat','prompt'=>'hello'];$cap=0;$r=aiRun($learner,$request,function($c,$path,$payload)use(&$cap){$cap=$payload['max_output_tokens'];return ['output'=>[['content'=>[['type'=>'output_text','text'=>'hello']]]],'usage'=>['total_tokens'=>20]];});
checkAi($cap===128&&aiGroupUsage($group,$chat['id'])===['calls'=>1,'tokens'=>20],'Output bounded and actual usage charged');
$before=aiGroupUsage($group,$chat['id']);aiRun($learner,$request,fn()=>throw new RuntimeException('Replay called provider'));checkAi(aiGroupUsage($group,$chat['id'])===$before,'Replay never double charges');
$shared=id();query('INSERT INTO projects(id,user_id,group_id,name,created_at,updated_at) VALUES(?,NULL,?,?,?,?)',[$shared,$group,'Shared',now(),now()]);checkAi(count(aiAvailable($learner,$shared))===1,'Exact shared group receives grant');
query('INSERT INTO group_members(group_id,user_id) VALUES(?,?)',[$otherGroup,$learnerId]);$wrong=id();query('INSERT INTO projects(id,user_id,group_id,name,created_at,updated_at) VALUES(?,NULL,?,?,?,?)',[$wrong,$otherGroup,'Wrong group',now(),now()]);checkAi(count(aiAvailable($learner,$wrong))===0,'No cross-group grant leakage');
saveGroupPeriods($group,groupPeriodsInput(['access_end'=>'2020-01-01']));checkAi(count(aiAvailable($learner,$learnerProject))===0,'Expired group removed despite other active membership');saveGroupPeriods($group,groupPeriodsInput([]));
$own=aiConnectionSave($learner,['name'=>'Own','provider'=>'anthropic','model'=>'test','capability'=>'chat','key'=>'synthetic-not-a-real-key']);checkAi(count(aiAvailable($learner,$learnerProject))===2,'Personal connections supplement shared');
$old=aiGroupUsage($group,$chat['id']);$nestedBlocked=false;
aiRun($learner,[...$request,'request'=>id()],function($c,$path,$payload)use($u,$g,$grant,$learner,$request,$group,$chat,&$nestedBlocked){
 $usage=aiGroupUsage($group,$chat['id']);checkAi($usage['tokens']>20,'In-flight tokens reserved before transport');
 aiGroupSave($u,[...$grant,'version'=>$g['version'],'max_tokens'=>$usage['tokens']]);
 expectAi(403,fn()=>aiRun($learner,[...$request,'request'=>id()],fn()=>throw new RuntimeException('Over-budget transport')));$nestedBlocked=true;
 return ['output'=>[['content'=>[['type'=>'output_text','text'=>'No usage metadata']]]]];
});checkAi($nestedBlocked&&aiGroupUsage($group,$chat['id'])['tokens']>$old['tokens'],'Missing usage conservatively charged');
$g=one('SELECT * FROM ai_group_grants WHERE group_id=? AND connection_id=?',[$group,$chat['id']]);aiGroupSave($u,[...$grant,'version'=>(int)$g['version'],'remove'=>true]);checkAi(count(aiAvailable($learner,$learnerProject))===1,'Revocation immediate, own key remains');
$g=aiGroupSave($u,$grant);checkAi(aiGroupUsage($group,$chat['id'])['calls']===2,'Regrant retains historical budget consumption');
$failed=[...$request,'request'=>id()];try{aiRun($learner,$failed,fn()=>throw new RuntimeException('Synthetic timeout'));}catch(RuntimeException $e){checkAi($e->getMessage()==='Synthetic timeout','Synthetic failure propagated');}checkAi(one('SELECT state,tokens FROM ai_calls WHERE id=?',[$failed['request']])['tokens']>0,'Unknown failure keeps reservation charged');
foreach(['max_calls'=>0,'max_tokens'=>-1,'max_output_tokens'=>20000] as $key=>$value)expectAi(422,fn()=>aiGroupSave($u,[...$grant,'version'=>(int)$g['version'],$key=>$value]));
echo "$checks AI checks including active groups, private/shared isolation, output limits, atomic reservation, replay, missing usage, failure charging and revocation passed.\n";
