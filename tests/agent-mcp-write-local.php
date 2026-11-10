<?php
declare(strict_types=1);
$private=sys_get_temp_dir().'/ectro-mcp-write-'.bin2hex(random_bytes(6));mkdir($private,0700);putenv('APP_DATA_DIR='.$private);putenv('APP_ENV=development');putenv('APP_KEY='.base64_encode(random_bytes(32)));
require __DIR__.'/../app/bootstrap.php';require __DIR__.'/../app/templates.php';require __DIR__.'/../app/mysql.php';require __DIR__.'/../app/lab-api.php';require __DIR__.'/agent-mcp-write.php';
// The adapter exercises transactions/constraints locally. CI additionally runs this suite on real MariaDB.
class McpWriteTestDatabase extends PDO {
    public bool $ambiguousCommit=false;
    public string $engine='InnoDB';
    public array $columns=[];
    function __construct(){parent::__construct('sqlite::memory:',null,null,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);$this->exec('CREATE TABLE baskets(id INT PRIMARY KEY,name VARCHAR(80) CHECK(length(name)<=80),amount DECIMAL(8,2),secret VARCHAR(80))');$this->exec("INSERT INTO baskets VALUES(1,'One',12.25,'DO_NOT_RETURN'),(2,'Two',NULL,'DO_NOT_RETURN'),(3,'Three',0,'DO_NOT_RETURN')");foreach(['id','name','amount','secret'] as $c)$this->columns[]=['Field'=>$c,'Type'=>$c==='id'?'int':'varchar(80)','Null'=>$c==='id'?'NO':'YES','Key'=>$c==='id'?'PRI':'','Default'=>null,'Extra'=>''];}
    function prepare(string $query,array $options=[]):PDOStatement|false {if(str_contains($query,'information_schema.TABLES'))return parent::prepare("SELECT 'BASE TABLE' AS TABLE_TYPE,".$this->quote($this->engine).' AS ENGINE WHERE ? IS NOT NULL',$options);return parent::prepare(str_replace([' <=> ',' FOR UPDATE',' LIMIT 1'],[' IS ','',''],$query),$options);}
    function query(string $query,?int $fetchMode=null,mixed ...$fetchModeArgs):PDOStatement|false {if(str_starts_with($query,'SHOW COLUMNS FROM '))$query=implode(' UNION ALL ',array_map(fn($c)=>'SELECT '.implode(',',array_map(fn($v,$k)=>($v===null?'NULL':$this->quote($v)).' AS '.identifier($k),array_values($c),array_keys($c))),$this->columns));return parent::query($query,...($fetchMode===null?[]:[$fetchMode,...$fetchModeArgs]));}
    function exec(string $statement):int|false {return str_starts_with($statement,'SET SESSION ')?0:parent::exec($statement);}
    function commit():bool {$result=parent::commit();if($this->ambiguousCommit)throw new PDOException('Synthetic lost connection during commit');return $result;}
}
try {
    $uid=id();query('INSERT INTO users(id,name,email,password,role,created_at) VALUES(?,?,?,?,?,?)',[$uid,'Synthetic','write@example.test','unused','user',now()]);query('INSERT INTO connections VALUES(?,?,?,?,?)',[$uid,'localhost','synthetic','synthetic',encryptSecret('fake')]);$u=one('SELECT * FROM users WHERE id=?',[$uid]);$pdo=new McpWriteTestDatabase();checkMcpWrites($pdo,'baskets',$u);
    $p=agentMcpProfile($u);$args=['operation'=>'update','table'=>'baskets','values'=>['name'=>'Ambiguous'],'key'=>['id'=>1]];
    foreach(['MyISAM','MEMORY'] as $engine){$pdo->engine=$engine;try{agentMcpPrepareChange($u,$p,$args,$pdo);throw new RuntimeException('Nontransactional engine accepted');}catch(ApiError $e){if($e->status!==422)throw $e;}}$pdo->engine='InnoDB';
    $original=$pdo->columns;foreach(['no-key','generated','automatic'] as $kind){$pdo->columns=$original;foreach($pdo->columns as &$column){if($kind==='no-key')$column['Key']='';elseif($column['Field']==='id')$column['Extra']=$kind==='generated'?'VIRTUAL GENERATED':'auto_increment';}unset($column);try{agentMcpPrepareChange($u,$p,$args,$pdo);throw new RuntimeException('Unsafe schema accepted: '.$kind);}catch(ApiError $e){if($e->status!==422)throw $e;}}$pdo->columns=$original;
    $preview=agentMcpPrepareChange($u,$p,$args,$pdo);$pdo->ambiguousCommit=true;try{agentMcpApplyChange($u,$p,['change'=>$preview['change'],'confirm'=>true],$pdo);throw new RuntimeException('Lost commit response accepted');}catch(ApiError $e){if($e->status!==409)throw $e;}
    if(one('SELECT status FROM agent_mcp_changes WHERE id=?',[$preview['change']])['status']!=='uncertain')throw new RuntimeException('Ambiguous commit must be recorded');
    try{agentMcpApplyChange($u,$p,['change'=>$preview['change'],'confirm'=>true],$pdo);throw new RuntimeException('Uncertain mutation retried');}catch(ApiError $e){if($e->status!==409)throw $e;}
    echo "Nontransactional tables rejected; ambiguous commit cannot be retried.\n";
}finally{$it=new RecursiveIteratorIterator(new RecursiveDirectoryIterator($private,FilesystemIterator::SKIP_DOTS),RecursiveIteratorIterator::CHILD_FIRST);foreach($it as $f)$f->isDir()?rmdir($f->getPathname()):unlink($f->getPathname());rmdir($private);}
