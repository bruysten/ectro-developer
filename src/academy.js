// This function is serialized into the isolated worker. It has no ambient authority.
export function academyClient(request){
  const call=(op,args={})=>request(op,args);const requestId=()=>[...crypto.getRandomValues(new Uint8Array(16))].map(n=>n.toString(16).padStart(2,'0')).join('');
  return {call,connections:()=>call('ai.connections'),ai:(connection,prompt,system='')=>call('ai',{connection,prompt,system,operation:'chat',request:requestId()}),embed:(connection,input)=>call('ai',{connection,input,operation:'embedding',request:requestId()}),list:()=>call('list'),get:id=>call('get',{id}),save:object=>call('save',{id:object.id,version:object.version,content:object.content}),sql:sql=>call('sql',{sql}),graph:id=>({nodes:()=>call('graph.nodes',{id}),edges:()=>call('graph.edges',{id}),addNode:(label,type='Objekt',properties={})=>call('graph.add_node',{id,label,type,properties}),addEdge:(from,to,label,properties={})=>call('graph.add_edge',{id,from,to,label,properties}),updateEdge:(edge,values)=>call('graph.update_edge',{id,edge,values}),updateNode:(node,values)=>call('graph.update_node',{id,node,values}),removeEdge:edge=>call('graph.remove_edge',{id,edge}),removeNode:node=>call('graph.remove_node',{id,node}),neighbors:(node,depth=1)=>call('graph.neighbors',{id,node,depth}),path:(node,target)=>call('graph.path',{id,node,target,depth:10})}),network:id=>({train:(epochs=1,rate=.3)=>call('network.train',{id,epochs,rate}),predict:input=>call('network.predict',{id,input})}),dataset:id=>({rows:()=>call('dataset.rows',{id})})};
}
export const pythonAcademy=`import json
from js import academyRequest
async def call(op, **args):
    result = json.loads(await academyRequest(op, json.dumps(args)))
    if "error" in result: raise RuntimeError(result["error"])
    return result["value"]
async def connections(): return await call("ai.connections")
async def ai(connection,prompt,system=""):
    import uuid
    return await call("ai",connection=connection,prompt=prompt,system=system,operation="chat",request=uuid.uuid4().hex)
async def embed(connection,input):
    import uuid
    return await call("ai",connection=connection,input=input,operation="embedding",request=uuid.uuid4().hex)
async def objects(): return await call("list")
async def get(id): return await call("get", id=id)
async def save(object): return await call("save", id=object["id"], version=object["version"], content=object["content"])
async def sql(query): return await call("sql", sql=query)
class Graph:
    def __init__(self, id): self.id=id
    async def nodes(self): return await call("graph.nodes", id=self.id)
    async def edges(self): return await call("graph.edges", id=self.id)
    async def add_node(self, label, type="Objekt", properties=None): return await call("graph.add_node", id=self.id, label=label, type=type, properties=properties or {})
    async def add_edge(self, source, target, label, properties=None): return await call("graph.add_edge", id=self.id, **{"from":source,"to":target,"label":label,"properties":properties or {}})
    async def update_node(self, node, **values): return await call("graph.update_node",id=self.id,node=node,values=values)
    async def remove_node(self,node): return await call("graph.remove_node",id=self.id,node=node)
    async def remove_edge(self,edge): return await call("graph.remove_edge",id=self.id,edge=edge)
    async def neighbors(self, node, depth=1): return await call("graph.neighbors", id=self.id, node=node, depth=depth)
    async def path(self, node, target): return await call("graph.path", id=self.id, node=node, target=target, depth=10)
class Network:
    def __init__(self,id): self.id=id
    async def train(self,epochs=1,rate=0.3): return await call("network.train",id=self.id,epochs=epochs,rate=rate)
    async def predict(self,input): return await call("network.predict",id=self.id,input=input)
class Dataset:
    def __init__(self,id): self.id=id
    async def rows(self): return await call("dataset.rows",id=self.id)
`;
