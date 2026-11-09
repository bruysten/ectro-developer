<?php
declare(strict_types=1);

function studioCombinedInput(array $v): array {
    $mode=studioEnum($v['mode']??null,['join','append']);$tables=[];$aliases=[];
    foreach(labList($v['tables']??[],6) as $raw){
        $t=studioRecord($raw);$table=studioText($t['table']??'',64);identifier($table);
        $alias=labName($t['alias']??null,30);if(!preg_match('/^[a-zA-Z0-9_]+$/D',$alias)||isset($aliases[$alias]))fail(422,'Tabellen benötigen unterschiedliche gültige Namen.');$aliases[$alias]=true;
        $tables[]=['table'=>$table,'scope'=>studioEnum($t['scope']??'project',['project','personal']),'alias'=>$alias];
    }
    if(count($tables)<2)fail(422,'Bitte zwei bis sechs Tabellen auswählen.');$joins=[];
    foreach(labList($v['joins']??[],5) as $raw){$j=studioRecord($raw);$joins[]=['left'=>labName($j['left']??null),'right'=>labName($j['right']??null),'how'=>studioEnum($j['how']??null,['left','inner'])];}
    if($mode==='join'&&count($joins)!==count($tables)-1)fail(422,'Für jede weitere Tabelle wird eine Beziehung benötigt.');
    return ['type'=>'combined','mode'=>$mode,'tables'=>$tables,'joins'=>$mode==='join'?$joins:[]];
}
function studioMysqlConnection(array $u,string $pid,string $scope): PDO {
    labAccess($u,$pid);needFeature($u,'database');studioEnum($scope,['project','personal']);
    $conn=$scope==='project'?mysqlSavedConnection($u,$pid):one('SELECT * FROM connections WHERE user_id=?',[$u['id']]);
    if(!$conn)fail(422,$scope==='project'?'Für dieses Projekt ist keine Datenbank verbunden.':'Es ist keine persönliche Datenbank verbunden.');
    return mysqlConnection($u,$conn,$pid);
}
function studioJoinKey(mixed $value): ?string {
    if($value===null||$value==='')return null;
    if(is_int($value)||is_float($value))return 'n:'.json_encode($value==0?0:(float)$value);
    return is_bool($value)?'b:'.($value?'true':'false'):'s:'.$value;
}
function studioCombineTables(array $inputs,array $spec,int $limit): array {
    $columns=[];$rows=[];$unmatched=[];$expanded=0;
    $check=function(array $columns){if(count($columns)>50)fail(422,'Das Ergebnis enthält mehr als 50 Spalten.');foreach($columns as $c)labName($c['name']);};
    $push=function(array $row)use(&$rows,$limit){if(count($rows)>=$limit)fail(422,'Das Ergebnis überschreitet '.$limit.' Zeilen. Bitte weniger Daten oder eindeutigere Schlüssel wählen.');$rows[]=$row;};
    if($spec['mode']==='append'){
        $types=[];foreach($inputs as $input)foreach($input['columns'] as $c)$types[$c['name']][]=$c['type'];
        $sourceColumn='quelle';while(isset($types[$sourceColumn]))$sourceColumn='_'.$sourceColumn;
        foreach($types as $name=>$values)$columns[]=['name'=>$name,'type'=>count(array_unique($values))===1?$values[0]:'text'];$columns[]=['name'=>$sourceColumn,'type'=>'text'];$check($columns);
        foreach($inputs as $i=>$input)foreach($input['rows'] as $row){$next=[];foreach($types as $name=>$_)$next[$name]=$row[$name]??null;$next[$sourceColumn]=$spec['tables'][$i]['alias'];$push($next);}
    }else{
        $qualify=fn($i)=>array_map(fn($c)=>[...$c,'name'=>$spec['tables'][$i]['alias'].'.'.$c['name']],$inputs[$i]['columns']);
        $columns=$qualify(0);$check($columns);foreach($inputs[0]['rows'] as $row){$next=[];foreach($inputs[0]['columns'] as $c)$next[$spec['tables'][0]['alias'].'.'.$c['name']]=$row[$c['name']]??null;$push($next);}
        for($i=1;$i<count($inputs);$i++){
            $rule=$spec['joins'][$i-1];$input=$inputs[$i];$alias=$spec['tables'][$i]['alias'];
            if(!in_array($rule['left'],array_column($columns,'name'),true)||!in_array($rule['right'],array_column($input['columns'],'name'),true))fail(422,'Die gewählten Schlüsselspalten sind nicht mehr vorhanden.');
            $added=$qualify($i);$columns=[...$columns,...$added];$check($columns);$index=[];
            foreach($input['rows'] as $row){$key=studioJoinKey($row[$rule['right']]??null);if($key!==null)$index[$key][]=$row;}
            $previous=$rows;$rows=[];$missing=0;
            foreach($previous as $row){$key=studioJoinKey($row[$rule['left']]??null);$matches=$key===null?[]:($index[$key]??[]);
                if(!$matches){$missing++;if($rule['how']==='left'){$next=$row;foreach($added as $c)$next[$c['name']]=null;$push($next);}}
                else{$expanded+=max(0,count($matches)-1);foreach($matches as $match){$next=$row;foreach($input['columns'] as $c)$next[$alias.'.'.$c['name']]=$match[$c['name']]??null;$push($next);}}
            }
            $unmatched[]=['table'=>$alias,'count'=>$missing];
        }
    }
    $truncated=(bool)array_filter($inputs,fn($t)=>$t['truncated']??false);
    return ['name'=>implode(' + ',array_column($spec['tables'],'alias')),'columns'=>$columns,'rows'=>$rows,'total'=>$truncated?null:count($rows),'truncated'=>$truncated,'unmatched'=>$unmatched,'expanded'=>$expanded]+(isset($sourceColumn)?['sourceColumn'=>$sourceColumn]:[]);
}
