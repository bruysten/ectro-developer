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
        $total+=mb_strlen($out['text']);if($total>200000)fail(422,'Ein Archiv darf insgesamt höchstens 200.000 Textzeichen enthalten.');$documents[]=$out;
    }
    return ['documents'=>$documents];
}
