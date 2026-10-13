<?php
declare(strict_types=1);
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/templates.php';
require_once __DIR__ . '/mysql.php';
require_once __DIR__ . '/chat.php';
require_once __DIR__ . '/workspace-uploads.php';
require_once __DIR__ . '/sql-training.php';
require_once __DIR__ . '/collaboration.php';
require_once __DIR__ . '/mail.php';
secureHeaders();
try {
    keyBytes(); sessionStart();
    $action = $_GET['action'] ?? 'bootstrap';
    $method = $_SERVER['REQUEST_METHOD'];
    $readActions = ['bootstrap','dashboard','projects','templates','files','file','chat','db.info','db.tables','db.rows','admin.overview','admin.users','admin.groups','admin.templates','admin.template','admin.chat','training.info','training.table','teacher.participants','uploads.info','admin.mail','admin.mail.templates','profile','team','team.profile'];
    if ($method !== 'GET' && $method !== 'POST') fail(405, 'Methode nicht erlaubt.');
    if (!in_array($action, $readActions, true) && $method !== 'POST') fail(405, 'Diese Aktion benötigt POST.');
    if (in_array($action, $readActions, true) && $method !== 'GET') fail(405, 'Diese Aktion benötigt GET.');
    if(in_array($action,['chat.upload','file.upload'],true) && ($postLimit=iniBytes((string)ini_get('post_max_size')))>0 && (int)($_SERVER['CONTENT_LENGTH']??0)>$postLimit)fail(413,'Der Upload überschreitet das PHP-Uploadlimit.');
    $data = $method === 'POST' ? (in_array($action,['chat.upload','file.upload'],true)?$_POST:input()) : $_GET;
    if ($method === 'POST') csrf();
    if ($action === 'bootstrap') {
        $u = currentUser(); $hasAdmin = (bool)query("SELECT 1 FROM users WHERE role='admin' LIMIT 1")->fetchColumn();
        jsonOut(['user' => $u ? safeUser($u) : null, 'csrf' => $_SESSION['csrf'], 'features' => $u ? features($u) : [], 'setup_required' => !$hasAdmin]);
    }
    if ($action === 'setup') {
        rateLimit('setup',10,900);
        $token = textField($data,'token',200); $expected = config()['setup_token'];
        if (strlen($expected)<32 || !hash_equals($expected,$token)) fail(403,'Der Einrichtungsschlüssel ist nicht gültig.');
        $email = emailField($data); $name = textField($data,'name'); $pass = passwordField($data);
        transaction(function () use($email,$name,$pass) {
            if (query("SELECT 1 FROM users WHERE role='admin'")->fetchColumn()) fail(409,'Die Einrichtung ist bereits abgeschlossen.');
            $uid = id(); query('INSERT INTO users(id,name,email,password,role,created_at) VALUES(?,?,?,?,?,?)',[$uid,$name,$email,password_hash($pass,PASSWORD_DEFAULT),'admin',now()]);
            audit($uid,'setup.complete');
        }); jsonOut(['ok'=>true]);
    }
    if ($action === 'login') {
        rateLimit('login',20,900); $email = emailField($data); $pass = $data['password'] ?? '';
        if (!is_string($pass) || strlen($pass)>256) fail(422,'Ungültiges Passwort.');
        $admin = ($data['portal'] ?? '') === 'admin';
        $u = one('SELECT * FROM users WHERE email=?',[$email]);
        $valid = password_verify($pass, $u['password'] ?? '$2y$10$123456789012345678901uKnUnQFK8mrwZZS/d83FbDXstEOkaLT/y');
        if (!$valid || !$u || !$u['active'] || ($u['role']==='admin') !== $admin) fail(401,'E-Mail oder Passwort stimmen nicht mit diesem Zugang überein.');
        session_regenerate_id(true); $_SESSION=['uid'=>$u['id'],'auth_version'=>(int)$u['auth_version'],'created'=>time(),'last_seen'=>time(),'csrf'=>bin2hex(random_bytes(32))];
        query('UPDATE users SET last_login=? WHERE id=?',[now(),$u['id']]); audit($u['id'],'login');
        jsonOut(['user'=>safeUser($u),'csrf'=>$_SESSION['csrf'],'features'=>features($u)]);
    }
    $u = requireUser(str_starts_with($action,'admin.'));
    if ($action === 'logout') { $_SESSION=[]; session_destroy(); jsonOut(['ok'=>true]); }
    if ($action === 'password') {
        if (!is_string($data['current'] ?? null) || !password_verify($data['current'],$u['password'])) fail(422,'Das bisherige Passwort stimmt nicht.');
        $pass = passwordField($data); query('UPDATE users SET password=?,must_change_password=0,auth_version=auth_version+1 WHERE id=?',[password_hash($pass,PASSWORD_DEFAULT),$u['id']]);
        $_SESSION['auth_version'] = (int)$u['auth_version']+1; session_regenerate_id(true); audit($u['id'],'password.change'); jsonOut(['ok'=>true]);
    }
    if ($u['must_change_password']) fail(403,'Bitte ändern Sie zuerst Ihr vorläufiges Passwort.');
    switch ($action) {
        case 'team': needFeature($u,'team');$groups=safeUser($u)['groups'];$gid=textField($data,'group',32,false);jsonOut(['groups'=>$groups,'members'=>$gid?teamMembers($u,$gid):[]]);
        case 'team.profile': jsonOut(['profile'=>teamProfile($u,textField($data,'group',32),textField($data,'id',32))]);
        case 'profile': jsonOut(['user'=>safeUser($u)]);
        case 'profile.save': jsonOut(['ok'=>true,'user'=>saveProfile($u,$data)]);
        case 'dashboard':
            jsonOut(['projects'=>visibleProjects($u),
                'stats'=>one('SELECT COUNT(*) files, COALESCE(SUM(length(CAST(f.content AS BLOB))+COALESCE(a.size,0)),0) bytes FROM files f LEFT JOIN workspace_uploads a ON a.file_id=f.id WHERE project_id IN (SELECT id FROM projects WHERE user_id=?) AND kind IN (\'file\',\'asset\')',[$u['id']]),
                'runs'=>(int)query("SELECT COUNT(*) FROM events WHERE user_id=? AND event='run'",[$u['id']])->fetchColumn(),
                'activity'=>all('SELECT event,created_at FROM events WHERE user_id=? ORDER BY id DESC LIMIT 8',[$u['id']])]);
        case 'teacher.participants': needFeature($u,'files');jsonOut(['groups'=>teacherParticipants($u)]);
        case 'projects': needFeature($u,'files'); jsonOut(['projects'=>visibleProjects($u,textField($data,'participant',32,false),textField($data,'group',32,false))]);
        case 'templates':
            needFeature($u,'files');$available=features($u);
            jsonOut(['templates'=>array_values(array_filter(projectTypes(),fn($type)=>$type['active']&&$available[$type['language']==='web'?'html':$type['language']]))]);
        case 'project.create':
            needFeature($u,'files'); $template=textField($data,'template',32);
            jsonOut(['id'=>createProject($u,textField($data,'name',80),$template,textField($data,'group',32,false))],201);
        case 'project.share':
            needFeature($u,'files'); $pid=textField($data,'id',32); $gid=textField($data,'group',32);
            transaction(function() use($u,$pid,$gid) {
                $p=project($u,$pid);
                if ($p['group_id']||$p['user_id']!==$u['id']) fail(403,'Nur eigene persönliche Projekte können geteilt werden.');
                if (!one('SELECT 1 FROM group_members WHERE group_id=? AND user_id=?',[$gid,$u['id']])) fail(403,'Sie gehören dieser Gruppe nicht an.');
                if ((int)query('SELECT COUNT(*) FROM projects WHERE group_id=?',[$gid])->fetchColumn()>=30) fail(422,'Die Gruppe hat bereits 30 Projekte.');
                $target=['group_id'=>$gid,'user_id'=>null];
                $size=(int)query('SELECT COALESCE(SUM(length(CAST(f.content AS BLOB))+COALESCE(a.size,0)),0) FROM files f LEFT JOIN workspace_uploads a ON a.file_id=f.id WHERE project_id=?',[$pid])->fetchColumn();
                if (workspaceBytes($target)+$size>SPACE_LIMIT) fail(422,'Der Gruppen-Workspace ist voll (20 MB).');
                query('UPDATE projects SET group_id=?,created_by=user_id,user_id=NULL,updated_at=? WHERE id=?',[$gid,now(),$pid]);
                // Canonical LF text is required by CodeMirror collaboration.
                foreach(all("SELECT id,content FROM files WHERE project_id=? AND kind='file'",[$pid]) as $file) query('UPDATE files SET content=?,version=version+1 WHERE id=?',[str_replace(["\r\n","\r"],"\n",$file['content']),$file['id']]);
                audit($u['id'],'project.share');
            }); jsonOut(['ok'=>true]);
        case 'file.sync':
            needFeature($u,'editor'); needFeature($u,'files'); jsonOut(synchronizeFile($u,$data));
        case 'project.rename':
            needFeature($u,'files'); transaction(function() use($u,$data) { $p=project($u,textField($data,'id',32));projectManager($u,$p);query('UPDATE projects SET name=?,updated_at=? WHERE id=?',[textField($data,'name',80),now(),$p['id']]); }); jsonOut(['ok'=>true]);
        case 'project.delete':
            needFeature($u,'files'); transaction(function() use($u,$data) { $p=project($u,textField($data,'id',32));projectManager($u,$p,true);query('DELETE FROM projects WHERE id=?',[$p['id']]);audit($u['id'],'project.delete'); }); jsonOut(['ok'=>true]);
        case 'uploads.info': needFeature($u,'files');jsonOut(['uploads'=>workspaceUploads()]);
        case 'file.upload': jsonOut(['file'=>workspaceUpload($u,$data)],201);
        case 'files':
            needFeature($u,'files'); $p=project($u,textField($data,'project',32));
            jsonOut(['project'=>$p,'files'=>all('SELECT f.id,f.path,f.kind,f.version,length(CAST(f.content AS BLOB))+COALESCE(a.size,0) bytes,f.updated_at,a.extension FROM files f LEFT JOIN workspace_uploads a ON a.file_id=f.id WHERE f.project_id=? ORDER BY f.kind DESC,f.path',[$p['id']])]);
        case 'file':
            needFeature($u,'editor'); $p=project($u,textField($data,'project',32)); $f=one('SELECT * FROM files WHERE project_id=? AND path=?',[$p['id'],filePath(textField($data,'path',240))]);
            if (!$f || $f['kind']!=='file') fail(404,'Datei nicht gefunden.'); jsonOut(['file'=>$f]);
        case 'file.save':
            needFeature($u,'editor'); needFeature($u,'files'); $p=project($u,textField($data,'project',32)); $path=filePath(textField($data,'path',240));
            $content=$data['content']??''; if (!is_string($content) || strlen($content)>FILE_LIMIT || !mb_check_encoding($content,'UTF-8')) fail(422,'Dateien müssen gültiger UTF-8-Text und höchstens 512 KB groß sein.');
            $out=transaction(function() use($u,$p,$path,$data,$content) {
                $p=project($u,$p['id']);
                $content=$p['group_id']?str_replace(["\r\n","\r"],"\n",$content):$content;
                $f=one('SELECT * FROM files WHERE project_id=? AND path=?',[$p['id'],$path]);
                if ($f && $p['group_id']) fail(409,'Diese Gruppendatei bitte im synchronisierten Editor bearbeiten.');
                if ($f && ($f['kind']!=='file' || (int)($data['version']??0)!==(int)$f['version'])) fail(409,'Diese Datei wurde inzwischen geändert. Laden Sie sie neu, bevor Sie speichern. Ihr Entwurf bleibt im Editor.');
                $bytes=workspaceBytes($p);
                if ($bytes-strlen($f['content']??'')+strlen($content)>SPACE_LIMIT) fail(422,'Ihr Workspace ist voll (20 MB).');
                $count=(int)query('SELECT COUNT(*) FROM files WHERE project_id=?',[$p['id']])->fetchColumn(); if (!$f && $count>=300) fail(422,'Ein Projekt kann höchstens 300 Dateien enthalten.');
                $parts=explode('/',$path); array_pop($parts); $parent='';
                foreach($parts as $part) { $parent=ltrim($parent.'/'.$part,'/'); $entry=one('SELECT kind FROM files WHERE project_id=? AND path=?',[$p['id'],$parent]); if ($entry && $entry['kind']!=='directory') fail(409,'Ein übergeordneter Pfad ist bereits eine Datei.'); }
                if (query('SELECT 1 FROM files WHERE project_id=? AND path GLOB ? LIMIT 1',[$p['id'],$path.'/*'])->fetchColumn()) fail(409,'Dieser Name wird bereits von einem Ordner verwendet.');
                if ($f) query('UPDATE files SET content=?,version=version+1,updated_at=? WHERE id=?',[$content,now(),$f['id']]);
                else query('INSERT INTO files(id,project_id,path,content,updated_at) VALUES(?,?,?,?,?)',[id(),$p['id'],$path,$content,now()]);
                query('UPDATE projects SET updated_at=? WHERE id=?',[now(),$p['id']]);
                return one('SELECT id,path,version,updated_at FROM files WHERE project_id=? AND path=?',[$p['id'],$path]);
            }); audit($u['id'],'file.save',$p['user_id']&&$p['user_id']!==$u['id']?['project'=>$p['id'],'owner'=>$p['user_id'],'teaching'=>true]:[]); jsonOut(['file'=>$out]);
        case 'folder.create':
            needFeature($u,'files'); $p=project($u,textField($data,'project',32)); $path=filePath(textField($data,'path',240));
            transaction(function() use($u,$p,$path) {
            project($u,$p['id']);
            checkParents($p['id'],$path);
            if ((int)query('SELECT COUNT(*) FROM files WHERE project_id=?',[$p['id']])->fetchColumn()>=300) fail(422,'Ein Projekt kann höchstens 300 Einträge enthalten.');
            if (one('SELECT id FROM files WHERE project_id=? AND path=?',[$p['id'],$path])) fail(409,'Dieser Name existiert bereits.');
            query('INSERT INTO files(id,project_id,path,kind,updated_at) VALUES(?,?,?,\'directory\',?)',[id(),$p['id'],$path,now()]); }); jsonOut(['ok'=>true]);
        case 'file.rename':
            needFeature($u,'files'); $p=project($u,textField($data,'project',32)); $from=filePath(textField($data,'path',240)); $to=filePath(textField($data,'new_path',240));
            transaction(function() use($u,$p,$from,$to) {
                $p=project($u,$p['id']);
                $f=one('SELECT * FROM files WHERE project_id=? AND path=?',[$p['id'],$from]); if (!$f) fail(404,'Datei nicht gefunden.');if($f['kind']==='asset'&&strtolower(pathinfo($from,PATHINFO_EXTENSION))!==strtolower(pathinfo($to,PATHINFO_EXTENSION)))fail(422,'Beim Umbenennen bitte die Dateiendung beibehalten.');
                if ($from===$to) return;
                if (str_starts_with($to,$from.'/')) fail(422,'Ein Ordner kann nicht in sich selbst verschoben werden.');
                checkParents($p['id'],$to);
                $entries=all('SELECT * FROM files WHERE project_id=? AND (path=? OR path GLOB ?)',[$p['id'],$from,$from.'/*']);
                foreach($entries as $e) { $dest=$to.substr($e['path'],strlen($from)); filePath($dest); if (one('SELECT id FROM files WHERE project_id=? AND (path=? OR path GLOB ?)',[$p['id'],$dest,$dest.'/*'])) fail(409,'Der Zielname existiert bereits.');
                    query('UPDATE files SET path=?,version=version+?,updated_at=? WHERE id=?',[$dest,$p['group_id']?0:1,now(),$e['id']]); }
                query('UPDATE projects SET updated_at=? WHERE id=?',[now(),$p['id']]);
            }); jsonOut(['ok'=>true]);
        case 'file.delete':
            needFeature($u,'files'); $p=project($u,textField($data,'project',32)); $path=filePath(textField($data,'path',240));
            transaction(function() use($u,$p,$path) { project($u,$p['id']);query('DELETE FROM files WHERE project_id=? AND (path=? OR path GLOB ?)',[$p['id'],$path,$path.'/*']); query('UPDATE projects SET updated_at=? WHERE id=?',[now(),$p['id']]); }); jsonOut(['ok'=>true]);
        case 'project.bundle':
            needFeature($u,'editor'); $p=project($u,textField($data,'project',32));
            jsonOut(['files'=>all('SELECT path,content FROM files WHERE project_id=? AND kind=\'file\'',[$p['id']]),'assets'=>previewImageAssets($u,$p)]);
        case 'run.record':
            needFeature($u,'editor'); $language=textField($data,'language',20); if (!in_array($language,['html','php','python','javascript'])) fail(422,'Unbekannte Sprache.');
            needFeature($u,$language==='javascript'?'html':$language); project($u,textField($data,'project',32)); rateLimit('run',100,60); audit($u['id'],'run',['language'=>$language]); jsonOut(['ok'=>true]);
        case 'chat.upload': chatUpload($u,$data);jsonOut(['ok'=>true]);
        case 'chat':
        case 'chat.send':
            $gid=textField($data,'group',32);chatAccess($u,$gid);
            if ($action==='chat.send') { rateLimit('chat.'.$u['id'],30,60); query('INSERT INTO messages(group_id,user_id,body,created_at) VALUES(?,?,?,?)',[$gid,$u['id'],textField($data,'body',2000),now()]); audit($u['id'],'chat.send'); jsonOut(['ok'=>true]); }
            query('INSERT INTO chat_presence VALUES(?,?,?) ON CONFLICT(group_id,user_id) DO UPDATE SET touched=excluded.touched',[$gid,$u['id'],time()]);
            $revision=(int)(one('SELECT revision FROM chat_state WHERE group_id=?',[$gid])['revision']??0);$reset=isset($data['revision'])&&(int)$data['revision']!==$revision;
            jsonOut([...chatHistory($gid,$reset?0:max(0,(int)($data['before']??0)),$reset?0:max(0,(int)($data['after']??0))),'reset'=>$reset,'members'=>chatMembers($gid),'sharing'=>chatSharing()]);
        case 'admin.chat': $gid=textField($data,'group',32);chatAccess($u,$gid,true);jsonOut([...chatHistory($gid,max(0,(int)($data['before']??0))),'members'=>chatMembers($gid),'sharing'=>chatSharing()]);
        case 'admin.chat.delete': moderateChat($u,textField($data,'group',32),max(0,(int)($data['message']??0)));jsonOut(['ok'=>true]);
        case 'admin.chat.reset': moderateChat($u,textField($data,'group',32));jsonOut(['ok'=>true]);
        case 'training.info':
            needFeature($u,'database');rateLimit('training.info.'.$u['id'],60,60);$mode=textField($data,'mode',20,false)?:'practice';$my=trainingConnection($u,$mode);
            jsonOut(['tables'=>trainingTables($my,$mode),'has_connection'=>(bool)one('SELECT user_id FROM connections WHERE user_id=?',[$u['id']]),'mode'=>$mode]);
        case 'training.table':
            needFeature($u,'database');rateLimit('training.read.'.$u['id'],120,60);$mode=textField($data,'mode',20);$my=trainingConnection($u,$mode);$table=textField($data,'table',64);$columns=trainingColumns($my,$mode,$table);
            try{jsonOut(['columns'=>$columns,'rows'=>$my->query('SELECT * FROM '.identifier($table).' LIMIT 100')->fetchAll()]);}catch(PDOException $e){mysqlError($e);}
        case 'training.preview':
            needFeature($u,'database');rateLimit('training.preview.'.$u['id'],120,60);$mode=textField($data,'mode',20);$my=trainingConnection($u,$mode);$model=$data['model']??null;if(!is_array($model))fail(422,'Ungültiger Query-Entwurf.');
            $columns=trainingColumns($my,$mode,textField($model,'table',64));if(!in_array($model['action']??'', ['insert','select','update','delete'],true))fail(422,'Unbekannte SQL-Aktion.');if(($model['action']??'')==='insert')jsonOut(['rows'=>[]]);
            $model['action']='select';$query=composeTrainingSql($model,$columns,$mode);try{$stmt=$my->prepare($query['sql']);$stmt->execute($query['params']);jsonOut(['rows'=>$stmt->fetchAll()]);}catch(PDOException $e){if($mode==='mysql')mysqlError($e);fail(422,'Die Auswahl konnte nicht gelesen werden.');}
        case 'training.execute':
            needFeature($u,'database');rateLimit('training.write.'.$u['id'],40,60);$mode=textField($data,'mode',20);$my=trainingConnection($u,$mode);$model=$data['model']??null;if(!is_array($model))fail(422,'Ungültiger Query-Entwurf.');
            $columns=trainingColumns($my,$mode,textField($model,'table',64));$query=composeTrainingSql($model,$columns,$mode);
            try{
                $my->beginTransaction();$stmt=$my->prepare($query['sql']);$stmt->execute($query['params']);$rows=$stmt->columnCount()?$stmt->fetchAll():[];$affected=$query['action']==='select'?0:$stmt->rowCount();if($mode==='practice'&&$query['action']!=='select'){if((int)$my->query('PRAGMA page_count')->fetchColumn()*(int)$my->query('PRAGMA page_size')->fetchColumn()>20971520)fail(413,'Der persönliche Übungsspeicher ist voll. Bitte die Startdaten wiederherstellen.');foreach(['produkte','kontakte'] as $t)if((int)$my->query('SELECT COUNT(*) FROM '.$t)->fetchColumn()>1000)fail(413,'Im Übungsbereich sind höchstens 1000 Datensätze pro Tabelle möglich.');}$my->commit();
                audit($u['id'],'db.query',['training'=>true,'mode'=>$mode,'action'=>$query['action']]);jsonOut(['rows'=>$rows,'affected'=>$affected,'action'=>$query['action']]);
            }catch(ApiError $e){if($my->inTransaction())$my->rollBack();throw $e;}catch(PDOException $e){if($my->inTransaction())$my->rollBack();if($mode==='mysql')mysqlError($e);fail(422,'Die Abfrage konnte nicht ausgeführt werden. Bitte Pflichtfelder und eindeutige Werte prüfen.');}
        case 'training.reset':
            needFeature($u,'database');rateLimit('training.reset.'.$u['id'],5,60);$my=practiceDatabase($u);$my->beginTransaction();try{$my->exec('DELETE FROM produkte;DELETE FROM kontakte;DELETE FROM sqlite_sequence');seedPractice($my);$my->commit();}catch(Throwable $e){$my->rollBack();throw $e;}jsonOut(['ok'=>true]);
        case 'db.info':
            needFeature($u,'database'); jsonOut(['connection'=>one('SELECT host,db_name,username FROM connections WHERE user_id=?',[$u['id']]),'hosts'=>allowedHosts()]);
        case 'db.connect':
            needFeature($u,'database'); rateLimit('mysql.'.$u['id'],15,60);
            $password=$data['password']??null; if(!is_string($password)||$password===''||strlen($password)>256) fail(422,'Bitte geben Sie das Datenbankpasswort ein.');
            $conn=['host'=>textField($data,'host',253),'db_name'=>textField($data,'db_name',64),'username'=>textField($data,'username',80),'secret'=>encryptSecret($password)];
            mysqlConnection($u,$conn); query('INSERT INTO connections VALUES(?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET host=excluded.host,db_name=excluded.db_name,username=excluded.username,secret=excluded.secret',[$u['id'],$conn['host'],$conn['db_name'],$conn['username'],$conn['secret']]); audit($u['id'],'db.connect'); jsonOut(['ok'=>true]);
        case 'db.disconnect': needFeature($u,'database'); query('DELETE FROM connections WHERE user_id=?',[$u['id']]); jsonOut(['ok'=>true]);
        case 'db.tables':
            needFeature($u,'database'); rateLimit('mysql.'.$u['id'],60,60); $my=mysqlConnection($u);
            try { jsonOut(['tables'=>$my->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN)]); } catch(PDOException $e) { mysqlError($e); }
        case 'db.rows':
            needFeature($u,'database'); rateLimit('mysql.'.$u['id'],60,60); $my=mysqlConnection($u); $table=textField($data,'table',64); $columns=tableColumns($my,$table); $offset=min(100000,max(0,(int)($data['offset']??0)));
            try { $rows=$my->query('SELECT * FROM '.identifier($table).' LIMIT 101 OFFSET '.$offset)->fetchAll(); $hasMore=count($rows)>100; jsonOut(['columns'=>$columns,'rows'=>array_slice($rows,0,100),'has_more'=>$hasMore,'offset'=>$offset]); } catch(PDOException $e) { mysqlError($e); }
        case 'db.query':
            needFeature($u,'database'); rateLimit('mysql.'.$u['id'],30,60); $my=mysqlConnection($u); $sql=validateSql(textField($data,'sql',16000));
            try { $stmt=$my->prepare($sql); $stmt->execute(); $rows=[]; if ($stmt->columnCount()) { while(count($rows)<201 && ($row=$stmt->fetch())) $rows[]=$row; }
                audit($u['id'],'db.query'); jsonOut(['rows'=>array_slice($rows,0,200),'affected'=>$stmt->rowCount(),'truncated'=>count($rows)>200]); } catch(PDOException $e) { mysqlError($e); }
        case 'db.table.create':
            needFeature($u,'database'); rateLimit('mysql.'.$u['id'],30,60);
            $sql=createTableSql(textField($data,'table',64),$data['fields']??[]);$my=mysqlConnection($u);
            try { $my->exec($sql); audit($u['id'],'db.table.create'); jsonOut(['ok'=>true]); } catch(PDOException $e) { mysqlError($e); }
        case 'db.row.save':
        case 'db.row.delete':
            needFeature($u,'database'); rateLimit('mysql.'.$u['id'],60,60); $my=mysqlConnection($u); $table=textField($data,'table',64); $cols=tableColumns($my,$table); $primary=array_column(array_filter($cols,fn($c)=>$c['Key']==='PRI'),'Field');
            $where=[];$params=[]; $keys=$data['keys']??null;
            if ($keys!==null) {
                if (!$primary || !is_array($keys) || array_diff($primary,array_keys($keys)) || count($keys)!==count($primary)) fail(422,'Bearbeiten und Löschen benötigt den vollständigen Primärschlüssel.');
                foreach($primary as $key) { if (!is_scalar($keys[$key])) fail(422,'Ungültiger Schlüssel.'); $where[]=identifier($key).'=?'; $params[]=$keys[$key]; }
            }
            try {
                if ($action==='db.row.delete') { if (!$where) fail(422,'Primärschlüssel fehlt.'); $stmt=$my->prepare('DELETE FROM '.identifier($table).' WHERE '.implode(' AND ',$where).' LIMIT 1'); $stmt->execute($params); }
                else {
                    $values=$data['values']??[]; if (!is_array($values) || !$values || array_diff(array_keys($values),array_column($cols,'Field'))) fail(422,'Ungültige Spalten.');
                    foreach($values as $v) if (($v!==null && !is_scalar($v)) || (is_string($v)&&strlen($v)>100000)) fail(422,'Ungültiger Zellenwert.');
                    $fields=array_map('identifier',array_keys($values));
                    $sql=$where ? 'UPDATE '.identifier($table).' SET '.implode(',',array_map(fn($f)=>$f.'=?',$fields)).' WHERE '.implode(' AND ',$where).' LIMIT 1' : 'INSERT INTO '.identifier($table).' ('.implode(',',$fields).') VALUES('.implode(',',array_fill(0,count($fields),'?')).')';
                    $stmt=$my->prepare($sql); $stmt->execute(array_merge(array_values($values),$params));
                }
                audit($u['id'],$action); jsonOut(['ok'=>true,'affected'=>$stmt->rowCount()]);
            } catch(PDOException $e) { mysqlError($e); }
        case 'admin.overview':
            jsonOut(['counts'=>['users'=>(int)query("SELECT COUNT(*) FROM users WHERE role IN ('user','teacher')")->fetchColumn(),'groups'=>(int)query('SELECT COUNT(*) FROM groups')->fetchColumn(),'projects'=>(int)query('SELECT COUNT(*) FROM projects')->fetchColumn(),'runs'=>(int)query("SELECT COUNT(*) FROM events WHERE event='run'")->fetchColumn()],
                'daily'=>all("SELECT substr(created_at,1,10) day,COUNT(*) activity,SUM(event='run') runs FROM events WHERE created_at>=? GROUP BY day ORDER BY day",[gmdate('Y-m-d',time()-13*86400)]),
                'languages'=>all("SELECT json_extract(details,'$.language') language,COUNT(*) runs FROM events WHERE event='run' GROUP BY language"),
                'events'=>all('SELECT e.event,e.created_at,u.name FROM events e LEFT JOIN users u ON u.id=e.user_id ORDER BY e.id DESC LIMIT 30'),
                'sharing'=>chatSharing(),'uploads'=>workspaceUploads(),'session_hours'=>sessionHours(),'settings'=>array_diff_key(settings(),['mailjet'=>true]),'hosts'=>allowedHosts(),'health'=>['php'=>PHP_MAJOR_VERSION.'.'.PHP_MINOR_VERSION,'sqlite'=>true,'mysql'=>extension_loaded('pdo_mysql'),'encryption'=>extension_loaded('sodium'),'private_storage'=>is_writable(dataDir())]]);
        case 'admin.templates': jsonOut(['templates'=>projectTypes()]);
        case 'admin.template': jsonOut(['template'=>projectType(textField($data,'id',32))]);
        case 'admin.template.save': jsonOut(['id'=>saveProjectType($u,$data),'ok'=>true]);
        case 'admin.template.delete':
            initializeProjectTypes();
            transaction(function() use($u,$data) {
                $tid=textField($data,'id',32);$type=one('SELECT version FROM project_types WHERE id=?',[$tid]);
                if(!$type)fail(404,'Projekttyp nicht gefunden.');
                if(!is_int($data['version']??null)||(int)$type['version']!==$data['version'])fail(409,'Der Projekttyp wurde inzwischen geändert. Bitte aktualisieren Sie die Übersicht.');
                query('DELETE FROM project_types WHERE id=?',[$tid]);audit($u['id'],'admin.template.delete');
            }); jsonOut(['ok'=>true]);
        case 'admin.mail':
            initializeMailTemplates();cleanWelcomeMails();jsonOut(['config'=>publicMailConfig(),'mails'=>all('SELECT id,user_id,recipient,template_name,status,error,created_at,updated_at FROM welcome_mails ORDER BY created_at DESC LIMIT 50')]);
        case 'admin.mail.save': saveMailConfig($u,$data);jsonOut(['ok'=>true,'config'=>publicMailConfig()]);
        case 'admin.mail.test':
            rateLimit('mail.test.'.$u['id'],5,60);$c=mailConfig();if(empty($c['api_key'])||empty($c['api_secret']))fail(422,'Bitte zuerst beide Mailjet-Schlüssel speichern.');
            $result=mailjetSend($c,['To'=>[['Email'=>$c['sender_email'],'Name'=>$c['sender_name']]],'Subject'=>'Verbindung prüfen','TextPart'=>'Mailjet-Verbindungsprüfung.'],true);jsonOut(['result'=>$result]);
        case 'admin.mail.retry':
            rateLimit('mail.send.'.$u['id'],20,60);$mid=textField($data,'id',32);$mail=one('SELECT status FROM welcome_mails WHERE id=?',[$mid]);if(!$mail)fail(404,'Zugangsmail nicht gefunden.');
            if($mail['status']==='uncertain'&&($data['confirm_uncertain']??false)!==true)fail(422,'Der Versandstatus ist unklar. Bitte zuerst Mailjet prüfen und den erneuten Versand bestätigen.');
            jsonOut(['mail'=>deliverWelcome($mid,$u,true)]);
        case 'admin.mail.templates': initializeMailTemplates();jsonOut(['templates'=>all('SELECT * FROM mail_templates ORDER BY name'),'variables'=>MAIL_VARIABLES,'defaults'=>mailDefaults()]);
        case 'admin.mail.template.save':
            initializeMailTemplates();$t=mailTemplateInput($data);$tid=textField($data,'id',32,false);
            transaction(function()use(&$tid,$t,$data,$u){if($tid){$old=one('SELECT version FROM mail_templates WHERE id=?',[$tid]);if(!$old)fail(404,'Mailvorlage nicht gefunden.');if(!is_int($data['version']??null)||$data['version']!==(int)$old['version'])fail(409,'Die Vorlage wurde inzwischen geändert. Bitte neu laden.');query('UPDATE mail_templates SET name=?,subject=?,body=?,version=version+1,updated_at=? WHERE id=?',[$t['name'],$t['subject'],$t['body'],now(),$tid]);}else{$tid=id();query('INSERT INTO mail_templates(id,name,subject,body,updated_at) VALUES(?,?,?,?,?)',[$tid,$t['name'],$t['subject'],$t['body'],now()]);}audit($u['id'],'admin.mail.template.save');});jsonOut(['ok'=>true,'id'=>$tid]);
        case 'admin.mail.template.delete':
            initializeMailTemplates();transaction(function()use($u,$data){$tid=textField($data,'id',32);$old=one('SELECT version FROM mail_templates WHERE id=?',[$tid]);if(!$old)fail(404,'Mailvorlage nicht gefunden.');if(!is_int($data['version']??null)||$data['version']!==(int)$old['version'])fail(409,'Die Vorlage wurde inzwischen geändert. Bitte neu laden.');query('DELETE FROM mail_templates WHERE id=?',[$tid]);audit($u['id'],'admin.mail.template.delete');});jsonOut(['ok'=>true]);
        case 'admin.users': jsonOut(['users'=>array_map('safeUser',all('SELECT * FROM users ORDER BY name'))]);
        case 'admin.user.save':
            $uid=textField($data,'id',32,false); $name=textField($data,'name'); $email=emailField($data); $role=$data['role']??'user'; if(!in_array($role,['user','teacher','admin'],true)) fail(422,'Ungültige Rolle.');
            $active=(bool)($data['active']??true); $pass=passwordField($data,$uid===''); $flags=featureInput($data['features']??[]); $groups=$data['groups']??[];
            if (!is_array($groups)||count($groups)>1000) fail(422,'Ungültige Gruppenzuordnung.');
            foreach ($groups as $groupId) if (!is_string($groupId)) fail(422,'Ungültige Gruppenzuordnung.');
            $mail=null;$mailId=null;
            $wantsMail=textField($data,'mail_template',32,false)!=='';
            if($wantsMail&&$uid!=='')fail(422,'Zugangsmails können beim Anlegen eines neuen Benutzers versendet werden.');
            if($wantsMail){$existing=one('SELECT m.*,u.name,u.role,u.active,u.password FROM welcome_mails m JOIN users u ON u.id=m.user_id WHERE request_key=?', [textField($data,'creation_token',36)]);if($existing){if($existing['created_by']!==$u['id']||$existing['recipient']!==$email||$existing['name']!==$name||$existing['role']!==$role||(bool)$existing['active']!==$active||!password_verify($pass,$existing['password']))fail(409,'Dieser Anlegevorgang wurde bereits verwendet. Bitte den Dialog neu öffnen.');jsonOut(['ok'=>true,'id'=>$existing['user_id'],'mail'=>welcomeStatus($existing['id'])]);}rateLimit('mail.send.'.$u['id'],20,60);$mail=prepareWelcome($data,$name,$email,$role,$active,$pass,$groups);}
            transaction(function() use($u,&$uid,$name,$email,$role,$active,$pass,$flags,$groups,$mail,&$mailId) {
                if ($uid) { $target=one('SELECT * FROM users WHERE id=?',[$uid]); if (!$target) fail(404,'Benutzer nicht gefunden.');
                    if ($uid===$u['id'] && (!$active || $role!=='admin')) fail(422,'Sie können Ihren eigenen Adminzugang nicht sperren oder herabstufen.');
                    if ($target['role']==='admin' && ($role!=='admin'||!$active) && (int)query("SELECT COUNT(*) FROM users WHERE role='admin' AND active=1")->fetchColumn()<=1) fail(422,'Mindestens ein aktiver Admin muss bestehen bleiben.');
                    query('UPDATE users SET name=?,email=?,role=?,active=?,features=?,auth_version=auth_version+1 WHERE id=?',[$name,$email,$role,(int)$active,$flags,$uid]);
                    if ($pass) query('UPDATE users SET password=?,must_change_password=1 WHERE id=?',[password_hash($pass,PASSWORD_DEFAULT),$uid]);
                    if ($uid===$u['id']) $_SESSION['auth_version']=(int)$target['auth_version']+1;
                } else { $uid=id(); query('INSERT INTO users(id,name,email,password,role,active,features,must_change_password,created_at) VALUES(?,?,?,?,?,?,?,1,?)',[$uid,$name,$email,password_hash($pass,PASSWORD_DEFAULT),$role,(int)$active,$flags,now()]); }
                query('DELETE FROM group_members WHERE user_id=?',[$uid]); foreach(array_unique($groups) as $gid) { if(!is_string($gid)||!one('SELECT id FROM groups WHERE id=?',[$gid])) fail(422,'Eine Gruppe existiert nicht mehr.'); query('INSERT INTO group_members VALUES(?,?)',[$gid,$uid]); }
                if($mail){queueWelcome($mail,$uid,$u,$email);$mailId=$mail['id'];}
                audit($u['id'],'admin.user.save');
            }); jsonOut(['ok'=>true,'id'=>$uid,'mail'=>$mailId?deliverWelcome($mailId,$u):null]);
        case 'admin.user.delete':
            $uid=textField($data,'id',32); if ($uid===$u['id']) fail(422,'Sie können Ihren eigenen Zugang nicht löschen.');
            transaction(function() use($uid,$u) { $target=one('SELECT * FROM users WHERE id=?',[$uid]); if (!$target) fail(404,'Benutzer nicht gefunden.');
                if ($target['role']==='admin' && (int)query("SELECT COUNT(*) FROM users WHERE role='admin' AND active=1")->fetchColumn()<=1) fail(422,'Der letzte Admin kann nicht gelöscht werden.');
                foreach(all('SELECT DISTINCT group_id FROM messages WHERE user_id=?',[$uid]) as $group)query('INSERT INTO chat_state(group_id,revision) VALUES(?,1) ON CONFLICT(group_id) DO UPDATE SET revision=revision+1',[$group['group_id']]);
                query('DELETE FROM users WHERE id=?',[$uid]); audit($u['id'],'admin.user.delete'); }); removePracticeData($uid); jsonOut(['ok'=>true]);
        case 'admin.groups':
            $groups=all('SELECT g.*,(SELECT COUNT(*) FROM group_members WHERE group_id=g.id) members FROM groups g ORDER BY name');
            $members=[];
            foreach(all('SELECT group_id,user_id FROM group_members') as $member) $members[$member['group_id']][]=$member['user_id'];
            foreach($groups as &$group) $group['user_ids']=$members[$group['id']]??[];
            unset($group);
            jsonOut(['groups'=>$groups]);
        case 'admin.group.save':
            $gid=textField($data,'id',32,false); $name=textField($data,'name',80); $description=textField($data,'description',500,false); $flags=featureInput($data['features']??[]);
            $replaceMembers=array_key_exists('users',$data); $members=$data['users']??[];
            if ($replaceMembers) {
                if (!is_array($data['users'])||count($members)>10000) fail(422,'Ungültige Mitgliederzuordnung.');
                foreach($members as $memberId) if (!is_string($memberId)) fail(422,'Ungültige Mitgliederzuordnung.');
                $members=array_values(array_unique($members));
            }
            transaction(function() use($u,&$gid,$name,$description,$flags,$replaceMembers,$members) {
                foreach($members as $memberId) if (!one('SELECT id FROM users WHERE id=?',[$memberId])) fail(422,'Ein Benutzer existiert nicht mehr.');
                if ($gid) { if (!one('SELECT id FROM groups WHERE id=?',[$gid])) fail(404,'Gruppe nicht gefunden.'); query('UPDATE groups SET name=?,description=?,features=? WHERE id=?',[$name,$description,$flags,$gid]); }
                else { $gid=id(); query('INSERT INTO groups VALUES(?,?,?,?,?)',[$gid,$name,$description,$flags,now()]); }
                if ($replaceMembers) {
                    query('DELETE FROM group_members WHERE group_id=?',[$gid]);
                    foreach($members as $memberId) query('INSERT INTO group_members VALUES(?,?)',[$gid,$memberId]);
                }
                audit($u['id'],'admin.group.save');
            }); jsonOut(['ok'=>true,'id'=>$gid]);
        case 'admin.group.delete': query('DELETE FROM groups WHERE id=?',[textField($data,'id',32)]); audit($u['id'],'admin.group.delete'); jsonOut(['ok'=>true]);
        case 'admin.settings':
            $flags=featureInput($data['features']??[]); $hosts=$data['hosts']??[];
            if (!is_array($hosts)||count($hosts)>20) fail(422,'Bitte geben Sie höchstens 20 Hosts an.');
            foreach($hosts as $host) if (!is_string($host)||!preg_match('/^[a-zA-Z0-9.-]{1,253}$/',$host)) fail(422,'Ungültiger Host.');
            $sharing=isset($data['chat_sharing'])?chatSharingInput($data['chat_sharing']):null;
            $uploads=isset($data['workspace_uploads'])?workspaceUploadsInput($data['workspace_uploads']):null;
            $sessionHours=array_key_exists('session_hours',$data)?sessionHoursInput($data['session_hours']):null;
            transaction(function() use($flags,$hosts,$u,$sharing,$uploads,$sessionHours) { query("UPDATE settings SET value=? WHERE key='features'",[$flags]); query("INSERT INTO settings VALUES('db_allowed_hosts',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",[json_encode(array_values(array_unique($hosts)))]); if($sharing!==null)query("INSERT INTO settings VALUES('chat_sharing',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",[json_encode($sharing)]);if($uploads!==null)query("INSERT INTO settings VALUES('workspace_uploads',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",[json_encode($uploads)]);if($sessionHours!==null)query("INSERT INTO settings VALUES('session_hours',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",[json_encode($sessionHours)]);audit($u['id'],'admin.settings'); }); jsonOut(['ok'=>true]);
        default: fail(404,'Unbekannte Aktion.');
    }
} catch (ApiError $e) { jsonOut(['error'=>$e->getMessage()],$e->status); }
catch (PDOException $e) {
    if (str_contains($e->getMessage(),'UNIQUE constraint')) jsonOut(['error'=>'Dieser Name oder diese E-Mail-Adresse ist bereits vergeben.'],409);
    error_log('ectro database error: '.$e->getCode()); jsonOut(['error'=>'Der Speicher ist vorübergehend nicht verfügbar. Bitte versuchen Sie es erneut.'],503);
} catch (Throwable $e) { error_log('ectro error: '.get_class($e).' '.$e->getMessage()); jsonOut(['error'=>'Die Anfrage konnte nicht verarbeitet werden.'],500); }
