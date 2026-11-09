<?php
declare(strict_types=1);
function statisticsValidate(array $c):array {
    $products=[];foreach(labList($c['products']??[],50) as $p){$p=labName($p);if(in_array($p,$products,true))fail(422,'Artikelnamen müssen eindeutig sein.');$products[]=$p;}
    $baskets=[];$ids=[];foreach(labList($c['baskets']??[],min(1000,labLimits()['rows'])) as $row){$row=studioRecord($row);$id=labName($row['id']??null);if(in_array($id,$ids,true))fail(422,'Warenkorb-IDs müssen eindeutig sein.');$ids[]=$id;$items=[];foreach(labList($row['items']??[],50) as $p){if(!is_string($p)||!in_array($p,$products,true)||in_array($p,$items,true))fail(422,'Ein Artikel darf pro Warenkorb genau einmal vorkommen und muss angelegt sein.');$items[]=$p;}$baskets[]=['id'=>$id,'items'=>$items];}
    $rule=studioRecord($c['rule']??[]);$out=[];foreach(['antecedent','consequent'] as $side){$out[$side]=[];foreach(labList($rule[$side]??[],5) as $p){if(!is_string($p)||!in_array($p,$products,true)||in_array($p,$out[$side],true))fail(422,'Ungültige Artikelauswahl in der Regel.');$out[$side][]=$p;}}if(array_intersect($out['antecedent'],$out['consequent']))fail(422,'Die beiden Regelseiten benötigen unterschiedliche Artikel.');
    $result=['products'=>$products,'baskets'=>$baskets,'rule'=>$out,'sourceLabel'=>studioText($c['sourceLabel']??'',180)];foreach(['minSupport','minConfidence'] as $key){$v=$c[$key]??0;if((!is_int($v)&&!is_float($v))||!is_finite((float)$v)||$v<0||$v>100)fail(422,'Schwellenwerte liegen zwischen 0 und 100 Prozent.');$result[$key]=$v;}
    return $result;
}
