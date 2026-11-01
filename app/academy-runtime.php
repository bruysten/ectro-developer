<?php
// Copied into a run's private directory. Credentials and session data are never supplied.
function academy_call(string $operation,array $args=[]): mixed {
    $message=json_encode(['op'=>$operation,'args'=>$args],JSON_THROW_ON_ERROR);
    if(function_exists('post_message_to_js'))$reply=post_message_to_js($message);
    else{static $out,$in;$out??=fopen('php://fd/3','w');$in??=fopen('php://fd/4','r');if(!$out||!$in)throw new RuntimeException('Academy-Verbindung nicht verfügbar.');fwrite($out,$message."\n");$reply=fgets($in,2097152);}
    $value=json_decode((string)$reply,true,64,JSON_THROW_ON_ERROR);if(isset($value['error']))throw new RuntimeException($value['error']);return $value['value']??null;
}
function academy_graph(string $id): object {
    return new class($id){public function __construct(private string $id){}private function call(string $op,array $args=[]):mixed{return academy_call('graph.'.$op,['id'=>$this->id,...$args]);}public function nodes():array{return $this->call('nodes');}public function edges():array{return $this->call('edges');}public function addNode(string $label,string $type='Objekt',array $properties=[]):array{return $this->call('add_node',compact('label','type','properties'));}public function addEdge(string $from,string $to,string $label,array $properties=[]):array{return $this->call('add_edge',compact('from','to','label','properties'));}public function neighbors(string $node,int $depth=1):array{return $this->call('neighbors',compact('node','depth'));}public function path(string $node,string $target):array{return $this->call('path',['node'=>$node,'target'=>$target,'depth'=>10]);}};
}
function academy_predict(string $id,array $input): array{return academy_call('network.predict',compact('id','input'));}
function academy_sql(string $sql): array{return academy_call('sql',compact('sql'));}

function academy_train(string $id,int $epochs=1,float $rate=0.3): array{return academy_call('network.train',compact('id','epochs','rate'));}

function academy_ai(string $connection,string $prompt,string $system=''): array{return academy_call('ai',['connection'=>$connection,'prompt'=>$prompt,'system'=>$system,'operation'=>'chat','request'=>bin2hex(random_bytes(16))]);}
