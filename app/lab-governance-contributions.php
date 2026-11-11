<?php
declare(strict_types=1);
function governanceDefaultContributions():array {static $items;return $items??=json_decode(file_get_contents(__DIR__.'/governance-contributions.json'),true,16,JSON_THROW_ON_ERROR);}
function governanceContributionsValidate(mixed $raw):array {
 $items=govUniqueRows($raw,12);if(!$items)fail(422,'Mindestens einen Beitragsbereich behalten.');$codes=[];$out=[];
 foreach($items as $item){$id=labName($item['id']??null);if(!preg_match('/^[a-zA-Z0-9_-]{1,80}$/D',$id))fail(422,'Ungültige Beitrags-ID.');$code=labName($item['code']??null,8);if(!preg_match('/^[\p{L}\p{N}_-]+$/uD',$code))fail(422,'Kürzel: 1–8 Buchstaben oder Ziffern, ohne Leerzeichen.');$key=mb_strtoupper($code);if(isset($codes[$key]))fail(422,'Jedes Kürzel nur einmal verwenden.');$codes[$key]=true;$accountable=$item['accountable']??false;if(!is_bool($accountable))fail(422,'Gesamtverantwortung als Ja/Nein angeben.');$out[]=['id'=>$id,'code'=>$code,'label'=>labName($item['label']??null,80),'description'=>studioText($item['description']??'',240),'accountable'=>$accountable];}
 return $out;
}
function governanceProjectContributions(string $pid):array {
 $config=json_decode(one('SELECT config FROM lab_project_config WHERE project_id=?',[$pid])['config']??'{}',true);
 return $config['governanceContributions']??['version'=>0,'items'=>governanceDefaultContributions()];
}
function governanceContributionContext(string $pid):array {
 $result=governanceProjectContributions($pid);$result['counts']=[];$result['works']=0;
 foreach(all('SELECT content FROM lab_objects WHERE project_id=? AND kind="governance"',[$pid]) as $row){$result['works']++;foreach(json_decode($row['content'],true)['assignments']??[] as $a)$result['counts'][$a['raci']]=($result['counts'][$a['raci']]??0)+1;}
 $result['counts']=(object)$result['counts'];return $result;
}
// Model configuration is project work, not an administration permission. All
// saved works migrate in one transaction; frozen Project Lab states never change.
function governanceContributionsSave(array $u,array $d):array {
 $pid=textField($d,'project',32);labAccess($u,$pid,'governance');$items=governanceContributionsValidate($d['items']??null);$moves=studioRecord($d['moves']??[]);
 return transaction(function()use($u,$d,$pid,$items,$moves){
  $p=labAccess($u,$pid,'governance');$before=governanceProjectContributions($pid);if(($d['version']??null)!==$before['version'])fail(409,'Die Beitragsbereiche wurden inzwischen geändert. Dialog schließen und erneut öffnen; Ihr Entwurf bleibt erhalten.');
  $ids=array_column($items,'id');$removed=array_diff(array_column($before['items'],'id'),$ids);
  foreach($moves as $from=>$to)if(!in_array($from,$removed,true)||!is_string($to)||!in_array($to,$ids,true))fail(422,'Zuordnungen nur aus entfernten Bereichen in einen verbleibenden Bereich verschieben.');
  $updates=[];$growth=0;
  foreach(all('SELECT id,name,content FROM lab_objects WHERE project_id=? AND kind="governance"',[$pid]) as $row){$c=json_decode($row['content'],true);foreach($c['assignments'] as &$a){if(!in_array($a['raci'],$ids,true)){if(!isset($moves[$a['raci']]))fail(422,'Für einen belegten, entfernten Bereich ein neues Ziel wählen.');$a['raci']=$moves[$a['raci']];}}unset($a);
   $c['contributions']=$items;try{$checked=governanceValidate($c);}catch(ApiError $e){fail(422,'„'.$row['name'].'“: '.$e->getMessage().' Bitte zuerst die betroffenen Zuordnungen prüfen.');}$content=labJson($checked);$growth+=strlen($content)-strlen($row['content']);$updates[]=[$content,now(),$row['id']];
  }
  if(workspaceBytes($p)+$growth>SPACE_LIMIT)fail(413,'Der Workspace-Speicher ist voll.');
  $config=json_decode(one('SELECT config FROM lab_project_config WHERE project_id=?',[$pid])['config']??'{}',true);$config['governanceContributions']=['version'=>$before['version']+1,'items'=>$items];
  query('INSERT INTO lab_project_config VALUES(?,?) ON CONFLICT(project_id) DO UPDATE SET config=excluded.config',[$pid,labJson($config)]);
  foreach($updates as $values)query('UPDATE lab_objects SET content=?,version=version+1,updated_at=? WHERE id=?',$values);
  query('UPDATE projects SET updated_at=? WHERE id=?',[now(),$pid]);audit($u['id'],'lab.governance.contributions',['project'=>$pid,'areas'=>count($items)]);return ['contributions'=>governanceContributionContext($pid)];
 });
}
