<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require __DIR__.'/../app/bootstrap.php';require __DIR__.'/../app/templates.php';
if(config()['environment']!=='development'){fwrite(STDERR,"Demo nur in APP_ENV=development erlaubt.\n");exit(1);}
foreach ([['Kursleitung','admin@example.test','admin'],['Alex Weber','alex@example.test','user'],['Robin Fischer','robin@example.test','user']] as [$name,$email,$role]) {
    if(one('SELECT id FROM users WHERE email=?',[$email]))continue;
    $uid=id();query('INSERT INTO users(id,name,email,password,role,created_at) VALUES(?,?,?,?,?,?)',[$uid,$name,$email,password_hash('development-demo-2026!',PASSWORD_DEFAULT),$role,now()]);
    if($role==='user') {
        $gid=one('SELECT id FROM groups LIMIT 1')['id']??id();if(!one('SELECT id FROM groups WHERE id=?',[$gid]))query('INSERT INTO groups VALUES(?,?,?,?,?)',[$gid,'Webentwicklung · Grundlagen','Unser gemeinsamer Raum für Fragen, Entwürfe und Fortschritt.','{}',now()]);
        query('INSERT INTO group_members VALUES(?,?)',[$gid,$uid]);
        $u=one('SELECT * FROM users WHERE id=?',[$uid]);
        createProject($u,'Meine erste Website','web');createProject($u,'Dynamische Seiten','php');createProject($u,'Python entdecken','python');
    }
}
echo "Lokale Demo vorbereitet.\n";
