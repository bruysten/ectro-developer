<?php
declare(strict_types=1);
$dir=sys_get_temp_dir().'/ectro-recovery-'.bin2hex(random_bytes(8));mkdir($dir,0700);
putenv('APP_DATA_DIR='.$dir);putenv('APP_ENV=development');putenv('APP_KEY='.base64_encode(random_bytes(32)));
require __DIR__.'/../app/bootstrap.php';require __DIR__.'/../app/mail.php';require __DIR__.'/../app/password-recovery.php';
$checks=0;
function checkRecovery(bool $ok,string $label):void{global $checks;if(!$ok)throw new RuntimeException($label);++$checks;}
function rejectRecovery(callable $fn):void{try{$fn();throw new RuntimeException('Invalid reset accepted');}catch(ApiError $e){checkRecovery($e->status===422,'Invalid recovery rejected');}}
function clearRecoveryLimits():void{query('DELETE FROM rate_limits');}
function recoveryToken(array $job):string{preg_match('/#reset-password=([a-f0-9]{64})/',$job['message']['TextPart'],$match);return $match[1]??'';}
function resetInput(string $token):array{return ['token'=>$token,'password'=>'new-secure-password','confirmation'=>'new-secure-password'];}
try{
    checkRecovery(!passwordRecoveryReady(),'Recovery unavailable before mail setup');
    foreach(['admin'=>'admin','learner'=>'user','teacher'=>'teacher','disabled'=>'user'] as $id=>$role)
        query('INSERT INTO users(id,name,email,password,role,active,must_change_password,created_at) VALUES(?,?,?,?,?,?,1,?)',[$id,$id,$id.'@example.test',password_hash('original-password',PASSWORD_DEFAULT),$role,$id==='disabled'?0:1,now()]);
    $config=['enabled'=>true,'version'=>1,'sender_email'=>'sender@example.test','sender_name'=>'Academy','app_url'=>'https://academy.example','api_key'=>encryptSecret(str_repeat('a',32)),'api_secret'=>encryptSecret(str_repeat('b',32))];
    query("INSERT INTO settings VALUES('mailjet',?)",[json_encode($config)]);
    checkRecovery(passwordRecoveryReady(),'Configured Mailjet enables recovery');
    foreach(['https://attacker@academy.example','https://academy.example/path','http://academy.example'] as $url){query("UPDATE settings SET value=? WHERE key='mailjet'",[json_encode([...$config,'app_url'=>$url])]);checkRecovery(!passwordRecoveryReady(),'Unsafe recovery origin rejected');}
    query("UPDATE settings SET value=? WHERE key='mailjet'",[json_encode($config)]);
    $_SERVER['HTTP_HOST']='attacker.example';
    $admin=preparePasswordRecovery(['email'=>'ADMIN@example.test']);$token=recoveryToken($admin);
    checkRecovery(strlen($token)===64&&ctype_xdigit($token),'256-bit random recovery token');
    checkRecovery(str_contains($admin['message']['TextPart'],'https://academy.example/admin/#reset-password='),'Trusted configured origin and admin portal');
    checkRecovery(!str_contains(json_encode($admin),'attacker.example'),'Host header cannot poison reset link');
    checkRecovery($admin['message']['TrackClicks']==='disabled','Click tracking cannot rewrite secret fragment');
    checkRecovery(one('SELECT token_hash FROM password_resets')['token_hash']===hash('sha256',$token),'Only token digest persisted');
    checkRecovery(!str_contains(file_get_contents($dir.'/app.sqlite'),$token),'Raw token absent from database');
    checkRecovery(preparePasswordRecovery(['email'=>'admin@example.test'])===null,'Immediate resend silently throttled');
    checkRecovery(preparePasswordRecovery(['email'=>'missing@example.test'])===null&&preparePasswordRecovery(['email'=>'disabled@example.test'])===null,'Missing and disabled accounts have no token');
    checkRecovery(count(all('SELECT * FROM rate_limits'))===6,'Missing accounts reserve the same throttle slots');
    $payload=null;$ok=function($p)use(&$payload){$payload=$p;return [200,'{"Messages":[{"Status":"success"}]}'];};
    deliverPasswordRecovery($admin,$ok);checkRecovery($payload['Messages'][0]['To'][0]['Email']==='admin@example.test','Recovery delivered only to stored address');
    checkRecovery(!str_contains(json_encode(all('SELECT * FROM events')),$token),'Audit excludes recovery secret');
    rejectRecovery(fn()=>resetForgottenPassword(resetInput(str_repeat('0',64))));
    rejectRecovery(fn()=>resetForgottenPassword([...resetInput($token),'password'=>'short']));
    rejectRecovery(fn()=>resetForgottenPassword([...resetInput($token),'confirmation'=>'different']));
    rejectRecovery(fn()=>resetForgottenPassword([...resetInput($token),'password'=>str_repeat('x',73),'confirmation'=>str_repeat('x',73)]));
    checkRecovery(one("SELECT auth_version FROM users WHERE id='admin'")['auth_version']===1,'Invalid reset preserves credentials');
    clearRecoveryLimits();$second=preparePasswordRecovery(['email'=>'admin@example.test']);
    checkRecovery(recoveryToken($second)!==$token,'New request gets independent secret');
    checkRecovery(count(all('SELECT * FROM password_resets'))===2,'New request does not invalidate a previously mailed link');
    query("INSERT INTO welcome_mails(id,user_id,request_key,recipient,template_name,auth_version,payload,status,created_at,updated_at) VALUES('welcome','admin','welcome-request','admin@example.test','Welcome',1,?,'pending',?,?)",[encryptSecret('obsolete-password'),now(),now()]);
    $u=resetForgottenPassword(resetInput($token));
    checkRecovery(password_verify('new-secure-password',one("SELECT password FROM users WHERE id='admin'")['password']),'New password securely hashed');
    checkRecovery(one("SELECT auth_version,must_change_password FROM users WHERE id='admin'")===['auth_version'=>2,'must_change_password'=>0],'Reset invalidates sessions and clears temporary password gate');
    checkRecovery(!one('SELECT 1 FROM password_resets'),'Reset invalidates every outstanding link');
    checkRecovery(one("SELECT payload,status FROM welcome_mails WHERE id='welcome'")===['payload'=>null,'status'=>'cancelled'],'Recovery immediately erases obsolete queued credentials');
    rejectRecovery(fn()=>resetForgottenPassword(resetInput($token)));rejectRecovery(fn()=>resetForgottenPassword(resetInput(recoveryToken($second))));
    notifyPasswordRecovery($u,$ok);checkRecovery(!str_contains(json_encode($payload),'new-secure-password')&&!str_contains(json_encode($payload),$token),'Confirmation email contains no credentials');
    foreach(['learner','teacher'] as $id){clearRecoveryLimits();$job=preparePasswordRecovery(['email'=>$id.'@example.test']);checkRecovery(str_contains($job['message']['TextPart'],'https://academy.example/#reset-password='),'Learner and teacher use user portal');}
    $job=preparePasswordRecovery(['email'=>'admin@example.test']);$expired=recoveryToken($job);query('UPDATE password_resets SET expires_at=?',[time()]);rejectRecovery(fn()=>resetForgottenPassword(resetInput($expired)));
    foreach(['email','auth_version','active'] as $changed){
        clearRecoveryLimits();$job=preparePasswordRecovery(['email'=>'learner@example.test']);
        if($changed==='email')query("UPDATE users SET email='changed@example.test' WHERE id='learner'");
        if($changed==='auth_version')query("UPDATE users SET auth_version=auth_version+1 WHERE id='learner'");
        if($changed==='active')query("UPDATE users SET active=0 WHERE id='learner'");
        rejectRecovery(fn()=>resetForgottenPassword(resetInput(recoveryToken($job))));
        query("UPDATE users SET email='learner@example.test',active=1 WHERE id='learner'");
    }
    clearRecoveryLimits();$job=preparePasswordRecovery(['email'=>'learner@example.test']);deliverPasswordRecovery($job,fn()=>[401,'{}']);checkRecovery(!one('SELECT 1 FROM password_resets WHERE token_hash=?',[$job['hash']]),'Rejected delivery erases token');
    clearRecoveryLimits();$job=preparePasswordRecovery(['email'=>'learner@example.test']);deliverPasswordRecovery($job,fn()=>[500,'{}']);checkRecovery((bool)one('SELECT 1 FROM password_resets WHERE token_hash=?',[$job['hash']]),'Uncertain delivery retains potentially delivered link');
    clearRecoveryLimits();for($i=0;$i<3;$i++){query("DELETE FROM rate_limits WHERE key LIKE '%-cooldown'");checkRecovery(preparePasswordRecovery(['email'=>'teacher@example.test'])!==null,'Three requests per hour allowed');}
    query("DELETE FROM rate_limits WHERE key LIKE '%-cooldown'");checkRecovery(preparePasswordRecovery(['email'=>'teacher@example.test'])===null,'Per-address hourly cap survives changes of client IP');
    query("DELETE FROM users WHERE id='teacher'");checkRecovery(!one("SELECT 1 FROM password_resets WHERE user_id='teacher'"),'User deletion cascades to tokens');
    echo "$checks password recovery security checks passed.\n";
}finally{foreach(glob($dir.'/*') as $f)unlink($f);rmdir($dir);}
