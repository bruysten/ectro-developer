<?php
declare(strict_types=1);
// Shared assertions: run against real MariaDB in CI and a transaction-backed SQLite adapter locally.
function checkMcpWrites(PDO $pdo,string $table,array $u):void {
    $check=function(bool $ok,string $message){if(!$ok)throw new RuntimeException($message);};
    $reject=function(int $status,callable $fn)use($check){try{$fn();throw new RuntimeException('Expected rejection '.$status);}catch(ApiError $e){$check($e->status===$status,$e->status.': '.$e->getMessage());}};
    $read=[$table=>['id','name','amount']];$writes=[$table=>['columns'=>['id','name','amount'],'insert'=>true,'update'=>true]];
    query('INSERT INTO agent_mcp_profiles(user_id,selection,write_selection,max_rows,enabled,version,connection_hash,updated_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET selection=excluded.selection,write_selection=excluded.write_selection,enabled=1,connection_hash=excluded.connection_hash',[$u['id'],labJson($read),labJson($writes),10,1,1,agentMcpConnectionHash(agentMcpConnection($u,null)),now()]);$p=agentMcpProfile($u);
    $prepare=fn(array $args,array $profile=[])=>agentMcpTool($u,$profile?:$p,'db.prepare_change',['operation'=>'update','table'=>$table,'values'=>['name'=>'Changed'],'key'=>['id'=>1],...$args],$pdo);
    $apply=fn(string $id,array $args=[])=>agentMcpTool($u,$p,'db.apply_change',['change'=>$id,'confirm'=>true,...$args],$pdo);
    $row=fn()=>$pdo->query('SELECT name FROM '.identifier($table).' WHERE id=1')->fetchColumn();
    $check(count(agentMcpTools($p))===5,'Two bounded write tools available');
    $check(count(agentMcpTools([...$p,'write_selection'=>'{}']))===3,'Read-only consent hides write tools');
    $check(count(agentMcpTools([...$p,'write_allowed'=>false]))===3,'Group denial hides write tools');
    $reject(403,fn()=>$prepare([], [...$p,'write_selection'=>'{}']));
    $reject(403,fn()=>$prepare([], [...$p,'write_allowed'=>false]));
    $check(agentMcpWriteSelection($writes,$read)===$writes,'Explicit write selection round trips');
    foreach([['columns'=>[['bad']]],['columns'=>['secret']],['columns'=>['name','name']],['insert'=>false,'update'=>false],['insert'=>1]] as $bad)$reject(422,fn()=>agentMcpWriteSelection([$table=>[...$writes[$table],...$bad]],$read));
    $reject(403,fn()=>$prepare(['values'=>['secret'=>'Forbidden']]));
    $reject(403,fn()=>$prepare(['table'=>'other']));
    $reject(422,fn()=>$prepare(['operation'=>'delete']));
    $reject(422,fn()=>$prepare(['key'=>[]]));
    $reject(422,fn()=>$prepare(['key'=>['id'=>1,'name'=>'One']]));
    $reject(422,fn()=>$prepare(['values'=>['id'=>2]]));
    $reject(422,fn()=>$prepare(['values'=>['name'=>['nested']]]));
    $reject(422,fn()=>$prepare(['sql'=>'DROP TABLE x']));
    $reject(422,fn()=>$prepare(['operation'=>'insert','values'=>['name'=>'Missing ID'],'key'=>[]]));
    $before=$row();$preview=$prepare([]);$check($row()===$before&&!$preview['applied']&&$preview['before']['name']===$before&&$preview['after']->name==='Changed','Preview never writes');
    $check(!str_contains(labJson($preview),'DO_NOT_RETURN'),'Preview cannot expose unshared columns');
    $other=id();query('INSERT INTO users(id,name,email,password,role,created_at) VALUES(?,?,?,?,?,?)',[$other,'Other writer',$other.'@example.test','unused','user',now()]);query('INSERT INTO connections SELECT ?,host,db_name,username,secret FROM connections WHERE user_id=?',[$other,$u['id']]);query('INSERT INTO agent_mcp_profiles(user_id,selection,write_selection,enabled,connection_hash,updated_at) VALUES(?,?,?,?,?,?)',[$other,$p['selection'],$p['write_selection'],1,$p['connection_hash'],now()]);$otherUser=one('SELECT * FROM users WHERE id=?',[$other]);$otherProfile=agentMcpProfile($otherUser);$reject(404,fn()=>agentMcpTool($otherUser,$otherProfile,'db.apply_change',['change'=>$preview['change'],'confirm'=>true],$pdo));
    $stored=one('SELECT payload FROM agent_mcp_changes WHERE id=?',[$preview['change']]);$check(!str_contains($stored['payload'],'Changed'),'Preview payload encrypted at rest');
    $reject(422,fn()=>$apply($preview['change'],['confirm'=>false]));$check($row()===$before,'Unconfirmed change never writes');
    $result=$apply($preview['change']);$check($row()==='Changed'&&$result['applied']&&$result['affected']===1,'Exact row update');
    $check(labJson($apply($preview['change']))===labJson($result),'Replay returns receipt without repeating mutation');
    $check(one('SELECT payload FROM agent_mcp_changes WHERE id=?',[$preview['change']])['payload']==='','Completed payload removed');
    $preview=$prepare(['values'=>['name'=>'Stale']]);$pdo->exec('UPDATE '.identifier($table)." SET name='Concurrent' WHERE id=1");$reject(409,fn()=>$apply($preview['change']));$check($row()==='Concurrent','Stale snapshot cannot overwrite newer data');$reject(409,fn()=>$apply($preview['change']));
    $preview=$prepare(['operation'=>'insert','values'=>['id'=>4,'name'=>'New','amount'=>null],'key'=>[]]);$check((int)$pdo->query('SELECT COUNT(*) FROM '.identifier($table))->fetchColumn()===3,'Insert preview has no side effects');
    $insert=$apply($preview['change']);$check($insert['affected']===1&&(string)$insert['key']->{'id'}==='4','Insert receipt identifies manual primary key');$check(labJson($apply($preview['change']))===labJson($insert)&&(int)$pdo->query('SELECT COUNT(*) FROM '.identifier($table))->fetchColumn()===4,'Insert replay never duplicates data');
    $duplicate=$prepare(['operation'=>'insert','values'=>['id'=>4,'name'=>'Duplicate'],'key'=>[]]);$reject(422,fn()=>$apply($duplicate['change']));$check(one('SELECT status FROM agent_mcp_changes WHERE id=?',[$duplicate['change']])['status']==='failed','Constraint error rolls back and records failure');
    $long=$prepare(['values'=>['name'=>str_repeat('x',100)]]);$reject(422,fn()=>$apply($long['change']));$check($row()==='Concurrent','Strict SQL never silently truncates input');
    $expired=$prepare([]);query('UPDATE agent_mcp_changes SET expires=? WHERE id=?',[time()-1,$expired['change']]);$reject(409,fn()=>$apply($expired['change']));
    $pending=$prepare([]);query('UPDATE agent_mcp_changes SET status="executing" WHERE id=?',[$pending['change']]);$reject(409,fn()=>$apply($pending['change']));query('UPDATE agent_mcp_changes SET status="uncertain" WHERE id=?',[$pending['change']]);$reject(409,fn()=>$apply($pending['change']));
    query('UPDATE users SET features=? WHERE id=?',['{"mcp_write":false}',$u['id']]);$deny=one('SELECT * FROM users WHERE id=?',[$u['id']]);$reject(403,fn()=>agentMcpTool($deny,$p,'db.prepare_change',['operation'=>'insert','table'=>$table,'values'=>['id'=>5]],$pdo));$check(!isset(agentMcpTool($deny,$p,'db.list_tables',[],$pdo)['writable']),'Denied capability not advertised');query('UPDATE users SET features=? WHERE id=?',['{}',$u['id']]);
    query('UPDATE users SET active=0 WHERE id=?',[$u['id']]);$reject(403,fn()=>$prepare([]));query('UPDATE users SET active=1 WHERE id=?',[$u['id']]);
    $key=agentMcpDispatch($u,'studio.mcp.key',['version'=>(int)$p['version']]);$cached=agentMcpAuthenticate($key['token'])[1];$preview=$prepare([],$cached);agentMcpDispatch($u,'studio.mcp.key',['version'=>(int)$p['version']]);$reject(403,fn()=>agentMcpTool($u,$cached,'db.apply_change',['change'=>$preview['change'],'confirm'=>true],$pdo));$check($row()==='Concurrent','A rotated key cannot finish its pending mutation');
    query('UPDATE agent_mcp_profiles SET version=version+1 WHERE user_id=?',[$u['id']]);$reject(403,fn()=>$prepare([]));
    $check($pdo->query('SELECT secret FROM '.identifier($table).' WHERE id=1')->fetchColumn()==='DO_NOT_RETURN','Unshared field never changed');
    echo "MCP writes verified: opt-in, column/row isolation, preview, update/insert, replay, conflicts, expiry, constraints, revocation and uncertain outcomes.\n";
}
