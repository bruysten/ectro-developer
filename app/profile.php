<?php
declare(strict_types=1);
function profileData(string $uid):array {
    $p=one('SELECT first_name,last_name,bio,urls,picture_version,version,picture IS NOT NULL AS has_picture FROM user_profiles WHERE user_id=?',[$uid]);
    return $p?['first_name'=>$p['first_name'],'last_name'=>$p['last_name'],'bio'=>$p['bio'],'urls'=>json_decode($p['urls'],true),'picture_version'=>(int)$p['picture_version'],'has_picture'=>(bool)$p['has_picture'],'version'=>(int)$p['version']]:['first_name'=>'','last_name'=>'','bio'=>'','urls'=>[],'picture_version'=>0,'has_picture'=>false,'version'=>0];
}
function profilePicture(mixed $value):?array {
    if($value===null)return null;if($value==='remove')return ['content'=>null,'mime'=>null];
    if(!is_string($value)||strlen($value)>750000||!preg_match('~^data:image/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$~D',$value,$m))fail(422,'Bitte ein gültiges Profilbild hochladen.');
    $bytes=base64_decode($m[2],true);if($bytes===false||strlen($bytes)>524288)fail(413,'Das vorbereitete Profilbild darf höchstens 512 KB groß sein.');
    $info=@getimagesizefromstring($bytes);$mime=$info['mime']??'';
    if(!$info||!in_array($mime,['image/jpeg','image/png','image/webp'],true)||$mime!=='image/'.$m[1]||$info[0]<64||$info[1]<64||$info[0]>1024||$info[1]>1024)fail(422,'Bitte ein gültiges Bild mit 64–1024 Pixeln pro Seite verwenden.');
    return ['content'=>$bytes,'mime'=>$mime];
}
function saveProfile(array $u,array $data):array {
    foreach(array_keys($data) as $field)if(!in_array($field,['name','first_name','last_name','bio','urls','picture','version'],true))fail(422,'Dieses Profilfeld kann nicht geändert werden.');
    $name=textField($data,'name',120);$first=textField($data,'first_name',80,false);$last=textField($data,'last_name',80,false);$bio=textField($data,'bio',2000,false);
    foreach([$name,$first,$last] as $value)if(preg_match('/[\x00-\x1f\x7f]/',$value))fail(422,'Bitte Namen ohne Steuerzeichen eingeben.');
    $urls=$data['urls']??[];if(!is_array($urls)||!array_is_list($urls)||count($urls)>8)fail(422,'Bitte höchstens acht Profil-Links angeben.');$clean=[];
    foreach($urls as $link){if(!is_array($link))fail(422,'Bitte die Profil-Links prüfen.');$label=textField($link,'label',60,false);$url=textField($link,'url',500);$parts=parse_url($url);if(!filter_var($url,FILTER_VALIDATE_URL)||!$parts||!in_array($parts['scheme']??'', ['https','http'],true)||isset($parts['user'])||isset($parts['pass']))fail(422,'Profil-Links müssen mit https:// oder http:// beginnen und dürfen keine Zugangsdaten enthalten.');$clean[]=['label'=>$label?:$parts['host'],'url'=>$url];}
    $picture=profilePicture($data['picture']??null);$version=$data['version']??null;if(!is_int($version)||$version<0)fail(422,'Bitte das Profil neu öffnen.');
    transaction(function()use($u,$name,$first,$last,$bio,$clean,$picture,$version){$old=one('SELECT version FROM user_profiles WHERE user_id=?',[$u['id']]);if(($old?(int)$old['version']:0)!==$version)fail(409,'Ihr Profil wurde inzwischen geändert. Bitte erneut öffnen.');
        query('INSERT INTO user_profiles(user_id,first_name,last_name,bio,urls,version,updated_at) VALUES(?,?,?,?,?,1,?) ON CONFLICT(user_id) DO UPDATE SET first_name=excluded.first_name,last_name=excluded.last_name,bio=excluded.bio,urls=excluded.urls,version=user_profiles.version+1,updated_at=excluded.updated_at',[$u['id'],$first,$last,$bio,json_encode($clean),now()]);
        if($picture!==null){$statement=db()->prepare('UPDATE user_profiles SET picture=?,picture_mime=?,picture_version=picture_version+1 WHERE user_id=?');$statement->bindValue(1,$picture['content'],$picture['content']===null?PDO::PARAM_NULL:PDO::PARAM_LOB);$statement->bindValue(2,$picture['mime']);$statement->bindValue(3,$u['id']);$statement->execute();}
        query('UPDATE users SET name=? WHERE id=?',[$name,$u['id']]);audit($u['id'],'profile.save');
    });return safeUser(one('SELECT * FROM users WHERE id=?',[$u['id']]));
}
