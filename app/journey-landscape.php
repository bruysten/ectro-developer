<?php
declare(strict_types=1);
function journeyInfrastructureValidate(mixed $raw,array $stages,?array $blueprint):?array {
    if($raw===null)return null;$v=studioRecord($raw);$source=studioText($v['landscape']??'',32);if(!preg_match('/^[a-f0-9]{32}$/D',$source))fail(422,'Bitte eine vorhandene Landschaft auswählen.');
    $stageIds=array_fill_keys(array_column($stages,'id'),true);$items=[];foreach($blueprint['items']??[] as $item)$items[$item['id']]=$item['stage'];$bindings=[];$seen=[];
    foreach(labList($v['bindings']??[],300) as $raw){$b=studioRecord($raw);$stage=labName($b['stage']??null);$element=studioEnum($b['element']??null,['phase','goal','action','touchpoint','channel','pain','opportunity','kpi','blueprint']);$item=$element==='blueprint'?labName($b['blueprint']??null):'';
        if(!isset($stageIds[$stage])||($element==='blueprint'&&($items[$item]??null)!==$stage))fail(422,'Die Zuordnung benötigt eine vorhandene Phase bzw. Blueprint-Aktivität.');$key=$stage.'|'.$element.'|'.$item;if(isset($seen[$key]))fail(422,'Ein Journey-Element darf nur eine Zuordnung haben.');$seen[$key]=true;$out=['stage'=>$stage,'element'=>$element];if($item!=='')$out['blueprint']=$item;
        foreach(['systems','stores'] as $type){$ids=labList($b[$type]??[],100);foreach($ids as $id)labName($id);if(count(array_unique($ids))!==count($ids))fail(422,'Eine Abhängigkeit wurde doppelt gewählt.');$out[$type]=$ids;}if(!$out['systems']&&!$out['stores'])fail(422,'Mindestens ein System oder einen Datenbestand zuordnen.');$bindings[]=$out;
    }return ['landscape'=>$source,'bindings'=>$bindings];
}
// Unchanged references survive source deletion or revocation; they never grant access to source data.
function journeyInfrastructureAccess(array $u,string $pid,?array $next,?array $old=null):void {
    if($next===null||$next===$old)return;labAccess($u,$pid,'landscape');$source=one('SELECT * FROM lab_objects WHERE id=? AND project_id=? AND kind="landscape"',[$next['landscape'],$pid]);if(!$source)fail(422,'Die gewählte Landschaft ist in diesem Projekt nicht verfügbar.');$c=json_decode($source['content'],true);$valid=['systems'=>array_fill_keys(array_column($c['systems'],'id'),true),'stores'=>array_fill_keys(array_column($c['stores'],'id'),true)];
    // Existing dangling references may be kept while another element is edited, but cannot be newly introduced.
    foreach($next['bindings'] as $b)foreach(['systems','stores'] as $type)foreach($b[$type] as $id)if(!isset($valid[$type][$id])){$kept=false;if(($old['landscape']??'')===$next['landscape'])foreach($old['bindings'] as $before)if($before['stage']===$b['stage']&&$before['element']===$b['element']&&($before['blueprint']??'')===($b['blueprint']??'')&&in_array($id,$before[$type],true))$kept=true;if(!$kept)fail(422,'Ein zugeordnetes System oder ein Datenbestand ist nicht mehr vorhanden. Bitte die Zuordnung aktualisieren.');}
}
function labIndustryCreate(array $u,array $data):array {
    return transaction(function()use($u,$data){$pid=textField($data,'project',32);labAccess($u,$pid,'landscape');labAccess($u,$pid,'journey');$landscape=labSaveRecord($u,['project'=>$pid,'kind'=>'landscape','name'=>labName($data['name']??null).' · Landscape','content'=>$data['landscape']??null]);$journey=studioRecord($data['journey']??null);$infrastructure=studioRecord($journey['infrastructure']??[]);$journey['infrastructure']=[...$infrastructure,'landscape'=>$landscape['id']];$journey=labSaveRecord($u,['project'=>$pid,'kind'=>'journey','name'=>labName($data['name']??null).' · Journey','content'=>$journey]);return ['landscape'=>$landscape,'journey'=>$journey];});
}
