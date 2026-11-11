<?php
declare(strict_types=1);
// Project configuration and its explicit AI grants are one reviewable, atomic change.
function labProjectSettings(array $u,string $pid):array {
 if(!in_array($u['role'],['teacher','admin'],true))fail(403,'Dozentenfunktion.');labAccess($u,$pid);
 $config=json_decode(one('SELECT config FROM lab_project_config WHERE project_id=?',[$pid])['config']??'{}',true);
 $connections=all('SELECT c.id,c.name,c.provider,c.model,c.capability,c.active,c.version FROM ai_connections c JOIN users owner ON owner.id=c.user_id WHERE c.shared=1 AND owner.active=1 AND owner.role IN ("teacher","admin") AND (c.user_id=? OR ?="admin") AND (c.provider<>"daimon" OR ?="admin") ORDER BY c.id',[$u['id'],$u['role'],$u['role']]);
 foreach($connections as &$c){$c['active']=(bool)$c['active'];$c['version']=(int)$c['version'];}unset($c);
 $grants=all('SELECT g.connection_id,g.max_calls FROM ai_grants g WHERE g.project_id=? ORDER BY g.connection_id',[$pid]);foreach($grants as &$g)$g['max_calls']=(int)$g['max_calls'];unset($g);
 $revision=hash('sha256',json_encode([$config,$connections,$grants],JSON_THROW_ON_ERROR));
 $editable=array_column($connections,'id');$visible=array_values(array_filter($grants,fn($g)=>in_array($g['connection_id'],$editable,true)));
 foreach($visible as &$g)$g['calls']=(int)query('SELECT COUNT(*) FROM ai_calls WHERE project_id=? AND connection_id=?',[$pid,$g['connection_id']])->fetchColumn();unset($g);
 $inherited=[];if(features($u)['ai'])foreach(aiAvailable($u,$pid) as $c)if(isset($c['group_name']))$inherited[]=array_intersect_key($c,array_flip(['id','name','capability','group_name']));
 return ['config'=>$config,'connections'=>$connections,'grants'=>$visible,'inherited'=>$inherited,'revision'=>$revision];
}
function labProjectSettingsSave(array $u,array $data):array {
 $pid=textField($data,'project',32);$config=labConfigInput($data['config']??null);$revision=textField($data,'revision',64);$changes=labList($data['grants']??[],200);$seen=[];
 foreach($changes as $g){if(!is_array($g)||!is_string($g['connection']??null)||!preg_match('/^[a-f0-9]{32}$/D',$g['connection'])||isset($seen[$g['connection']])||!is_int($g['max_calls']??null)||$g['max_calls']<0||$g['max_calls']>10000)fail(422,'Projektfreigaben und Anfragebudgets kontrollieren.');$seen[$g['connection']]=true;}
 return transaction(function()use($u,$pid,$config,$revision,$changes){
  $current=labProjectSettings($u,$pid);if(!hash_equals($current['revision'],$revision))fail(409,'Projekt oder KI-Freigaben wurden inzwischen geändert. Dialog schließen, neu öffnen und erneut prüfen.');
  $available=array_column($current['connections'],null,'id');
  foreach($changes as $g){$c=$available[$g['connection']]??null;if(!$c)fail(403,'Diese Verbindung dürfen Sie nicht freigeben.');if($g['max_calls']>0&&!$c['active'])fail(422,'Die KI-Verbindung ist inaktiv. Zuerst im Profil bzw. Adminbereich aktivieren.');
   if($g['max_calls']===0)query('DELETE FROM ai_grants WHERE project_id=? AND connection_id=?',[$pid,$c['id']]);else query('INSERT INTO ai_grants VALUES(?,?,?) ON CONFLICT(project_id,connection_id) DO UPDATE SET max_calls=excluded.max_calls',[$pid,$c['id'],$g['max_calls']]);
  }
  query('INSERT INTO lab_project_config VALUES(?,?) ON CONFLICT(project_id) DO UPDATE SET config=excluded.config',[$pid,labJson([...$current['config'],'tools'=>$config['tools'],'entry'=>$config['entry']])]);audit($u['id'],'lab.project.settings.save',['project'=>$pid]);return labProjectSettings($u,$pid);
 });
}
