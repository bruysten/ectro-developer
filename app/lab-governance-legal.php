<?php
declare(strict_types=1);
function governanceLegalCatalog():array {static $catalog;return $catalog??=json_decode(file_get_contents(__DIR__.'/governance-legal-catalog.json'),true,64,JSON_THROW_ON_ERROR);}
function governanceLegalValidate(mixed $raw,array $people):array {
 $out=[];$catalog=governanceLegalCatalog();$person=function($value)use($people){$id=govOptionalId($value);if($id!==''&&!isset($people[$id]))fail(422,'Stakeholder im Legal-Check nicht vorhanden.');return $id;};
 foreach(govUniqueRows($raw??[],80) as $a){$v=['id'=>$a['id'],'scope'=>govScope($a['scope']??null),'label'=>studioText($a['label']??'',180),'purpose'=>labName($a['purpose']??null,180),'reviews'=>[]];$reviews=studioRecord($a['reviews']??[]);if(array_diff(array_keys($reviews),array_keys($catalog['frameworks'])))fail(422,'Unbekannter Rechtsrahmen.');
  foreach($reviews as $law=>$review){$r=studioRecord($review);$definition=$catalog['frameworks'][$law];$facts=studioRecord($r['facts']??[]);if(array_diff(array_keys($facts),array_column($definition['facts'],'id')))fail(422,'Unbekannte Kontextfrage.');$row=['facts'=>[],'reviewer'=>$person($r['reviewer']??''),'rationale'=>studioText($r['rationale']??'',2000),'reviewedOn'=>govDate($r['reviewedOn']??''),'nextReview'=>govDate($r['nextReview']??''),'reviewToken'=>govOptionalId($r['reviewToken']??''),'basis'=>studioText($r['basis']??'',8),'checks'=>[]];
   if($row['reviewedOn']>gmdate('Y-m-d')||$row['nextReview']&&$row['reviewedOn']&&$row['nextReview']<$row['reviewedOn'])fail(422,'Prüfdatum und erneute Prüfung kontrollieren.');
   foreach($definition['facts'] as $q)$row['facts'][$q['id']]=studioEnum($facts[$q['id']]??'unknown',array_keys($q['options']));
   $checks=studioRecord($r['checks']??[]);$controls=array_column($definition['controls'],null,'id');if(array_diff(array_keys($checks),array_keys($controls)))fail(422,'Unbekannter Prüfschritt.');
   foreach($checks as $key=>$check){$x=studioRecord($check);$control=['state'=>studioEnum($x['state']??'open',['open','met','gap','excluded']),'owner'=>$person($x['owner']??''),'evidence'=>studioText($x['evidence']??'',2000),'reviewedOn'=>govDate($x['reviewedOn']??''),'dueDate'=>govDate($x['dueDate']??''),'nextReview'=>govDate($x['nextReview']??''),'rule'=>govOptionalId($x['rule']??''),'reviewToken'=>govOptionalId($x['reviewToken']??''),'basis'=>studioText($x['basis']??'',8)];
    if($control['reviewedOn']>gmdate('Y-m-d')||$control['nextReview']&&$control['reviewedOn']&&$control['nextReview']<$control['reviewedOn'])fail(422,'Prüfdatum und erneute Prüfung kontrollieren.');
    if($control['state']==='excluded'&&!$controls[$key]['allowExclusion'])fail(422,'Diesen Prüfschritt anhand der Kontextfragen einordnen; keine pauschale Ausnahme wählen.');
    if(in_array($control['state'],['met','excluded'],true)&&(!$control['owner']||!trim($control['evidence'])||!$control['reviewedOn']||!$control['reviewToken']))fail(422,'Erfüllte oder ausgenommene Prüfschritte benötigen Zuständigkeit, Nachweis und bestätigtes Prüfdatum.');$row['checks'][$key]=$control;
   }$v['reviews'][$law]=$row;
  }$out[]=$v;
 }return $out;
}
function governanceLegalCanonical(mixed $v):mixed {if(!is_array($v))return $v;if(!array_is_list($v))ksort($v,SORT_STRING);foreach($v as &$item)$item=governanceLegalCanonical($item);unset($item);return $v;}
function governanceLegalHash(mixed $value):string {
 $text=json_encode(governanceLegalCanonical($value),JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_LINE_TERMINATORS|JSON_THROW_ON_ERROR);$units=unpack('v*',mb_convert_encoding($text,'UTF-16LE','UTF-8'));$hash=2166136261;foreach($units as $unit)$hash=(($hash^$unit)*16777619)&0xffffffff;return str_pad(dechex($hash),8,'0',STR_PAD_LEFT);
}
function governanceLegalResource(array $a,?array $l):?array {
 if($a['scope']['type']==='organization')return ['name'=>'Gesamte Organisation'];$key=['system'=>'systems','store'=>'stores','flow'=>'flows'][$a['scope']['type']];foreach($l[$key]??[] as $r)if($r['id']===$a['scope']['id'])return $r;return null;
}
function governanceLegalResourceBasis(array $a,?array $l):?array {
 $r=governanceLegalResource($a,$l);if($a['scope']['type']==='organization'||!$r)return null;$clean=function($row){unset($row['mapPosition']);return $row;};$systems=$a['scope']['type']==='system'?[$r]:array_values(array_filter($l['systems']??[],fn($s)=>$a['scope']['type']==='store'?$s['id']===$r['system']:in_array($s['id'],[$r['from'],$r['to']],true)));$stores=$a['scope']['type']==='flow'?array_values(array_filter($l['stores']??[],fn($s)=>in_array($s['id'],$r['stores']??[],true))):[];
 usort($systems,fn($x,$y)=>strcmp($x['id'],$y['id']));usort($stores,fn($x,$y)=>strcmp($x['id'],$y['id']));return ['resource'=>$clean($r),'systems'=>array_map($clean,$systems),'stores'=>array_map($clean,$stores)];
}
function governanceLegalBasis(array $c,array $a,string $law,?array $l,string $rule=''):string {
 $catalog=governanceLegalCatalog();$facts=[];foreach($catalog['frameworks'][$law]['facts'] as $q)$facts[]=[$q['id'],$a['reviews'][$law]['facts'][$q['id']]??'unknown'];$linked=null;if($rule!=='')foreach($c['rules'] as $r)if($r['id']===$rule)$linked=$r;
 return governanceLegalHash([$catalog['version'],$c['landscape']?:'',$a['scope'],$a['purpose'],$facts,governanceLegalResourceBasis($a,$l),$linked]);
}
// Confirmation is bound to the server-resolved context. An ordinary resave or
// a changed questionnaire must never silently refresh an old legal attestation.
function governanceLegalBind(array &$c,?array $l,?array $old):void {
 $previous=array_column($old['legal']??[],null,'id');$rules=array_column($c['rules'],null,'id');
 foreach($c['legal'] as &$a){$before=$previous[$a['id']]??null;$resource=governanceLegalResource($a,$l);$a['label']=$resource['name']??(($before&&$before['scope']===$a['scope'])?$before['label']??'':'');
  foreach($a['reviews'] as $law=>&$review){$prior=$before['reviews'][$law]??[];$fresh=$review['reviewToken']!==''&&$review['reviewToken']!==($prior['reviewToken']??'');
   if($fresh){if(!$resource)fail(422,'Die Ressource muss für eine neue Einordnung verfügbar sein.');if(!$review['reviewer']||!trim($review['rationale'])||!$review['reviewedOn'])fail(422,'Eine bestätigte Einordnung benötigt Fachverantwortung, Begründung und Datum.');$expected=governanceLegalBasis($c,$a,$law,$l);if($review['basis']!==''&&$review['basis']!==$expected)fail(409,'Der Legal-Kontext wurde inzwischen geändert. Arbeitsgrundlage aktualisieren und die Einordnung erneut bestätigen.');$review['basis']=$review['basis']!==''?$expected:'';}else $review['basis']=$prior['basis']??'';
   foreach($review['checks'] as $key=>&$check){$oldCheck=$prior['checks'][$key]??[];if($check['rule']!==''&&!isset($rules[$check['rule']])&&($oldCheck['rule']??'')!==$check['rule'])fail(422,'Verknüpfte Governance-Regel nicht vorhanden.');
    $new=$check['reviewToken']!==''&&$check['reviewToken']!==($oldCheck['reviewToken']??'');if($new){if(!$resource&&in_array($check['state'],['met','excluded'],true))fail(422,'Für einen neuen Prüfnachweis die Ressource zuerst wieder verfügbar machen.');$expected=governanceLegalBasis($c,$a,$law,$l,$check['rule']);if($check['basis']!==''&&$check['basis']!==$expected)fail(409,'Der Legal-Kontext oder die verknüpfte Regel wurde geändert. Arbeitsgrundlage aktualisieren und den Prüfschritt erneut bestätigen.');$check['basis']=$check['basis']!==''?$expected:'';}else $check['basis']=$oldCheck['basis']??'';
   }unset($check);
  }unset($review);
 }unset($a);
}
