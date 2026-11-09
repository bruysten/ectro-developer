<?php
/** Public, user-requested page import. Every redirect is resolved and pinned separately. */
declare(strict_types=1);
function geoIpIn(string $ip,string $network,int $bits):bool {
    $a=inet_pton($ip);$b=inet_pton($network);if($a===false||$b===false||strlen($a)!==strlen($b))return false;
    $bytes=intdiv($bits,8);$rest=$bits%8;return substr($a,0,$bytes)===substr($b,0,$bytes)&&(!$rest||((ord($a[$bytes])& (255<<(8-$rest)))===(ord($b[$bytes])&(255<<(8-$rest)))));
}
function geoPublicIp(string $ip):bool {
    if(filter_var($ip,FILTER_VALIDATE_IP,FILTER_FLAG_IPV4)){
        foreach(['0.0.0.0/8','10.0.0.0/8','100.64.0.0/10','127.0.0.0/8','169.254.0.0/16','172.16.0.0/12','192.0.0.0/24','192.0.2.0/24','192.88.99.0/24','192.168.0.0/16','198.18.0.0/15','198.51.100.0/24','203.0.113.0/24','224.0.0.0/4','240.0.0.0/4'] as $range){[$net,$bits]=explode('/',$range);if(geoIpIn($ip,$net,(int)$bits))return false;}return true;
    }
    if(!filter_var($ip,FILTER_VALIDATE_IP,FILTER_FLAG_IPV6)||!geoIpIn($ip,'2000::',3))return false;
    foreach(['2001::/23','2001:db8::/32','2002::/16','3fff::/20'] as $range){[$net,$bits]=explode('/',$range);if(geoIpIn($ip,$net,(int)$bits))return false;}return true;
}
function geoFetchTarget(string $url,?callable $resolver=null):array {
    if(strlen($url)>1600||preg_match('/[\x00-\x20\x7f<>"\\\\]/',$url))fail(422,'Bitte eine öffentliche HTTPS-Adresse ohne Leerzeichen verwenden.');$p=parse_url($url);
    if(!is_array($p)||strtolower($p['scheme']??'')!=='https'||isset($p['user'])||isset($p['pass'])||(isset($p['port'])&&$p['port']!==443))fail(422,'Nur öffentliche HTTPS-Seiten auf Port 443 können geladen werden.');
    $host=strtolower($p['host']??'');if(strlen($host)>253||!preg_match('/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{1,62}$/D',$host)||preg_match('/\.(?:localhost|local|internal|test|invalid|example)$/D',$host))fail(422,'Lokale Adressen und IP-Adressen können nicht geladen werden.');
    $resolver??=static function($host){$ips=[];foreach(@dns_get_record($host,DNS_A|DNS_AAAA)?:[] as $r)if(isset($r['ip'])||isset($r['ipv6']))$ips[]=$r['ip']??$r['ipv6'];return $ips;};$ips=$resolver($host);
    if(!is_array($ips)||!$ips)fail(503,'Die öffentliche Adresse konnte nicht aufgelöst werden.');foreach($ips as $ip)if(!is_string($ip)||!geoPublicIp($ip))fail(403,'Die Adresse verweist auf ein nicht öffentliches Netz.');
    return ['url'=>'https://'.$host.($p['path']??'/').(isset($p['query'])?'?'.$p['query']:''),'host'=>$host,'ips'=>array_values(array_unique($ips))];
}
function geoRedirect(string $base,string $location):string {
    $location=trim($location);if($location==='')fail(502,'Das Weiterleitungsziel fehlt.');if(preg_match('~^[a-z][a-z0-9+.-]*:~i',$location))return $location;if(str_starts_with($location,'//'))return 'https:'.$location;
    $p=parse_url($base);$origin='https://'.$p['host'];if(str_starts_with($location,'#'))return $base;if(str_starts_with($location,'?'))return $origin.($p['path']??'/').$location;
    $path=str_starts_with($location,'/')?$location:substr($p['path']??'/',0,strrpos($p['path']??'/','/')+1).$location;$parts=explode('?',explode('#',$path,2)[0],2);$out=[];foreach(explode('/',$parts[0]) as $seg){if($seg==='..'){if(count($out)>1)array_pop($out);continue;}if($seg==='.')continue;$out[]=$seg;}if(preg_match('~/(?:\.|\.\.)$~',$parts[0]))$out[]='';return $origin.implode('/',$out).(isset($parts[1])?'?'.$parts[1]:'');
}
function geoCurlPage(array $target,int $limit,float $remaining):array {
    if(!extension_loaded('curl'))fail(503,'Für den Seitenabruf fehlt die PHP-cURL-Erweiterung.');$body='';$headers=[];$headerBytes=0;$tooLarge=false;$ip=$target['ips'][0];$ch=curl_init($target['url']);
    curl_setopt_array($ch,[CURLOPT_PROXY=>'',CURLOPT_NETRC=>CURL_NETRC_IGNORED,CURLOPT_FOLLOWLOCATION=>false,CURLOPT_PROTOCOLS=>CURLPROTO_HTTPS,CURLOPT_SSL_VERIFYPEER=>true,CURLOPT_SSL_VERIFYHOST=>2,CURLOPT_CONNECTTIMEOUT_MS=>min(3000,(int)($remaining*1000)),CURLOPT_TIMEOUT_MS=>max(1,(int)($remaining*1000)),CURLOPT_RESOLVE=>[$target['host'].':443:'.(str_contains($ip,':')?'['.$ip.']':$ip)],CURLOPT_USERAGENT=>'Entrosphere-Learning-Lab/1.0 (user-requested page analysis)',CURLOPT_HTTPHEADER=>['Accept: text/html, application/xhtml+xml, text/plain'],CURLOPT_ENCODING=>'',CURLOPT_HEADERFUNCTION=>static function($h,$line)use(&$headers,&$headerBytes,&$tooLarge){$headerBytes+=strlen($line);if($headerBytes>32768){$tooLarge=true;return 0;}if(str_starts_with($line,'HTTP/'))$headers=[];elseif(str_contains($line,':')){[$k,$v]=explode(':',$line,2);$k=strtolower(trim($k));$headers[$k]=isset($headers[$k])?$headers[$k].', '.trim($v):trim($v);}return strlen($line);},CURLOPT_WRITEFUNCTION=>static function($h,$part)use(&$body,&$tooLarge,$limit){if(strlen($body)+strlen($part)>$limit){$tooLarge=true;return 0;}$body.=$part;return strlen($part);}]);
    $ok=curl_exec($ch);$status=(int)curl_getinfo($ch,CURLINFO_HTTP_CODE);unset($ch);if($ok===false)fail(502,$tooLarge||strlen($body)>=$limit?'Die Seite überschreitet die Abrufgrenze. Bitte einen Textauszug einfügen.':'Die Seite konnte nicht vollständig geladen werden. Alternativ HTML oder Text einfügen.');return ['status'=>$status,'headers'=>$headers,'body'=>$body];
}
function geoFetchPage(string $url,int $limit=524288,?callable $resolver=null,?callable $transport=null,float $seconds=18):array {
    $deadline=microtime(true)+$seconds;$seen=[];$transport??='geoCurlPage';
    for($hop=0;$hop<=3;$hop++){$target=geoFetchTarget($url,$resolver);if(isset($seen[$target['url']]))fail(502,'Die Seite leitet im Kreis weiter.');$seen[$target['url']]=true;$remaining=$deadline-microtime(true);if($remaining<=0)fail(504,'Der Seitenabruf dauert zu lange.');$r=$transport($target,$limit,$remaining);if(strlen($r['body'])>$limit||strlen(json_encode($r['headers']))>32768)fail(413,'Die Antwort überschreitet die Abrufgrenze.');
        if(in_array($r['status'],[301,302,303,307,308],true)){$url=geoRedirect($target['url'],$r['headers']['location']??'');continue;}return [...$r,'url'=>$target['url']];
    }fail(502,'Zu viele Weiterleitungen. Bitte die Zieladresse direkt verwenden.');
}
function geoFetchDocument(string $url,?callable $resolver=null,?callable $transport=null):array {
    $r=geoFetchPage($url,524288,$resolver,$transport);if($r['status']!==200)fail(422,'Die Seite antwortet mit HTTP '.$r['status'].'. Bitte einen Textauszug einfügen.');$type=strtolower(explode(';',$r['headers']['content-type']??'')[0]);if(!in_array($type,['text/html','application/xhtml+xml','text/plain'],true))fail(422,'Bitte eine HTML- oder Textseite verwenden.');$body=$r['body'];
    if(!mb_check_encoding($body,'UTF-8')){preg_match('/charset\s*=\s*["\']?([a-z0-9_-]+)/i',$r['headers']['content-type']??'',$m);$enc=strtolower($m[1]??'');if(!in_array($enc,['iso-8859-1','windows-1252'],true))fail(422,'Die Zeichenkodierung ist nicht lesbar. Bitte UTF-8-Text einfügen.');$body=mb_convert_encoding($body,'UTF-8',$enc);}
    $format=$type==='text/plain'?'text':'html';if(mb_strlen($body)>($format==='html'?300000:50000))fail(413,'Die Seite ist zu groß. Bitte einen passenden Textauszug einfügen.');$robotsStatus='unknown';$robotsText='';try{$rr=geoFetchPage('https://'.parse_url($r['url'],PHP_URL_HOST).'/robots.txt',50000,$resolver,$transport,6);if($rr['status']===404)$robotsStatus='missing';elseif($rr['status']===200&&str_starts_with(strtolower($rr['headers']['content-type']??''),'text/plain')&&mb_check_encoding($rr['body'],'UTF-8')){$robotsStatus='ok';$robotsText=$rr['body'];}}catch(ApiError){}
    $doc=['format'=>$format,'url'=>$r['url'],'body'=>$body,'title'=>'','description'=>'','snapshot'=>['status'=>200,'fetchedAt'=>gmdate('c'),'robotsHeader'=>mb_substr($r['headers']['x-robots-tag']??'',0,2000),'robotsText'=>$robotsText,'robotsStatus'=>$robotsStatus,'finalUrl'=>$r['url']]];return ['document'=>$doc,'analysis'=>geoInspect($doc)];
}
