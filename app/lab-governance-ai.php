<?php
declare(strict_types=1);
function governanceAiRating(mixed $raw):array {
 $a=studioRecord($raw);$out=['level'=>studioEnum($a['level']??'unknown',['unknown','none','planned','pilot','managed','proven']),'evidence'=>studioText($a['evidence']??'',2000),'reviewedOn'=>govDate($a['reviewedOn']??'')];
 if($out['reviewedOn']>gmdate('Y-m-d'))fail(422,'Bewertungsdatum liegt in der Zukunft.');
 if($out['level']==='proven'&&(!trim($out['evidence'])||!$out['reviewedOn']))fail(422,'Nachweisliche Wirksamkeit benötigt einen Beleg und ein Datum.');return $out;
}
function governanceAiAnswers(mixed $raw):array {
 $answers=studioRecord($raw);$ids=array_column(governanceCatalog()['ai'],'id');if(array_diff(array_keys($answers),$ids))fail(422,'Unbekannte AI-Readiness-Frage.');$out=[];
 foreach($answers as $key=>$rawAnswer){$a=studioRecord($rawAnswer);$value=governanceAiRating($a);$value['basis']=studioEnum($a['basis']??'overall',['overall','resources']);$value['assessments']=[];$used=[];
  foreach(govUniqueRows($a['assessments']??[],100) as $r){$scope=govScope($r['scope']??null);if($scope['type']==='organization')fail(422,'Einen konkreten Datenbestand, Datenfluss oder ein System wählen.');$ref=$scope['type'].':'.$scope['id'];if(isset($used[$ref]))fail(422,'Eine Ressource je Dimension nur einmal bewerten.');$used[$ref]=true;$value['assessments'][]=['id'=>$r['id'],'scope'=>$scope,'label'=>studioText($r['label']??'',180),...governanceAiRating($r)];}
  $out[$key]=$value;
 }return $out;
}
