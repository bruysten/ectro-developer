<?php
declare(strict_types=1);
function readinessValidate(array $c):array {
    if(($c['schemaVersion']??1)!==1)fail(422,'Diese Check-Version wird nicht unterstützt.');
    $catalog=json_decode(file_get_contents(__DIR__.'/readiness-catalog.json'),true,64,JSON_THROW_ON_ERROR);
    $allowed=array_column($catalog['criteria'],'id');$answers=studioRecord($c['answers']??[]);$out=[];
    foreach($answers as $key=>$value){if(!in_array($key,$allowed,true))fail(422,'Unbekanntes Readiness-Kriterium.');$out[$key]=studioEnum($value,['yes','partial','no','unknown']);}
    $organization=studioText($c['organization']??'',180);$scope=studioEnum($c['scope']??'organization',['organization','area']);$area=studioText($c['area']??'',180);$baseline=studioEnum($c['baseline']??'',['','analog','islands','connected','unknown']);$screen=studioEnum($c['screen']??'setup',['setup','questions','result']);$step=$c['step']??0;
    if(!is_int($step)||$step<0||$step>=count($catalog['questions']))fail(422,'Ungültiger Check-Schritt.');
    if($screen!=='setup'&&(trim($organization)===''||($scope==='area'&&trim($area)==='')||$baseline===''))fail(422,'Bitte Organisation, Bezugsbereich und Arbeitsalltag festlegen.');
    if($screen==='setup'&&$answers)fail(422,'Für einen neuen Bezugsbereich zuerst die Antworten zurücksetzen.');
    $completed=studioText($c['completedAt']??'',30);
    if($screen==='result'){
        if(count($out)!==count($allowed))fail(422,'Bitte alle Kriterien einschätzen; „Weiß ich nicht“ ist möglich.');
        $date=DateTimeImmutable::createFromFormat('!Y-m-d\TH:i:s.v\Z',$completed,new DateTimeZone('UTC'));
        if(!$date||$date->format('Y-m-d\TH:i:s.v\Z')!==$completed)fail(422,'Ungültiger Abschlusszeitpunkt.');
    }else $completed='';
    return ['schemaVersion'=>1,'organization'=>$organization,'scope'=>$scope,'area'=>$area,'baseline'=>$baseline,'answers'=>(object)$out,'screen'=>$screen,'step'=>$step,'completedAt'=>$completed];
}
