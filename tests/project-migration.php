<?php
declare(strict_types=1);
$dir=sys_get_temp_dir().'/ectro-migration-'.bin2hex(random_bytes(8));mkdir($dir,0700);
putenv('APP_DATA_DIR='.$dir);putenv('APP_ENV=development');
try {
    $old=new PDO('sqlite:'.$dir.'/app.sqlite');$old->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
    $schema=file_get_contents(__DIR__.'/../app/schema.sql');
    $schema=preg_replace('/CREATE TABLE IF NOT EXISTS projects .*?;/', 'CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);',$schema);
    $old->exec($schema);
    $old->exec("INSERT INTO users(id,name,email,password,role,created_at) VALUES('user','Legacy','legacy@test.invalid','unused','user','2026');INSERT INTO projects VALUES('project','user','Existing project','2026','2026');INSERT INTO files(id,project_id,path,content,updated_at) VALUES('file','project','index.html','Legacy content','2026')");
    $old=null;
    require __DIR__.'/../app/bootstrap.php';
    $db=db();$project=one('SELECT * FROM projects WHERE id=?',['project']);
    if ($project['user_id']!=='user'||$project['group_id']!==null||$project['created_by']!=='user') throw new RuntimeException('Existing ownership lost');
    if (one('SELECT * FROM files WHERE id=?',['file'])['content']!=='Legacy content') throw new RuntimeException('Existing content lost');
    if (all('PRAGMA foreign_key_check')) throw new RuntimeException('Broken foreign keys');
    query('DELETE FROM users WHERE id=?',['user']);
    if (one('SELECT id FROM projects')||one('SELECT id FROM files')) throw new RuntimeException('Personal deletion cascade broken');
    echo "Existing database migration, content and cascades verified.\n";
} finally {
    foreach(glob($dir.'/*') as $file)unlink($file);rmdir($dir);
}
