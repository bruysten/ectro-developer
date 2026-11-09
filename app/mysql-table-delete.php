<?php
declare(strict_types=1);
function tableDeleteInput(array $data):string {
    $table=$data['table']??null;
    if(!is_string($table)||$table===''||mb_strlen($table)>64||str_contains($table,"\0"))fail(422,'Ungültiger Tabellenname.');
    if(($data['confirmation']??null)!==$table)fail(422,'Zum Löschen den Tabellennamen exakt bestätigen.');
    return $table;
}
function tableDeleteConnection(array $data,?array $saved):array {
    if(!$saved)fail(409,'Die Datenbankverbindung wurde entfernt. Bitte die Ansicht aktualisieren.');
    $expected=$data['connection']??null;
    foreach(['host','db_name','username'] as $key)if(!is_array($expected)||!is_string($expected[$key]??null)||$expected[$key]!==$saved[$key])fail(409,'Die Datenbankverbindung wurde geändert. Bitte die Ansicht aktualisieren.');
    return $saved;
}
function deleteMysqlTable(PDO $pdo,string $table):void {
    // Exact metadata lookup and identifier escaping support existing table names as well.
    $stmt=$pdo->prepare('SELECT TABLE_TYPE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND BINARY TABLE_NAME=BINARY ?');$stmt->execute([$table]);$type=$stmt->fetchColumn();
    if($type===false)fail(404,'Diese Tabelle existiert nicht mehr. Bitte die Tabellenliste aktualisieren.');
    if($type!=='BASE TABLE')fail(422,'Diese Auswahl ist eine Ansicht und keine Tabelle.');
    // Never disable foreign key checks or cascade into related tables.
    $pdo->exec('DROP TABLE `'.str_replace('`','``',$table).'`');
}
