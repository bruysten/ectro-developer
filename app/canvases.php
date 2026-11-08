<?php
declare(strict_types=1);
require_once __DIR__.'/labs.php';
const CANVAS_SECTIONS=[
 'business'=>['partners','activities','resources','value','relationships','channels','segments','costs','revenue'],
 'value'=>['products','relievers','creators','jobs','pains','gains'],
 'lean'=>['problem','solution','metrics','value','advantage','channels','segments','costs','revenue','alternatives','concept','adopters'],
 'smart'=>['specific','measurable','achievable','relevant','timebound'],
 'swot'=>['strengths','weaknesses','opportunities','threats'],
 'pestel'=>['political','economic','social','technological','environmental','legal'],
 'empathy'=>['says','thinks','does','feels','questions','insights','hear','see','pains','gains'],
 'experiment'=>['risk','hypothesis','audience','test','measure','threshold','results','learning','next'],
];
function canvasNeed(array $u): void {needFeature($u,'files');needFeature($u,'canvas_lab');}
function canvasGroups(array $u): array {
 return all('SELECT g.id,g.name FROM groups g WHERE '.(workspaceManagement($u)?'1=1':'EXISTS(SELECT 1 FROM group_members m WHERE m.group_id=g.id AND m.user_id=?) AND '.groupOpenSql('g.id')).' ORDER BY g.name',workspaceManagement($u)?[]:[$u['id']]);
}
function canvasAccess(array $u,string $id,bool $includeDeleted=false): array {
 canvasNeed($u);$row=one('SELECT c.*,g.name group_name,t.deleted_at FROM canvases c LEFT JOIN groups g ON g.id=c.group_id LEFT JOIN canvas_trash t ON t.canvas_id=c.id WHERE c.id=?',[$id]);
 if(!$row||(!$includeDeleted&&$row['deleted_at'])||($row['owner_id']!==$u['id']&&(!$row['group_id']||!in_array($row['group_id'],array_column(canvasGroups($u),'id'),true))))fail(404,'Canvas nicht gefunden.');
 $row['version']=(int)$row['version'];$row['archived']=(bool)$row['archived'];$row['content']=json_decode($row['content'],true);$row['can_manage']=$row['owner_id']===$u['id']||$row['created_by']===$u['id']||$u['role']==='admin';return $row;
}
function canvasContent(string $kind,mixed $value): array {
 if(!isset(CANVAS_SECTIONS[$kind])||!is_array($value))fail(422,'Unbekanntes Canvas-Modell.');
 $cards=[];$ids=[];foreach(labList($value['cards']??[],300) as $card){
  if(!is_array($card))fail(422,'Ungültige Karte.');$id=$card['id']??'';
  if(!is_string($id)||!preg_match('/^[a-zA-Z0-9_-]{16,64}$/D',$id)||isset($ids[$id]))fail(422,'Ungültige oder doppelte Kartenkennung.');$ids[$id]=true;
  if(!in_array($card['section']??null,CANVAS_SECTIONS[$kind],true)||!in_array($card['color']??'sand',['sand','rose','mint','sky'],true)||!in_array($card['status']??'assumption',['assumption','evidence','decision'],true)||!in_array($card['priority']??'normal',['normal','high'],true))fail(422,'Ungültiges Kartenfeld.');
  $text=textField($card,'text',2000);$evidence=textField($card,'evidence',1000,false);if(($card['status']??'assumption')==='evidence'&&$evidence==='')fail(422,'Für einen Beleg bitte die Quelle oder Beobachtung ergänzen.');
  if($kind==='experiment'&&!in_array($card['outcome']??'open',['open','validated','invalidated','inconclusive'],true))fail(422,'Ungültige Ergebnisbewertung.');
  $cards[]=[...($kind==='experiment'?['outcome'=>$card['outcome']??'open']:[]),'id'=>$id,'section'=>$card['section'],'text'=>$text,'evidence'=>$evidence,'color'=>$card['color']??'sand','status'=>$card['status']??'assumption','priority'=>$card['priority']??'normal','version'=>is_int($card['version']??null)?max(1,$card['version']):1,'author'=>is_string($card['author']??null)?mb_substr($card['author'],0,120):'','updated_at'=>is_string($card['updated_at']??null)?substr($card['updated_at'],0,40):''];
 }$out=['cards'=>$cards];labJson($out);return $out;
}
function canvasCreate(array $u,array $data): array {
 canvasNeed($u);return transaction(function()use($u,$data){
  $source=!empty($data['source'])?canvasAccess($u,textField($data,'source',32)):null;
  $kind=$source['kind']??textField($data,'kind',20);if(!isset(CANVAS_SECTIONS[$kind]))fail(422,'Unbekanntes Canvas-Modell.');
  $group=textField($data,'group',32,false);if($group&&!in_array($group,array_column(canvasGroups($u),'id'),true))fail(404,'Gruppe nicht gefunden.');
  $owner=$group?null:$u['id'];$count=(int)query('SELECT COUNT(*) FROM canvases WHERE '.($group?'group_id=?':'owner_id=?'),[$group?:$owner])->fetchColumn();if($count>=100)fail(413,'Höchstens 100 Canvases pro persönlichem Bereich oder Gruppe.');
  $content=canvasContent($kind,$source['content']??($data['content']??['cards'=>[]]));foreach($content['cards'] as &$card){$card['id']=id();$card['version']=1;$card['author']=$u['name'];$card['updated_at']=now();}unset($card);
  $id=id();query('INSERT INTO canvases(id,owner_id,group_id,created_by,kind,name,content,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)',[$id,$owner,$group?:null,$u['id'],$kind,labName($data['name']??null),labJson($content),now(),now()]);audit($u['id'],'canvas.create',['id'=>$id,'kind'=>$kind]);return canvasAccess($u,$id);
 });
}
function canvasMutate(array $u,array $data): array {
 return transaction(function()use($u,$data){
  $action=$data['op']??'';$c=canvasAccess($u,textField($data,'id',32),in_array($action,['trash','restore'],true));$op=textField($data,'mutation',64);if(!preg_match('/^[a-zA-Z0-9_-]{16,64}$/D',$op))fail(422,'Ungültige Änderungskennung.');
  $hash=hash('sha256',labJson($data));$seen=one('SELECT user_id,request_hash FROM canvas_mutations WHERE canvas_id=? AND id=?',[$c['id'],$op]);if($seen){if($seen['user_id']!==$u['id']||!hash_equals($seen['request_hash'],$hash))fail(409,'Diese Änderungskennung wurde bereits verwendet.');return $c;}
  $action=$data['op']??'';$content=$c['content'];
  if(in_array($action,['rename','archive','trash','restore'],true)){
   if(!$c['can_manage'])fail(403,'Nur die erstellende Person oder Administration kann diesen Canvas verwalten.');if(($data['version']??null)!==$c['version'])fail(409,'Der Canvas wurde inzwischen geändert. Bitte den aktuellen Stand prüfen.');
   if(in_array($action,['trash','restore'],true)){if(($action==='trash')===(bool)$c['deleted_at'])fail(409,'Der Papierkorbstatus wurde inzwischen geändert.');if($action==='trash')query('INSERT INTO canvas_trash(canvas_id,deleted_at,deleted_by) VALUES(?,?,?)',[$c['id'],now(),$u['id']]);else{query('DELETE FROM canvas_trash WHERE canvas_id=?',[$c['id']]);$c['archived']=false;}}
   elseif($action==='rename')$c['name']=labName($data['name']??null);else{if(!is_bool($data['archived']??null))fail(422,'Ungültiger Archivstatus.');$c['archived']=$data['archived'];}
  }elseif(in_array($action,['put','remove'],true)){
   if($c['archived'])fail(409,'Archivierte Canvases können nicht bearbeitet werden.');$cardId=textField($data,'card_id',64);$index=null;foreach($content['cards'] as $i=>$card)if($card['id']===$cardId){$index=$i;break;}
   $current=$index===null?null:$content['cards'][$index];if(($data['card_version']??null)!==($current['version']??0))fail(409,'Diese Karte wurde inzwischen geändert oder entfernt. Der Entwurf bleibt erhalten.');
   if($index===null&&one('SELECT card_id FROM canvas_removed_cards WHERE canvas_id=? AND card_id=?',[$c['id'],$cardId]))fail(409,'Diese Karte wurde bereits entfernt. Bitte den Entwurf als neue Karte sichern.');
   if($action==='remove'){if($index===null)fail(409,'Diese Karte wurde bereits entfernt.');array_splice($content['cards'],$index,1);query('INSERT INTO canvas_removed_cards(canvas_id,card_id) VALUES(?,?)',[$c['id'],$cardId]);}else{
    $input=$data['card']??null;if(!is_array($input))fail(422,'Ungültige Karte.');$next=canvasContent($c['kind'],['cards'=>[[...$input,'id'=>$cardId,'version'=>($current['version']??0)+1,'author'=>$u['name'],'updated_at'=>now()]]])['cards'][0];
    if($index===null)$content['cards'][]=$next;else $content['cards'][$index]=$next;$content=canvasContent($c['kind'],$content);
   }
  }else fail(422,'Unbekannte Canvas-Aktion.');
  query('UPDATE canvases SET name=?,content=?,archived=?,version=version+1,updated_at=? WHERE id=?',[$c['name'],labJson($content),(int)$c['archived'],now(),$c['id']]);
  query('INSERT INTO canvas_mutations(canvas_id,id,user_id,request_hash) VALUES(?,?,?,?)',[$c['id'],$op,$u['id'],$hash]);query('DELETE FROM canvas_mutations WHERE canvas_id=? AND rowid NOT IN (SELECT rowid FROM canvas_mutations WHERE canvas_id=? ORDER BY rowid DESC LIMIT 300)',[$c['id'],$c['id']]);return canvasAccess($u,$c['id'],$action==='trash');
 });
}
function canvasDispatch(array $u,string $action,array $data): never {
 canvasNeed($u);
 switch($action){
  case 'canvas.list':
   $groups=canvasGroups($u);$ids=array_column($groups,'id');$rows=all('SELECT c.id,c.name,c.kind,c.group_id,c.owner_id,c.created_by,c.version,c.archived,c.updated_at,g.name group_name,t.deleted_at FROM canvases c LEFT JOIN groups g ON g.id=c.group_id LEFT JOIN canvas_trash t ON t.canvas_id=c.id WHERE c.owner_id=?'.($ids?' OR c.group_id IN ('.implode(',',array_fill(0,count($ids),'?')).')':'').' ORDER BY c.updated_at DESC,c.id',[$u['id'],...$ids]);foreach($rows as &$r){$r['version']=(int)$r['version'];$r['archived']=(bool)$r['archived'];}unset($r);jsonOut(['canvases'=>$rows,'groups'=>$groups]);
  case 'canvas.get':jsonOut(['canvas'=>canvasAccess($u,textField($data,'id',32),($data['trash']??'')==='1')]);
  case 'canvas.create':rateLimit('canvas.create.'.$u['id'],30,60);jsonOut(['canvas'=>canvasCreate($u,$data)]);
  case 'canvas.purge':
   transaction(function()use($u,$data){$c=canvasAccess($u,textField($data,'id',32),true);if(!$c['can_manage'])fail(403,'Nur die erstellende Person oder Administration kann diesen Canvas löschen.');if(!$c['deleted_at'])fail(409,'Bitte zuerst in den Papierkorb verschieben.');if(($data['version']??null)!==$c['version'])fail(409,'Der Canvas wurde inzwischen geändert.');query('DELETE FROM canvases WHERE id=?',[$c['id']]);audit($u['id'],'canvas.delete',['id'=>$c['id']]);});jsonOut(['ok'=>true]);
  case 'canvas.mutate':rateLimit('canvas.mutate.'.$u['id'],120,60);jsonOut(['canvas'=>canvasMutate($u,$data)]);
  default:fail(404,'Unbekannte Canvas-Aktion.');
 }
}
