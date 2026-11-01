<?php
declare(strict_types=1);
const GROUP_PERIOD_ZONE='Europe/Berlin';
const GROUP_PERIOD_FIELDS=['access_start','access_end','course_start','course_end'];
function groupPeriods(string $gid): array {
    return one('SELECT access_start,access_end,course_start,course_end,access_start_at,access_end_before FROM group_periods WHERE group_id=?',[$gid])??array_fill_keys([...GROUP_PERIOD_FIELDS,'access_start_at','access_end_before'],null);
}
function groupPeriodsInput(mixed $input,array $existing=[]): array {
    if(!is_array($input)||array_diff(array_keys($input),GROUP_PERIOD_FIELDS))fail(422,'Ungültige Zeiträume.');
    $out=array_intersect_key(array_replace(array_fill_keys(GROUP_PERIOD_FIELDS,null),$existing,$input),array_flip(GROUP_PERIOD_FIELDS));
    foreach($out as $key=>&$value){if($value===''||$value===null){$value=null;continue;}if(!is_string($value)||!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/D',$value,$m)||!checkdate((int)$m[2],(int)$m[3],(int)$m[1]))fail(422,'Bitte gültige Kalenderdaten angeben (JJJJ-MM-TT).');}unset($value);
    if($out['access_start']&&$out['access_end']&&$out['access_start']>$out['access_end'])fail(422,'„Zugriff bis“ darf nicht vor „Zugriff ab“ liegen.');
    if(($out['course_start']===null)!==($out['course_end']===null))fail(422,'Für den Kurszeitraum bitte Kursbeginn und Kursende angeben.');
    if($out['course_start']){
        if($out['course_start']>$out['course_end'])fail(422,'Das Kursende darf nicht vor dem Kursbeginn liegen.');
        if(($out['access_start']&&$out['course_start']<$out['access_start'])||($out['access_end']&&$out['course_end']>$out['access_end']))fail(422,'Der Kurszeitraum muss innerhalb des Zugriffszeitraums liegen.');
    }
    return $out;
}
function groupDateTimestamp(string $date,bool $end=false): int {
    $value=new DateTimeImmutable($date.' 00:00:00',new DateTimeZone(GROUP_PERIOD_ZONE));return ($end?$value->modify('+1 day'):$value)->getTimestamp();
}
function saveGroupPeriods(string $gid,array $periods): void {
    if(!array_filter($periods)){query('DELETE FROM group_periods WHERE group_id=?',[$gid]);return;}
    query('INSERT INTO group_periods(group_id,access_start,access_end,course_start,course_end,access_start_at,access_end_before) VALUES(?,?,?,?,?,?,?) ON CONFLICT(group_id) DO UPDATE SET access_start=excluded.access_start,access_end=excluded.access_end,course_start=excluded.course_start,course_end=excluded.course_end,access_start_at=excluded.access_start_at,access_end_before=excluded.access_end_before',[$gid,...array_values($periods),$periods['access_start']?groupDateTimestamp($periods['access_start']):null,$periods['access_end']?groupDateTimestamp($periods['access_end'],true):null]);
}
function groupPeriodState(array $p,?int $at=null): string {
    $at??=time();if($p['access_start_at']!==null&&$at<(int)$p['access_start_at'])return 'scheduled';if($p['access_end_before']!==null&&$at>=(int)$p['access_end_before'])return 'expired';return !$p['access_start']&&!$p['access_end']?'unlimited':'active';
}
function groupPeriodsPublic(string $gid): array {
    $p=groupPeriods($gid);return [...array_intersect_key($p,array_flip(GROUP_PERIOD_FIELDS)),'state'=>groupPeriodState($p),'timezone'=>GROUP_PERIOD_ZONE];
}
// Expressions are supplied by application code, never by an HTTP parameter.
function groupOpenSql(string $column): string {
    if(!preg_match('/^[a-z_]+\.(?:id|group_id)$/D',$column))throw new LogicException('Invalid group reference.');
    $at=time();return "NOT EXISTS(SELECT 1 FROM group_periods period WHERE period.group_id=$column AND ((period.access_start_at IS NOT NULL AND period.access_start_at>$at) OR (period.access_end_before IS NOT NULL AND period.access_end_before<=$at)))";
}
function requireGroupPeriod(array $u,string $gid): void {
    if($u['role']==='admin')return;$p=groupPeriods($gid);$state=groupPeriodState($p);
    if($state==='scheduled')throw new ApiError(403,'Der Zugriff auf diese Gruppe beginnt am '.groupDateLabel($p['access_start']).'.','group_period');
    if($state==='expired')throw new ApiError(403,'Der Zugriff auf diese Gruppe endete am '.groupDateLabel($p['access_end']).'.','group_period');
}
function groupDateLabel(string $date): string {return substr($date,8,2).'.'.substr($date,5,2).'.'.substr($date,0,4);}
function learningAccess(array $u,?int $at=null): array {
    $at??=time();$base=['allowed'=>true,'message'=>'','next_transition'=>null,'checked_at'=>$at,'timezone'=>GROUP_PERIOD_ZONE];if($u['role']==='admin')return $base;
    $rows=all('SELECT p.* FROM group_members m LEFT JOIN group_periods p ON p.group_id=m.group_id WHERE m.user_id=?',[$u['id']]);if(!$rows)return $base;
    $open=false;$next=null;$firstStart=null;
    foreach($rows as $p){$state=groupPeriodState($p,$at);if(in_array($state,['active','unlimited'],true))$open=true;foreach(['access_start_at','access_end_before'] as $key)if($p[$key]!==null&&(int)$p[$key]>$at)$next=$next===null?(int)$p[$key]:min($next,(int)$p[$key]);if($state==='scheduled'&&($firstStart===null||$p['access_start']<$firstStart))$firstStart=$p['access_start'];}
    return [...$base,'allowed'=>$open,'next_transition'=>$next,'message'=>$open?'':($firstStart?'Ihr Lernzugang beginnt am '.groupDateLabel($firstStart).'.':'Der Zugriffszeitraum Ihrer Lerngruppen ist beendet.')];
}
function requireLearningAccess(array $u): void {$access=learningAccess($u);if(!$access['allowed'])throw new ApiError(403,$access['message'],'access_period');}
