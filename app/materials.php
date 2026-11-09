<?php
declare(strict_types=1);
require_once __DIR__.'/chat.php'; // Shared PHP upload-limit parser.
const MATERIAL_FILE_TYPES=['pdf','doc','docx','xls','xlsx','ppt','pptx','odt','ods','odp','rtf','txt','md','csv','tsv','png','jpg','jpeg','webp','zip'];
const MATERIAL_SPACE_LIMIT=104857600;
function materialAdmin(array $u):void {if($u['role']!=='admin')fail(403,'Materialien werden zentral im Adminbereich verwaltet.');}
function materialUploadLimit():int {$limit=10485760;foreach(['upload_max_filesize','post_max_size'] as $key){$v=iniBytes((string)ini_get($key));if($v>0)$limit=min($limit,max(0,$v-($key==='post_max_size'?65536:0)));}return $limit;}
function materialURL(mixed $url):string {
    if(!is_string($url)||mb_strlen($url)>2000||preg_match('/[\x00-\x20\\\\]/',$url))fail(422,'Bitte einen gültigen Weblink angeben.');$p=parse_url($url);
    if(!$p||!in_array(strtolower($p['scheme']??''),['https','http'],true)||empty($p['host'])||isset($p['user'])||isset($p['pass'])||!filter_var($url,FILTER_VALIDATE_URL))fail(422,'Links müssen mit https:// oder http:// beginnen und dürfen keine Zugangsdaten enthalten.');return $url;
}
function materialGroupIds(mixed $values):array {if(!is_array($values)||!array_is_list($values)||count($values)>200)fail(422,'Bitte gültige Gruppen auswählen.');$out=[];foreach($values as $gid){if(!is_string($gid)||!preg_match('/^[a-f0-9]{32}$/D',$gid)||!one('SELECT id FROM groups WHERE id=?',[$gid]))fail(422,'Eine ausgewählte Gruppe existiert nicht mehr.');if(in_array($gid,$out,true))fail(422,'Gruppen dürfen nicht doppelt vorkommen.');$out[]=$gid;}return $out;}
function materialRows(?array $u=null):array {
    $where='';$args=[];
    if($u){$where=' WHERE m.enabled=1';if(!in_array($u['role'],['admin','teacher'],true)){$where.=' AND EXISTS(SELECT 1 FROM material_groups mg JOIN group_members gm ON gm.group_id=mg.group_id WHERE mg.material_id=m.id AND gm.user_id=? AND '.groupOpenSql('mg.group_id').')';$args[]=$u['id'];}}
    $items=all('SELECT m.*,f.filename,f.size FROM materials m LEFT JOIN material_files f ON f.material_id=m.id'.$where.' ORDER BY m.category COLLATE NOCASE,m.title COLLATE NOCASE,m.id',$args);
    $grants=all('SELECT mg.material_id,g.id,g.name FROM material_groups mg JOIN groups g ON g.id=mg.group_id'.($u&&!in_array($u['role'],['admin','teacher'],true)?' JOIN group_members gm ON gm.group_id=g.id WHERE gm.user_id=? AND '.groupOpenSql('g.id'):'').' ORDER BY g.name',$u&&!in_array($u['role'],['admin','teacher'],true)?[$u['id']]:[]);
    $byId=[];foreach($grants as $g)$byId[$g['material_id']][]=['id'=>$g['id'],'name'=>$g['name']];
    foreach($items as &$m){$m['version']=(int)$m['version'];$m['enabled']=(bool)$m['enabled'];$m['size']=(int)($m['size']??0);$m['groups']=$byId[$m['id']]??[];unset($m['created_by']);}unset($m);return $items;
}
function materialGet(array $u,string $id):array {
    $m=one('SELECT m.id,m.kind,m.enabled,f.filename,f.size FROM materials m LEFT JOIN material_files f ON f.material_id=m.id WHERE m.id=?',[$id]);
    if(!$m)fail(404,'Material nicht verfügbar.');
    if(!in_array($u['role'],['admin','teacher'],true)&&(!$m['enabled']||!one('SELECT 1 FROM material_groups mg JOIN group_members gm ON gm.group_id=mg.group_id WHERE mg.material_id=? AND gm.user_id=? AND '.groupOpenSql('mg.group_id'),[$id,$u['id']])))fail(404,'Material nicht verfügbar.');return $m;
}
function materialSaved(string $id):array {foreach(materialRows() as $m)if($m['id']===$id)return $m;fail(404,'Material nicht gefunden.');}
function materialSave(array $u,array $data,?array $file=null):array {
    materialAdmin($u);$title=textField($data,'title',160);$description=textField($data,'description',1500,false);$category=textField($data,'category',80,false);$kind=$data['kind']??null;if(!in_array($kind,['document','link'],true))fail(422,'Bitte Dokument oder Link wählen.');if(!is_bool($data['enabled']??null))fail(422,'Bitte den Status prüfen.');$enabled=$data['enabled'];$url=$kind==='link'?materialURL($data['url']??null):'';$groups=materialGroupIds($data['groups']??[]);
    if($file){if($kind!=='document'||!is_string($file['name']??null)||!is_string($file['content']??null)||!strlen($file['content'])||strlen($file['content'])>materialUploadLimit())fail(413,'Die Datei ist leer oder überschreitet die erlaubte Größe.');$filename=basename(str_replace('\\','/',$file['name']));if(mb_strlen($filename)>180||preg_match('/[\x00-\x1f\x7f]/',$filename)||!in_array(strtolower(pathinfo($filename,PATHINFO_EXTENSION)),MATERIAL_FILE_TYPES,true))fail(422,'Dieser Dateityp oder Dateiname ist nicht für Materialien geeignet.');$file['name']=$filename;}
    return transaction(function()use($u,$data,$title,$description,$category,$kind,$enabled,$url,$groups,$file){
        $id=textField($data,'id',32,false);$old=$id?one('SELECT * FROM materials WHERE id=?',[$id]):null;
        if($id&&(!$old||!is_int($data['version']??null)||(int)$old['version']!==$data['version']))fail(409,'Das Material wurde inzwischen geändert oder entfernt. Bitte neu laden.');
        if($old&&$old['kind']!==$kind)fail(422,'Dokument und Link können nicht ineinander umgewandelt werden. Bitte ein neues Material anlegen.');
        if(!$id){if((int)query('SELECT COUNT(*) FROM materials')->fetchColumn()>=300)fail(422,'Die Materialbibliothek enthält bereits 300 Einträge.');$id=id();}
        if($kind==='document'&&!$file&&!one('SELECT material_id FROM material_files WHERE material_id=?',[$id]))fail(422,'Bitte ein Dokument auswählen.');
        $previous=(int)(one('SELECT size FROM material_files WHERE material_id=?',[$id])['size']??0);if($file&&(int)query('SELECT COALESCE(SUM(size),0) FROM material_files')->fetchColumn()-$previous+strlen($file['content'])>MATERIAL_SPACE_LIMIT)fail(413,'Die zentrale Materialablage ist voll (100 MB).');
        if($old)query('UPDATE materials SET title=?,description=?,category=?,url=?,enabled=?,version=version+1,updated_at=? WHERE id=?',[$title,$description,$category,$url,(int)$enabled,now(),$id]);
        else query('INSERT INTO materials(id,title,description,category,kind,url,enabled,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)',[$id,$title,$description,$category,$kind,$url,(int)$enabled,$u['id'],now(),now()]);
        if($file){query('DELETE FROM material_files WHERE material_id=?',[$id]);$s=db()->prepare('INSERT INTO material_files VALUES(?,?,?,?)');$s->bindValue(1,$id);$s->bindValue(2,$file['name']);$s->bindValue(3,strlen($file['content']),PDO::PARAM_INT);$s->bindValue(4,$file['content'],PDO::PARAM_LOB);$s->execute();}
        query('DELETE FROM material_groups WHERE material_id=?',[$id]);foreach($groups as $g)query('INSERT INTO material_groups VALUES(?,?)',[$id,$g]);audit($u['id'],'material.save',['id'=>$id]);return materialSaved($id);
    });
}
function materialUpload(array $u,array $data):array {
    materialAdmin($u);rateLimit('materials.upload.'.$u['id'],20,60);$f=$_FILES['file']??null;if(!is_array($f)||($f['error']??null)!==UPLOAD_ERR_OK||!is_uploaded_file($f['tmp_name']??'')||($f['size']??0)<1||$f['size']>materialUploadLimit())fail(413,'Bitte eine Datei innerhalb der erlaubten Größe auswählen.');
    $content=file_get_contents($f['tmp_name']);if($content===false||strlen($content)!==$f['size'])fail(422,'Die Datei konnte nicht gelesen werden.');
    try{$groups=json_decode($data['groups']??'[]',true,32,JSON_THROW_ON_ERROR);}catch(Throwable){fail(422,'Ungültige Gruppenfreigaben.');}
    if(!in_array($data['enabled']??null,['true','false'],true))fail(422,'Bitte den Status prüfen.');$data['enabled']=$data['enabled']==='true';$data['groups']=$groups;if(isset($data['version'])){if(!preg_match('/^[1-9][0-9]{0,9}$/D',(string)$data['version']))fail(422,'Ungültige Materialversion.');$data['version']=(int)$data['version'];}
    return materialSave($u,$data,['name'=>$f['name'],'content'=>$content]);
}
function materialGrant(array $u,array $data):array {
    materialAdmin($u);$id=textField($data,'id',32);$groups=materialGroupIds([$data['group']??null]);if(!is_bool($data['enabled']??null))fail(422,'Bitte die Gruppenfreigabe prüfen.');
    return transaction(function()use($u,$data,$id,$groups){$m=one('SELECT version FROM materials WHERE id=?',[$id]);if(!$m||!is_int($data['version']??null)||(int)$m['version']!==$data['version'])fail(409,'Die Freigaben wurden inzwischen geändert. Bitte neu laden.');$exists=(bool)one('SELECT 1 FROM material_groups WHERE material_id=? AND group_id=?',[$id,$groups[0]]);if($exists!==$data['enabled']){if($data['enabled'])query('INSERT INTO material_groups VALUES(?,?)',[$id,$groups[0]]);else query('DELETE FROM material_groups WHERE material_id=? AND group_id=?',[$id,$groups[0]]);query('UPDATE materials SET version=version+1,updated_at=? WHERE id=?',[now(),$id]);audit($u['id'],'material.grant',['id'=>$id,'group'=>$groups[0],'enabled'=>$data['enabled']]);}return materialSaved($id);});
}
function materialsDispatch(array $u,string $action,array $data):never {
    if($action==='materials')jsonOut(['materials'=>materialRows($u)]);
    materialAdmin($u);
    if($action==='admin.materials'){$groups=all('SELECT id,name FROM groups ORDER BY name');foreach($groups as &$g)$g['periods']=groupPeriodsPublic($g['id']);unset($g);jsonOut(['materials'=>materialRows(),'groups'=>$groups,'limits'=>['fileBytes'=>materialUploadLimit(),'spaceBytes'=>MATERIAL_SPACE_LIMIT,'usedBytes'=>(int)query('SELECT COALESCE(SUM(size),0) FROM material_files')->fetchColumn(),'types'=>MATERIAL_FILE_TYPES]]);}
    if($action==='admin.material.save')jsonOut(['material'=>materialSave($u,$data)]);
    if($action==='admin.material.upload')jsonOut(['material'=>materialUpload($u,$data)]);
    if($action==='admin.material.grant')jsonOut(['material'=>materialGrant($u,$data)]);
    if($action==='admin.material.delete'){transaction(function()use($u,$data){$id=textField($data,'id',32);$m=one('SELECT version FROM materials WHERE id=?',[$id]);if(!$m||!is_int($data['version']??null)||(int)$m['version']!==$data['version'])fail(409,'Das Material wurde inzwischen geändert oder entfernt. Bitte neu laden.');query('DELETE FROM materials WHERE id=?',[$id]);audit($u['id'],'material.delete',['id'=>$id]);});jsonOut(['ok'=>true]);}
    fail(404,'Unbekannte Materialaktion.');
}
