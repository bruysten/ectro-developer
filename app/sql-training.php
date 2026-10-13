<?php
declare(strict_types=1);
function removePracticeData(string $uid): void {
    if(!preg_match('/^[a-f0-9]{32}$/',$uid))return;
    foreach(['','-wal','-shm'] as $suffix){$path=dataDir().'/sql-training/'.$uid.'.sqlite'.$suffix;if(is_file($path)&&!unlink($path))error_log('SQL training storage cleanup failed.');}
}
function practiceDatabase(array $u): PDO {
    $dir=dataDir().'/sql-training';if(!is_dir($dir)&&!mkdir($dir,0700,true)&&!is_dir($dir))fail(503,'Der Übungsspeicher ist nicht verfügbar.');
    $pdo=new PDO('sqlite:'.$dir.'/'.$u['id'].'.sqlite',null,null,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
    $pdo->exec('PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS training_meta (key TEXT PRIMARY KEY);');
    $pdo->exec('BEGIN IMMEDIATE');try{
        if(!$pdo->query("SELECT 1 FROM training_meta WHERE key='seeded'")->fetchColumn()){
            $pdo->exec('CREATE TABLE produkte (id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,kategorie TEXT NOT NULL DEFAULT \'Allgemein\',preis NUMERIC NOT NULL DEFAULT 0,bestand INTEGER NOT NULL DEFAULT 0);CREATE TABLE kontakte (id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,email TEXT UNIQUE,stadt TEXT);');
            seedPractice($pdo);$pdo->exec("INSERT INTO training_meta VALUES('seeded')");
        }$pdo->exec('COMMIT');
    }catch(Throwable $e){$pdo->exec('ROLLBACK');throw $e;}return $pdo;
}
function seedPractice(PDO $pdo): void {
    $pdo->exec("INSERT INTO produkte(name,kategorie,preis,bestand) VALUES('Notizbuch','Büro',8.5,24),('Trinkflasche','Alltag',19.9,12),('Schreibtischlampe','Büro',39,6);INSERT INTO kontakte(name,email,stadt) VALUES('Mara','mara@example.test','Berlin'),('Jonas','jonas@example.test','Hamburg'),('Lina','lina@example.test','Berlin')");
}
function trainingConnection(array $u,string $mode): PDO {return match($mode){'practice'=>practiceDatabase($u),'mysql'=>mysqlConnection($u),default=>throw new ApiError(422,'Unbekannter Arbeitsbereich.')};}
function trainingTables(PDO $pdo,string $mode): array {return $mode==='practice'?['produkte','kontakte']:array_values(array_filter($pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN),fn($t)=>preg_match('/^[a-zA-Z_][a-zA-Z0-9_]{0,63}$/',$t)));}
function trainingColumns(PDO $pdo,string $mode,string $table): array {
    if(!in_array($table,trainingTables($pdo,$mode),true))fail(404,'Tabelle nicht gefunden.');
    if($mode==='mysql')return tableColumns($pdo,$table);
    return array_map(fn($c)=>['Field'=>$c['name'],'Type'=>match($c['type']){'INTEGER'=>'INT','NUMERIC'=>'DECIMAL',default=>'TEXT'},'Null'=>$c['notnull']||$c['pk']?'NO':'YES','Default'=>$c['dflt_value'],'Key'=>$c['pk']?'PRI':'','Extra'=>$c['pk']?'auto_increment':''],$pdo->query('PRAGMA table_info('.identifier($table).')')->fetchAll());
}
function trainingValue(mixed $value,array $column): mixed {
    if($value===null){if($column['Null']!=='YES')fail(422,'„'.$column['Field'].'“ darf nicht NULL sein.');return null;}
    if(!is_string($value)&&!is_int($value)&&!is_float($value))fail(422,'Ungültiger Spaltenwert.');
    if(is_string($value)&&(!mb_check_encoding($value,'UTF-8')||strlen($value)>10000))fail(422,'Der Wert ist zu lang oder enthält ungültigen Text.');
    if(preg_match('/INT|BOOLEAN/i',$column['Type'])&&!preg_match('/^-?[0-9]+$/',(string)$value))fail(422,'„'.$column['Field'].'“ benötigt eine ganze Zahl.');
    if(preg_match('/DECIMAL|NUMERIC|FLOAT|DOUBLE|REAL/i',$column['Type'])&&!preg_match('/^-?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)$/',(string)$value))fail(422,'„'.$column['Field'].'“ benötigt eine Zahl (Dezimalpunkt statt Komma).');
    return $value;
}
function composeTrainingSql(array $model,array $columns,string $mode='practice'): array {
    $table=identifier(textField($model,'table',64));$action=$model['action']??'';
    if(!in_array($action,['insert','select','update','delete'],true))fail(422,'Bitte INSERT, SELECT, UPDATE oder DELETE wählen.');
    $meta=array_column($columns,null,'Field');$params=[];
    $column=function($name)use($meta){if(!is_string($name)||!isset($meta[$name]))fail(422,'Unbekannte Spalte.');return identifier($name);};
    $conditions=$model['conditions']??[];if(!is_array($conditions)||!array_is_list($conditions)||count($conditions)>10)fail(422,'Höchstens zehn Bedingungen sind möglich.');
    $join=$model['join']??'and';if(!in_array($join,['and','or'],true))fail(422,'Ungültige Bedingungsverknüpfung.');
    $where=[];foreach($conditions as $c){if(!is_array($c))fail(422,'Ungültige Bedingung.');$name=$column($c['column']??null);$op=$c['operator']??'';
        if(!in_array($op,['=','!=','>','>=','<','<=','LIKE','IS NULL','IS NOT NULL'],true))fail(422,'Ungültiger Vergleich.');
        if(in_array($op,['IS NULL','IS NOT NULL'],true)){$where[]=$name.' '.$op;continue;}
        $value=$c['value']??null;if($value===null)fail(422,'Für NULL bitte „ist NULL“ oder „ist nicht NULL“ wählen.');
        if($op==='LIKE'&&!preg_match('/CHAR|TEXT/i',$meta[$c['column']]['Type']))fail(422,'LIKE ist für Textspalten vorgesehen.');
        $where[]=$name.' '.$op.' ?';$params[]=trainingValue($value,$meta[$c['column']]);
    }
    $limit=$model['limit']??20;if(!is_int($limit)||$limit<1||$limit>100)fail(422,'Das Limit muss zwischen 1 und 100 liegen.');
    $whereSql=$where?' WHERE '.implode(' '.strtoupper($join).' ',$where):'';
    if($action==='select'){
        $selected=$model['columns']??[];if(!is_array($selected)||!array_is_list($selected)||count($selected)>50||count(array_unique($selected,SORT_REGULAR))!==count($selected))fail(422,'Ungültige Spaltenauswahl.');
        $distinct=$model['distinct']??false;if(!is_bool($distinct))fail(422,'Ungültige DISTINCT-Option.');
        $sql='SELECT '.($distinct?'DISTINCT ':'').($selected?implode(', ',array_map($column,$selected)):'*').' FROM '.$table.$whereSql;
        $order=$model['order']??[];if(!is_array($order)||!array_is_list($order)||count($order)>5)fail(422,'Höchstens fünf Sortierungen sind möglich.');
        if($order){$parts=[];foreach($order as $o){if(!is_array($o)||!in_array($o['direction']??'', ['ASC','DESC'],true))fail(422,'Ungültige Sortierung.');$parts[]=$column($o['column']??null).' '.$o['direction'];}$sql.=' ORDER BY '.implode(', ',$parts);}
        return ['sql'=>$sql.' LIMIT '.$limit,'params'=>$params,'action'=>$action];
    }
    if(in_array($action,['update','delete'],true)&&!$where)fail(422,'UPDATE und DELETE benötigen im Training mindestens eine Bedingung.');
    $values=$model['values']??[];
    if(in_array($action,['insert','update'],true)){
        if(!is_array($values)||!$values||count($values)>30)fail(422,'Bitte mindestens eine Spalte mit Wert hinzufügen.');
        $names=[];$set=[];$valueParams=[];foreach($values as $name=>$value){$names[]=$column($name);if(preg_match('/(?:VIRTUAL|STORED) GENERATED|GENERATED ALWAYS/i',$meta[$name]['Extra']??''))fail(422,'Berechnete Spalten können nicht beschrieben werden.');$set[]=$column($name).' = ?';$valueParams[]=trainingValue($value,$meta[$name]);}
        if($action==='insert'){
            $rows=$model['rows']??[$values];if(!is_array($rows)||!array_is_list($rows)||!$rows||count($rows)>10)fail(422,'Bitte 1–10 Datensätze verwenden.');$params=[];
            foreach($rows as $row){if(!is_array($row)||array_keys($row)!==array_keys($values))fail(422,'Alle Datensätze benötigen dieselben Spalten.');foreach($row as $name=>$value)$params[]=trainingValue($value,$meta[$name]);}
            return ['sql'=>'INSERT INTO '.$table.' ('.implode(', ',$names).') VALUES '.implode(', ',array_fill(0,count($rows),'('.implode(', ',array_fill(0,count($names),'?')).')')),'params'=>$params,'action'=>$action];
        }
        $sql='UPDATE '.$table.' SET '.implode(', ',$set);$params=array_merge($valueParams,$params);
    }else $sql='DELETE FROM '.$table;
    if($mode==='mysql')$sql.=$whereSql.' LIMIT '.$limit;
    else $sql.=' WHERE rowid IN (SELECT rowid FROM '.$table.$whereSql.' LIMIT '.$limit.')';
    return ['sql'=>$sql,'params'=>$params,'action'=>$action];
}
