<?php
declare(strict_types=1);
// Configuration only. Data is read through the existing project/source ACL; processing never writes back.
function pipelineValidate(array $c):array {
    $source=studioSourceInput($c['source']??null);if(($source['type']??'')==='text')fail(422,'Bitte strukturierte Daten auswählen.');
    $steps=[];$ids=[];
    foreach(labList($c['steps']??[],12) as $v){
        $v=studioRecord($v);$id=labName($v['id']??null);if(isset($ids[$id]))fail(422,'Schritt-IDs müssen eindeutig sein.');$ids[$id]=true;
        $type=studioEnum($v['type']??null,['clean','filter','select','convert','calculate','deduplicate','sort','aggregate','join']);$s=['id'=>$id,'type'=>$type];
        $fields=match($type){'select','deduplicate'=>[], 'calculate'=>['column','other','target'], 'aggregate'=>['column','group','target'], 'join'=>['column','rightKey'],default=>['column']};
        foreach($fields as $key)$s[$key]=studioText($v[$key]??'',80);
        if(in_array($type,['select','deduplicate'],true)){$s['columns']=[];foreach(labList($v['columns']??[],50) as $name)$s['columns'][]=labName($name);if(count(array_unique($s['columns']))!==count($s['columns']))fail(422,'Spalten dürfen nicht doppelt vorkommen.');}
        $choices=match($type){'clean'=>['mode'=>['trim','lower','upper']], 'filter'=>['operator'=>['eq','neq','contains','gt','gte','lt','lte','present']], 'convert'=>['mode'=>['number','text','boolean']], 'calculate'=>['operation'=>['multiply','add','subtract','divide']], 'sort'=>['direction'=>['asc','desc']], 'aggregate'=>['operation'=>['sum','average','count','min','max']], 'join'=>['mode'=>['left','inner']],default=>[]};
        foreach($choices as $key=>$values)$s[$key]=studioEnum($v[$key]??$values[0],$values);
        if($type==='filter')$s['value']=studioText($v['value']??'',500);
        if($type==='join'){$s['source']=studioSourceInput($v['source']??null);if(($s['source']['type']??'')==='text')fail(422,'Verknüpfungen benötigen strukturierte Daten.');}
        $steps[]=$s;
    }
    return ['source'=>$source,'steps'=>$steps];
}
