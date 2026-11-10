<?php
declare(strict_types=1);

function mcpConsentQuery(array $r):array {
    return ['client_id'=>$r['client_id'],'redirect_uri'=>$r['redirect'],'response_type'=>'code','code_challenge_method'=>'S256','code_challenge'=>$r['challenge'],'resource'=>$r['resource'],'scope'=>$r['scope'],'state'=>$r['state']];
}
function mcpConsentFind(mixed $nonce):?array {
    if(!is_string($nonce)||!preg_match('/^[a-f0-9]{32}$/D',$nonce))return null;
    return one('SELECT * FROM mcp_oauth_consents WHERE hash=? AND created>?',[hash('sha256',$nonce),time()-3600])?:null;
}
function mcpConsentPayload(array $row):array {
    return json_decode(decryptSecret($row['payload']),true,32,JSON_THROW_ON_ERROR);
}
function mcpConsentStart(array $u,array $request,array $profile):string {
    return transaction(function()use($u,$request,$profile){
        query('DELETE FROM mcp_oauth_consents WHERE created<?',[time()-3600]);
        $fingerprint=hash('sha256',labJson($request));
        $existing=one('SELECT * FROM mcp_oauth_consents WHERE user_id=? AND fingerprint=? AND profile_version=? AND auth_version=? AND completed=0 AND expires>? ORDER BY created DESC LIMIT 1',[$u['id'],$fingerprint,$profile['version'],$u['auth_version'],time()+15]);
        if($existing)return mcpConsentPayload($existing)['nonce'];
        if((int)query('SELECT COUNT(*) FROM mcp_oauth_consents WHERE user_id=?',[$u['id']])->fetchColumn()>=100)fail(429,'Zu viele Verbindungsversuche. Bitte später erneut versuchen.');
        $nonce=id();query('INSERT INTO mcp_oauth_consents(hash,user_id,profile_version,auth_version,fingerprint,payload,created,expires) VALUES(?,?,?,?,?,?,?,?)',[hash('sha256',$nonce),$u['id'],$profile['version'],$u['auth_version'],$fingerprint,encryptSecret(labJson(['nonce'=>$nonce,'request'=>$request])),time(),time()+1200]);return $nonce;
    });
}
// Older, still-open consent pages can finish after an application upgrade.
function mcpConsentImportLegacy(array $u,string $nonce):void {
    if(mcpConsentFind($nonce))return;$old=$_SESSION['mcp_consent'][$nonce]??null;
    if(!$old||$old['user']!==$u['id']||$old['auth_version']!==(int)$u['auth_version'])return;
    $request=mcpOAuthRequest(mcpConsentQuery($old['request']));
    query('INSERT OR IGNORE INTO mcp_oauth_consents(hash,user_id,profile_version,auth_version,fingerprint,payload,created,expires) VALUES(?,?,?,?,?,?,?,?)',[hash('sha256',$nonce),$u['id'],$old['version'],$old['auth_version'],hash('sha256',labJson($request)),encryptSecret(labJson(['nonce'=>$nonce,'request'=>$request])),time(),$old['expires']]);
    unset($_SESSION['mcp_consent'][$nonce]);
}
function mcpConsentFinish(array $u,string $nonce,string $decision,bool $write):array {
    if(!in_array($decision,['allow','deny'],true))fail(422,'Bitte Verbinden oder Abbrechen wählen.');
    return transaction(function()use($u,$nonce,$decision,$write){
        $row=mcpConsentFind($nonce);
        if(!$row||$row['user_id']!==$u['id']||(int)$row['auth_version']!==(int)$u['auth_version'])fail(403,'Dieses Verbindungsfenster ist nicht mehr verfügbar. Bitte im KI-Client erneut auf Connect oder Verbinden klicken.');
        $request=mcpOAuthRequest(mcpConsentQuery(mcpConsentPayload($row)['request']));
        if($row['completed'])return ['done'=>true,'approved'=>(int)$row['completed']===1,'request'=>$request];
        $params=['state'=>$request['state'],'iss'=>mcpOAuthBase()];
        if($decision==='deny')$params['error']='access_denied';
        else{
            if((int)$row['expires']<=time()||(int)agentMcpProfile($u)['version']!==(int)$row['profile_version'])return ['retry'=>true];
            if(!$write)$request['scope']='db:read';
            $params['code']=mcpOAuthCode($u,$request,(int)$row['profile_version']);
        }
        // Issue the code and consume the consent in one transaction. A repeated POST cannot issue another code.
        query('UPDATE mcp_oauth_consents SET completed=? WHERE hash=?',[$decision==='allow'?1:2,$row['hash']]);
        return ['redirect'=>$request['redirect'].'?'.http_build_query($params)];
    });
}
function mcpConsentContinue(array $query,bool $hasSession):never {
    $fields='';foreach($query as $k=>$v)$fields.='<input type="hidden" name="'.htmlspecialchars($k,ENT_QUOTES,'UTF-8').'" value="'.htmlspecialchars($v,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8').'">';
    mcpOAuthConsentPage('Mit Academy verbinden','<p>Mit dem eigenen Academy-Konto fortfahren und anschließend die Datenauswahl bestätigen.</p><form method="get" action="/oauth/authorize/">'.$fields.'<button class="es-btn es-btn--primary">'.($hasSession?'Nach Anmeldung fortfahren':'Mit Academy fortfahren').'</button></form><p><a href="/#agent-lab" target="_blank" rel="noopener">Academy-Anmeldung öffnen</a></p>');
}
function mcpConsentClient(array $request):string {
    return parse_url($request['redirect'],PHP_URL_HOST)==='chatgpt.com'?'https://chatgpt.com/':'https://claude.ai/';
}

function mcpConsentCompletePage(array $request,bool $approved):never {
    $message=$approved?'Die Freigabe wurde bereits gesendet. Im KI-Client fortfahren. Falls die Verbindung dort noch offen ist, erneut Connect oder Verbinden wählen.':'Dieser Verbindungsversuch wurde abgebrochen. Für einen neuen Versuch im KI-Client erneut Connect oder Verbinden wählen.';
    mcpOAuthConsentPage($approved?'Freigabe bereits bestätigt':'Verbindung abgebrochen','<p>'.$message.'</p><p><a class="es-btn es-btn--primary" href="'.mcpConsentClient($request).'">Zurück zum KI-Client</a></p>');
}
