<?php
declare(strict_types=1);
const PERSONA_MODELS=['simple','behavioral','jobs','empathy','complete'];
const PERSONA_FIELDS=['needs','barriers','motivation','behavior','channels','skills','trigger','job','success','alternatives','says','does','thinks','feels','role','constraints','access','questions'];
function studioPersonaContent(mixed $value): array {
    $v=studioRecord($value);$out=[];
    foreach(['name'=>180,'tagline'=>240,'goal'=>2000,'context'=>2000] as $key=>$max)$out[$key]=studioText($v[$key]??'',$max);
    if(trim($out['name'])==='')fail(422,'Bitte die Persona benennen.');
    $out['model']=studioEnum($v['model']??'simple',PERSONA_MODELS);$out['basis']=studioEnum($v['basis']??'assumption',['assumption','mixed','supported']);
    $fields=studioRecord($v['fields']??[]);foreach(array_keys($fields) as $key)studioEnum($key,PERSONA_FIELDS);$out['fields']=[];foreach(PERSONA_FIELDS as $key)$out['fields'][$key]=studioText($fields[$key]??'',2000);
    $out['evidence']=[];foreach(labList($v['evidence']??[],6) as $item){$item=studioRecord($item);$source=studioText($item['source']??'',500);$note=studioText($item['note']??'',2000);if(trim($source)===''||trim($note)==='')fail(422,'Ein Beleg benötigt Quelle und Beobachtung.');$out['evidence'][]=['source'=>$source,'note'=>$note];}
    if($out['basis']!=='assumption'&&!$out['evidence'])fail(422,'Bitte mindestens eine Quelle mit Beobachtung dokumentieren oder „Annahme“ wählen.');
    return $out;
}
function studioPersonaGet(array $u,string $pid,string $id): array {
    labAccess($u,$pid,'journey');$row=one('SELECT * FROM lab_personas WHERE id=? AND project_id=?',[$id,$pid]);if(!$row)fail(404,'Persona nicht gefunden.');$row['version']=(int)$row['version'];$row['archived']=(bool)$row['archived'];$row['content']=json_decode($row['content'],true);return $row;
}
function studioPersonas(array $u,string $pid): array {
    labAccess($u,$pid,'journey');$profiles=[];foreach(all('SELECT id FROM lab_personas WHERE project_id=? ORDER BY archived,name,id',[$pid]) as $row)$profiles[]=studioPersonaGet($u,$pid,$row['id']);
    $journeys=[];foreach(all('SELECT id,name,content FROM lab_objects WHERE project_id=? AND kind="journey" ORDER BY name',[$pid]) as $row){$c=json_decode($row['content'],true);$journeys[]=['id'=>$row['id'],'name'=>$row['name'],'personaId'=>$c['personaRef']['id']??'','personaVersion'=>$c['personaRef']['version']??0];}
    return ['personas'=>$profiles,'journeys'=>$journeys];
}
function studioPersonaSave(array $u,array $data): array {
    return transaction(function()use($u,$data){$pid=textField($data,'project',32);$project=labAccess($u,$pid,'journey');$id=textField($data,'id',32,false);$old=$id?studioPersonaGet($u,$pid,$id):null;
        if($old&&($data['version']??null)!==$old['version'])fail(409,'Diese Persona wurde inzwischen geändert. Dein Entwurf bleibt geöffnet; bitte separat sichern und die Bibliothek neu laden.');
        if(!$old&&(int)query('SELECT COUNT(*) FROM lab_personas WHERE project_id=?',[$pid])->fetchColumn()>=20)fail(413,'Höchstens 20 Personas einschließlich Archiv pro Projekt.');
        $content=studioPersonaContent($data['content']??null);$json=labJson($content);
        if(workspaceBytes($project)-($old?strlen(labJson($old['content'])):0)+strlen($json)>SPACE_LIMIT)fail(413,'Der Workspace-Speicher ist voll.');
        $id=$id?:id();if($old)query('UPDATE lab_personas SET name=?,content=?,version=version+1,updated_at=? WHERE id=?',[$content['name'],$json,now(),$id]);else query('INSERT INTO lab_personas(id,project_id,name,content,updated_at) VALUES(?,?,?,?,?)',[$id,$pid,$content['name'],$json,now()]);
        query('UPDATE projects SET updated_at=? WHERE id=?',[now(),$pid]);audit($u['id'],'persona.save',['project'=>$pid]);return studioPersonaGet($u,$pid,$id);
    });
}
function studioPersonaArchive(array $u,array $data): array {
    return transaction(function()use($u,$data){$pid=textField($data,'project',32);$row=studioPersonaGet($u,$pid,textField($data,'id',32));if(($data['version']??null)!==$row['version'])fail(409,'Die Persona wurde inzwischen geändert. Bitte die Bibliothek neu laden.');if(!is_bool($data['archived']??null))fail(422,'Bitte einen Archivstatus wählen.');query('UPDATE lab_personas SET archived=?,version=version+1,updated_at=? WHERE id=?',[(int)$data['archived'],now(),$row['id']]);audit($u['id'],'persona.archive',['project'=>$pid]);return studioPersonaGet($u,$pid,$row['id']);});
}
