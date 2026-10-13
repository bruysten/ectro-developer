<?php
declare(strict_types=1);
$dir=sys_get_temp_dir().'/ectro-session-test-'.bin2hex(random_bytes(8));mkdir($dir,0700);putenv('APP_DATA_DIR='.$dir);putenv('APP_ENV=development');
require __DIR__.'/../app/bootstrap.php';$checks=0;
function sessionCheck(bool $ok,string $label):void {global $checks;if(!$ok)throw new RuntimeException($label);++$checks;}
function fixtureSession(int $age,int $idle=0):void {$_SESSION=['uid'=>'session-user','auth_version'=>1,'created'=>time()-$age,'last_seen'=>time()-$idle,'csrf'=>'fixture'];}
try{
    query("INSERT INTO users(id,name,email,password,role,created_at) VALUES('session-user','Test','test@example.test','unused','user','2026')");sessionStart();
    sessionCheck(sessionHours()===8,'Default is eight hours');
    sessionCheck((int)ini_get('session.gc_maxlifetime')>=168*3600,'PHP cleanup cannot shorten a supported session');
    fixtureSession(7*3600,2*3600);sessionCheck(currentUser()!==null,'Idle session stays logged in within eight hours');
    fixtureSession(8*3600);sessionCheck(currentUser()===null&&!isset($_SESSION['uid'],$_SESSION['created']),'Expires at the exact eight-hour boundary');
    fixtureSession(9*3600);sessionCheck(currentUser()===null,'Recent activity does not extend absolute duration');
    query("INSERT INTO settings VALUES('session_hours','72')");fixtureSession(36*3600);sessionCheck(currentUser()!==null,'Configured duration can exceed the old twelve-hour cap');
    query("UPDATE settings SET value='1' WHERE key='session_hours'");fixtureSession(2*3600);sessionCheck(currentUser()===null,'Shortening duration applies to existing sessions');
    query("UPDATE settings SET value='8' WHERE key='session_hours'");sessionCheck(currentUser()===null,'Expired authentication cannot revive when duration increases');
    fixtureSession(0);sessionCheck(currentUser()!==null,'Fresh login receives a new full duration');
    unset($_SESSION['created']);sessionCheck(currentUser()===null,'Missing login timestamp fails closed');
    query("UPDATE settings SET value='0' WHERE key='session_hours'");sessionCheck(sessionHours()===8,'Invalid stored settings use safe default');
    foreach([1,8,168] as $valid)sessionCheck(sessionHoursInput($valid)===$valid,'Valid hour setting');
    foreach([0,169,-1,8.5,'8',null,true] as $bad){try{sessionHoursInput($bad);throw new RuntimeException('Invalid setting accepted');}catch(ApiError $e){sessionCheck($e->status===422,'Invalid duration rejected');}}
    echo "$checks session duration checks passed.\n";
}finally{if(session_status()===PHP_SESSION_ACTIVE)session_write_close();foreach(glob($dir.'/sessions/*')?:[] as $file)unlink($file);if(is_dir($dir.'/sessions'))rmdir($dir.'/sessions');foreach(glob($dir.'/*') as $file)unlink($file);rmdir($dir);}
