<?php
declare(strict_types=1);

function groupAddressInput(mixed $value): string {
    if(!is_string($value)||!in_array($value,['formal','informal'],true))fail(422,'Bitte „Siezen“ oder „Duzen“ wählen.');
    return $value;
}
function saveGroupAddress(string $gid,string $mode): void {
    query('INSERT INTO group_preferences(group_id,address_mode) VALUES(?,?) ON CONFLICT(group_id) DO UPDATE SET address_mode=excluded.address_mode',[$gid,groupAddressInput($mode)]);
}
function addressInfo(array $u,?int $at=null): array {
    $at??=time();$today=(new DateTimeImmutable('@'.$at))->setTimezone(new DateTimeZone(GROUP_PERIOD_ZONE))->format('Y-m-d');
    $rows=all("SELECT g.id,COALESCE(pref.address_mode,'formal') address_mode,p.access_start,p.access_end,p.access_start_at,p.access_end_before,p.course_start,p.course_end FROM groups g JOIN group_members m ON m.group_id=g.id LEFT JOIN group_preferences pref ON pref.group_id=g.id LEFT JOIN group_periods p ON p.group_id=g.id WHERE m.user_id=?",[$u['id']]);
    $open=[];$courses=[];$next=null;
    foreach($rows as $row){
        foreach(['access_start_at','access_end_before'] as $key)if($row[$key]!==null&&(int)$row[$key]>$at)$next=$next===null?(int)$row[$key]:min($next,(int)$row[$key]);
        foreach(['course_start','course_end'] as $key)if($row[$key]){$boundary=groupDateTimestamp($row[$key],$key==='course_end');if($boundary>$at)$next=$next===null?$boundary:min($next,$boundary);}
        if(!in_array(groupPeriodState($row,$at),['active','unlimited'],true))continue;
        $open[]=$row;if($row['course_start']&&$row['course_start']<=$today&&$row['course_end']>=$today)$courses[]=$row;
    }
    $candidates=$courses?:$open;$modes=array_values(array_unique(array_column($candidates,'address_mode')));
    return ['mode'=>count($modes)===1?$modes[0]:'formal','group_id'=>count($candidates)===1?$candidates[0]['id']:null,
        'source'=>$courses?'course':($open?'group':'default'),'conflict'=>count($modes)>1,'checked_at'=>$at,'next_transition'=>$next,'timezone'=>GROUP_PERIOD_ZONE];
}
function setRequestAddress(string $mode): void {$GLOBALS['academyAddressMode']=$mode==='informal'?'informal':'formal';}
function requestAddress(): string {return $GLOBALS['academyAddressMode']??'formal';}
function addressError(string $message,?string $mode=null): string {
    static $copy;$copy??=json_decode(file_get_contents(__DIR__.'/address-copy.json'),true,64,JSON_THROW_ON_ERROR);$mode=$mode==='informal'?'informal':($mode===null?requestAddress():'formal');
    foreach($copy as $entry){if(empty($entry['error']))continue;foreach([$entry['formal'],$entry['informal'],...($entry['legacy']??[])] as $source){
        if($message===$source)return $entry[$mode];
        if(!empty($entry['prefix'])&&str_starts_with($message,$source))return $entry[$mode].substr($message,strlen($source));
    }}return $message;
}
