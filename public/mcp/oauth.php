<?php
declare(strict_types=1);
require_once __DIR__.'/../../app/bootstrap.php';require_once __DIR__.'/../../app/templates.php';require_once __DIR__.'/../../app/mysql.php';require_once __DIR__.'/../../app/lab-api.php';
secureHeaders();header('Cache-Control: no-store');$_SERVER['HTTP_X_WORKSPACE_PORTAL']='frontend';
$recoveryHref=null;$req=null;
try{
    $base=mcpOAuthBase();if(config()['environment']!=='development'&&(!isset($_SERVER['HTTPS'])||$_SERVER['HTTPS']==='off'))fail(403,'HTTPS erforderlich.');$route=parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH);$method=$_SERVER['REQUEST_METHOD'];
    if(str_starts_with($route,'/.well-known/')){if($method!=='GET')fail(405,'GET erforderlich.');jsonOut(mcpOAuthMetadata(str_contains($route,'oauth-protected-resource')));}
    if($route==='/oauth/authorize/'||$route==='/oauth/authorize'){
        if($method==='POST'&&(int)($_SERVER['CONTENT_LENGTH']??0)>16000)fail(413,'Anfrage zu groß.');
        $escape=fn($v)=>htmlspecialchars((string)$v,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');
        if($method==='GET'){
            $resume=$_GET['resume']??null;$row=null;
            if($resume!==null){$row=mcpConsentFind($resume);if(!$row)fail(403,'Dieses Verbindungsfenster ist nicht mehr verfügbar. Bitte im KI-Client erneut auf Connect oder Verbinden klicken.');$req=mcpOAuthRequest(mcpConsentQuery(mcpConsentPayload($row)['request']));$query=['resume'=>$resume];}
            else{$req=mcpOAuthRequest($_GET);$query=mcpConsentQuery($req);}
            // SameSite=Strict omits the Academy cookie on the first visit from Claude/ChatGPT.
            // Do not create a new anonymous session here: it would overwrite the existing login cookie.
            if(empty($_COOKIE['ectro_session']))mcpConsentContinue($query,false);
            sessionStart();$u=currentUser();if(!$u)mcpConsentContinue($query,true);
            if($row&&($row['user_id']!==$u['id']||(int)$row['auth_version']!==(int)$u['auth_version']))fail(403,'Dieses Fenster gehört zu einer früheren oder anderen Anmeldung. Bitte im KI-Client erneut verbinden.');
            if($row&&$row['completed'])mcpConsentCompletePage($req,(int)$row['completed']===1);
            $p=mcpOAuthUserProfile($u);$nonce=mcpConsentStart($u,$req,$p);$recoveryHref='/oauth/authorize/?resume='.$nonce;
            $tables='';foreach(json_decode($p['selection'],true) as $table=>$cols)$tables.='<li><strong>'.$escape($table).'</strong><br>'.$escape(implode(', ',$cols)).'</li>';
            $writeRequested=str_contains($req['scope'],'db:write')&&features($u)['mcp_write']&&agentMcpWrites($p);$writeList='';foreach(agentMcpWrites($p) as $table=>$write)$writeList.='<li><strong>'.$escape($table).'</strong> · '.$escape(implode(', ',$write['columns'])).' · '.($write['insert']?'Anlegen ':'').($write['update']?'Ändern':'').'</li>';$writeConsent=$writeRequested?'<div class="agent-oauth-write"><label><input type="checkbox" name="write_access" value="yes"> <strong>Auch Schreibzugriff erlauben</strong></label><ul>'.$writeList.'</ul><p>Nur einzelne Datensätze nach Änderungsvorschau. Kein Löschen und keine freien SQL-Befehle.</p></div>':'';
            $clientHost=parse_url($req['redirect'],PHP_URL_HOST);mcpOAuthConsentPage('Datenzugriff freigeben',($resume!==null?'<p class="notice" role="status">Bitte die aktuelle Auswahl erneut prüfen und bestätigen.</p>':'').'<p><strong>'.$escape($clientHost).'</strong> möchte auf die freigegebenen Daten von <strong>'.$escape($u['name']).'</strong> zugreifen.</p><p>Lesen · maximal '.(int)$p['max_rows'].' Zeilen je Aufruf · keine SQL-Befehle</p><ul>'.$tables.'</ul><p>Im Agent Lab kann diese Verbindung jederzeit abgeschaltet werden. Eine Änderung der Tabellenfreigabe widerruft die Verbindung.</p><form method="post" action="/oauth/authorize/" data-mcp-consent><input type="hidden" name="csrf" value="'.$escape($_SESSION['csrf']).'"><input type="hidden" name="nonce" value="'.$nonce.'">'.$writeConsent.'<button class="es-btn es-btn--primary" name="decision" value="allow">Verbinden & freigeben</button><button class="es-btn es-btn--secondary" name="decision" value="deny">Abbrechen</button></form>',$req['redirect']);
        }
        if($method!=='POST')fail(405,'Methode nicht erlaubt.');
        $nonce=$_POST['nonce']??'';if(!is_string($nonce)||!preg_match('/^[a-f0-9]{32}$/D',$nonce))fail(422,'Ungültige Anfrage.');
        $pending=mcpConsentFind($nonce);if($pending)$recoveryHref='/oauth/authorize/?resume='.$nonce;
        if(empty($_COOKIE['ectro_session']))fail(403,'Die Anmeldung muss erneut bestätigt werden. Danach die Freigabe noch einmal prüfen.');
        sessionStart();$u=currentUser();if($pending&&$u&&$pending['user_id']!==$u['id'])$recoveryHref=null;
        if(!$u||!is_string($_POST['csrf']??null)||!hash_equals($_SESSION['csrf'],$_POST['csrf']))fail(403,'Die Anmeldung hat sich geändert. Bitte die Freigabe erneut prüfen.');
        mcpConsentImportLegacy($u,$nonce);if(mcpConsentFind($nonce))$recoveryHref='/oauth/authorize/?resume='.$nonce;
        $result=mcpConsentFinish($u,$nonce,is_string($_POST['decision']??null)?$_POST['decision']:'',($_POST['write_access']??'')==='yes');
        if(isset($result['retry'])){header('Location: '.$recoveryHref,true,303);exit;}
        if(isset($result['done']))mcpConsentCompletePage($result['request'],$result['approved']);
        header('Location: '.$result['redirect'],true,303);exit;
    }
    if($method!=='POST')fail(405,'POST erforderlich.');if((int)($_SERVER['CONTENT_LENGTH']??0)>16000)fail(413,'Anfrage zu groß.');rateLimit('mcp.oauth.'.$route,str_contains($route,'register')?20:180,str_contains($route,'register')?3600:60);
    if($route==='/oauth/register/'||$route==='/oauth/register'){if(!str_starts_with(strtolower($_SERVER['CONTENT_TYPE']??''),'application/json'))fail(415,'application/json erforderlich.');jsonOut(mcpOAuthRegister(input()),201);}
    if(!str_starts_with(strtolower($_SERVER['CONTENT_TYPE']??''),'application/x-www-form-urlencoded'))fail(415,'Form-Daten erforderlich.');if($route==='/oauth/token/'||$route==='/oauth/token')jsonOut(mcpOAuthToken($_POST));if($route==='/oauth/revoke/'||$route==='/oauth/revoke'){mcpOAuthRevoke($_POST);jsonOut([]);}fail(404,'Unbekannte OAuth-Adresse.');
}catch(ApiError $e){$route=$route??'';if(str_contains($route,'authorize')){http_response_code($e->status);mcpOAuthConsentPage('Verbindung fortsetzen','<p>'.htmlspecialchars($e->getMessage(),ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8').'</p>'.($recoveryHref?'<p><a class="es-btn es-btn--primary" href="'.htmlspecialchars($recoveryHref,ENT_QUOTES,'UTF-8').'">Freigabe erneut prüfen</a></p>':'<p>Im KI-Client auf <strong>Connect</strong> oder <strong>Verbinden</strong> klicken, um neu zu starten.</p>').'<p><a href="/#agent-lab">MCP-Freigabe im Agent Lab verwalten</a></p>');}jsonOut(['error'=>in_array($e->getMessage(),['invalid_grant','invalid_scope','invalid_target','invalid_client'],true)?$e->getMessage():'invalid_request','error_description'=>$e->getMessage()],$e->status);}catch(Throwable){jsonOut(['error'=>'server_error'],500);}
