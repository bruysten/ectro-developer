<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
if (PHP_VERSION_ID < 80200) { fwrite(STDERR, "PHP 8.2 oder neuer erforderlich.\n"); exit(1); }
foreach (['pdo_sqlite','pdo_mysql','mbstring','sodium','session'] as $ext) if (!extension_loaded($ext)) { fwrite(STDERR,"Fehlende PHP-Erweiterung: $ext\n"); exit(1); }
umask(0077);
$root=dirname(__DIR__);$target=$root.'/config.local.php';
if (!is_file($target)) {
    $data=[];
    if (in_array('--stdin', $argv, true)) { $data=json_decode(stream_get_contents(STDIN),true,8,JSON_THROW_ON_ERROR); }
    $token=$data['setup_token']??getenv('APP_SETUP_TOKEN')?:'';
    if (strlen($token)<32) { fwrite(STDERR,"APP_SETUP_TOKEN mit mindestens 32 Zeichen setzen oder JSON über --stdin übergeben.\n");exit(1); }
    // A deployment may place the shared config behind a not-yet-existing symlink.
    $destination=is_link($target)?readlink($target):$target;
    if (!str_starts_with($destination,'/')) $destination=$root.'/'.$destination;
    $cfg=['environment'=>'production','key'=>base64_encode(random_bytes(32)),'setup_token'=>$token,'db_allowed_hosts'=>['localhost','127.0.0.1']];
    if(in_array('--development',$argv,true))$cfg['environment']='development';
    $file=fopen($destination,'x');if(!$file){fwrite(STDERR,"Konfiguration konnte nicht sicher angelegt werden.\n");exit(1);}fwrite($file,"<?php\nreturn ".var_export($cfg,true).";\n");fclose($file);chmod($destination,0600);
}
require $root.'/app/bootstrap.php';
keyBytes();db();
$public=realpath($root.'/public');$private=realpath(dataDir());
if(str_starts_with($private,$public.'/')){fwrite(STDERR,"Privater Speicher liegt im Webroot. Deployment gestoppt.\n");exit(1);}
foreach (['assets/app.js','assets/runtime/php/8_4_25/php_8_4.wasm','assets/runtime/python/python_stdlib.zip','assets/fonts/fonts.css'] as $asset)
    if(!is_file($public.'/'.$asset)){fwrite(STDERR,"Fehlendes fertiges Asset: $asset\n");exit(1);}
fwrite(STDOUT,"Preflight erfolgreich. SQLite und private Konfiguration sind bereit.\n");
