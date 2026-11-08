<?php
declare(strict_types=1);

function aiAdmin(array $u):void {if($u['role']!=='admin')fail(403,'Administratorfunktion.');}
function aiGroupGrant(array $u,string $pid,array $connection):?array {
    if($connection['user_id']===$u['id'])return null;
    $project=one('SELECT group_id FROM projects WHERE id=?',[$pid]);
    $rows=all('SELECT grant.*,g.name group_name FROM ai_group_grants grant JOIN groups g ON g.id=grant.group_id JOIN group_members m ON m.group_id=g.id WHERE m.user_id=? AND grant.connection_id=? AND '.groupOpenSql('g.id').($project['group_id']?' AND g.id=?':'').' ORDER BY g.name,g.id',[$u['id'],$connection['id'],...($project['group_id']?[$project['group_id']]:[])]);
    $current=addressInfo($u)['group_id'];foreach($rows as $row)if($row['group_id']===$current)return $row;
    return $rows[0]??null;
}
function aiGroupUsage(string $gid,string $cid):array {
    $usage=one('SELECT COUNT(*) calls,COALESCE(SUM(a.tokens),0) tokens FROM ai_call_groups scope JOIN ai_calls a ON a.id=scope.call_id WHERE scope.group_id=? AND a.connection_id=?',[$gid,$cid]);
    return ['calls'=>(int)$usage['calls'],'tokens'=>(int)$usage['tokens']];
}
function aiGroupSave(array $u,array $data):array {
    aiAdmin($u);return transaction(function()use($u,$data){
        $gid=textField($data,'group',32);$cid=textField($data,'connection',32);
        if(!one('SELECT id FROM groups WHERE id=?',[$gid])||!one('SELECT id FROM ai_connections WHERE id=? AND shared=1',[$cid]))fail(404,'Gruppe oder bereitgestellte Verbindung nicht gefunden.');
        $old=one('SELECT * FROM ai_group_grants WHERE group_id=? AND connection_id=?',[$gid,$cid]);
        if(($data['version']??null)!==(int)($old['version']??0))fail(409,'Die Gruppenfreigabe wurde inzwischen geändert.');
        if(($data['remove']??false)===true){query('DELETE FROM ai_group_grants WHERE group_id=? AND connection_id=?',[$gid,$cid]);audit($u['id'],'ai.group.revoke');return ['ok'=>true];}
        foreach(['max_calls'=>100000,'max_tokens'=>100000000,'max_output_tokens'=>16384] as $key=>$max)if(!is_int($data[$key]??null)||$data[$key]<($key==='max_output_tokens'?16:1)||$data[$key]>$max)fail(422,'Ungültiges Budget: '.$key.'.');
        query('INSERT INTO ai_group_grants(group_id,connection_id,max_calls,max_tokens,max_output_tokens,version) VALUES(?,?,?,?,?,1) ON CONFLICT(group_id,connection_id) DO UPDATE SET max_calls=excluded.max_calls,max_tokens=excluded.max_tokens,max_output_tokens=excluded.max_output_tokens,version=ai_group_grants.version+1',[$gid,$cid,$data['max_calls'],$data['max_tokens'],$data['max_output_tokens']]);
        audit($u['id'],'ai.group.save');return one('SELECT * FROM ai_group_grants WHERE group_id=? AND connection_id=?',[$gid,$cid]);
    });
}
function aiConnectionDelete(array $u,array $data,bool $admin=false):void {
    if($admin)aiAdmin($u);else needFeature($u,'ai');
    transaction(function()use($u,$data,$admin){$c=one('SELECT * FROM ai_connections WHERE id=?',[textField($data,'id',32)]);
        if(!$c||($c['user_id']!==$u['id']&&!($admin&&$c['shared'])))fail(404,'Verbindung nicht gefunden.');
        if($c['provider']==='daimon'&&$u['role']!=='admin')fail(403,'Administratorfunktion.');
        if(($data['version']??null)!==(int)$c['version'])fail(409,'Inzwischen geändert.');
        query('DELETE FROM ai_connections WHERE id=?',[$c['id']]);audit($u['id'],'ai.connection.delete');
    });
}
