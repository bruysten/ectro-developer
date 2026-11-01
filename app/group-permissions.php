<?php
declare(strict_types=1);
function groupVersion(string $gid): int {return (int)(one('SELECT version FROM group_revisions WHERE group_id=?',[$gid])['version']??1);}
function bumpGroupVersion(string $gid): int {
    query('INSERT INTO group_revisions(group_id,version) VALUES(?,2) ON CONFLICT(group_id) DO UPDATE SET version=version+1',[$gid]);return groupVersion($gid);
}
function compareGroupVersion(string $gid,mixed $version): void {
    if(!is_int($version)||$version!==groupVersion($gid))fail(409,'Diese Gruppe wurde inzwischen geändert. Ihr Entwurf bleibt erhalten. Bitte die aktuellen Gruppenrechte laden.');
}
function saveGroupPermissions(array $u,array $data): array {
    $gid=textField($data,'id',32);if(!array_key_exists('features',$data))fail(422,'Gruppenrechte fehlen.');$flags=featureInput($data['features']);
    return transaction(function()use($u,$data,$gid,$flags){if(!one('SELECT id FROM groups WHERE id=?',[$gid]))fail(404,'Gruppe nicht gefunden.');compareGroupVersion($gid,$data['version']??null);query('UPDATE groups SET features=? WHERE id=?',[$flags,$gid]);$version=bumpGroupVersion($gid);audit($u['id'],'admin.group.permissions',['group'=>$gid]);return ['id'=>$gid,'features'=>json_decode($flags,true),'version'=>$version];});
}
