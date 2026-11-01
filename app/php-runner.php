<?php
declare(strict_types=1);

function phpRunnerBinary(): ?string {
    $configured = config()['php_cli_binary'] ?? '';
    $candidates = array_filter([$configured, PHP_BINARY, PHP_BINDIR . '/php',PHP_BINDIR.'/php8.4',PHP_BINDIR.'/php8.3',PHP_BINDIR.'/php8.2',PHP_BINDIR.'/php84',PHP_BINDIR.'/php83',PHP_BINDIR.'/php82','/usr/bin/php','/usr/bin/php8.4','/usr/bin/php8.3','/usr/bin/php8.2','/usr/local/bin/php','/usr/local/bin/php8.4','/usr/local/bin/php8.3','/usr/local/bin/php8.2']);
    foreach (array_unique($candidates) as $binary) {
        if (!is_string($binary) || !str_starts_with($binary, '/') || !is_file($binary) || !is_executable($binary)) continue;
        if (str_contains(basename($binary), 'fpm') || str_contains(basename($binary), 'cgi')) continue;
        return $binary;
    }
    return null;
}

function phpRunnerStatus(): array {
    if (!function_exists('proc_open')) return ['available'=>false,'message'=>'PHP-Prozessstart ist auf diesem Server gesperrt.'];
    $binary=phpRunnerBinary();
    if (!$binary) return ['available'=>false,'message'=>'PHP-CLI wurde nicht gefunden.'];
    $pipes=[];
    $process=@proc_open([$binary,'-r','echo PHP_VERSION,"|",(extension_loaded("mysqli")?"mysqli":""),"|",PHP_SAPI;'],[0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']],$pipes,dirname($binary),['PATH'=>dirname($binary)]);
    if (!is_resource($process)) return ['available'=>false,'message'=>'PHP-CLI konnte nicht gestartet werden.'];
    fclose($pipes[0]);$stdout=stream_get_contents($pipes[1],256);$stderr=stream_get_contents($pipes[2],256);fclose($pipes[1]);fclose($pipes[2]);$exit=proc_close($process);
    $parts=explode('|',(string)$stdout);
    if ($exit!==0 || count($parts)!==3 || $parts[2]!=='cli') return ['available'=>false,'message'=>'Die PHP-CLI konnte nicht geprüft werden.'];
    if (version_compare($parts[0],'8.2.0','<')) return ['available'=>false,'message'=>'Die PHP-CLI muss Version 8.2 oder neuer haben.'];
    if ($parts[1]!=='mysqli') return ['available'=>false,'message'=>'MySQLi ist in der PHP-CLI nicht aktiviert.'];
    return ['available'=>true,'message'=>'PHP-CLI mit MySQLi ist bereit.','version'=>$parts[0]];
}

function validatePhpDatabaseTargets(array $files): void {
    $allowed=array_map('strtolower',allowedHosts());
    foreach($files as $file){
        if(!str_ends_with(strtolower($file['path']),'.php'))continue;
        $source=$file['content'];
        if(!preg_match_all('/\b(mysqli_connect|new\s+mysqli|mysqli_real_connect)\s*\(/i',$source,$calls,PREG_OFFSET_CAPTURE))continue;
        foreach($calls[0] as $index=>$call){
            $tail=substr($source,$call[1]+strlen($call[0]));
            $function=strtolower(preg_replace('/\s+/','',$calls[1][$index][0]));
            if($function==='mysqli_real_connect'){
                if(!preg_match('/^\s*(?:\$[a-zA-Z_][a-zA-Z0-9_]*|[a-zA-Z_][a-zA-Z0-9_]*)\s*,\s*([\'"])([^\'"]+)\1\s*[,)]/',$tail,$arg))fail(403,'Server-PHP erlaubt nur feste MySQL-Hosts aus der Admin-Freigabeliste.');
            }elseif(!preg_match('/^\s*([\'"])([^\'"]+)\1\s*[,)]/',$tail,$arg))fail(403,'Server-PHP erlaubt nur feste MySQL-Hosts aus der Admin-Freigabeliste.');
            $target=$arg[2];
            if(!in_array(strtolower($target),$allowed,true))fail(403,'Der MySQL-Host „'.$target.'“ ist in den Admin-Freigaben nicht erlaubt.');
        }
    }
}

function phpRunDirectoryBytes(string $dir): int {
    $bytes=0;
    foreach(new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir,FilesystemIterator::SKIP_DOTS)) as $file){
        if($file->isLink())continue;
        if($file->isFile())$bytes+=$file->getSize();
        if($bytes>33554432)return $bytes;
    }
    return $bytes;
}

function runProjectPhp(array $u, array $data): array {
    needFeature($u,'php');needFeature($u,'editor');
    if (phpExecutionMode()!=='server') fail(409,'Die PHP-Ausführung auf dem Server ist nicht aktiviert.');
    rateLimit('php.run.'.$u['id'],30,60);
    $status=phpRunnerStatus();if (!$status['available']) fail(503,$status['message']);
    $project=project($u,textField($data,'project',32));
    $entry=filePath(textField($data,'path',240));
    if (!str_ends_with(strtolower($entry),'.php')) fail(422,'Bitte wählen Sie eine PHP-Datei.');
    $queryString=textField($data,'query',4096,false);
    $files=all("SELECT path,content FROM files WHERE project_id=? AND kind='file'",[$project['id']]);
    if (count($files)>300) fail(413,'Das Projekt enthält zu viele Dateien für einen PHP-Run.');
    validatePhpDatabaseTargets($files);
    $work=dataDir().'/php-runs';if(!is_dir($work)&&!mkdir($work,0700,true))fail(503,'Der temporäre PHP-Arbeitsbereich konnte nicht angelegt werden.');
    $dir=$work.'/'.bin2hex(random_bytes(16));if(!mkdir($dir,0700))fail(503,'Der PHP-Arbeitsbereich konnte nicht angelegt werden.');
    $process=null;$pipes=[];
    try {
        $total=0;$found=false;
        foreach($files as $file){$path=filePath($file['path']);$total+=strlen($file['content']);if($total>20971520)fail(413,'Das Projekt ist zu groß für einen PHP-Run.');$target=$dir.'/'.$path;$parent=dirname($target);if(!is_dir($parent)&&!mkdir($parent,0700,true))fail(503,'Projektdateien konnten nicht vorbereitet werden.');if(file_put_contents($target,$file['content'],LOCK_EX)===false)fail(503,'Projektdateien konnten nicht vorbereitet werden.');chmod($target,0600);if($path===$entry)$found=true;}
        if(!$found)fail(404,'Die PHP-Startdatei wurde nicht gefunden.');
        $query=var_export($queryString,true);$script=var_export($entry,true);
        $bootstrap='<?php ini_set("display_errors","1"); ini_set("html_errors","1"); parse_str('.$query.', $_GET); $_REQUEST=$_GET; $_SERVER["REQUEST_METHOD"]="GET"; $_SERVER["QUERY_STRING"]='.$query.'; $_SERVER["REQUEST_URI"]="/".'.$script.(strlen($queryString)?'."?".'.$query:'').'; $_SERVER["SCRIPT_NAME"]="/".'.$script.'; $_SERVER["SCRIPT_FILENAME"]='.var_export($dir.'/'.$entry,true).'; $_SERVER["DOCUMENT_ROOT"]='.var_export($dir,true).'; chdir('.var_export(dirname($dir.'/'.$entry),true).'); require '.var_export($dir.'/'.$entry,true).';';
        $academy=$dir.'/.academy.php';file_put_contents($academy,file_get_contents(__DIR__.'/academy-runtime.php'));chmod($academy,0600);$bootstrap=str_replace('<?php ', '<?php require_once '.var_export($academy,true).'; ', $bootstrap);
        $runner=$dir.'/.runner.php';file_put_contents($runner,$bootstrap,LOCK_EX);chmod($runner,0600);
        // mysqlnd validates this setting even on a successful TCP connection.
        // A regular file passes open_basedir but cannot be a LOCAL INFILE directory.
        $disabled='exec,shell_exec,system,passthru,proc_open,popen,pcntl_exec,pcntl_fork,pcntl_alarm,pcntl_signal,posix_kill,putenv,dl,mail,curl_init,fsockopen,pfsockopen,stream_socket_client,stream_socket_server,socket_create,socket_connect,socket_sendto,socket_send,socket_write,socket_import_stream,symlink,link';
        $readableCertDirs=array_values(array_filter(['/etc/ssl/certs',APP_ROOT.'/app/certs'],static fn($path)=>is_dir($path)));
        $openBasedir=implode(PATH_SEPARATOR,array_merge([$dir],$readableCertDirs));
        $command=[phpRunnerBinary(),'-d','open_basedir='.$openBasedir,'-d','disable_functions='.$disabled,'-d','allow_url_fopen=0','-d','allow_url_include=0','-d','enable_dl=0','-d','memory_limit=64M','-d','max_execution_time=8','-d','default_socket_timeout=5','-d','mysqli.connect_timeout=5','-d','mysqli.allow_local_infile=0','-d','mysqli.local_infile_directory='.$runner,'-d','mysqli.allow_persistent=0','-d','mysqlnd.net_read_timeout=5','-d','session.save_path='.$dir,'-d','display_errors=1','-d','log_errors=0',$runner];
        $process=@proc_open($command,[0=>['file','/dev/null','r'],1=>['pipe','w'],2=>['pipe','w'],3=>['pipe','w'],4=>['pipe','r']],$pipes,$dir,['PATH'=>dirname($command[0]),'HOME'=>$dir,'TMPDIR'=>$dir]);
        if(!is_resource($process))fail(503,'Der isolierte PHP-Prozess konnte nicht gestartet werden.');
        stream_set_blocking($pipes[3],false);$rpcBuffer='';$rpcCount=0;
        stream_set_blocking($pipes[1],false);stream_set_blocking($pipes[2],false);$started=microtime(true);$wallStarted=$started;$nextSizeCheck=$started;$exitCode=null;$output='';$errors='';
        do {
            $rpcBuffer.=stream_get_contents($pipes[3],65536);if(strlen($rpcBuffer)>65536)fail(413,'Academy-Anfrage zu groß.');while(($nl=strpos($rpcBuffer,"\n"))!==false){$line=substr($rpcBuffer,0,$nl);$rpcBuffer=substr($rpcBuffer,$nl+1);try{if(++$rpcCount>100)fail(429,'Höchstens 100 Academy-Aufrufe pro Run.');$request=json_decode($line,true,16,JSON_THROW_ON_ERROR);if(($request['op']??'')==='ai'&&microtime(true)-$wallStarted>40)fail(408,'Kein weiterer KI-Aufruf innerhalb dieses Runs.');$rpcStarted=microtime(true);$reply=labRpc($u,[...$request,'project'=>$project['id']]);if(($request['op']??'')==='ai')$started+=microtime(true)-$rpcStarted;}catch(Throwable $e){$reply=['error'=>$e instanceof ApiError?$e->getMessage():'Ungültige Academy-Anfrage.'];}fwrite($pipes[4],json_encode($reply,JSON_INVALID_UTF8_SUBSTITUTE)."\n");}
            $output.=stream_get_contents($pipes[1],65536);$errors.=stream_get_contents($pipes[2],65536);$state=proc_get_status($process);
            if(strlen($output)+strlen($errors)>100000){proc_terminate($process,9);fail(413,'Die PHP-Ausgabe überschreitet das Limit von 100 KB.');}
            if(microtime(true)>=$nextSizeCheck){if(phpRunDirectoryBytes($dir)>33554432){proc_terminate($process,9);fail(413,'Der temporäre PHP-Arbeitsbereich überschreitet das Limit von 32 MB.');}$nextSizeCheck=microtime(true)+.2;}
            if(!$state['running']){$exitCode=$state['exitcode'];break;}
            if(microtime(true)-$started>8||microtime(true)-$wallStarted>90){proc_terminate($process,9);fail(408,'PHP wurde nach 8 Sekunden beendet.');}
            usleep(20000);
        }while(true);
        $output.=stream_get_contents($pipes[1]);$errors.=stream_get_contents($pipes[2]);fclose($pipes[1]);fclose($pipes[2]);
        proc_close($process);$process=null;
        return ['output'=>mb_substr($output,0,100000),'errors'=>mb_substr($errors,0,10000),'exit_code'=>$exitCode];
    } finally {
        foreach ($pipes as $pipe) if (is_resource($pipe)) @fclose($pipe);
        if(is_resource($process)){proc_terminate($process,9);proc_close($process);}
        foreach(new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir,FilesystemIterator::SKIP_DOTS),RecursiveIteratorIterator::CHILD_FIRST) as $item){($item->isLink()||!$item->isDir())?@unlink($item->getPathname()):@rmdir($item->getPathname());}
        @rmdir($dir);
    }
}
