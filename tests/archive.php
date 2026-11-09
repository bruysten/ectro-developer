<?php
declare(strict_types=1);
$private=sys_get_temp_dir().'/ectro-archive-'.bin2hex(random_bytes(6));mkdir($private,0700);putenv('APP_DATA_DIR='.$private);putenv('APP_ENV=development');putenv('APP_KEY='.base64_encode(random_bytes(32)));
register_shutdown_function(function()use($private){$it=new RecursiveIteratorIterator(new RecursiveDirectoryIterator($private,FilesystemIterator::SKIP_DOTS),RecursiveIteratorIterator::CHILD_FIRST);foreach($it as $f)$f->isDir()?rmdir($f->getPathname()):unlink($f->getPathname());rmdir($private);});
require __DIR__.'/../app/bootstrap.php';require __DIR__.'/../app/templates.php';require __DIR__.'/../app/mysql.php';require __DIR__.'/../app/lab-api.php';
$n=0;function archeck(bool $ok,string $why):void{global $n;if(!$ok)throw new RuntimeException($why);$n++;}function arreject(int $status,callable $fn):void{try{$fn();throw new RuntimeException('Expected '.$status);}catch(ApiError $e){archeck($e->status===$status,$e->status.' '.$e->getMessage());}}
$c=json_decode(stream_get_contents(STDIN),true,64,JSON_THROW_ON_ERROR);
// Upgrade the previous complete catalog, retaining history and deliberately restricted projects.
$pdo=new PDO('sqlite:'.$private.'/app.sqlite');$pdo->exec(str_replace([",'archive'",",'pipeline'"],'',file_get_contents(__DIR__.'/../app/schema.sql')));
$uid=id();$pid=id();$limited=id();$other=id();$ready=id();
$pdo->prepare('INSERT INTO users(id,name,email,password,role,created_at) VALUES(?,?,?,?,?,?)')->execute([$uid,'Archive learner','archive@example.test','unused','user',now()]);
foreach([$pid,$limited] as $p)$pdo->prepare('INSERT INTO projects(id,user_id,name,created_at,updated_at) VALUES(?,?,?,?,?)')->execute([$p,$uid,'Archive',now(),now()]);
$pdo->prepare('INSERT INTO lab_objects(id,project_id,kind,name,content,version,updated_at) VALUES(?,?,?,?,?,?,?)')->execute([$ready,$pid,'readiness','Keep','{}',4,now()]);
$pdo->prepare('INSERT INTO readiness_revisions VALUES(?,?,?,?,?)')->execute([$ready,4,$uid,'{}',now()]);
$pdo->prepare('INSERT INTO lab_project_config VALUES(?,?)')->execute([$pid,json_encode(['tools'=>array_values(array_diff(LAB_KINDS,['archive','pipeline'])),'entry'=>'dataset'])]);
$restricted='{"tools":["dataset"],"entry":"dataset"}';$pdo->prepare('INSERT INTO lab_project_config VALUES(?,?)')->execute([$limited,$restricted]);$pdo=null;db();
archeck(json_decode(one('SELECT config FROM lab_project_config WHERE project_id=?',[$pid])['config'],true)['tools']===LAB_KINDS,'Complete catalog extended');
archeck(one('SELECT config FROM lab_project_config WHERE project_id=?',[$limited])['config']===$restricted,'Restricted catalog unchanged');
archeck((int)query('SELECT COUNT(*) FROM readiness_revisions')->fetchColumn()===1&&!db()->query('PRAGMA foreign_key_check')->fetch(),'History and foreign keys preserved');
$u=one('SELECT * FROM users WHERE id=?',[$uid]);archeck(archiveValidate($c)==$c,'Lossless JS/PHP contract');
$withOCR=$c;$withOCR['documents'][0]['extraction']=['mode'=>'mixed','language'=>'deu+eng','pages'=>2,'ocrPages'=>[2],'confidence'=>90];archeck(archiveValidate($withOCR)==$withOCR,'OCR provenance survives validation');
foreach([['pages'=>31],['ocrPages'=>[2,2]],['mode'=>'text'],['language'=>'remote'],['confidence'=>101]] as $bad){$invalid=$withOCR;$invalid['documents'][0]['extraction']=[...$invalid['documents'][0]['extraction'],...$bad];arreject(422,fn()=>archiveValidate($invalid));}
archeck(archiveValidate(['documents'=>[]])===['documents'=>[]],'An intentionally empty archive stays empty');
foreach([['status'=>'fake'],['classification'=>'private'],['date'=>'2026-02-30'],['text'=>str_repeat('x',12001)],['tags'=>['Retoure','retoure']],['tags'=>['']],['id'=>'../escape'],['owner'=>['bad']]] as $bad){$value=$c;$value['documents'][0]=[...$value['documents'][0],...$bad];arreject(422,fn()=>archiveValidate($value));}
$value=$c;$value['documents'][]=$value['documents'][0];arreject(422,fn()=>archiveValidate($value));
$value=$c;$value['documents']=array_fill(0,51,$c['documents'][0]);arreject(422,fn()=>archiveValidate($value));
$value=$c;$value['documents']=[];for($i=0;$i<17;$i++)$value['documents'][]=[...$c['documents'][0],'id'=>'doc-'.$i,'text'=>str_repeat('ä',12000)];arreject(422,fn()=>archiveValidate($value));
$o=labSave($u,['project'=>$pid,'kind'=>'archive','name'=>'Archive','content'=>$c]);archeck(labObject($u,$o['id'])['content']===$o['content'],'Saved collection reloads');
$rag=['text'=>"Herkunft: Test\nStand: 2026-11-09\nStatus: Aktuell\n\n".$c['documents'][0]['text'],'source'=>'Archivtest','size'=>600,'overlap'=>80,'chunks'=>[],'question'=>'','hits'=>[],'selected'=>[],'answer'=>''];archeck(labValidate('rag',$rag)===$rag,'Archive snapshot fits the existing RAG contract without model calls');
arreject(403,fn()=>labSave($u,['project'=>$limited,'kind'=>'archive','name'=>'No','content'=>$c]));
query('UPDATE users SET features=? WHERE id=?',[json_encode(['archive_lab'=>false]),$uid]);$blocked=one('SELECT * FROM users WHERE id=?',[$uid]);arreject(403,fn()=>labObject($blocked,$o['id']));query('UPDATE users SET features="{}" WHERE id=?',[$uid]);
$oid=id();query('INSERT INTO users(id,name,email,password,role,created_at) VALUES(?,?,?,?,?,?)',[$oid,'Other','other-archive@example.test','unused','user',now()]);$stranger=one('SELECT * FROM users WHERE id=?',[$oid]);arreject(404,fn()=>labObject($stranger,$o['id']));
$g1=id();$g2=id();foreach([[$g1,false],[$g2,true]] as [$gid,$grant]){query('INSERT INTO groups(id,name,features,created_at) VALUES(?,?,?,?)',[$gid,'Archive group',json_encode(['archive_lab'=>$grant]),now()]);query('INSERT INTO group_members VALUES(?,?)',[$gid,$uid]);}
archeck(features($u)['archive_lab']===true,'Active group grants are additive for Archive');
$shared=id();query('INSERT INTO projects(id,group_id,name,created_at,updated_at) VALUES(?,?,?,?,?)',[$shared,$g2,'Shared archive',now(),now()]);$sharedObject=labSave($u,['project'=>$shared,'kind'=>'archive','name'=>'Shared','content'=>$c]);
query('INSERT INTO group_members VALUES(?,?)',[$g2,$oid]);archeck(labObject($stranger,$sharedObject['id'])['id']===$sharedObject['id'],'Active group member can use shared archive');
saveGroupPeriods($g2,groupPeriodsInput(['access_end'=>'2000-01-01']));archeck(features($u)['archive_lab']===false,'Expired group no longer grants Archive');arreject(403,fn()=>labObject($u,$o['id']));arreject(404,fn()=>labObject($u,$sharedObject['id']));
query('DELETE FROM groups WHERE id IN (?,?)',[$g1,$g2]);
$empty=labSave($u,[...$o,'project'=>$pid,'content'=>['documents'=>[]]]);arreject(409,fn()=>labSave($u,[...$o,'project'=>$pid]));archeck(labObject($u,$empty['id'])['content']['documents']===[],'Stale save cannot resurrect removed documents');
$new=labSave($u,[...$empty,'project'=>$pid,'content'=>['documents'=>[$c['documents'][0]]]]);archeck(count(labObject($u,$new['id'])['content']['documents'])===1,'Creating one document after clearing retains only that document');
query('DELETE FROM lab_objects WHERE id=?',[$new['id']]);arreject(404,fn()=>labSave($u,[...$new,'project'=>$pid]));
echo "Archive: $n validation, persistence, permission, migration and stale-save checks passed.\n";
