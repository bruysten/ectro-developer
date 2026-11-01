<?php
declare(strict_types=1);
require_once __DIR__.'/labs.php';
require_once __DIR__.'/lab-ai.php';
function labDispatch(array $u,string $action,array $data): never {
    switch($action){
        case 'lab.projects':
            needFeature($u,'files');
            $rows=$u['role']==='admin'?all('SELECT p.*,g.name group_name FROM projects p LEFT JOIN groups g ON g.id=p.group_id ORDER BY p.updated_at DESC LIMIT 1000'):all('SELECT p.*,g.name group_name FROM projects p LEFT JOIN groups g ON g.id=p.group_id ORDER BY p.updated_at DESC LIMIT 1000');$visible=[];foreach($rows as $p){try{project($u,$p['id']);$visible[]=$p;}catch(ApiError){}}jsonOut(['projects'=>$visible,'limits'=>labLimits()]);
        case 'lab.info':
            $pid=textField($data,'project',32);$p=labAccess($u,$pid);$objects=[];foreach(all('SELECT id,project_id,kind,name,version,updated_at,length(CAST(content AS BLOB)) bytes FROM lab_objects WHERE project_id=? ORDER BY kind,name',[$pid]) as $o){try{labAccess($u,$pid,$o['kind']);$o['version']=(int)$o['version'];$objects[]=$o;}catch(ApiError){}}$c=json_decode(one('SELECT config FROM lab_project_config WHERE project_id=?',[$pid])['config']??'{}',true);jsonOut(['project'=>$p,'objects'=>$objects,'config'=>$c,'limits'=>labLimits(),'connections'=>features($u)['ai']?aiAvailable($u,$pid):[]]);
        case 'lab.object': jsonOut(['object'=>labObject($u,textField($data,'id',32))]);
        case 'lab.validate': labAccess($u,textField($data,'project',32),textField($data,'kind',20));jsonOut(['content'=>labValidate($data['kind'],$data['content']??null)]);
        case 'lab.save': jsonOut(['object'=>labSave($u,$data)]);
        case 'lab.delete': transaction(function()use($u,$data){$o=labObject($u,textField($data,'id',32));if(($data['version']??null)!==$o['version'])fail(409,'Inzwischen geändert. Bitte neu laden.');query('DELETE FROM lab_objects WHERE id=?',[$o['id']]);audit($u['id'],'lab.delete',['project'=>$o['project_id']]);});jsonOut(['ok'=>true]);
        case 'lab.rpc': rateLimit('lab.rpc.'.$u['id'],300,60);jsonOut(labRpc($u,$data));
        case 'lab.project.save':
            if(!in_array($u['role'],['teacher','admin'],true))fail(403,'Dozentenfunktion.');$pid=textField($data,'project',32);labAccess($u,$pid);$c=labConfigInput($data['config']??null);transaction(function()use($u,$pid,$c){labAccess($u,$pid);query('INSERT INTO lab_project_config VALUES(?,?) ON CONFLICT(project_id) DO UPDATE SET config=excluded.config',[$pid,labJson(['tools'=>$c['tools'],'entry'=>$c['entry']])]);});jsonOut(['ok'=>true]);
        case 'presence.touch': rateLimit('presence.'.$u['id'],20,60);learningContext($u,$data);jsonOut(['ok'=>true]);
        case 'presence.open':
            $uid=textField($data,'user',32);$gid=textField($data,'group',32);chatAccess($u,$gid,true);$context=learningLocation($u,$uid,$gid);if(!$context)fail(404,'Diese Ansicht ist nicht mehr verfügbar.');jsonOut(['context'=>$context,'participant'=>$uid,'group'=>$gid]);
        case 'ai.connections': needFeature($u,'ai');jsonOut(['connections'=>array_map('aiPublic',all('SELECT * FROM ai_connections WHERE user_id=? AND (provider<>"daimon" OR ?="admin") ORDER BY name',[$u['id'],$u['role']]))]);
        case 'ai.connection.save': jsonOut(['connection'=>aiConnectionSave($u,$data)]);
        case 'ai.connection.delete':
            needFeature($u,'ai');transaction(function()use($u,$data){$c=one('SELECT * FROM ai_connections WHERE id=? AND user_id=?',[textField($data,'id',32),$u['id']]);if(!$c)fail(404,'Verbindung nicht gefunden.');if($c['provider']==='daimon'&&$u['role']!=='admin')fail(403,'Daimon-Zugänge werden ausschließlich von Administratoren verwaltet.');if(($data['version']??null)!==(int)$c['version'])fail(409,'Inzwischen geändert.');query('DELETE FROM ai_connections WHERE id=?',[$c['id']]);});jsonOut(['ok'=>true]);
        case 'ai.grant':
            if(!in_array($u['role'],['teacher','admin'],true))fail(403,'Dozentenfunktion.');transaction(function()use($u,$data){$pid=textField($data,'project',32);labAccess($u,$pid);$cid=textField($data,'connection',32);$c=one('SELECT * FROM ai_connections WHERE id=? AND shared=1',[$cid]);if(!$c||($c['user_id']!==$u['id']&&$u['role']!=='admin'))fail(403,'Diese Verbindung dürfen Sie nicht freigeben.');if($c['provider']==='daimon'&&$u['role']!=='admin')fail(403,'Nur Administratoren dürfen Daimon-Zugänge freigeben.');$limit=$data['max_calls']??100;if(!is_int($limit)||$limit<0||$limit>10000)fail(422,'Anfragebudget: 0–10000.');if($limit===0)query('DELETE FROM ai_grants WHERE project_id=? AND connection_id=?',[$pid,$cid]);else query('INSERT INTO ai_grants VALUES(?,?,?) ON CONFLICT(project_id,connection_id) DO UPDATE SET max_calls=excluded.max_calls',[$pid,$cid,$limit]);});jsonOut(['ok'=>true]);
        case 'ai.run': jsonOut(aiRun($u,$data));
        case 'admin.ai.status':
            transaction(function()use($data){$c=one('SELECT * FROM ai_connections WHERE id=? AND shared=1',[textField($data,'id',32)]);if(!$c)fail(404,'Projektverbindung nicht gefunden.');if(($data['version']??null)!==(int)$c['version']||!is_bool($data['active']??null))fail(409,'Verbindung wurde inzwischen geändert.');query('UPDATE ai_connections SET active=?,version=version+1 WHERE id=?',[(int)$data['active'],$c['id']]);});jsonOut(['ok'=>true]);
        case 'admin.labs':
            jsonOut(['limits'=>labLimits(),'connections'=>array_map('aiPublic',all('SELECT * FROM ai_connections WHERE shared=1 ORDER BY name')),'grants'=>all('SELECT g.*,p.name project_name,c.name connection_name,(SELECT COUNT(*) FROM ai_calls a WHERE a.project_id=g.project_id AND a.connection_id=g.connection_id) calls FROM ai_grants g JOIN projects p ON p.id=g.project_id JOIN ai_connections c ON c.id=g.connection_id'),'projects'=>all('SELECT p.id,p.name,u.name owner,g.name group_name,(SELECT COUNT(*) FROM lab_objects o WHERE o.project_id=p.id) objects,(SELECT COALESCE(SUM(length(content)),0) FROM lab_objects o WHERE o.project_id=p.id) bytes FROM projects p LEFT JOIN users u ON u.id=p.user_id LEFT JOIN groups g ON g.id=p.group_id ORDER BY p.updated_at DESC'),'usage'=>all('SELECT c.name,a.state,COUNT(*) calls,SUM(a.tokens) tokens FROM ai_calls a JOIN ai_connections c ON c.id=a.connection_id GROUP BY c.id,a.state')]);
        default:fail(404,'Unbekannte Laboraktion.');
    }
}
