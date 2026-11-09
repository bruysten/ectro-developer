<?php
declare(strict_types=1);
// Saved revisions only: a browser click that has not been saved is not an administrative record.
function readinessRecord(string $oid,int $version,array $u,array $content):void {
    query('INSERT INTO readiness_revisions(object_id,version,actor_id,content,saved_at) VALUES(?,?,?,?,?)',[$oid,$version,$u['id'],labJson($content),now()]);
}
function readinessAdminOnly(array $u):void {if(($u['role']??'')!=='admin')fail(403,'Administratorzugang erforderlich.');}
function readinessScore(array $c):array {
    static $catalog=null;$catalog??=json_decode(file_get_contents(__DIR__.'/readiness-catalog.json'),true,64,JSON_THROW_ON_ERROR);$answers=$c['answers']??[];$unknown=0;$answered=0;$progress=[];$possible=[];$counts=[];
    foreach($catalog['stages'] as $stage){$points=0;$missing=0;$yes=0;$partial=0;foreach($stage['criterionOrder'] as $id){$a=$answers[$id]??'';if(in_array($a,['yes','partial','no','unknown'],true))$answered++;if($a==='yes'){$points++;$yes++;}elseif($a==='partial'){$points+=.5;$partial++;}elseif($a!=='no'){$missing++;$unknown++;}}$n=count($stage['criterionOrder']);$progress[]=$n?$points/$n:0;$possible[]=$n?($points+$missing)/$n:0;$counts[]=['yes'=>$yes,'partial'=>$partial,'unknown'=>$missing,'total'=>$n];}
    $calculate=function($values){$cap=1;$digital=0;$contributions=[0];for($i=1;$i<=5;$i++){$cap=min($cap,$values[$i]);$contributions[$i]=$cap;$digital+=$cap;}$contributions[6]=$digital===5.0||$digital===5?$values[6]:0;return ['position'=>$digital+$contributions[6],'contributions'=>$contributions];};
    $lower=$calculate($progress);$upper=$calculate($possible);$score=floor((1+$lower['position'])*10+1e-9)/10;$upperScore=$lower['position']===$upper['position']?$score:ceil((1+$upper['position'])*10-1e-9)/10;
    $complete=($c['screen']??'')==='result'&&count($answers)===count($catalog['criteria'])&&!empty($c['completedAt']);
    return ['score'=>$score,'upperScore'=>$upperScore,'level'=>min(6,(int)floor($lower['position']+1e-9)),'unknown'=>$unknown,'answered'=>$answered,'complete'=>$complete,'progress'=>$progress,'contributions'=>$lower['contributions'],'counts'=>$counts,'scoringVersion'=>2];
}
function readinessAdminRow(array $r,bool $content=false):array {
    $c=json_decode($r['content'],true,64,JSON_THROW_ON_ERROR);$r['report']=readinessScore($c);$r['organization']=$c['organization']??'';$r['scope']=$c['scope']??'organization';$r['area']=$c['area']??'';$r['completed_at']=$c['completedAt']??'';$r['version']=(int)$r['version'];if($content)$r['content']=$c;else unset($r['content']);return $r;
}
function readinessAdminDirectory(array $u):array {
    readinessAdminOnly($u);
    return ['groups'=>all('SELECT g.id,g.name,p.access_start,p.access_end,p.access_start_at,p.access_end_before FROM groups g LEFT JOIN group_periods p ON p.group_id=g.id ORDER BY g.name,g.id'),'people'=>all('SELECT id,name,role,active FROM users ORDER BY name,id'),'memberships'=>all('SELECT user_id,group_id FROM group_members')];
}
function readinessAdminOverview(array $u,array $data):array {
    readinessAdminOnly($u);$group=textField($data,'group',32,false);$person=textField($data,'person',32,false);$status=$data['status']??'all';if(!in_array($status,['all','complete','draft'],true))fail(422,'Ungültiger Status.');$page=filter_var($data['page']??1,FILTER_VALIDATE_INT);if($page===false||$page<1||$page>100000)fail(422,'Ungültige Seite.');
    if($group&&!one('SELECT id FROM groups WHERE id=?',[$group]))fail(404,'Gruppe nicht gefunden.');if($person&&!one('SELECT id FROM users WHERE id=?',[$person]))fail(404,'Person nicht gefunden.');
    $where=["o.kind='readiness'"];$args=[];
    if($group){$where[]='(p.group_id=? OR (p.user_id IS NOT NULL AND EXISTS(SELECT 1 FROM group_members m WHERE m.user_id=p.user_id AND m.group_id=?)))';array_push($args,$group,$group);}
    if($person){$where[]='(p.user_id=? OR (p.group_id IS NOT NULL AND EXISTS(SELECT 1 FROM readiness_revisions rr WHERE rr.object_id=o.id AND rr.actor_id=?)))';array_push($args,$person,$person);}
    $sql='SELECT o.id,o.name,o.version,o.updated_at,o.content,p.id project_id,p.name project_name,p.user_id owner_id,p.group_id,u.name owner_name,g.name group_name,r.actor_id,a.name actor_name FROM lab_objects o JOIN projects p ON p.id=o.project_id LEFT JOIN users u ON u.id=p.user_id LEFT JOIN groups g ON g.id=p.group_id LEFT JOIN readiness_revisions r ON r.object_id=o.id AND r.version=o.version LEFT JOIN users a ON a.id=r.actor_id WHERE '.implode(' AND ',$where).' ORDER BY o.updated_at DESC,o.id';
    $rows=[];$distribution=array_fill(0,7,0);$summary=['complete'=>0,'draft'=>0,'shared'=>0,'unknown'=>0];$people=[];$total=0;
    // Stream full content for summaries; return only one bounded page of metadata.
    $stmt=query($sql,$args);while($r=$stmt->fetch()){$r=readinessAdminRow($r);$complete=$r['report']['complete'];if(($status==='complete'&&!$complete)||($status==='draft'&&$complete))continue;$total++;$summary[$complete?'complete':'draft']++;if($r['group_id'])$summary['shared']++;if($complete){$distribution[$r['report']['level']]++;$summary['unknown']+=$r['report']['unknown'];}if($r['owner_id']){$id=$r['owner_id'];$people[$id]??=['id'=>$id,'checks'=>0,'complete'=>0,'latest'=>null];$people[$id]['checks']++;if($complete){$people[$id]['complete']++;$people[$id]['latest']??=$r;}}if($total>($page-1)*50&&$total<=$page*50)$rows[]=$r;}
    $participants=all("SELECT u.id,u.name,u.role,u.active FROM users u WHERE u.role='user'".($group?' AND EXISTS(SELECT 1 FROM group_members m WHERE m.user_id=u.id AND m.group_id=?)':'').($person?' AND u.id=?':'').' ORDER BY u.name,u.id',array_values(array_filter([$group?:null,$person?:null],fn($v)=>$v!==null)));
    // Include instructors/administrators only when they own a matching personal check or were selected explicitly.
    foreach(all('SELECT id,name,role,active FROM users WHERE role!=\'user\' ORDER BY name,id') as $p)if((isset($people[$p['id']])||$person===$p['id'])&&(!$group||one('SELECT 1 FROM group_members WHERE user_id=? AND group_id=?',[$p['id'],$group]))&&(!$person||$person===$p['id']))$participants[]=$p;
    foreach($participants as &$p)$p=[...$p,...($people[$p['id']]??['checks'=>0,'complete'=>0,'latest'=>null])];unset($p);
    return ['checks'=>$rows,'total'=>$total,'page'=>$page,'pages'=>max(1,(int)ceil($total/50)),'summary'=>$summary,'distribution'=>$distribution,'participants'=>$participants];
}
function readinessAdminDetail(array $u,array $data):array {
    readinessAdminOnly($u);$id=textField($data,'id',32);$r=one("SELECT o.*,p.name project_name,p.user_id owner_id,p.group_id,u.name owner_name,g.name group_name FROM lab_objects o JOIN projects p ON p.id=o.project_id LEFT JOIN users u ON u.id=p.user_id LEFT JOIN groups g ON g.id=p.group_id WHERE o.id=? AND o.kind='readiness'",[$id]);if(!$r)fail(404,'Check nicht gefunden.');
    $version=isset($data['version'])?filter_var($data['version'],FILTER_VALIDATE_INT):(int)$r['version'];if($version===false||$version<1)fail(422,'Ungültige Version.');$revision=one('SELECT r.*,u.name actor_name FROM readiness_revisions r LEFT JOIN users u ON u.id=r.actor_id WHERE object_id=? AND version=?',[$id,$version]);if(!$revision&&$version!==(int)$r['version'])fail(404,'Dieser frühere Speicherstand wurde nicht erfasst.');
    if($revision){$r['content']=$revision['content'];$r['version']=$revision['version'];$r['updated_at']=$revision['saved_at'];}$r['actor_id']=$revision['actor_id']??null;$r['actor_name']=$revision['actor_name']??null;
    $before=one('SELECT content FROM readiness_revisions WHERE object_id=? AND version<? ORDER BY version DESC LIMIT 1',[$id,$version]);
    return ['check'=>readinessAdminRow($r,true),'previous'=>$before?json_decode($before['content'],true):null,'revisions'=>all('SELECT r.version,r.saved_at,u.name actor_name FROM readiness_revisions r LEFT JOIN users u ON u.id=r.actor_id WHERE r.object_id=? ORDER BY r.version DESC LIMIT 100',[$id])];
}
