<?php
require __DIR__.'/../app/bootstrap.php';require __DIR__.'/../app/mysql.php';
$cases=[
    ['SELECT * FROM people LIMIT 10;',true],
    ["INSERT INTO people(name) VALUES('Sam');",true],
    ["SELECT 'hello;world' as value",true],
    ['CREATE TABLE people (id INT PRIMARY KEY, name VARCHAR(255))',true],
    ['ALTER TABLE people ADD COLUMN age INT',true],
    ['SELECT 1; DROP TABLE people',false],
    ["SELECT * INTO OUTFILE '/tmp/leak' FROM people",false],
    ["SELECT LOAD_FILE('/etc/passwd')",false],
    ['SELECT SLEEP(100)',false],
    ['SELECT BENCHMARK(999999999,1+1)',false],
    ['GRANT ALL ON *.* TO root',false],
    ['SELECT /* hidden */ 1',false],
    ['SELECT 1 /*!50000 INTO OUTFILE */',false],
    ['SELECT * FROM mysql.user',false],
    ['USE another_database',false],
    ['CREATE FUNCTION p RETURNS INTEGER SONAME "evil.so"',false],
];
foreach($cases as [$sql,$expected]) {
    try {validateSql($sql);$actual=true;}catch(ApiError){$actual=false;}
    if($actual!==$expected){fwrite(STDERR,"SQL policy failed: $sql\n");exit(1);}
}
echo count($cases)." SQL policy checks passed.\n";
