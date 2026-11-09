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
    $mysql->exec('CREATE TABLE studio_source_labels (code VARCHAR(10),label VARCHAR(20),missing INT NULL)');
    $mysql->exec("INSERT INTO studio_source_labels VALUES('00123','Sensor',NULL),('00456','Motor',NULL)");
    query('INSERT INTO connections VALUES(?,?,?,?,?)',[$uid,'127.0.0.1','ectro_schema_test','schema_test',encryptSecret('disposable-schema-test-password')]);
    $personal=studioReadSource($u,$other,['type'=>'mysql','scope'=>'personal','table'=>'studio_source_read']);
    if($personal['rows'][0]['code']!=='00123')throw new RuntimeException('Explicit personal source failed.');
    $spec=['type'=>'combined','mode'=>'join','tables'=>[['table'=>'studio_source_read','scope'=>'project','alias'=>'sales'],['table'=>'studio_source_labels','scope'=>'project','alias'=>'labels']],'joins'=>[['left'=>'sales.code','right'=>'code','how'=>'left']]];
    $joined=studioReadSource($u,$pid,$spec);
    if(count($joined['rows'])!==2||$joined['rows'][0]['labels.label']!=='Sensor'||$joined['columns'][5]['type']!=='number')throw new RuntimeException('Live database join or NULL numeric schema failed.');
    $mysql->exec("UPDATE studio_source_labels SET label='Updated' WHERE code='00123'");
    if(studioReadSource($u,$pid,$spec)['rows'][0]['labels.label']!=='Updated')throw new RuntimeException('Refreshing relationships must re-read live tables.');
    $appended=studioReadSource($u,$pid,[...$spec,'mode'=>'append','joins'=>[]]);
    if(count($appended['rows'])!==4||$appended['sourceColumn']!=='quelle')throw new RuntimeException('Live table comparison failed.');
    $mysql->exec('DELETE FROM studio_source_labels');
    $empty=studioReadSource($u,$pid,$spec);
    if(count($empty['rows'])!==2||$empty['rows'][0]['labels.label']!==null||$empty['columns'][5]['type']!=='number')throw new RuntimeException('Empty joined table must preserve numeric schema and base rows.');
    echo "9 MariaDB studio source checks passed: typed values, project connection isolation and read-only access.\n";
} finally {$mysql->exec('DROP TABLE IF EXISTS studio_source_labels');$mysql->exec('DROP TABLE IF EXISTS studio_source_read');}
