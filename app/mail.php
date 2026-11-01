<?php
declare(strict_types=1);
const MAIL_VARIABLES=['name','email','password','login_url','groups','role','app_name'];
function mailTemplatePurpose(string $id):string {
    return ['password-reset'=>'password_reset','password-changed'=>'password_changed'][$id]??'welcome';
}
function mailTemplateVariables(string $purpose):array {
    return match($purpose){
        'password_reset'=>['name','email','reset_url','expires_minutes','login_url','role','app_name'],
        'password_changed'=>['name','email','login_url','role','app_name'],
        default=>MAIL_VARIABLES,
    };
}
function recoveryMailDefaults():array {
    return [
        ['id'=>'password-reset','name'=>'Passwort zurücksetzen','subject'=>'Ihr Passwort zurücksetzen · {app_name}','body'=>"Guten Tag {name},\n\nfür Ihren Zugang zu {app_name} wurde ein neues Passwort angefordert.\n\nPasswort zurücksetzen:\n{reset_url}\n\nDieser Link ist {expires_minutes} Minuten gültig und kann einmal verwendet werden. Wenn Sie die Anfrage nicht gestellt haben, ignorieren Sie diese Nachricht. Ihr Passwort bleibt unverändert."],
        ['id'=>'password-changed','name'=>'Passwort geändert','subject'=>'Ihr Passwort wurde geändert · {app_name}','body'=>"Guten Tag {name},\n\nIhr Passwort für {app_name} wurde über die Passwort-Wiederherstellung geändert. Alle bisherigen Sitzungen und Wiederherstellungslinks sind jetzt ungültig.\n\nAnmelden:\n{login_url}\n\nFalls Sie diese Änderung nicht vorgenommen haben, wenden Sie sich bitte umgehend an die Kursleitung oder den Betreiber."],
    ];
}
function recoveryMailTemplate(string $purpose):array {
    foreach(recoveryMailDefaults() as $t)if(mailTemplatePurpose($t['id'])===$purpose)return one('SELECT * FROM mail_templates WHERE id=?',[$t['id']])??$t;
    throw new LogicException('Unbekannter Wiederherstellungsvorgang.');
}
function mailDefaults():array {
    $common="\n\nLogin: {login_url}\nE-Mail: {email}\nVorläufiges Passwort: {password}\n\n";
    return [
        ['name'=>'Willkommen · Du','subject'=>'Dein Zugang zu {app_name}','body'=>"Hallo {name},\n\ndein Zugang zu {app_name} ist bereit.".$common."Melde dich mit diesen Zugangsdaten an. Du kannst dein Passwort nach dem Login in deinem Profil ändern.\n\nViel Freude beim Lernen und Entwickeln!\nDein {app_name}-Team"],
        ['name'=>'Willkommen · Sie','subject'=>'Ihr Zugang zu {app_name}','body'=>"Guten Tag {name},\n\nIhr Zugang zu {app_name} ist bereit.".$common."Melden Sie sich mit diesen Zugangsdaten an. Sie können Ihr Passwort nach dem Login in Ihrem Profil ändern.\n\nWir wünschen Ihnen viel Freude beim Lernen und Entwickeln!\nIhr {app_name}-Team"]
    ];
}
function initializeMailTemplates():void {
    if(one("SELECT 1 FROM settings WHERE key='mail_templates_initialized'")&&one("SELECT 1 FROM settings WHERE key='recovery_mail_templates_initialized'"))return;
    transaction(function(){
        if(!one("SELECT 1 FROM settings WHERE key='mail_templates_initialized'")){
            foreach(mailDefaults() as $t)query('INSERT INTO mail_templates(id,name,subject,body,updated_at) VALUES(?,?,?,?,?)',[id(),$t['name'],$t['subject'],$t['body'],now()]);
            query("INSERT INTO settings VALUES('mail_templates_initialized','true')");
        }
        if(!one("SELECT 1 FROM settings WHERE key='recovery_mail_templates_initialized'")){
            foreach(recoveryMailDefaults() as $t){
                if(one('SELECT 1 FROM mail_templates WHERE id=?',[$t['id']]))continue;
                $name=$t['name'];$suffix=0;
                while(one('SELECT 1 FROM mail_templates WHERE name=? COLLATE NOCASE',[$name]))$name=$t['name'].' · System '.(++$suffix);
                query('INSERT INTO mail_templates(id,name,subject,body,updated_at) VALUES(?,?,?,?,?)',[$t['id'],$name,$t['subject'],$t['body'],now()]);
            }
            query("INSERT INTO settings VALUES('recovery_mail_templates_initialized','true')");
        }
    });
}
function mailTemplateInput(array $d,string $purpose='welcome'):array {
    $t=['name'=>textField($d,'name',100),'subject'=>textField($d,'subject',200),'body'=>textField($d,'body',12000)];
    if(preg_match('/[\r\n\x00]/',$t['subject']))fail(422,'Der Betreff muss einzeilig sein.');
    foreach(['subject','body'] as $field){preg_match_all('/\{([^{}]+)\}/u',$t[$field],$matches);foreach($matches[1] as $v)if(!in_array($v,mailTemplateVariables($purpose),true))fail(422,'Unbekannte Variable: {'.$v.'}');}
    if(str_contains($t['subject'],'{password}'))fail(422,'Das Passwort gehört in den Nachrichtentext.');
    if(str_contains($t['subject'],'{reset_url}'))fail(422,'Der Wiederherstellungslink gehört in den Nachrichtentext.');
    $required=match($purpose){'password_reset'=>['reset_url','expires_minutes'],'password_changed'=>[],default=>['password','email','login_url']};
    foreach($required as $v)if(!str_contains($t['body'],'{'.$v.'}'))fail(422,'Im Nachrichtentext fehlt {'.$v.'}.');
    return $t;
}
function renderMailTemplate(array $template,array $variables):array {
    $values=[];foreach(array_unique([...MAIL_VARIABLES,'reset_url','expires_minutes']) as $name)$values['{'.$name.'}']=(string)($variables[$name]??'');
    $subject=str_replace(["\r","\n","\0"],' ',strtr($template['subject'],$values));$text=strtr($template['body'],$values);
    $htmlValues=array_map(static fn($value)=>htmlspecialchars($value,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8'),$values);
    foreach(['login_url','reset_url'] as $link){$url=(string)($variables[$link]??'');if(filter_var($url,FILTER_VALIDATE_URL)&&in_array(parse_url($url,PHP_URL_SCHEME),['https','http'],true)){$escaped=$htmlValues['{'.$link.'}'];$htmlValues['{'.$link.'}']='<a href="'.$escaped.'" style="color:#b2026c">'.$escaped.'</a>';}}
    $html='<div style="font-family:Arial,sans-serif;line-height:1.6;color:#191c1b;max-width:640px"><div style="border-top:4px solid #b2026c;padding-top:24px">'.nl2br(strtr(htmlspecialchars($template['body'],ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8'),$htmlValues)).'</div></div>';
    return ['Subject'=>$subject,'TextPart'=>$text,'HTMLPart'=>$html];
}
function mailConfig():array{return settings()['mailjet']??['enabled'=>false,'version'=>0,'sender_email'=>'','sender_name'=>'Entrosphere Developer','app_url'=>'','api_key'=>'','api_secret'=>''];}
function publicMailConfig():array{$c=mailConfig();return ['enabled'=>(bool)$c['enabled'],'version'=>$c['version'],'sender_email'=>$c['sender_email'],'sender_name'=>$c['sender_name'],'app_url'=>$c['app_url'],'has_keys'=>!empty($c['api_key'])&&!empty($c['api_secret']),'curl'=>extension_loaded('curl')];}
function saveMailConfig(array $u,array $d):void {
    transaction(function()use($u,$d){$c=mailConfig();if(!is_int($d['version']??null)||$d['version']!==$c['version'])fail(409,'Die Verbindung wurde inzwischen geändert. Bitte neu laden.');
        if(!is_bool($d['enabled']??null))fail(422,'Bitte den Versandstatus prüfen.');
        $email=emailField(['email'=>$d['sender_email']??'']);$name=textField($d,'sender_name',120);$url=rtrim(textField($d,'app_url',500),'/');$parts=parse_url($url);
        if(!filter_var($url,FILTER_VALIDATE_URL)||!$parts||empty($parts['host'])||isset($parts['user'])||isset($parts['pass'])||isset($parts['query'])||isset($parts['fragment'])||($parts['path']??'')!==''||!(($parts['scheme']??'')==='https'||(config()['environment']==='development'&&($parts['scheme']??'')==='http'&&in_array($parts['host'],['localhost','127.0.0.1'],true))))fail(422,'Bitte die HTTPS-Adresse der Anwendung ohne Unterpfad angeben.');
        $key=textField($d,'api_key',200,false);$secret=textField($d,'api_secret',200,false);
        if($key!==''||$secret!==''){if(!preg_match('/^[a-zA-Z0-9_-]{16,200}$/',$key)||!preg_match('/^[a-zA-Z0-9_-]{16,200}$/',$secret))fail(422,'Bitte API-Key und Secret-Key gemeinsam eingeben.');$c['api_key']=encryptSecret($key);$c['api_secret']=encryptSecret($secret);}
        if($d['enabled']&&(empty($c['api_key'])||empty($c['api_secret'])||!extension_loaded('curl')))fail(422,'Für den Versand werden beide Mailjet-Schlüssel und PHP-cURL benötigt.');
        $c=array_merge($c,['enabled'=>$d['enabled'],'version'=>$c['version']+1,'sender_email'=>$email,'sender_name'=>$name,'app_url'=>$url]);
        query("INSERT INTO settings VALUES('mailjet',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",[json_encode($c)]);audit($u['id'],'admin.mailjet.save');
    });
}
function mailjetSend(array $config,array $message,bool $sandbox=false,?callable $transport=null):array {
    $message['From']=['Email'=>$config['sender_email'],'Name'=>$config['sender_name']];$payload=['Messages'=>[$message]];if($sandbox)$payload['SandboxMode']=true;
    try {
        if($transport){[$status,$body]=$transport($payload);}else{
            if(!extension_loaded('curl'))return ['status'=>'failed','message'=>'PHP-cURL ist auf dem Server nicht verfügbar.'];
            $handle=curl_init('https://api.mailjet.com/v3.1/send');$body='';
            curl_setopt_array($handle,[CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>json_encode($payload,JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE),CURLOPT_HTTPHEADER=>['Content-Type: application/json'],CURLOPT_HTTPAUTH=>CURLAUTH_BASIC,CURLOPT_USERPWD=>decryptSecret($config['api_key']).':'.decryptSecret($config['api_secret']),CURLOPT_CONNECTTIMEOUT=>4,CURLOPT_TIMEOUT=>12,CURLOPT_FOLLOWLOCATION=>false,(defined('CURLOPT_PROTOCOLS_STR')?CURLOPT_PROTOCOLS_STR:CURLOPT_PROTOCOLS)=>(defined('CURLOPT_PROTOCOLS_STR')?'https':CURLPROTO_HTTPS),CURLOPT_SSL_VERIFYPEER=>true,CURLOPT_SSL_VERIFYHOST=>2,CURLOPT_WRITEFUNCTION=>static function($ch,$chunk)use(&$body){if(strlen($body)+strlen($chunk)>65536)return 0;$body.=$chunk;return strlen($chunk);}]);
            $ok=curl_exec($handle);$status=(int)curl_getinfo($handle,CURLINFO_HTTP_CODE);curl_close($handle);
            if($ok===false)return ['status'=>'uncertain','message'=>'Keine eindeutige Antwort von Mailjet. Vor erneutem Versand bitte in Mailjet prüfen.'];
        }
        $reply=json_decode($body,true);
        if($status>=200&&$status<300&&($reply['Messages'][0]['Status']??'')==='success')return ['status'=>'sent','message'=>$sandbox?'Verbindung und Absender von Mailjet bestätigt.':'Von Mailjet zum Versand angenommen.'];
        if($status>=400&&$status<500)return ['status'=>'failed','message'=>'Mailjet hat die Anfrage abgelehnt (HTTP '.$status.'). Bitte Schlüssel, Absender und Versandlimit prüfen.'];
        if($status>=200&&$status<300&&($reply['Messages'][0]['Status']??'')==='error')return ['status'=>'failed','message'=>'Mailjet hat die Nachricht abgelehnt. Bitte den bestätigten Absender und die Verbindung prüfen.'];
        return ['status'=>'uncertain','message'=>'Mailjet hat den Versand nicht eindeutig bestätigt. Vor erneutem Versand bitte in Mailjet prüfen.'];
    }catch(Throwable $e){return ['status'=>'uncertain','message'=>'Der Versand konnte nicht eindeutig bestätigt werden. Bitte die Verbindung und Mailjet prüfen.'];}
}
function prepareWelcome(array $data,string $name,string $email,string $role,bool $active,string $pass,array $groups):?array {
    $tid=textField($data,'mail_template',32,false);if($tid==='')return null;
    if(mailTemplatePurpose($tid)!=='welcome')fail(422,'Bitte eine Vorlage für Zugangsmails auswählen.');
    if(!$active)fail(422,'Zugangsmails sind nur für aktive Benutzer möglich.');$c=mailConfig();if(!$c['enabled']||empty($c['api_key'])||empty($c['api_secret'])||!extension_loaded('curl'))fail(422,'Bitte zuerst Mailjet einrichten und den Versand aktivieren.');
    initializeMailTemplates();$t=one('SELECT * FROM mail_templates WHERE id=?',[$tid]);if(!$t)fail(422,'Die Mailvorlage existiert nicht mehr.');
    $request=textField($data,'creation_token',36);if(!preg_match('/^[a-f0-9-]{36}$/i',$request))fail(422,'Ungültiger Anlegevorgang. Bitte den Dialog neu öffnen.');
    $names=[];foreach($groups as $gid){$g=one('SELECT name FROM groups WHERE id=?',[$gid]);if($g)$names[]=$g['name'];}
    $mail=renderMailTemplate($t,['name'=>$name,'email'=>$email,'password'=>$pass,'login_url'=>$c['app_url'].($role==='admin'?'/admin/':'/'),'groups'=>implode(', ',$names),'role'=>['user'=>'Lernender','teacher'=>'Lehrer','admin'=>'Administrator'][$role],'app_name'=>'Entrosphere Developer']);
    return ['id'=>id(),'request'=>$request,'template_name'=>$t['name'],'message'=>['To'=>[['Email'=>$email,'Name'=>$name]],...$mail]];
}
function queueWelcome(array $mail,string $uid,array $admin,string $email):void {
    query('INSERT INTO welcome_mails(id,user_id,created_by,request_key,recipient,template_name,auth_version,payload,status,created_at,updated_at) VALUES(?,?,?,?,?,?,1,?,\'pending\',?,?)',[$mail['id'],$uid,$admin['id'],$mail['request'],$email,$mail['template_name'],encryptSecret(json_encode($mail['message'],JSON_THROW_ON_ERROR)),now(),now()]);
}
function cleanWelcomeMails():void {
    query("UPDATE welcome_mails SET status='expired',payload=NULL,error='Die Zugangsmail ist abgelaufen. Bitte neue Zugangsdaten festlegen.',updated_at=? WHERE payload IS NOT NULL AND created_at<?",[now(),gmdate('Y-m-d\TH:i:s\Z',time()-86400)]);
    query("UPDATE welcome_mails SET status='uncertain',error='Der Versand wurde unterbrochen. Vor erneutem Versand bitte in Mailjet prüfen.',updated_at=? WHERE status='sending' AND updated_at<?",[now(),gmdate('Y-m-d\TH:i:s\Z',time()-120)]);
    query("UPDATE welcome_mails SET status='cancelled',payload=NULL,error='Der Zugang wurde inzwischen geändert. Diese Zugangsmail wird nicht mehr versendet.',updated_at=? WHERE payload IS NOT NULL AND EXISTS(SELECT 1 FROM users u WHERE u.id=welcome_mails.user_id AND (u.auth_version!=welcome_mails.auth_version OR u.active=0 OR u.email!=welcome_mails.recipient))",[now()]);
}
function welcomeStatus(string $id):array {
    $row=one('SELECT id,status,error FROM welcome_mails WHERE id=?',[$id]);return $row?['id'=>$id,'status'=>$row['status'],'message'=>$row['error']]:['status'=>'cancelled','message'=>'Der Benutzer existiert nicht mehr.'];
}
function deliverWelcome(string $id,array $admin,bool $retry=false,?callable $transport=null):array {
    cleanWelcomeMails();$c=mailConfig();if(!$c['enabled']){ $current=welcomeStatus($id);if(in_array($current['status'],['sent','cancelled','expired','sending'],true))return $current;return ['id'=>$id,'status'=>$current['status'],'message'=>'Der Mailversand ist deaktiviert. Die Zugangsmail bleibt vorbereitet.'];}
    $job=transaction(function()use($id,$admin,$retry){$job=one('SELECT * FROM welcome_mails WHERE id=?',[$id]);if(!$job)fail(404,'Zugangsmail nicht gefunden.');$allowed=$retry?['pending','failed','uncertain']:['pending'];if(!in_array($job['status'],$allowed,true))return null;if(!$job['payload'])return null;query("UPDATE welcome_mails SET status='sending',updated_at=? WHERE id=?",[now(),$id]);audit($admin['id'],'admin.mail.send',['mail'=>$id,'retry'=>$retry]);return $job;});
    if(!$job)return welcomeStatus($id);
    if(session_status()===PHP_SESSION_ACTIVE)session_write_close();
    try{$message=json_decode(decryptSecret($job['payload']),true,512,JSON_THROW_ON_ERROR);$result=mailjetSend($c,$message,false,$transport);}catch(Throwable $e){$result=['status'=>'failed','message'=>'Die vorbereitete Zugangsmail konnte nicht entschlüsselt werden.'];}
    query('UPDATE welcome_mails SET status=?,error=?,payload=CASE WHEN ?=\'sent\' THEN NULL ELSE payload END,updated_at=? WHERE id=? AND status=\'sending\'',[$result['status'],$result['message'],$result['status'],now(),$id]);return welcomeStatus($id);
}
