<?php
declare(strict_types=1);
require_once __DIR__.'/../../app/bootstrap.php';
require_once __DIR__.'/../../app/templates.php';
require_once __DIR__.'/../../app/mysql.php';
require_once __DIR__.'/../../app/lab-api.php';
secureHeaders();header('Content-Type: application/json; charset=utf-8');header('Cache-Control: no-store');
// Remote clients are always subject to learner-facing access periods. No cookie or admin-portal bypass.
$_SERVER['HTTP_X_WORKSPACE_PORTAL']='frontend';unset($GLOBALS['academyDbUser'],$GLOBALS['academyDbProject']);
try{
    if(!empty($_GET))fail(400,'MCP-Schlüssel ausschließlich im Authorization-Header übergeben.');
    $ep=agentMcpEndpoint();if(config()['environment']!=='development'&&(!isset($_SERVER['HTTPS'])||$_SERVER['HTTPS']==='off'))fail(403,'MCP benötigt HTTPS.');
    if(isset($_SERVER['HTTP_ORIGIN'])){$origin=rtrim($_SERVER['HTTP_ORIGIN'],'/');$expected=preg_replace('~/mcp/$~','',$ep['url']);if(!$expected||!hash_equals($expected,$origin))fail(403,'Origin nicht erlaubt.');}
    rateLimit('mcp.auth',120,60);$header=$_SERVER['HTTP_AUTHORIZATION']??$_SERVER['REDIRECT_HTTP_AUTHORIZATION']??'';if(!preg_match('/^Bearer (\S+)$/D',$header,$m))fail(401,'Authorization: Bearer mit persönlichem MCP-Schlüssel erforderlich.');[$u,$p]=agentMcpAuthenticate($m[1]);rateLimit('mcp.user.'.$u['id'],60,60);
    if(($_SERVER['REQUEST_METHOD']??'')!=='POST'){header('Allow: POST');fail(405,'Dieser stateless MCP-Endpunkt unterstützt POST.');}
    if(!str_starts_with(strtolower($_SERVER['CONTENT_TYPE']??''),'application/json'))fail(415,'Content-Type application/json erforderlich.');$raw=file_get_contents('php://input',false,null,0,65537);if(strlen($raw)>65536)fail(413,'Die MCP-Anfrage überschreitet 64 KB.');
    try{$message=json_decode($raw,true,32,JSON_THROW_ON_ERROR);}catch(JsonException){jsonOut(['jsonrpc'=>'2.0','id'=>null,'error'=>['code'=>-32700,'message'=>'Parse error']],200);}
    if(!is_array($message)||array_is_list($message))jsonOut(['jsonrpc'=>'2.0','id'=>null,'error'=>['code'=>-32600,'message'=>'Invalid Request']],200);
    $result=agentMcpRpc($u,$p,$message);agentMcpAuthenticate($m[1]);if($result===null){http_response_code(202);exit;}jsonOut($result);
}catch(ApiError $e){if($e->status===401&&($ep['url']??''))header('WWW-Authenticate: Bearer resource_metadata="'.mcpOAuthBase().'/.well-known/oauth-protected-resource/mcp", scope="db:read", error="invalid_token"');jsonOut(['error'=>$e->getMessage()],$e->status);}catch(Throwable){jsonOut(['error'=>'Die MCP-Anfrage konnte nicht verarbeitet werden.'],500);}
