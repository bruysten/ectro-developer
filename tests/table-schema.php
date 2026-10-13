<?php
declare(strict_types=1);
require __DIR__.'/../app/bootstrap.php';require __DIR__.'/../app/mysql.php';
$checks=0;
function schemaCheck(bool $condition,string $label): void {global $checks;if(!$condition){fwrite(STDERR,"Schema check failed: $label\n");exit(1);}++$checks;}
$plain=[['name'=>'name','type'=>'VARCHAR(255)']];
$sql=createTableSql('people',$plain);
schemaCheck(!str_contains($sql,'`id`')&&!str_contains($sql,'PRIMARY KEY')&&!str_contains($sql,'AUTO_INCREMENT'),'No implicit ID, key or increment');
$fields=[['name'=>'id','type'=>'INT','key'=>'primary','auto_increment'=>true],['name'=>'email','type'=>'VARCHAR(255)','key'=>'unique','nullable'=>false],['name'=>'name','type'=>'VARCHAR(255)','key'=>'index']];
$sql=createTableSql('people',$fields);
schemaCheck(str_contains($sql,'`id` INT NOT NULL AUTO_INCREMENT')&&str_contains($sql,'PRIMARY KEY (`id`)'),'Explicit ID and auto increment');
schemaCheck(str_contains($sql,'UNIQUE KEY (`email`)')&&str_contains($sql,'KEY (`name`)'),'Unique and search index');
$compound=[['name'=>'course','type'=>'INT','key'=>'primary'],['name'=>'learner','type'=>'INT','key'=>'primary']];
schemaCheck(str_contains(createTableSql('memberships',$compound),'PRIMARY KEY (`course`,`learner`)'),'Composite primary key');
foreach(['TEXT','INT','BIGINT UNSIGNED','DECIMAL(10,2)','DATE','DATETIME','BOOLEAN'] as $type) schemaCheck(str_contains(createTableSql('example',[['name'=>'value','type'=>$type]]),$type),'Supported type');
$invalid=[[],array_fill(0,31,$plain[0]),['bad'],[['name'=>'id','type'=>'INT'],['name'=>'ID','type'=>'INT']],[['name'=>'x` INT); DROP TABLE people; --','type'=>'INT']],[['name'=>'x','type'=>'INT); DROP TABLE people']],[['name'=>'x','type'=>'TEXT','key'=>'unique']],[['name'=>'x','type'=>'INT','key'=>'other']],[['name'=>'x','type'=>'INT','key'=>'primary','nullable'=>true]],[['name'=>'x','type'=>'INT','nullable'=>'false']],[['name'=>'x','type'=>'INT','auto_increment'=>1]],[['name'=>'x','type'=>'INT','auto_increment'=>true]],[['name'=>'x','type'=>'VARCHAR(255)','key'=>'primary','auto_increment'=>true]],[['name'=>'x','type'=>'INT','key'=>'primary','auto_increment'=>true],['name'=>'y','type'=>'INT','key'=>'primary']]];
foreach($invalid as $fieldsToReject){try{createTableSql('people',$fieldsToReject);schemaCheck(false,'Invalid schema accepted');}catch(ApiError $e){schemaCheck($e->status===422,'Invalid schema rejected');}}
try{createTableSql('people; DROP TABLE x',$plain);schemaCheck(false,'Invalid table accepted');}catch(ApiError $e){schemaCheck($e->status===422,'Invalid table rejected');}
schemaCheck(columnSqlType(['type'=>'VARCHAR','length'=>80])==='VARCHAR(80)','Explicit character limit');
schemaCheck(columnSqlType(['type'=>'DECIMAL','precision'=>12,'scale'=>3])==='DECIMAL(12,3)','Explicit decimal precision and scale');
schemaCheck(columnSqlType(['type'=>'DECIMAL','precision'=>1,'scale'=>0])==='DECIMAL(1,0)','Zero decimal places accepted');
schemaCheck(columnSqlType(['type'=>'DECIMAL','precision'=>65,'scale'=>30])==='DECIMAL(65,30)','Portable decimal boundary accepted');
schemaCheck(columnSqlType(['type'=>'VARCHAR','length'=>16383])==='VARCHAR(16383)','Non-indexed character boundary accepted');
schemaCheck(columnSqlType(['type'=>'VARCHAR','length'=>768,'key'=>'unique'])==='VARCHAR(768)','Indexed character boundary accepted');
foreach([
 ['type'=>'VARCHAR','length'=>0],['type'=>'VARCHAR','length'=>16384],['type'=>'VARCHAR','length'=>'80'],['type'=>'VARCHAR','length'=>1.5],['type'=>'VARCHAR','length'=>null],['type'=>'VARCHAR','length'=>'80); DROP TABLE x'],['type'=>'VARCHAR','length'=>769,'key'=>'primary'],
 ['type'=>'DECIMAL','precision'=>0,'scale'=>0],['type'=>'DECIMAL','precision'=>66,'scale'=>2],['type'=>'DECIMAL','precision'=>5,'scale'=>6],['type'=>'DECIMAL','precision'=>40,'scale'=>31],['type'=>'DECIMAL','precision'=>10,'scale'=>-1],['type'=>'DECIMAL','precision'=>'10','scale'=>2],['type'=>'DECIMAL','precision'=>10,'scale'=>'2'],['type'=>'DECIMAL','precision'=>10,'scale'=>null],
 ['type'=>'INT','length'=>11],['type'=>'DATE','precision'=>10],['type'=>'VARCHAR','scale'=>2],['type'=>'DECIMAL','length'=>20]
] as $invalidType){try{columnSqlType($invalidType);schemaCheck(false,'Invalid type parameters accepted');}catch(ApiError $e){schemaCheck($e->status===422,'Invalid type parameters rejected');}}
echo "$checks schema validation checks passed.\n";
$dsn=getenv('MYSQL_SCHEMA_TEST_DSN');
if(!$dsn){echo "MariaDB execution checks skipped: isolated test service not configured.\n";exit;}
if(!preg_match('/^mysql:host=127\.0\.0\.1;port=[0-9]+;dbname=ectro_schema_test$/',$dsn)) throw new RuntimeException('Only isolated local schema-test database allowed.');
$pdo=new PDO($dsn,'schema_test','disposable-schema-test-password',[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
$tables=['schema_plain','schema_keys','schema_compound','schema_dimensions'];$before=$checks;
try {
    $pdo->exec(createTableSql($tables[0],$plain));
    schemaCheck(array_column($pdo->query('SHOW COLUMNS FROM schema_plain')->fetchAll(PDO::FETCH_ASSOC),'Field')===['name'],'MariaDB has exactly requested columns');
    $pdo->exec(createTableSql($tables[1],$fields));
    $columns=$pdo->query('SHOW COLUMNS FROM schema_keys')->fetchAll(PDO::FETCH_ASSOC);
    schemaCheck($columns[0]['Key']==='PRI'&&$columns[0]['Null']==='NO'&&$columns[0]['Extra']==='auto_increment','MariaDB primary/NULL/increment metadata');
    schemaCheck($columns[1]['Key']==='UNI'&&$columns[2]['Key']==='MUL','MariaDB unique and index metadata');
    $pdo->exec("INSERT INTO schema_keys(email,name) VALUES('first@test.invalid','Sam'),('second@test.invalid','Sam')");
    schemaCheck($pdo->query('SELECT id FROM schema_keys ORDER BY id')->fetchAll(PDO::FETCH_COLUMN)===[1,2],'Auto increment and nonunique index accept rows');
    try{$pdo->exec("INSERT INTO schema_keys(email,name) VALUES('first@test.invalid','Other')");schemaCheck(false,'Duplicate unique value accepted');}catch(PDOException $e){schemaCheck((int)$e->errorInfo[1]===1062,'Unique constraint rejects duplicates');}
    try{$pdo->exec("INSERT INTO schema_keys(id,email) VALUES(1,'third@test.invalid')");schemaCheck(false,'Duplicate primary key accepted');}catch(PDOException $e){schemaCheck((int)$e->errorInfo[1]===1062,'Primary key rejects duplicates');}
    $pdo->exec(createTableSql($tables[2],$compound));
    $pdo->exec('INSERT INTO schema_compound VALUES(1,1),(1,2),(2,1)');
    schemaCheck((int)$pdo->query('SELECT COUNT(*) FROM schema_compound')->fetchColumn()===3,'Composite key permits separate combinations');
    try{$pdo->exec('INSERT INTO schema_compound VALUES(1,1)');schemaCheck(false,'Duplicate composite accepted');}catch(PDOException $e){schemaCheck((int)$e->errorInfo[1]===1062,'Composite key rejects duplicate combinations');}
    $pdo->exec(createTableSql('schema_dimensions',[['name'=>'name','type'=>'VARCHAR','length'=>43],['name'=>'amount','type'=>'DECIMAL','precision'=>7,'scale'=>3]]));
    $dimensions=$pdo->query('SHOW COLUMNS FROM schema_dimensions')->fetchAll(PDO::FETCH_ASSOC);
    schemaCheck($dimensions[0]['Type']==='varchar(43)'&&$dimensions[1]['Type']==='decimal(7,3)','MariaDB preserves explicit dimensions');
    $pdo->exec("INSERT INTO schema_dimensions VALUES('Dimension check',12.125)");
    schemaCheck($pdo->query('SELECT amount FROM schema_dimensions')->fetchColumn()==='12.125','Declared decimal places preserve value');
    echo ($checks-$before)." MariaDB schema execution checks passed.\n";
} finally {foreach($tables as $table)$pdo->exec('DROP TABLE IF EXISTS '.identifier($table));}
