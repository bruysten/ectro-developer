<?php
declare(strict_types=1);

const LAB_KINDS = ['graph','dataset','network','prompt','rag'];
const LAB_FEATURES = ['graph'=>'graph','dataset'=>'data_lab','network'=>'neural','prompt'=>'ai','rag'=>'rag'];
const LAB_GRAPH_ICONS = ['category','person','apartment','location_on','description','event','inventory_2','school','psychology','database','public','hub'];

function labLimits(): array {
    return array_merge(['objects'=>40,'nodes'=>500,'edges'=>1500,'rows'=>1000,'chunks'=>100,'parallel'=>2],settings()['lab_limits']??[]);
}
function labLimitsInput(mixed $value): array {
    $ranges=['objects'=>[1,100],'nodes'=>[1,2000],'edges'=>[1,5000],'rows'=>[1,5000],'chunks'=>[1,200],'parallel'=>[1,4]];
    if(!is_array($value)||array_diff(array_keys($value),array_keys($ranges)))fail(422,'Ungültige Laborgrenzen.');
    $out=labLimits();foreach($value as $key=>$n){[$min,$max]=$ranges[$key];if(!is_int($n)||$n<$min||$n>$max)fail(422,"Ungültige Grenze für $key ($min–$max).");$out[$key]=$n;}return $out;
}
function labJson(mixed $value): string {
    try{$json=json_encode($value,JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE);}catch(JsonException){fail(422,'Ungültige Labordaten.');}
    if(strlen($json)>1048576)fail(413,'Ein Laborobjekt darf höchstens 1 MB groß sein.');return $json;
}
function labName(mixed $name,int $max=80): string {
    if(!is_string($name)||trim($name)===''||mb_strlen($name)>$max||preg_match('/[\x00-\x1f\x7f]/',$name)||in_array($name,['__proto__','constructor','prototype'],true))fail(422,'Bitte einen gültigen Namen eingeben.');return trim($name);
}
function labList(mixed $value,int $max): array {
    if(!is_array($value)||!array_is_list($value)||count($value)>$max)fail(422,'Ungültige Liste oder zu viele Einträge.');return $value;
}
function labNumeric(mixed $v): float {
    if((!is_int($v)&&!is_float($v))||!is_finite((float)$v)||abs($v)>1e8)fail(422,'Bitte endliche Zahlen verwenden.');return (float)$v;
}
function labValidate(string $kind,mixed $content): array {
    if(!in_array($kind,LAB_KINDS,true)||!is_array($content))fail(422,'Ungültiger Laborinhalt.');labJson($content);$lim=labLimits();
    if($kind==='graph'){
        $types=[];foreach(labList($content['types']??[],50) as $type){if(!is_array($type))fail(422,'Ungültiger Entitätstyp.');$name=labName($type['name']??null);if(isset($types[$name]))fail(422,'Doppelter Entitätstyp.');if(array_key_exists('color',$type)&&(!is_string($type['color'])||!preg_match('/^#[0-9a-f]{6}$/iD',$type['color'])))fail(422,'Knotentyp benötigt eine gültige Farbe (#RRGGBB).');if(array_key_exists('icon',$type)&&!in_array($type['icon'],LAB_GRAPH_ICONS,true))fail(422,'Unbekanntes Knotentyp-Icon.');$fields=[];foreach(labList($type['fields']??[],30) as $f){$fn=labName($f['name']??null);if(isset($fields[$fn])||!in_array($f['type']??'text',['text','number','boolean'],true)||!is_bool($f['required']??false))fail(422,'Ungültige Eigenschaft.');$fields[$fn]=$f;}$types[$name]=$fields;}
        $rules=[];$ruleKeys=[];foreach(labList($content['relations']??[],100) as $rule){if(!is_array($rule))fail(422,'Ungültiger Beziehungstyp.');$name=labName($rule['name']??null);$from=labName($rule['from']??null);$to=labName($rule['to']??null);$key=json_encode([$name,$from,$to]);if(isset($ruleKeys[$key])||!isset($types[$from],$types[$to]))fail(422,'Beziehungstyp benötigt gültige Entitätstypen und darf nicht doppelt vorkommen.');$ruleKeys[$key]=true;$rules[$name][]=[$from,$to];}
        $ids=[];foreach(labList($content['nodes']??[],$lim['nodes']) as $node){if(!is_array($node))fail(422,'Ungültiger Knoten.');$id=labName($node['id']??null);if(isset($ids[$id]))fail(422,'Doppelte Knoten-ID.');labName($node['label']??null,160);$type=labName($node['type']??'Objekt');if($types&&!isset($types[$type]))fail(422,'Der Entitätstyp ist nicht im Modell enthalten.');$props=$node['properties']??[];if(is_object($props))$props=(array)$props;if(!is_array($props)||count($props)>30)fail(422,'Ungültige Eigenschaften.');foreach($props as $key=>$v){labName($key);if($v!==null&&!is_scalar($v))fail(422,'Eigenschaften benötigen einfache Werte.');}
            foreach($types[$type]??[] as $key=>$field){$v=$props[$key]??null;if(($field['required']??false)&&($v===null||$v===''))fail(422,'Pflichtfeld fehlt: '.$key);if($v!==null&&$v!==''&&match($field['type']??'text'){'number'=>!is_int($v)&&!is_float($v),'boolean'=>!is_bool($v),default=>!is_string($v)})fail(422,'Falscher Datentyp: '.$key);}
            foreach(['x','y'] as $axis)if(isset($node[$axis]))labNumeric($node[$axis]);$ids[$id]=$type;
        }
        $edgeIds=[];foreach(labList($content['edges']??[],$lim['edges']) as $edge){$id=labName($edge['id']??null);$name=labName($edge['label']??null);if(isset($edgeIds[$id])||!isset($ids[$edge['from']??''],$ids[$edge['to']??'']))fail(422,'Eine Kante benötigt zwei vorhandene Knoten und eine eigene ID.');if($rules&&!in_array([$ids[$edge['from']],$ids[$edge['to']]],$rules[$name]??[],true))fail(422,'Die Kante passt nicht zum Beziehungsmodell.');$props=$edge['properties']??[];if(is_object($props))$props=(array)$props;if(!is_array($props)||count($props)>30)fail(422,'Ungültige Kanteneigenschaften.');foreach($props as $key=>$value){labName($key);if($value!==null&&!is_scalar($value))fail(422,'Kanteneigenschaften benötigen einfache Werte.');}$edgeIds[$id]=true;}
    }elseif($kind==='dataset'){
        $columns=labList($content['columns']??[],50);$names=[];foreach($columns as $c){$n=labName($c['name']??null);if(isset($names[$n])||!in_array($c['type']??'text',['text','number','boolean'],true))fail(422,'Ungültige Datenspalte.');$names[$n]=true;}
        foreach(labList($content['rows']??[],$lim['rows']) as $row){if(!is_array($row)||array_diff(array_keys($row),array_keys($names)))fail(422,'Datensatz enthält unbekannte Spalten.');foreach($row as $v)if($v!==null&&!is_scalar($v))fail(422,'Zellen benötigen einfache Werte.');}
    }elseif($kind==='network'){
        if(isset($content['epochs'])&&(!is_int($content['epochs'])||$content['epochs']<0||$content['epochs']>1000000000))fail(422,'Ungültiger Trainingszähler.');
        foreach(labList($content['history']??[],1000) as $point){if(!is_int($point['epoch']??null))fail(422,'Ungültiger Trainingsverlauf.');foreach(['train','test'] as $key)if(isset($point[$key]))labNumeric($point[$key]);}
        $layers=labList($content['layers']??[],6);if(count($layers)<2)fail(422,'Ein Netz benötigt mindestens Eingabe und Ausgabe.');foreach($layers as $n)if(!is_int($n)||$n<1||$n>64)fail(422,'Pro Schicht sind 1–64 Neuronen möglich.');
        $weights=labList($content['weights']??[],5);$biases=labList($content['biases']??[],5);if(count($weights)!==count($layers)-1||count($biases)!==count($weights))fail(422,'Gewichte passen nicht zu den Schichten.');
        foreach($weights as $i=>$matrix){if(count(labList($matrix,64))!==$layers[$i+1]||count(labList($biases[$i],64))!==$layers[$i+1])fail(422,'Ungültige Gewichtsmatrix.');foreach($matrix as $j=>$row){if(count(labList($row,64))!==$layers[$i])fail(422,'Ungültige Eingangsgewichte.');foreach($row as $w)labNumeric($w);labNumeric($biases[$i][$j]);}}
        foreach(labList($content['samples']??[],1000) as $sample){if(isset($sample['test'])&&!is_bool($sample['test']))fail(422,'Testmarkierung muss Ja/Nein sein.');foreach(['input'=>$layers[0],'output'=>$layers[count($layers)-1]] as $key=>$size){if(count(labList($sample[$key]??[],64))!==$size)fail(422,'Trainingsbeispiel passt nicht zum Netz.');foreach($sample[$key] as $v)labNumeric($v);}}
    }elseif($kind==='prompt'){
        if(!is_string($content['input']??null)||mb_strlen($content['input'])>30000)fail(422,'Ungültige Testeingabe.');
        foreach(labList($content['variants']??[],4) as $variant){labName($variant['name']??null);foreach(['system'=>4000,'prompt'=>30000] as $key=>$max)if(!is_string($variant[$key]??null)||mb_strlen($variant[$key])>$max)fail(422,'Ungültige Promptvariante.');}
        foreach(labList($content['runs']??[],20) as $run){foreach(['tokens','ms'] as $key)if(isset($run[$key]))labNumeric($run[$key]);foreach(['text'=>100000,'variant'=>80,'note'=>4000] as $key=>$max)if(isset($run[$key])&&(!is_string($run[$key])||mb_strlen($run[$key])>$max))fail(422,'Ungültiger Promptvergleich.');}
    }elseif($kind==='rag'){
        if(isset($content['answerMeta']))foreach(['tokens','ms'] as $key)if(isset($content['answerMeta'][$key]))labNumeric($content['answerMeta'][$key]);
        foreach(['text'=>500000,'question'=>4000,'context'=>30000,'answer'=>100000,'source'=>180] as $key=>$max)if(isset($content[$key])&&(!is_string($content[$key])||mb_strlen($content[$key])>$max))fail(422,'Ungültiger RAG-Text: '.$key);
        if(isset($content['queryVector']))foreach(labList($content['queryVector'],4096) as $v)labNumeric($v);
        foreach(labList($content['chunks']??[],$lim['chunks']) as $chunk){if(!is_string($chunk['text']??null)||mb_strlen($chunk['text'])>12000)fail(422,'Ungültiger Textabschnitt.');if(isset($chunk['vector']))foreach(labList($chunk['vector'],4096) as $v)labNumeric($v);}
        foreach(labList($content['selected']??[],$lim['chunks']) as $index)if(!is_int($index)||$index<0||$index>=count($content['chunks']??[]))fail(422,'Ungültige Kontextauswahl.');
        foreach(labList($content['hits']??[],$lim['chunks']) as $hit){if(!is_int($hit['index']??null)||$hit['index']<0||$hit['index']>=count($content['chunks']??[]))fail(422,'Ungültiger Suchtreffer.');labNumeric($hit['score']??null);}
    }
    if($kind==='graph')foreach($content['nodes'] as &$node)$node['properties']=(object)($node['properties']??[]);unset($node);
    return $content;
}
function labTypeConfig(string $id): array {
    return json_decode(one('SELECT config FROM lab_type_config WHERE type_id=?',[$id])['config']??'{}',true);
}
function labConfigInput(mixed $c): array {
    if(!is_array($c))fail(422,'Ungültige Laborvorlage.');$tools=labList($c['tools']??[],5);foreach($tools as $tool)if(!is_string($tool))fail(422,'Ungültiges Werkzeug.');if(array_diff($tools,LAB_KINDS))fail(422,'Unbekanntes Labor.');$entry=$c['entry']??'editor';if(!in_array($entry,['editor',...LAB_KINDS],true)||($entry!=='editor'&&!in_array($entry,$tools,true)))fail(422,'Startbereich ist nicht freigegeben.');
    $seeds=labList($c['seeds']??[],20);foreach($seeds as &$seed){if(!in_array($seed['kind']??'',$tools,true))fail(422,'Startinhalt benötigt ein aktiviertes Labor.');$seed=['kind'=>$seed['kind'],'name'=>labName($seed['name']??null),'content'=>labValidate($seed['kind'],$seed['content']??null)];}unset($seed);
    $groups=labList($c['groups']??[],1000);foreach($groups as $gid)if(!is_string($gid)||!one('SELECT id FROM groups WHERE id=?',[$gid]))fail(422,'Unbekannte Vorlagengruppe.');$out=['tools'=>array_values(array_unique($tools)),'entry'=>$entry,'seeds'=>$seeds,'groups'=>$groups];labJson($out);return $out;
}
function labTypeAvailable(array $u,array $type): bool {
    $c=labTypeConfig($type['id']);$f=features($u);$entry=$c['entry']??'editor';if($entry!=='editor'&&!$f[LAB_FEATURES[$entry]])return false;
    $groups=$c['groups']??[];return !$groups||$u['role']==='admin'||(bool)array_intersect($groups,array_column(all('SELECT m.group_id FROM group_members m WHERE user_id=? AND '.groupOpenSql('m.group_id'),[$u['id']]),'group_id'));
}
function labAccess(array $u,string $pid,?string $kind=null): array {
    needFeature($u,'files');$p=project($u,$pid);if($kind!==null){if(!isset(LAB_FEATURES[$kind]))fail(422,'Unbekanntes Labor.');needFeature($u,LAB_FEATURES[$kind]);$c=json_decode(one('SELECT config FROM lab_project_config WHERE project_id=?',[$pid])['config']??'{}',true);if(isset($c['tools'])&&!in_array($kind,$c['tools'],true))fail(403,'Dieses Labor ist im Projekt nicht aktiviert.');}return $p;
}
function labObject(array $u,string $id): array {
    $obj=one('SELECT * FROM lab_objects WHERE id=?',[$id]);if(!$obj)fail(404,'Laborobjekt nicht gefunden.');labAccess($u,$obj['project_id'],$obj['kind']);$obj['content']=json_decode($obj['content'],true);if($obj['kind']==='graph')foreach($obj['content']['nodes'] as &$node)$node['properties']=(object)($node['properties']??[]);unset($node);$obj['version']=(int)$obj['version'];return $obj;
}
function labSave(array $u,array $data): array {
    return transaction(function()use($u,$data){$pid=textField($data,'project',32);$oid=textField($data,'id',32,false);$kind=textField($data,'kind',20);$p=labAccess($u,$pid,$kind);$old=$oid?labObject($u,$oid):null;if($old&&($old['project_id']!==$pid||$old['kind']!==$kind))fail(404,'Laborobjekt nicht gefunden.');
        if($old&&(!is_int($data['version']??null)||$old['version']!==$data['version']))fail(409,'Inzwischen geändert. Ihr Entwurf bleibt erhalten; bitte zuerst exportieren oder neu laden.');
        if(!$old&&(int)query('SELECT COUNT(*) FROM lab_objects WHERE project_id=?',[$pid])->fetchColumn()>=labLimits()['objects'])fail(413,'Die maximale Anzahl an Laborobjekten ist erreicht.');
        $content=labJson(labValidate($kind,$data['content']??null));if(workspaceBytes($p)-($old?strlen(labJson($old['content'])):0)+strlen($content)>SPACE_LIMIT)fail(413,'Der Workspace-Speicher ist voll.');$oid=$oid?:id();$name=labName($data['name']??null);
        if($old)query('UPDATE lab_objects SET name=?,content=?,version=version+1,updated_at=? WHERE id=?',[$name,$content,now(),$oid]);else query('INSERT INTO lab_objects(id,project_id,kind,name,content,updated_at) VALUES(?,?,?,?,?,?)',[$oid,$pid,$kind,$name,$content,now()]);query('UPDATE projects SET updated_at=? WHERE id=?',[now(),$pid]);audit($u['id'],'lab.save',['kind'=>$kind,'project'=>$pid]);return labObject($u,$oid);
    });
}
function labInitializeProject(string $pid,string $type): void {
    $c=labTypeConfig($type);query('INSERT INTO lab_project_config VALUES(?,?)',[$pid,labJson(['tools'=>$c['tools']??LAB_KINDS,'entry'=>$c['entry']??'editor'])]);foreach($c['seeds']??[] as $seed)query('INSERT INTO lab_objects(id,project_id,kind,name,content,updated_at) VALUES(?,?,?,?,?,?)',[id(),$pid,$seed['kind'],$seed['name'],labJson($seed['content']),now()]);
}
function networkPredict(array $net,array $input): array {
    if(count($input)!==$net['layers'][0])fail(422,'Eingabe passt nicht zum Netz.');foreach($input as $v)labNumeric($v);$a=$input;
    foreach($net['weights'] as $l=>$matrix){$next=[];foreach($matrix as $j=>$row){$sum=$net['biases'][$l][$j];foreach($row as $k=>$w)$sum+=$w*$a[$k];$next[]=1/(1+exp(-max(-700,min(700,$sum))));}$a=$next;}return $a;
}
function networkTrain(array $net,int $epochs,float $rate): array {
    $samples=array_values(array_filter($net['samples'],fn($s)=>!($s['test']??false)));$parameters=0;foreach($net['weights'] as $matrix)foreach($matrix as $row)$parameters+=count($row);
    if(!$samples||$epochs<1||$epochs>1000||$rate<0.001||$rate>2||$parameters*count($samples)*$epochs>2000000)fail(422,'Code-Training: 1–1000 Epochen, Lernrate 0,001–2 und höchstens 2 Millionen Gewichtsschritte je Aufruf.');
    for($epoch=0;$epoch<$epochs;$epoch++)foreach($samples as $sample){$a=[$sample['input']];foreach($net['weights'] as $l=>$matrix){$next=[];foreach($matrix as $j=>$row){$z=$net['biases'][$l][$j];foreach($row as $k=>$w)$z+=$w*$a[$l][$k];$next[]=1/(1+exp(-max(-700,min(700,$z))));}$a[]=$next;}
        $last=count($net['weights'])-1;$d=[];foreach($a[$last+1] as $j=>$v)$d[$last][$j]=2*($v-$sample['output'][$j])*$v*(1-$v)/count($sample['output']);for($l=$last-1;$l>=0;$l--)foreach($a[$l+1] as $j=>$v){$sum=0;foreach($net['weights'][$l+1] as $k=>$row)$sum+=$row[$j]*$d[$l+1][$k];$d[$l][$j]=$sum*$v*(1-$v);}
        foreach($net['weights'] as $l=>$matrix)foreach($matrix as $j=>$row){foreach($row as $k=>$w)$net['weights'][$l][$j][$k]=max(-100,min(100,$w-$rate*$d[$l][$j]*$a[$l][$k]));$net['biases'][$l][$j]=max(-100,min(100,$net['biases'][$l][$j]-$rate*$d[$l][$j]));}
    }$net['epochs']=($net['epochs']??0)+$epochs;return $net;
}
function labRpc(array $u,array $data): array {
    $pid=textField($data,'project',32);labAccess($u,$pid);$op=textField($data,'op',40);$args=$data['args']??[];if(!is_array($args))fail(422,'Ungültige Argumente.');
    if($op==='ai.connections')return ['value'=>aiAvailable($u,$pid)];
    if($op==='ai')return ['value'=>aiRun($u,[...$args,'project'=>$pid])];
    if($op==='list'){$visible=[];foreach(all('SELECT id,name,kind FROM lab_objects WHERE project_id=? ORDER BY name',[$pid]) as $o){try{labAccess($u,$pid,$o['kind']);$visible[]=$o;}catch(ApiError){}}return ['value'=>$visible];}
    if($op==='sql'){needFeature($u,'database');rateLimit('mysql.'.$u['id'],30,60);$my=mysqlConnection($u,null,$pid);$sql=validateSql(textField($args,'sql',16000));$stmt=$my->prepare($sql);$stmt->execute();$rows=[];if($stmt->columnCount())while(count($rows)<200&&($row=$stmt->fetch()))$rows[]=$row;return ['value'=>['rows'=>$rows,'affected'=>$stmt->rowCount()]];}
    $obj=labObject($u,textField($args,'id',32));if($obj['project_id']!==$pid)fail(404,'Laborobjekt nicht gefunden.');$c=$obj['content'];
    if($op==='network.train'){rateLimit('network.train.'.$u['id'],10,60);rateLimit('network.train.global',100,60);
        if($obj['kind']!=='network')fail(422,'Kein neuronales Netz.');$epochs=$args['epochs']??1;if(!is_int($epochs))fail(422,'Epochen als ganze Zahl angeben.');$rate=labNumeric($args['rate']??0.3);$trained=networkTrain($c,$epochs,$rate);return ['value'=>labSave($u,['project'=>$pid,'id'=>$obj['id'],'kind'=>'network','name'=>$obj['name'],'version'=>$obj['version'],'content'=>$trained])];
    }
    if($op==='save'){return ['value'=>labSave($u,['project'=>$pid,'id'=>$obj['id'],'kind'=>$obj['kind'],'name'=>$obj['name'],'version'=>$args['version']??0,'content'=>$args['content']??null])];}
    $value=match($op){'get'=>$obj,'graph.nodes'=>$obj['kind']==='graph'?$c['nodes']:null,'graph.edges'=>$obj['kind']==='graph'?$c['edges']:null,'network.predict'=>$obj['kind']==='network'?networkPredict($c,labList($args['input']??[],64)):null,'dataset.rows'=>$obj['kind']==='dataset'?$c['rows']:null,default=>null};
    if($value!==null)return ['value'=>$value];
    if(!in_array($op,['graph.add_node','graph.add_edge','graph.update_node','graph.update_edge','graph.remove_node','graph.remove_edge','graph.neighbors','graph.path'],true)||$obj['kind']!=='graph')fail(422,'Unbekannte Laboroperation.');
    if($op==='graph.neighbors'||$op==='graph.path'){$start=labName($args['node']??null);$target=$args['target']??null;$queue=[[$start]];$seen=[$start=>true];$paths=[];while($queue){$path=array_shift($queue);$last=end($path);if($op==='graph.path'&&$last===$target)return ['value'=>$path];if(count($path)>min(10,(int)($args['depth']??3)))continue;foreach($c['edges'] as $edge)if($edge['from']===$last&&!isset($seen[$edge['to']])){$seen[$edge['to']]=true;$next=[...$path,$edge['to']];$queue[]=$next;$paths[]=$edge['to'];}}return ['value'=>$op==='graph.path'?[]:array_values(array_filter($c['nodes'],fn($n)=>in_array($n['id'],$paths,true)))];}
    if($op==='graph.add_node'){$node=['id'=>id(),'label'=>labName($args['label']??null,160),'type'=>$args['type']??'Objekt','properties'=>(object)($args['properties']??[]),'x'=>100,'y'=>100];$c['nodes'][]=$node;$value=$node;}
    elseif($op==='graph.add_edge'){$edge=['id'=>id(),'from'=>$args['from']??'','to'=>$args['to']??'','label'=>$args['label']??'','properties'=>(object)($args['properties']??[])];$c['edges'][]=$edge;$value=$edge;}
    elseif($op==='graph.update_node'){$index=array_search($args['node']??'',array_column($c['nodes'],'id'),true);if($index===false)fail(404,'Knoten nicht gefunden.');$updates=$args['values']??[];if(!is_array($updates)||array_diff(array_keys($updates),['label','type','properties','x','y']))fail(422,'Ungültige Knoteneigenschaften.');$c['nodes'][$index]=array_merge($c['nodes'][$index],$updates);$value=$c['nodes'][$index];}
    elseif($op==='graph.update_edge'){$index=array_search($args['edge']??'',array_column($c['edges'],'id'),true);if($index===false)fail(404,'Kante nicht gefunden.');$updates=$args['values']??[];if(!is_array($updates)||array_diff(array_keys($updates),['label','from','to','properties']))fail(422,'Ungültige Kanteneigenschaften.');$c['edges'][$index]=array_merge($c['edges'][$index],$updates);$value=$c['edges'][$index];}
    elseif($op==='graph.remove_edge'){$c['edges']=array_values(array_filter($c['edges'],fn($e)=>$e['id']!==($args['edge']??'')));$value=true;}
    else{$nid=$args['node']??'';$c['nodes']=array_values(array_filter($c['nodes'],fn($n)=>$n['id']!==$nid));$c['edges']=array_values(array_filter($c['edges'],fn($e)=>$e['from']!==$nid&&$e['to']!==$nid));$value=true;}
    labSave($u,['project'=>$pid,'id'=>$obj['id'],'kind'=>'graph','name'=>$obj['name'],'version'=>$obj['version'],'content'=>$c]);return ['value'=>$value];
}

function learningContext(array $u,array $data): void {
    $routes=['dashboard','projects','files','editor','database','sql-training','converter','graph','data-lab','ai-lab','chat','team'];$route=$data['route']??'';if(!in_array($route,$routes,true))fail(422,'Unbekannte Ansicht.');$context=['route'=>$route];if(isset($data['analysis'])&&is_array($data['analysis'])){foreach(['column','term','operator','group','measure','aggregate','chartKind','chartX','chartY','vectorView','vectorProjection','vectorAxes','vectorSelected','vectorThreshold'] as $key)if(isset($data['analysis'][$key])&&is_string($data['analysis'][$key])&&mb_strlen($data['analysis'][$key])<=120)$context['analysis'][$key]=$data['analysis'][$key];}if(isset($data['step'])&&is_int($data['step'])&&$data['step']>=0&&$data['step']<=5)$context['step']=$data['step'];foreach(['tab'=>['data','model','quality','analysis'],'mode'=>['practice','mysql']] as $key=>$values)if(isset($data[$key])&&in_array($data[$key],$values,true))$context[$key]=$data[$key];foreach(['table'=>64,'node'=>80] as $key=>$max){$value=textField($data,$key,$max,false);if($value!=='')$context[$key]=$value;}$pid=textField($data,'project',32,false);
    if($pid){labAccess($u,$pid);$context['project']=$pid;$path=textField($data,'file',240,false);if($path&&one('SELECT id FROM files WHERE project_id=? AND path=?',[$pid,$path]))$context['file']=$path;$oid=textField($data,'object',32,false);if($oid&&one('SELECT id FROM lab_objects WHERE project_id=? AND id=?',[$pid,$oid]))$context['object']=$oid;}
    query('INSERT INTO learning_presence VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET context=excluded.context,touched=excluded.touched',[$u['id'],labJson($context),time()]);
}
function learningLocation(array $viewer,string $uid,string $gid): ?array {
    if(!in_array($viewer['role'],['teacher','admin'],true)||$viewer['id']===$uid)return null;if($viewer['role']==='teacher')teacherTarget($viewer,$uid,$gid);$row=one('SELECT * FROM learning_presence WHERE user_id=? AND touched>?',[$uid,time()-60]);if(!$row)return null;$c=json_decode($row['context'],true);
    if(isset($c['project'])){try{$p=labAccess($viewer,$c['project']);}catch(ApiError){return null;}$c['project_name']=$p['name'];}return $c;
}
