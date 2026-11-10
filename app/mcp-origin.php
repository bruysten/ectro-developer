<?php
declare(strict_types=1);
// Canonical origin only: never derive OAuth issuer/audience from untrusted request headers.
function agentMcpOrigin(string $value): string {
    if($value==='')return '';if(strlen($value)>300||preg_match('/[\s\x00-\x1f]/',$value))fail(422,'Bitte eine öffentliche HTTPS-Basisadresse ohne Pfad verwenden.');$p=parse_url($value);if(!$p||($p['scheme']??'')!=='https'||!isset($p['host'])||isset($p['user'])||isset($p['pass'])||isset($p['query'])||isset($p['fragment'])||!in_array($p['path']??'',['','/'],true)||!preg_match('/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/iD',$p['host'])||preg_match('/(^|\.)(localhost|local|internal)$/iD',$p['host'])||(isset($p['port'])&&$p['port']!==443))fail(422,'Bitte eine öffentliche HTTPS-Basisadresse ohne Pfad verwenden.');return 'https://'.strtolower($p['host']);
}
