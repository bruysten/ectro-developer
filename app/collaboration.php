<?php
declare(strict_types=1);

// CodeMirror ChangeSet JSON uses UTF-16 offsets, including for emoji.
function applyEditorChanges(string $content,mixed $changes): string {
    if (!is_array($changes)||!array_is_list($changes)||count($changes)>20000) fail(422,'Ungültige Textänderung.');
    $source=mb_convert_encoding($content,'UTF-16LE','UTF-8'); $offset=0; $out='';
    foreach($changes as $part) {
        $length=is_int($part)?$part:(is_array($part)&&array_is_list($part)?($part[0]??null):null);
        if (!is_int($length)||$length<0||$length>(strlen($source)-$offset)/2) fail(422,'Die Textänderung passt nicht zur Datei.');
        $end=$offset+$length*2;
        // Reject boundaries in the middle of a surrogate pair.
        foreach([$offset,$end] as $boundary) if ($boundary<strlen($source)) {
            $unit=unpack('v',substr($source,$boundary,2))[1];
            if ($unit>=0xDC00 && $unit<=0xDFFF) fail(422,'Ein Unicode-Zeichen darf nicht geteilt werden.');
        }
        if (is_int($part)) $out.=substr($source,$offset,$length*2);
        else {
            $lines=array_slice($part,1);
            foreach($lines as $line) if (!is_string($line)||str_contains($line,"\n")||str_contains($line,"\r")||!mb_check_encoding($line,'UTF-8')) fail(422,'Ungültiger Text.');
            $out.=mb_convert_encoding(implode("\n",$lines),'UTF-16LE','UTF-8');
        }
        $offset=$end;
        if (strlen($out)>FILE_LIMIT*2) fail(422,'Die Datei ist zu groß.');
    }
    if ($offset!==strlen($source)) fail(422,'Die Textänderung ist unvollständig.');
    $result=mb_convert_encoding($out,'UTF-8','UTF-16LE');
    if (strlen($result)>FILE_LIMIT) fail(422,'Eine Datei darf höchstens 512 KB groß sein.');
    return $result;
}
function synchronizeFile(array $u,array $data): array {
    $p=project($u,textField($data,'project',32));
    if (!$p['group_id']) fail(422,'Live-Synchronisation ist für Gruppenprojekte vorgesehen.');
    rateLimit('file.sync:'.$u['id'],300,60);
    $fid=textField($data,'file',32); $client=textField($data,'client',80);
    if (!preg_match('/^[a-zA-Z0-9-]{8,80}$/',$client)) fail(422,'Ungültige Editor-Kennung.');
    $version=$data['version']??null; $updates=$data['updates']??[];
    if (!is_int($version)||$version<1||!is_array($updates)||!array_is_list($updates)||count($updates)>100) fail(422,'Ungültige Synchronisation.');
    return transaction(function() use($u,$p,$fid,$client,$version,$updates) {
        // Recheck membership after acquiring the write lock.
        project($u,$p['id']);
        $file=one("SELECT * FROM files WHERE id=? AND project_id=? AND kind='file'",[$fid,$p['id']]);
        if (!$file) fail(404,'Die Datei wurde gelöscht. Ihr Entwurf bleibt erhalten.');
        if ($version>(int)$file['version']) fail(422,'Unbekannte Dateiversion.');
        $owner=one('SELECT user_id FROM file_editors WHERE file_id=? AND client_id=?',[$fid,$client]);
        if ($owner && $owner['user_id']!==$u['id']) fail(409,'Diese Editor-Kennung wird bereits verwendet.');
        query('INSERT INTO file_editors VALUES(?,?,?,?) ON CONFLICT(file_id,client_id) DO UPDATE SET touched=excluded.touched',[$fid,$client,$u['id'],time()]);
        $history=all('SELECT version,client_id,changes FROM file_updates WHERE file_id=? AND version>? ORDER BY version',[$fid,$version]);
        if (count($history)!==(int)$file['version']-$version) return ['resync'=>true,'file'=>$file,'updates'=>[]];
        $accepted=false;
        if ($version===(int)$file['version'] && $updates) {
            $content=$file['content'];
            foreach($updates as $changes) {
                $content=applyEditorChanges($content,$changes);
                $file['version']++;
                query('INSERT INTO file_updates VALUES(?,?,?,?)',[$fid,$file['version'],$client,json_encode($changes,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR)]);
                $history[]=['version'=>$file['version'],'client_id'=>$client,'changes'=>json_encode($changes,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR)];
            }
            if (workspaceBytes($p)-strlen($file['content'])+strlen($content)>SPACE_LIMIT) fail(422,'Der Gruppen-Workspace ist voll (20 MB).');
            $file['content']=$content; $file['updated_at']=now();
            query('UPDATE files SET content=?,version=?,updated_at=? WHERE id=?',[$content,$file['version'],$file['updated_at'],$fid]);
            query('UPDATE projects SET updated_at=? WHERE id=?',[now(),$p['id']]);
            // Bound the journal; disconnected clients keep their draft if history expired.
            $usage=one('SELECT COUNT(*) entries,COALESCE(SUM(length(CAST(changes AS BLOB))),0) bytes FROM file_updates WHERE file_id=?',[$fid]);
            if ((int)$usage['entries']>2000||(int)$usage['bytes']>8388608) {
                $bytes=0;$count=0;
                foreach(all('SELECT version,length(CAST(changes AS BLOB)) bytes FROM file_updates WHERE file_id=? ORDER BY version DESC',[$fid]) as $entry) {
                    $bytes+=(int)$entry['bytes'];$count++;
                    if ($bytes>8388608||$count>2000) { query('DELETE FROM file_updates WHERE file_id=? AND version<=?',[$fid,$entry['version']]);break; }
                }
            }
            $journalBytes=(int)query('SELECT COALESCE(SUM(length(CAST(h.changes AS BLOB))),0) FROM file_updates h JOIN files f ON f.id=h.file_id JOIN projects p ON p.id=f.project_id WHERE p.group_id=?',[$p['group_id']])->fetchColumn();
            if ($journalBytes>33554432) {
                $bytes=0;
                foreach(all('SELECT h.rowid sequence,length(CAST(h.changes AS BLOB)) bytes FROM file_updates h JOIN files f ON f.id=h.file_id JOIN projects p ON p.id=f.project_id WHERE p.group_id=? ORDER BY h.rowid DESC',[$p['group_id']]) as $entry) {
                    $bytes+=(int)$entry['bytes'];
                    if ($bytes>33554432) { query('DELETE FROM file_updates WHERE rowid<=? AND file_id IN (SELECT f.id FROM files f JOIN projects p ON p.id=f.project_id WHERE p.group_id=?)',[$entry['sequence'],$p['group_id']]);break; }
                }
            }
            audit($u['id'],'file.save'); $accepted=true;
        }
        query('DELETE FROM file_editors WHERE touched<?',[time()-60]);
        $people=all('SELECT DISTINCT u.id,u.name FROM file_editors e JOIN users u ON u.id=e.user_id JOIN group_members m ON m.user_id=u.id AND m.group_id=? WHERE e.file_id=? AND e.touched>=? AND u.active=1 ORDER BY u.name',[$p['group_id'],$fid,time()-15]);
        return ['accepted'=>$accepted,'version'=>(int)$file['version'],'path'=>$file['path'],'updates'=>array_map(fn($entry)=>['clientID'=>$entry['client_id'],'changes'=>json_decode($entry['changes'],true)],$history),'people'=>$people];
    });
}
