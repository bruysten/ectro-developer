<?php
declare(strict_types=1);
$private=sys_get_temp_dir().'/ectro-converter-migration-'.bin2hex(random_bytes(6));mkdir($private,0700);putenv('APP_DATA_DIR='.$private);putenv('APP_ENV=development');putenv('APP_KEY='.base64_encode(random_bytes(32)));
register_shutdown_function(function()use($private){foreach(glob($private.'/*') as $f)unlink($f);rmdir($private);});
$schema=file_get_contents(__DIR__.'/../app/schema.sql');$schema=str_replace('["csv","tsv","json","xml","jsonl","yaml","md"]','["csv","tsv","json","xml"]',$schema);$old=new PDO('sqlite:'.$private.'/app.sqlite');$old->exec($schema);$old=null;
require __DIR__.'/../app/bootstrap.php';if(converterFormats()!==CONVERTER_FORMATS)throw new RuntimeException('Old complete catalog was not upgraded');
$code='require '.var_export(realpath(__DIR__.'/../app/bootstrap.php'),true).'; echo json_encode(converterFormats());';
function nextFormats(string $code):array{$p=proc_open([PHP_BINARY,'-r',$code],[1=>['pipe','w'],2=>['pipe','w']],$pipes);$out=stream_get_contents($pipes[1]);$err=stream_get_contents($pipes[2]);fclose($pipes[1]);fclose($pipes[2]);if(proc_close($p)!==0)throw new RuntimeException($err);return json_decode($out,true,64,JSON_THROW_ON_ERROR);}
query("UPDATE settings SET value=? WHERE key='converter_formats'",[json_encode(['csv','tsv','json','xml'])]);if(nextFormats($code)!==['csv','tsv','json','xml'])throw new RuntimeException('Later explicit legacy selection overwritten');
query("DELETE FROM settings WHERE key='converter_formats_v2'");query("UPDATE settings SET value=? WHERE key='converter_formats'",[json_encode(['csv','json'])]);if(nextFormats($code)!==['csv','json'])throw new RuntimeException('Restricted catalog was changed');
echo "Converter upgrade verified: old complete catalog expands once, restricted selections and later administrator choices remain unchanged.\n";
