<?php
declare(strict_types=1);
const CHAT_TYPES=['pdf','csv','tsv','json','php','html','htm','css','js','mjs','py','txt','md','xml','sql','yaml','yml','ipynb','log','pub','pages','numbers','key','vsd','vsdx','one','accdb','mdb','dotm','xltm','potm','pps','ppsx','ppsm','doc','docx','docm','dot','dotx','xls','xlsx','xlsm','xlt','xltx','ppt','pptx','pptm','pot','potx','odt','ods','odp','odg','rtf','jpg','jpeg','png','gif','webp','svg','zip','7z','gz','tar'];
function iniBytes(string $value): int { $value=trim($value);$n=(int)$value;return $n*match(strtolower(substr($value,-1))){'g'=>1073741824,'m'=>1048576,'k'=>1024,default=>1}; }
function chatSharing(): array {
    $s=settings()['chat_sharing']??['enabled'=>true,'types'=>CHAT_TYPES,'max_mb'=>10];
    $limit=(int)$s['max_mb']*1048576;
    foreach(['upload_max_filesize','post_max_size'] as $setting){$v=iniBytes((string)ini_get($setting));if($v>0)$limit=min($limit,max(0,$v-($setting==='post_max_size'?65536:0)));}
    return [...$s,'max_bytes'=>$limit];
}
function chatSharingInput(mixed $s): array {
    if(!is_array($s)||!is_bool($s['enabled']??null)||!is_array($s['types']??null)||count($s['types'])>80||!is_int($s['max_mb']??null)||$s['max_mb']<1||$s['max_mb']>25)fail(422,'Bitte Dateifreigabe, Dateitypen und Dateigröße (1–25 MB) prüfen.');
    $types=[];foreach($s['types'] as $type){if(!is_string($type)||!preg_match('/^[a-z0-9]{1,12}$/',$type))fail(422,'Dateitypen als Endungen ohne Punkt angeben, z. B. pdf oder docx.');$types[]=$type;}
    if($s['enabled']&&!$types)fail(422,'Bitte mindestens einen Dateityp freigeben.');
    return ['enabled'=>$s['enabled'],'types'=>array_values(array_unique($types)),'max_mb'=>$s['max_mb']];
}
function chatAccess(array $u,string $group,bool $admin=false): void {
    if(!one('SELECT id FROM groups WHERE id=?',[$group]))fail(404,'Gruppe nicht gefunden.');
    if($admin&&$u['role']==='admin')return;
    needFeature($u,'chat');if(!one('SELECT 1 FROM group_members WHERE group_id=? AND user_id=?',[$group,$u['id']]))fail(403,'Sie sind nicht Mitglied dieser Gruppe.');
}
function chatHistory(string $gid,int $before=0,int $after=0): array {
    $where=$before?' AND m.id<?':($after?' AND m.id>?':'');$params=[$gid];if($before||$after)$params[]=$before?:$after;
    $rows=all('SELECT m.id,m.user_id,m.body,m.created_at,u.name,a.id attachment_id,a.name attachment_name,a.extension,a.size FROM messages m JOIN users u ON u.id=m.user_id LEFT JOIN chat_attachments a ON a.message_id=m.id WHERE m.group_id=?'.$where.' ORDER BY m.id '.($after?'ASC':'DESC').' LIMIT 101',$params);
    $more=count($rows)>100;$rows=array_slice($rows,0,100);if(!$after)$rows=array_reverse($rows);
    foreach($rows as &$row){$row['attachment']=$row['attachment_id']?['id'=>$row['attachment_id'],'name'=>$row['attachment_name'],'extension'=>$row['extension'],'size'=>(int)$row['size']]:null;unset($row['attachment_id'],$row['attachment_name'],$row['extension'],$row['size']);}unset($row);
    return ['messages'=>$rows,'has_more'=>$more,'revision'=>(int)(one('SELECT revision FROM chat_state WHERE group_id=?',[$gid])['revision']??0)];
}
function chatMembers(string $gid): array {
    return all('SELECT u.id,u.name,CASE WHEN p.touched>? THEN 1 ELSE 0 END online FROM users u JOIN group_members m ON m.user_id=u.id LEFT JOIN chat_presence p ON p.group_id=m.group_id AND p.user_id=u.id WHERE m.group_id=? AND u.active=1 ORDER BY u.name',[time()-60,$gid]);
}
function chatUpload(array $u,array $data): void {
    $gid=textField($data,'group',32);chatAccess($u,$gid);rateLimit('upload.'.$u['id'],20,60);$sharing=chatSharing();
    if(!$sharing['enabled'])fail(403,'Dateien teilen ist derzeit deaktiviert.');
    $f=$_FILES['file']??null;
    if(!is_array($f)||!is_int($f['error']??null))fail(422,'Bitte eine Datei auswählen.');
    if($f['error']!==UPLOAD_ERR_OK)fail(413,'Die Datei konnte nicht hochgeladen werden. Bitte die erlaubte Größe prüfen.');
    $name=$f['name']??'';
    if(!is_string($name)||!mb_check_encoding($name,'UTF-8')||mb_strlen($name)>180||preg_match('/[\x00-\x1f\x7f\/\\\\]/',$name)||str_starts_with($name,'.'))fail(422,'Ungültiger Dateiname.');
    $ext=strtolower(pathinfo($name,PATHINFO_EXTENSION));if(!in_array($ext,$sharing['types'],true))fail(422,'Dieser Dateityp ist nicht freigegeben.');
    if(!is_uploaded_file($f['tmp_name'])||$f['size']<1||$f['size']>$sharing['max_bytes'])fail(413,'Die Datei ist leer oder überschreitet die erlaubte Größe.');
    $content=file_get_contents($f['tmp_name']);if($content===false||strlen($content)!==$f['size'])fail(422,'Die Datei konnte nicht gelesen werden.');
    transaction(function()use($u,$gid,$name,$ext,$content,$data){
        chatAccess($u,$gid);$current=chatSharing();if(!$current['enabled']||!in_array($ext,$current['types'],true))fail(403,'Die Dateifreigabe wurde inzwischen geändert.');if(strlen($content)>$current['max_bytes'])fail(413,'Die Datei überschreitet die erlaubte Größe.');
        $used=(int)query('SELECT COALESCE(SUM(a.size),0) FROM chat_attachments a JOIN messages m ON m.id=a.message_id WHERE m.group_id=?',[$gid])->fetchColumn();
        if($used+strlen($content)>104857600)fail(413,'Der Dateispeicher dieser Gruppe (100 MB) ist voll. Bitte die Kursleitung informieren.');
        query('INSERT INTO messages(group_id,user_id,body,created_at) VALUES(?,?,?,?)',[$gid,$u['id'],textField($data,'body',2000,false),now()]);$mid=(int)db()->lastInsertId();
        $stmt=db()->prepare('INSERT INTO chat_attachments(id,message_id,name,extension,size,content) VALUES(?,?,?,?,?,?)');
        foreach([id(),$mid,$name,$ext,strlen($content)] as $i=>$v)$stmt->bindValue($i+1,$v);$stmt->bindValue(6,$content,PDO::PARAM_LOB);$stmt->execute();audit($u['id'],'chat.upload');
    });
}
function moderateChat(array $u,string $gid,?int $message=null): void {
    if($u['role']!=='admin')fail(403,'Dieser Bereich ist Administratoren vorbehalten.');
    chatAccess($u,$gid,true);transaction(function()use($u,$gid,$message){
        if($message!==null){if(!one('SELECT id FROM messages WHERE id=? AND group_id=?',[$message,$gid]))fail(404,'Nachricht nicht gefunden.');query('DELETE FROM messages WHERE id=? AND group_id=?',[$message,$gid]);}
        else query('DELETE FROM messages WHERE group_id=?',[$gid]);
        query('INSERT INTO chat_state(group_id,revision) VALUES(?,1) ON CONFLICT(group_id) DO UPDATE SET revision=revision+1',[$gid]);audit($u['id'],$message===null?'admin.chat.reset':'admin.chat.delete');
    });
}
