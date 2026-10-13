<?php
declare(strict_types=1);
const WORKSPACE_UPLOAD_TYPES=['pdf','doc','docx','docm','dot','dotx','dotm','xls','xlsx','xlsm','xlt','xltx','xltm','ppt','pptx','pptm','pot','potx','potm','pps','ppsx','ppsm','odt','ods','odp','odg','rtf','pages','numbers','key','pub','vsd','vsdx','one','accdb','mdb','jpg','jpeg','jpe','jfif','png','apng','gif','webp','avif','svg','svgz','bmp','dib','tif','tiff','ico','cur','heic','heif','jxl','jp2','j2k','jpf','jpx','pcx','tga','dds','eps','psd','psb','ai','xcf','dng','raw','cr2','cr3','nef','nrw','arw','sr2','srf','orf','rw2','pef','raf','pbm','pgm','ppm','pnm','pam','hdr','exr','fits','fit','wbmp','icns','emf','wmf','crw','mos','mef','mrw','rwl','iiq','3fr','kdc','erf','srw'];
function workspaceUploads(): array {
    $s=settings()['workspace_uploads']??['enabled'=>true,'types'=>WORKSPACE_UPLOAD_TYPES,'max_mb'=>10];$limit=$s['max_mb']*1048576;
    foreach(['upload_max_filesize','post_max_size'] as $key){$v=iniBytes((string)ini_get($key));if($v>0)$limit=min($limit,max(0,$v-($key==='post_max_size'?65536:0)));}return [...$s,'max_bytes'=>$limit];
}
function workspaceUploadsInput(mixed $input): array {
    if(!is_array($input)||!is_bool($input['enabled']??null)||!is_array($input['types']??null)||count($input['types'])>160||!is_int($input['max_mb']??null)||$input['max_mb']<1||$input['max_mb']>20)fail(422,'Bitte Uploadfreigabe, Dateitypen und Dateigröße (1–20 MB) prüfen.');
    $types=[];foreach($input['types'] as $type){if(!is_string($type)||!preg_match('/^[a-z0-9]{1,12}$/',$type))fail(422,'Dateitypen als Endungen ohne Punkt angeben.');$types[]=$type;}
    if($input['enabled']&&!$types)fail(422,'Bitte mindestens einen Dateityp freigeben.');return ['enabled'=>$input['enabled'],'types'=>array_values(array_unique($types)),'max_mb'=>$input['max_mb']];
}
function workspaceUpload(array $u,array $data): array {
    needFeature($u,'files');$p=project($u,textField($data,'project',32));rateLimit('workspace.upload.'.$u['id'],20,60);$settings=workspaceUploads();
    if(!$settings['enabled'])fail(403,'Datei-Uploads sind derzeit deaktiviert.');
    $f=$_FILES['file']??null;if(!is_array($f)||($f['error']??null)!==UPLOAD_ERR_OK)fail(413,'Bitte eine Datei innerhalb der erlaubten Größe auswählen.');
    $path=filePath(textField($data,'path',240));$ext=strtolower(pathinfo($path,PATHINFO_EXTENSION));
    if(!in_array($ext,$settings['types'],true))fail(422,'Dieser Dateityp ist nicht für Projekt-Uploads freigegeben.');
    if(!is_uploaded_file($f['tmp_name'])||$f['size']<1||$f['size']>$settings['max_bytes'])fail(413,'Die Datei ist leer oder überschreitet die erlaubte Größe.');
    $content=file_get_contents($f['tmp_name']);if($content===false||strlen($content)!==$f['size'])fail(422,'Die Datei konnte nicht gelesen werden.');
    return transaction(function()use($u,$p,$path,$ext,$content){
        $p=project($u,$p['id']);needFeature($u,'files');$settings=workspaceUploads();
        if(!$settings['enabled']||!in_array($ext,$settings['types'],true))fail(403,'Die Uploadfreigabe wurde inzwischen geändert.');
        if(strlen($content)>$settings['max_bytes'])fail(413,'Die Datei überschreitet die erlaubte Größe.');
        if(workspaceBytes($p)+strlen($content)>SPACE_LIMIT)fail(413,'Der Workspace ist voll (20 MB inklusive Dokumente und Bilder).');
        if((int)query('SELECT COUNT(*) FROM files WHERE project_id=?',[$p['id']])->fetchColumn()>=300)fail(422,'Ein Projekt kann höchstens 300 Einträge enthalten.');
        checkParents($p['id'],$path);if(one('SELECT id FROM files WHERE project_id=? AND (path=? OR path GLOB ?)',[$p['id'],$path,$path.'/*']))fail(409,'Dieser Dateipfad existiert bereits. Bitte einen anderen Namen wählen.');
        $fid=id();query("INSERT INTO files(id,project_id,path,kind,updated_at) VALUES(?,?,?,'asset',?)",[$fid,$p['id'],$path,now()]);
        $st=db()->prepare('INSERT INTO workspace_uploads(file_id,extension,size,content) VALUES(?,?,?,?)');$st->bindValue(1,$fid);$st->bindValue(2,$ext);$st->bindValue(3,strlen($content),PDO::PARAM_INT);$st->bindValue(4,$content,PDO::PARAM_LOB);$st->execute();
        query('UPDATE projects SET updated_at=? WHERE id=?',[now(),$p['id']]);audit($u['id'],'file.upload',['project'=>$p['id']]);return ['id'=>$fid,'path'=>$path,'extension'=>$ext,'size'=>strlen($content)];
    });
}

function previewImageAssets(array $u,array $p): array {
    if(!features($u)['files'])return [];
    $mime=['png'=>'image/png','apng'=>'image/png','jpg'=>'image/jpeg','jpeg'=>'image/jpeg','jpe'=>'image/jpeg','jfif'=>'image/jpeg','gif'=>'image/gif','webp'=>'image/webp','avif'=>'image/avif','bmp'=>'image/bmp','ico'=>'image/x-icon','svg'=>'image/svg+xml'];
    $out=[];foreach(all("SELECT f.id,f.path,a.extension,a.size FROM files f JOIN workspace_uploads a ON a.file_id=f.id WHERE f.project_id=?",[$p['id']]) as $file){if(isset($mime[$file['extension']]))$out[]=['id'=>$file['id'],'path'=>$file['path'],'mime'=>$mime[$file['extension']],'size'=>(int)$file['size']];}return $out;
}
