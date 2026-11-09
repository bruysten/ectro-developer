<?php
declare(strict_types=1);
function datasetDatabaseAccess(array $u,array $data):string {
    $pid=textField($data,'project',32);labAccess($u,$pid,'dataset');needFeature($u,'database');return $pid;
}
function datasetDatabases(array $u,array $data):array {
    $pid=datasetDatabaseAccess($u,$data);$out=[];
    if(mysqlSavedConnection($u,$pid))$out[]=['scope'=>'project','name'=>'Projekt-Datenbank'];
    if(one('SELECT user_id FROM connections WHERE user_id=?',[$u['id']]))$out[]=['scope'=>'personal','name'=>'Persönliche Datenbank'];
    return ['databases'=>$out,'limit'=>min(1000,labLimits()['rows'])];
}
function datasetDatabaseConnection(array $u,array $data):PDO {
    $pid=datasetDatabaseAccess($u,$data);$scope=$data['scope']??'';if(!in_array($scope,['project','personal'],true))fail(422,'Bitte eine Datenbank auswählen.');
    $conn=$scope==='project'?mysqlSavedConnection($u,$pid):one('SELECT * FROM connections WHERE user_id=?',[$u['id']]);
    if(!$conn)fail(422,'Diese Datenbankverbindung ist nicht mehr eingerichtet.');return mysqlConnection($u,$conn,$pid);
}
function datasetDatabaseTables(array $u,array $data):array {
    datasetDatabaseAccess($u,$data);rateLimit('dataset.mysql.'.$u['id'],30,60);$pdo=datasetDatabaseConnection($u,$data);
    try{return ['tables'=>$pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN)];}catch(PDOException $error){mysqlError($error);}
}
function datasetDatabaseContent(array $columns,array $rows):array {
    if(count($columns)>50)fail(422,'Im Datenlabor sind höchstens 50 Spalten möglich.');$out=[];
    foreach($columns as $column){$name=labName($column['Field']);$numeric=(bool)preg_match('/^(tinyint|smallint|mediumint|int|bigint|decimal|numeric|float|double|real)\b/i',$column['Type']);$safe=$numeric;
        foreach($rows as $row){$value=$row[$name]??null;if($value===null)continue;if(is_string($value)&&!mb_check_encoding($value,'UTF-8'))fail(422,'Die Tabelle enthält Binärdaten. Bitte eine Tabelle mit Text- und Zahlenwerten verwenden.');
            if($numeric&&(!is_numeric($value)||!is_finite((float)$value)||abs((float)$value)>9007199254740991||strlen(ltrim(preg_replace('/[^0-9]/','',(string)$value),'0'))>15))$safe=false;
        }
        foreach($rows as &$row){$value=$row[$name]??null;$row[$name]=$value===null?null:($safe?(float)$value:($numeric?(string)$value:$value));}unset($row);
        $out[]=['name'=>$name,'type'=>$safe?'number':'text'];
    }
    return labValidate('dataset',['columns'=>$out,'rows'=>$rows]);
}
function datasetDatabaseRead(array $u,array $data):array {
    datasetDatabaseAccess($u,$data);rateLimit('dataset.mysql.'.$u['id'],30,60);$pdo=datasetDatabaseConnection($u,$data);$table=textField($data,'table',64);$quoted=identifier($table);$limit=min(1000,labLimits()['rows']);
    try{
        if(!in_array($table,$pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN),true))fail(404,'Tabelle nicht gefunden.');
        $columns=tableColumns($pdo,$table);if(count($columns)>50)fail(422,'Im Datenlabor sind höchstens 50 Spalten möglich.');
        $names=array_map(fn($column)=>identifier($column['Field']),$columns);$pdo->setAttribute(PDO::MYSQL_ATTR_USE_BUFFERED_QUERY,false);$statement=$pdo->query('SELECT '.implode(',',$names).' FROM '.$quoted.' LIMIT '.($limit+1));$rows=[];$bytes=0;$truncated=false;
        while($row=$statement->fetch(PDO::FETCH_ASSOC)){if(count($rows)===$limit){$truncated=true;break;}$bytes+=strlen(labJson($row));if($bytes>1000000)fail(413,'Die Tabelle ist für einen Datensatz zu umfangreich (höchstens 1 MB).');$rows[]=$row;}
        return ['name'=>$table,'content'=>datasetDatabaseContent($columns,$rows),'truncated'=>$truncated,'limit'=>$limit];
    }catch(PDOException $error){mysqlError($error);}
}
