<?php
declare(strict_types=1);
$private=sys_get_temp_dir().'/ectro-source-tables-'.bin2hex(random_bytes(6));mkdir($private,0700);putenv('APP_DATA_DIR='.$private);putenv('APP_ENV=development');putenv('APP_KEY='.base64_encode(random_bytes(32)));
register_shutdown_function(function()use($private){$it=new RecursiveIteratorIterator(new RecursiveDirectoryIterator($private,FilesystemIterator::SKIP_DOTS),RecursiveIteratorIterator::CHILD_FIRST);foreach($it as $f)$f->isDir()?rmdir($f->getPathname()):unlink($f->getPathname());rmdir($private);});
require __DIR__.'/../app/bootstrap.php';require __DIR__.'/../app/templates.php';require __DIR__.'/../app/mysql.php';require __DIR__.'/../app/lab-api.php';
$fixtures=json_decode(stream_get_contents(STDIN),true,64,JSON_THROW_ON_ERROR);$results=[];
foreach($fixtures as $f){try{$spec=studioCombinedInput($f['spec']);$data=studioCombineTables($f['inputs'],$spec,$f['limit']??1000);$results[]=['columns'=>$data['columns'],'rows'=>$data['rows'],'unmatched'=>$data['unmatched'],'expanded'=>$data['expanded'],'truncated'=>$data['truncated']];}catch(ApiError $e){$results[]=['error'=>$e->status];}}
echo json_encode($results,JSON_THROW_ON_ERROR);
