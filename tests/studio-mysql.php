<?php
declare(strict_types=1);
$dsn=getenv('MYSQL_SCHEMA_TEST_DSN');
if (!$dsn) {echo "MariaDB studio source checks skipped: isolated service not configured.\n";exit;}
if ($dsn!=='mysql:host=127.0.0.1;port=3306;dbname=ectro_schema_test') throw new RuntimeException('Only the isolated local schema-test service is allowed.');
$private=sys_get_temp_dir().'/ectro-studio-mysql-'.bin2hex(random_bytes(6));mkdir($private,0700);
putenv('APP_DATA_DIR='.$private);putenv('APP_ENV=development');putenv('APP_KEY='.base64_encode(random_bytes(32)));
register_shutdown_function(function()use($private){foreach(glob($private.'/*') as $file)unlink($file);rmdir($private);});
require __DIR__.'/../app/bootstrap.php';require __DIR__.'/../app/templates.php';require __DIR__.'/../app/mysql.php';require __DIR__.'/../app/lab-api.php';
$uid=id();query('INSERT INTO users(id,name,email,password,role,created_at) VALUES(?,?,?,?,?,?)',[$uid,'Source test','source@example.test','unused','user',now()]);$u=one('SELECT * FROM users WHERE id=?',[$uid]);
$pid=createProject($u,'SQL source','web');$other=createProject($u,'No connection','web');
$mysql=new PDO($dsn,'schema_test','disposable-schema-test-password',[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
try {
    $mysql->exec('CREATE TABLE studio_source_read (id INT PRIMARY KEY,code VARCHAR(10),value DECIMAL(10,2) NULL) ENGINE=InnoDB');
    $mysql->exec("INSERT INTO studio_source_read VALUES(1,'00123',8.50),(2,'00456',NULL)");
    query('INSERT INTO project_connections VALUES(?,?,?,?,?)',[$pid,'127.0.0.1','ectro_schema_test','schema_test',encryptSecret('disposable-schema-test-password')]);
    $read=studioReadSource($u,$pid,['type'=>'mysql','table'=>'studio_source_read']);
    if($read['rows'][0]['code']!=='00123'||$read['rows'][0]['value']!==8.5||$read['rows'][1]['value']!==null)throw new RuntimeException('MariaDB source must preserve text identifiers, numeric decimals and NULL.');
    try {studioReadSource($u,$other,['type'=>'mysql','table'=>'studio_source_read']);throw new RuntimeException('Source borrowed another project connection.');}catch(ApiError $e){if($e->status!==422)throw $e;}
    if((int)$mysql->query('SELECT COUNT(*) FROM studio_source_read')->fetchColumn()!==2)throw new RuntimeException('Source read changed data.');
    echo "3 MariaDB studio source checks passed: typed values, project connection isolation and read-only access.\n";
} finally {$mysql->exec('DROP TABLE IF EXISTS studio_source_read');}
