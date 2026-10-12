<?php
declare(strict_types=1);
function defaultStarterFiles(string $template): array {
    return match($template) {
        'python' => ['main.py' => "# Ihr erster Python-Workspace\nfrom datetime import date\n\nname = 'Welt'\nprint(f'Hallo, {name}.')\nprint(f'Heute ist {date.today():%d.%m.%Y}.')\n\nfor zahl in range(1, 6):\n    print(f'{zahl} × {zahl} = {zahl ** 2}')\n"],
        'php' => ['index.php' => "<?php\n\$titel = 'Meine erste PHP-Seite';\n\$sprachen = ['HTML', 'CSS', 'JavaScript', 'PHP', 'Python'];\n?>\n<!doctype html>\n<html lang=\"de\">\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n  <title><?= htmlspecialchars(\$titel) ?></title>\n  <link rel=\"stylesheet\" href=\"style.css\">\n</head>\n<body>\n  <main>\n    <span class=\"label\">MEIN WORKSPACE // PHP</span>\n    <h1><?= htmlspecialchars(\$titel) ?><span>.</span></h1>\n    <p>Diese Seite wird mit PHP im Browser gerendert.</p>\n    <ul><?php foreach (\$sprachen as \$sprache): ?>\n      <li><?= htmlspecialchars(\$sprache) ?></li>\n    <?php endforeach; ?></ul>\n  </main>\n</body>\n</html>", 'style.css' => starterCss()],
        default => ['index.html' => "<!doctype html>\n<html lang=\"de\">\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n  <title>Mein erster Entwurf</title>\n  <link rel=\"stylesheet\" href=\"style.css\">\n</head>\n<body>\n  <main>\n    <span class=\"label\">MEIN WORKSPACE // WEB</span>\n    <h1>Eine Idee. Ihr <span>Code.</span></h1>\n    <p>Verändern Sie diese Seite. Probieren Sie etwas aus.</p>\n    <button id=\"hello\">Hallo sagen</button>\n    <p id=\"output\" aria-live=\"polite\"></p>\n  </main>\n  <script src=\"script.js\"></script>\n</body>\n</html>", 'style.css' => starterCss(), 'script.js' => "const button = document.querySelector('#hello');\nconst output = document.querySelector('#output');\n\nbutton.addEventListener('click', () => {\n  output.textContent = 'Es funktioniert. Machen Sie weiter.';\n});\n"]
    };
}
function initializeProjectTypes(): void {
    if (one("SELECT 1 FROM settings WHERE key='project_types_initialized'")) return;
    transaction(function() {
        if (one("SELECT 1 FROM settings WHERE key='project_types_initialized'")) return;
        foreach([['web','Web-Projekt','HTML, CSS und JavaScript.'],['php','PHP-Website','Dynamische Seiten mit PHP.'],['python','Python-Script','Ideen mit Python ausprobieren.']] as [$type,$name,$description]) {
            query('INSERT INTO project_types(id,name,description,language,created_at,updated_at) VALUES(?,?,?,?,?,?)',[$type,$name,$description,$type,now(),now()]);
            foreach(defaultStarterFiles($type) as $path=>$content)query('INSERT INTO project_type_files VALUES(?,?,?)',[$type,$path,$content]);
        }
        query("INSERT INTO settings VALUES('project_types_initialized','true')");
    });
}
function projectType(string $id): array {
    initializeProjectTypes();
    $type=one('SELECT * FROM project_types WHERE id=?',[$id]);
    if (!$type) fail(404,'Projekttyp nicht gefunden.');
    $type['active']=(bool)$type['active'];$type['version']=(int)$type['version'];
    $type['files']=all('SELECT path,content FROM project_type_files WHERE type_id=? ORDER BY path',[$id]);
    return $type;
}
function projectTypes(): array {
    initializeProjectTypes();
    return array_map(function($type){$type['active']=(bool)$type['active'];$type['version']=(int)$type['version'];return $type;},all('SELECT t.*,(SELECT COUNT(*) FROM project_type_files f WHERE f.type_id=t.id) file_count FROM project_types t ORDER BY CASE t.id WHEN \'web\' THEN 0 WHEN \'php\' THEN 1 WHEN \'python\' THEN 2 ELSE 3 END,t.name'));
}
function starterFiles(string $template): array {
    return array_column(projectType($template)['files'],'content','path');
}
function saveProjectType(array $u,array $data): string {
    initializeProjectTypes();
    $tid=textField($data,'id',32,false);$name=textField($data,'name',80);$description=textField($data,'description',500,false);$language=$data['language']??'web';$active=$data['active']??true;$files=$data['files']??null;$version=$data['version']??0;
    if (!in_array($language,['web','php','python'],true)||!is_bool($active)||!is_int($version)||!is_array($files)||!array_is_list($files)||count($files)>100)fail(422,'Bitte prüfen Sie Projekttyp und Startdateien.');
    $validated=[];$size=0;
    foreach($files as $file) {
        if(!is_array($file)||!is_string($file['content']??null))fail(422,'Ungültige Startdatei.');
        $path=filePath(textField($file,'path',240));$content=str_replace(["\r\n","\r"],"\n",$file['content']);
        if(strlen($content)>FILE_LIMIT||!mb_check_encoding($content,'UTF-8'))fail(422,'Startdateien müssen UTF-8-Text und höchstens 512 KB groß sein.');
        if(array_key_exists($path,$validated))fail(422,'Ein Dateipfad wurde mehrfach angegeben.');
        $validated[$path]=$content;$size+=strlen($content);
    }
    if($size>1048576)fail(422,'Die Startdateien dürfen zusammen höchstens 1 MB groß sein.');
    foreach(array_keys($validated) as $path) {
        $path=(string)$path;
        $parts=explode('/',$path);array_pop($parts);$parent='';
        foreach($parts as $part){$parent=ltrim($parent.'/'.$part,'/');if(array_key_exists($parent,$validated))fail(422,'Eine Startdatei kann nicht zugleich ein Ordner sein.');}
    }
    return transaction(function() use($u,$tid,$name,$description,$language,$active,$validated,$version) {
        if(one('SELECT id FROM project_types WHERE name=? AND id!=?',[$name,$tid]))fail(409,'Ein Projekttyp mit diesem Namen existiert bereits.');
        if($tid){
            $old=one('SELECT version FROM project_types WHERE id=?',[$tid]);if(!$old)fail(404,'Projekttyp nicht gefunden.');
            if((int)$old['version']!==$version)fail(409,'Diese Vorlage wurde inzwischen geändert. Ihr Entwurf bleibt erhalten. Bitte sichern Sie ihn und laden Sie den aktuellen Stand.');
            query('UPDATE project_types SET name=?,description=?,language=?,active=?,version=version+1,updated_at=? WHERE id=?',[$name,$description,$language,(int)$active,now(),$tid]);
        }else{
            if($version!==0)fail(422,'Ungültige Vorlagenversion.');
            if((int)query('SELECT COUNT(*) FROM project_types')->fetchColumn()>=100)fail(422,'Es sind bis zu 100 Projekttypen möglich.');
            $tid=id();query('INSERT INTO project_types(id,name,description,language,active,created_at,updated_at) VALUES(?,?,?,?,?,?,?)',[$tid,$name,$description,$language,(int)$active,now(),now()]);
        }
        query('DELETE FROM project_type_files WHERE type_id=?',[$tid]);
        foreach($validated as $path=>$content)query('INSERT INTO project_type_files VALUES(?,?,?)',[$tid,$path,$content]);
        audit($u['id'],'admin.template.save');return $tid;
    });
}
function starterCss(): string {
    return "* { box-sizing: border-box; }\nbody { margin: 0; background: #f9f9f9; color: #1a1c1c; font: 16px/1.6 system-ui, sans-serif; }\nmain { max-width: 760px; margin: 12vh auto; padding: 32px; }\n.label { font: 11px monospace; letter-spacing: .14em; }\nh1 { font-size: clamp(36px, 6vw, 64px); line-height: 1.05; letter-spacing: -.04em; font-weight: 500; }\nh1 span { color: #b2026c; }\np { color: #5e5e62; }\nbutton { margin-top: 24px; padding: 14px 24px; background: #b2026c; color: white; border: 0; border-radius: 999px; cursor: pointer; }\n";
}
function createProject(array $u, string $name, string $template, string $groupId=''): string {
    initializeProjectTypes();
    return transaction(function () use ($u,$name,$template,$groupId) {
        $type=one('SELECT * FROM project_types WHERE id=? AND active=1',[$template]);
        if(!$type)fail(422,'Dieser Projekttyp ist nicht verfügbar. Bitte wählen Sie einen anderen.');
        needFeature($u,$type['language']==='web'?'html':$type['language']);
        $startFiles=array_column(all('SELECT path,content FROM project_type_files WHERE type_id=? ORDER BY path',[$template]),'content','path');
        if ($groupId && !one('SELECT 1 FROM group_members WHERE group_id=? AND user_id=?',[$groupId,$u['id']])) fail(403,'Sie gehören dieser Gruppe nicht an.');
        if ((int)query('SELECT COUNT(*) FROM projects WHERE '.($groupId?'group_id=?':'user_id=?'), [$groupId?:$u['id']])->fetchColumn() >= 30) fail(422, 'Pro Workspace sind bis zu 30 Projekte möglich.');
        if (workspaceBytes(['group_id'=>$groupId?:null,'user_id'=>$u['id']])+array_sum(array_map('strlen',$startFiles))>SPACE_LIMIT) fail(422,'Der Workspace ist voll (20 MB).');
        $pid = id(); query('INSERT INTO projects(id,user_id,group_id,created_by,name,created_at,updated_at) VALUES(?,?,?,?,?,?,?)', [$pid, $groupId?null:$u['id'], $groupId?:null, $u['id'], $name, now(), now()]);
        foreach ($startFiles as $path => $content) query('INSERT INTO files(id,project_id,path,content,updated_at) VALUES(?,?,?,?,?)', [id(),$pid,$path,$content,now()]);
        audit($u['id'], 'project.create'); return $pid;
    });
}
