<?php
declare(strict_types=1);
require __DIR__.'/../app/bootstrap.php';
require __DIR__.'/../app/mysql.php';
$checks=0;
function checkConnection(bool $value,string $label): void {
    global $checks;
    if (!$value) { fwrite(STDERR,"MySQL connection check failed: $label\n");exit(1); }
    ++$checks;
}
$provider=APP_ROOT.'/app/certs/hetzner-mysql-ca.pem';
$cfg=['mysql_tls_ca'=>__FILE__];
checkConnection(mysqlTlsCa('mj7p.your-database.de',$cfg)===$provider,'Hetzner selects bundled provider CA');
checkConnection(mysqlTlsCa('MJ7P.YOUR-DATABASE.DE',$cfg)===$provider,'Provider matching is case insensitive');
foreach(['mj7p.your-database.de.evil.test','fake-your-database.de','your-database.de','mysql.example.test'] as $host) {
    checkConnection(mysqlTlsCa($host,$cfg)===__FILE__,'Other hosts retain configured CA');
}
checkConnection(mysqlTlsCa('mj7p.your-database.de',['mysql_hetzner_tls_ca'=>__FILE__])===__FILE__,'Explicit provider CA override respected');
foreach(['localhost','127.0.0.1'] as $host) checkConnection(mysqlTlsCa($host,[])===null,'Local connections do not require a CA');
foreach([['mysql_tls_ca'=>'/nonexistent/ca.pem','host'=>'mysql.example.test'],['mysql_hetzner_tls_ca'=>'/nonexistent/ca.pem','host'=>'mj7p.your-database.de']] as $invalid) {
    try {mysqlTlsCa($invalid['host'],$invalid);checkConnection(false,'Missing CA must fail');}
    catch(ApiError $e) {checkConnection($e->status===503,'Missing CA fails closed');}
}
$cert=file_get_contents($provider);
checkConnection(openssl_x509_fingerprint($cert,'sha256')==='0c2f667368a80314e2455e1dfffe8964854d9d112fc6f5a368cfd2ae936a7427','Certificate matches official provider fingerprint');
$parsed=openssl_x509_parse($cert);
checkConnection($parsed['validFrom_time_t']<=time()&&$parsed['validTo_time_t']>time(),'Provider certificate is currently valid');
foreach([[1045,422,'Anmeldung'],[1698,422,'Anmeldung'],[1044,422,'keinen Zugriff'],[1049,422,'nicht gefunden'],[2005,503,'aufgelöst'],[2002,503,'nicht erreichbar'],[2003,503,'nicht erreichbar'],[2006,503,'unterbrochen'],[2013,503,'unterbrochen'],[2026,503,'verschlüsselte']] as [$code,$expectedStatus,$expectedText]) {
    $e=new PDOException('sensitive-password-and-server-data');$e->errorInfo=['HY000',$code,$e->getMessage()];
    [$status,$message]=mysqlConnectionFailure($e);
    checkConnection($status===$expectedStatus&&str_contains($message,$expectedText)&&str_contains($message,(string)$code),'Actionable connection error category');
    checkConnection(!str_contains($message,'sensitive'),'Raw exception text is never exposed');
}
$e=new PDOException('SSL operation failed: certificate verify failed; sensitive-secret');$e->errorInfo=['HY000',2002,$e->getMessage()];
checkConnection(str_contains(mysqlConnectionFailure($e)[1],'verschlüsselte'),'mysqlnd transport errors distinguish TLS failure');
$e=new PDOException('sensitive-secret');
checkConnection(!str_contains(mysqlConnectionFailure($e)[1],'sensitive'),'Unknown errors do not disclose driver messages');
echo "$checks MySQL connection configuration/error checks passed.\n";
