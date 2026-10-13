<?php
declare(strict_types=1);
require __DIR__.'/../app/bootstrap.php';require __DIR__.'/../app/mysql.php';require __DIR__.'/../app/sql-training.php';
$cols=[['Field'=>'id','Type'=>'INT','Null'=>'NO','Default'=>null,'Key'=>'PRI','Extra'=>'auto_increment'],['Field'=>'name','Type'=>'VARCHAR(80)','Null'=>'NO','Default'=>null,'Key'=>'','Extra'=>''],['Field'=>'price','Type'=>'DECIMAL(10,2)','Null'=>'YES','Default'=>null,'Key'=>'','Extra'=>'']];
$checks=0;function trainingCheck(bool $ok,string $label):void{global $checks;if(!$ok){fwrite(STDERR,"Training check failed: $label\n");exit(1);}++$checks;}
$insert=['action'=>'insert','table'=>'products','values'=>['name'=>"O'Brien",'price'=>'8.5']];
$q=composeTrainingSql($insert,$cols,'mysql');trainingCheck($q['sql']==='INSERT INTO `products` (`name`, `price`) VALUES (?, ?)'&&$q['params']===["O'Brien",'8.5'],'INSERT uses native parameters');
$q=composeTrainingSql([...$insert,'rows'=>[$insert['values'],['name'=>'Second','price'=>null]]],$cols);trainingCheck(count($q['params'])===4&&$q['params'][3]===null,'Multi-row insert and NULL');
$filter=[['column'=>'id','operator'=>'>=','value'=>'1']];
$q=composeTrainingSql(['action'=>'select','table'=>'products','columns'=>['name'],'conditions'=>$filter,'order'=>[['column'=>'price','direction'=>'DESC']],'distinct'=>true,'limit'=>5],$cols,'mysql');trainingCheck($q['sql']==='SELECT DISTINCT `name` FROM `products` WHERE `id` >= ? ORDER BY `price` DESC LIMIT 5','SELECT composition');
$q=composeTrainingSql(['action'=>'update','table'=>'products','values'=>['price'=>'9.5'],'conditions'=>$filter,'limit'=>1],$cols,'mysql');trainingCheck($q['params']===['9.5','1']&&str_ends_with($q['sql'],'LIMIT 1'),'UPDATE bind order and limit');
$q=composeTrainingSql(['action'=>'delete','table'=>'products','conditions'=>$filter,'limit'=>2],$cols);trainingCheck(str_contains($q['sql'],'rowid IN (SELECT rowid')&&str_ends_with($q['sql'],'LIMIT 2)'),'Practice mutation limit adapter');
$bad=[['action'=>'drop','table'=>'products'],['action'=>'select','table'=>'../private'],['action'=>'select','table'=>'products','columns'=>['secret']],['action'=>'delete','table'=>'products'],['action'=>'update','table'=>'products','values'=>['name'=>'unsafe']],['action'=>'select','table'=>'products','conditions'=>[['column'=>'id','operator'=>'= ?; DROP TABLE products','value'=>'1']]],['action'=>'select','table'=>'products','conditions'=>[['column'=>'id','operator'=>'LIKE','value'=>'%']]],['action'=>'select','table'=>'products','limit'=>101],['action'=>'select','table'=>'products','limit'=>0],['action'=>'select','table'=>'products','limit'=>'10'],['action'=>'select','table'=>'products','order'=>[['column'=>'id','direction'=>'DESC;DROP']]],['action'=>'insert','table'=>'products','values'=>['name'=>null]],['action'=>'insert','table'=>'products','values'=>['price'=>'not numeric']],['action'=>'insert','table'=>'products','values'=>['name'=>'first'],'rows'=>[['price'=>'1']]]];
foreach($bad as $model){try{composeTrainingSql($model,$cols);trainingCheck(false,'Invalid model accepted');}catch(ApiError $e){trainingCheck($e->status===422,'Invalid model rejected');}}
$q=composeTrainingSql(['action'=>'select','table'=>'products','conditions'=>[['column'=>'name','operator'=>'=','value'=>"'; DELETE FROM products; --"]]],$cols);trainingCheck(!str_contains($q['sql'],'DELETE')&&$q['params']===["'; DELETE FROM products; --"],'Injected text remains parameter data');
echo "$checks SQL training compiler/security checks passed.\n";

$dsn=getenv('MYSQL_SCHEMA_TEST_DSN');
if(!$dsn){echo "MariaDB training execution checks skipped: isolated service not configured.\n";exit;}
if(!preg_match('/^mysql:host=127\.0\.0\.1;port=[0-9]+;dbname=ectro_schema_test$/',$dsn))throw new RuntimeException('Only isolated local schema-test database allowed.');
$pdo=new PDO($dsn,'schema_test','disposable-schema-test-password',[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES=>false,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
$before=$checks;
try{
    $pdo->exec('CREATE TABLE training_products (id INT PRIMARY KEY AUTO_INCREMENT,name VARCHAR(80) NOT NULL,price DECIMAL(10,2) NULL) ENGINE=InnoDB');
    $realColumns=tableColumns($pdo,'training_products');
    $run=function(array $model)use($pdo,$realColumns){$q=composeTrainingSql([...$model,'table'=>'training_products'],$realColumns,'mysql');$st=$pdo->prepare($q['sql']);$st->execute($q['params']);return $st;};
    trainingCheck($run(['action'=>'insert','values'=>['name'=>"O'Brien",'price'=>'8.50'],'rows'=>[['name'=>"O'Brien",'price'=>'8.50'],['name'=>'Second','price'=>null]]])->rowCount()===2,'MariaDB multi-row native INSERT');
    $rows=$run(['action'=>'select','columns'=>['name','price'],'conditions'=>[['column'=>'name','operator'=>'LIKE','value'=>'O%']]])->fetchAll();
    trainingCheck($rows===[['name'=>"O'Brien",'price'=>'8.50']],'MariaDB SELECT preserves apostrophe and decimal');
    trainingCheck($run(['action'=>'update','values'=>['price'=>'9.75'],'conditions'=>[['column'=>'id','operator'=>'>=','value'=>'1']],'limit'=>1])->rowCount()===1,'MariaDB UPDATE respects limit');
    trainingCheck($run(['action'=>'delete','conditions'=>[['column'=>'id','operator'=>'>=','value'=>'1']],'limit'=>1])->rowCount()===1&&(int)$pdo->query('SELECT COUNT(*) FROM training_products')->fetchColumn()===1,'MariaDB DELETE respects limit');
    echo ($checks-$before)." MariaDB training execution checks passed.\n";
}finally{$pdo->exec('DROP TABLE IF EXISTS training_products');}
