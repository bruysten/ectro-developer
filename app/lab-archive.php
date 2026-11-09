<?php
declare(strict_types=1);

function archiveValidate(array $c):array {
    $documents=[];$ids=[];$total=0;
    foreach(labList($c['documents']??[],50) as $raw){
        $d=studioRecord($raw);$id=studioText($d['id']??null,64);
        if(!preg_match('/^[a-zA-Z0-9_-]{1,64}$/D',$id)||isset($ids[$id]))fail(422,'Dokumentkennungen müssen gültig und eindeutig sein.');$ids[$id]=true;
        $out=['id'=>$id];foreach(['title'=>180,'filename'=>180,'text'=>12000,'owner'=>120,'source'=>500,'date'=>10,'note'=>2000] as $key=>$max)$out[$key]=studioText($d[$key]??'',$max);
        if($out['date']!==''){$date=DateTimeImmutable::createFromFormat('!Y-m-d',$out['date']);if(!$date||$date->format('Y-m-d')!==$out['date']||substr($out['date'],0,4)==='0000')fail(422,'Bitte ein gültiges Datum verwenden.');}
        $out['tags']=[];foreach(labList($d['tags']??[],12) as $tag){$tag=trim(studioText($tag,50));if($tag===''||in_array(mb_strtolower($tag),array_map('mb_strtolower',$out['tags']),true))fail(422,'Schlagwörter müssen ausgefüllt und eindeutig sein.');$out['tags'][]=$tag;}
        $out['status']=studioEnum($d['status']??'draft',['current','draft','superseded']);
        $out['classification']=studioEnum($d['classification']??'unknown',['unknown','public','internal','confidential']);
        if(isset($d['extraction'])){
            $x=studioRecord($d['extraction']);$mode=studioEnum($x['mode']??null,['text','ocr','mixed']);$language=studioEnum($x['language']??null,['deu','eng','deu+eng']);$pages=$x['pages']??0;if(!is_int($pages)||$pages<1||$pages>30)fail(422,'Ungültige Seitenzahl der Texterkennung.');$scanned=[];
            foreach(labList($x['ocrPages']??[],30) as $page){if(!is_int($page)||$page<1||$page>$pages||in_array($page,$scanned,true))fail(422,'Ungültige OCR-Seiten.');$scanned[]=$page;}sort($scanned);
            if(($mode==='text'&&$scanned)||($mode==='ocr'&&count($scanned)!==$pages)||($mode==='mixed'&&(!$scanned||count($scanned)===$pages)))fail(422,'Die Erkennungsart passt nicht zu den Seiten.');
            $confidence=$x['confidence']??null;if($confidence!==null&&(!is_int($confidence)||$confidence<0||$confidence>100))fail(422,'Ungültige OCR-Erkennungsqualität.');if(!$scanned&&$confidence!==null)fail(422,'Eine Textebene hat keine OCR-Erkennungsqualität.');
            $out['extraction']=['mode'=>$mode,'language'=>$language,'pages'=>$pages,'ocrPages'=>$scanned,'confidence'=>$confidence];
        }
        $total+=mb_strlen($out['text']);if($total>200000)fail(422,'Ein Archiv darf insgesamt höchstens 200.000 Textzeichen enthalten.');$documents[]=$out;
    }
    return ['documents'=>$documents];
}
