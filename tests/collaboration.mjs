import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:net';
import {EditorState,ChangeSet} from '@codemirror/state';
import {collab,receiveUpdates,sendableUpdates,getSyncedVersion} from '@codemirror/collab';
import {sharedDocument,sharedExtension} from '../src/collaboration.js';

const privateDir=await mkdtemp(join(tmpdir(),'ectro-collab-'));
const socket=createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));const port=socket.address().port;await new Promise(r=>socket.close(r));
const env={...process.env,APP_ENV:'development',APP_DATA_DIR:privateDir,APP_KEY:Buffer.alloc(32,7).toString('base64'),APP_SETUP_TOKEN:'collaboration-test-setup-token-2026'};
const server=spawn('php',['-S',`127.0.0.1:${port}`,'-t','public','scripts/router.php'],{env,stdio:'ignore'});
let checks=0;
function check(condition,label){assert.ok(condition,label);checks++;}
class Client {
  cookie='';csrf='';
  async call(action,data,params={}){
    const response=await fetch(`http://127.0.0.1:${port}/api/?${new URLSearchParams({action,...params})}`,{method:data?'POST':'GET',headers:{Cookie:this.cookie,...(data?{'Content-Type':'application/json','X-CSRF-Token':this.csrf}:{})},body:data?JSON.stringify(data):undefined});
    const cookie=response.headers.get('set-cookie');if(cookie)this.cookie=cookie.split(';')[0];
    const body=await response.json();if(body.csrf)this.csrf=body.csrf;
    return {status:response.status,body};
  }
  async ok(action,data,params){const result=await this.call(action,data,params);assert.ok(result.status<300,JSON.stringify(result));return result.body;}
}
try {
  const admin=new Client();
  for(let i=0;i<60;i++){try{await admin.ok('bootstrap');break;}catch{await new Promise(r=>setTimeout(r,50));}}
  await admin.ok('setup',{token:env.APP_SETUP_TOKEN,name:'Admin',email:'admin@test.invalid',password:'test-collaboration-password'});
  await admin.ok('login',{portal:'admin',email:'admin@test.invalid',password:'test-collaboration-password'});
  const group=(await admin.ok('admin.group.save',{name:'Team'})).id;
  const outsiders=(await admin.ok('admin.group.save',{name:'Other'})).id;
  const users=[];
  for(let i=0;i<3;i++){
    const id=(await admin.ok('admin.user.save',{name:`Learner ${i}`,email:`learner${i}@test.invalid`,password:'test-collaboration-password',groups:[i===2?outsiders:group]})).id;
    const client=new Client();await client.ok('bootstrap');await client.ok('login',{portal:'user',email:`learner${i}@test.invalid`,password:'test-collaboration-password'});await client.ok('password',{current:'test-collaboration-password',password:'changed-collaboration-password'});users.push({id,client});
  }
  const [alice,bob,outsider]=users;
  const pid=(await alice.client.ok('project.create',{name:'Shared',template:'web',group})).id;
  check((await bob.client.ok('projects')).projects.some(p=>p.id===pid),'Group member discovers project');
  check(!(await outsider.client.ok('projects')).projects.some(p=>p.id===pid),'Other group cannot discover project');
  for(const action of ['files','file','project.bundle'])check((await outsider.client.call(action,action==='project.bundle'?{project:pid}:null,{project:pid,path:'index.html'})).status===404,`Project isolation: ${action}`);
  check((await outsider.client.call('project.create',{name:'Invalid',template:'web',group})).status===403,'Cannot create for another group');
  check((await bob.client.call('project.delete',{id:pid})).status===403,'Member cannot delete whole group project');
  await alice.client.ok('file.save',{project:pid,path:'shared.txt',content:'Hello 🌍\nSecond line',version:0});
  const file=(await alice.client.ok('file',null,{project:pid,path:'shared.txt'})).file;
  const peers=[alice,bob].map((u,index)=>({...u,clientID:`test-client-${index}`,state:EditorState.create({doc:file.content,extensions:[collab({startVersion:file.version,clientID:`test-client-${index}`})]})}));
  async function sync(peer,updates=true){
    const result=await peer.client.ok('file.sync',{project:pid,file:file.id,client:peer.clientID,version:getSyncedVersion(peer.state),updates:updates?sendableUpdates(peer.state).slice(0,100).map(u=>u.changes.toJSON()):[]});
    peer.state=receiveUpdates(peer.state,result.updates.map(u=>({...u,changes:ChangeSet.fromJSON(u.changes)}))).state;
    return result;
  }
  const [a,b]=peers;
  a.state=a.state.update({changes:{from:0,insert:'A: '}}).state;
  b.state=b.state.update({changes:{from:6,to:8,insert:'🧑‍💻'}}).state;
  await sync(a);const stale=await sync(b);
  check(stale.accepted===false&&sendableUpdates(b.state).length===1,'Stale edits rebase without overwriting');
  await sync(b);await sync(a,false);
  check(a.state.doc.toString()===b.state.doc.toString()&&a.state.doc.toString()==='A: Hello 🧑‍💻\nSecond line','Concurrent edits converge, UTF-16 emoji offsets correct');
  a.state=a.state.update({changes:{from:0,to:3,insert:'Alice: '}}).state;
  b.state=b.state.update({changes:{from:0,to:3,insert:'Bob: '}}).state;
  await sync(b);await sync(a);await sync(a);await sync(b,false);
  check(a.state.doc.toString()===b.state.doc.toString(),'Overlapping replacements converge');
  // Offline peer accumulates local edits while another peer continues editing.
  for(let i=0;i<20;i++){
    a.state=a.state.update({changes:{from:a.state.doc.length,insert:`\nA${i}`}}).state;
    b.state=b.state.update({changes:{from:0,insert:`B${i} `}}).state;
    await sync(a);
  }
  await sync(b);await sync(b);await sync(a,false);
  check(a.state.doc.toString()===b.state.doc.toString(),'Offline backlog merges with all remote edits');
  check(!sendableUpdates(a.state).length&&!sendableUpdates(b.state).length,'All edits acknowledged');
  // Reload after a lost acknowledgement must replay original updates, not duplicate text.
  const cachedBase=a.state.doc.toString(),cachedVersion=getSyncedVersion(a.state);
  a.state=a.state.update({changes:{from:0,insert:'One '}}).state;
  a.state=a.state.update({changes:{from:4,insert:'Two '}}).state;
  const originalUpdates=sendableUpdates(a.state).map(u=>u.changes.toJSON());
  const draft={base:cachedBase,version:cachedVersion,text:a.state.doc.toString(),client:a.clientID,updates:originalUpdates};
  await alice.client.ok('file.sync',{project:pid,file:file.id,client:a.clientID,version:cachedVersion,updates:originalUpdates});
  globalThis.sessionStorage={getItem:()=>JSON.stringify(draft)};
  const recoveredFile=(await alice.client.ok('file',null,{project:pid,path:'shared.txt'})).file;
  const document=sharedDocument(alice.id,pid,recoveredFile);
  a.state=EditorState.create({doc:document.content,extensions:[sharedExtension(document)]});
  for(const changes of document.draft.updates)a.state=a.state.update({changes:ChangeSet.fromJSON(changes)}).state;
  await sync(a);await sync(b,false);
  check(a.state.doc.toString()===draft.text&&a.state.doc.toString()===b.state.doc.toString(),'Reload after lost acknowledgement preserves text without duplication');
  check(sendableUpdates(a.state).length===0,'Recovered update batch acknowledged exactly once');
  const current=(await alice.client.ok('file',null,{project:pid,path:'shared.txt'})).file;
  check(current.content===a.state.doc.toString(),'Server content agrees with both peers');
  const payload={project:pid,file:file.id,client:a.clientID,version:getSyncedVersion(a.state),updates:[[0]]};
  check((await alice.client.call('file.sync',{...payload,updates:[[ [0,'temporary'],current.content.length ],[]]})).status===422,'Invalid batch rolls back previously valid changes');
  const unchanged=(await alice.client.ok('file',null,{project:pid,path:'shared.txt'})).file;
  check(unchanged.version===current.version&&unchanged.content===current.content,'Batch rollback preserves content and version');
  const emoji=current.content.indexOf('🧑');
  check((await alice.client.call('file.sync',{...payload,updates:[[emoji+1,[1],current.content.length-emoji-2]]})).status===422,'Cannot split UTF-16 surrogate pair');
  check((await alice.client.call('file.sync',payload)).status===422,'Incomplete change rejected atomically');
  check((await outsider.client.call('file.sync',payload)).status===404,'Sync isolated from outsiders');
  check((await bob.client.call('file.sync',{...payload,updates:[]})).status===409,'Cannot impersonate other editor client');
  check((await alice.client.call('file.save',{project:pid,path:'shared.txt',content:'overwrite',version:current.version})).status===409,'Full-text overwrite of shared file rejected');
  check((await alice.client.ok('file',null,{project:pid,path:'shared.txt'})).file.content===current.content,'Rejected writes preserve content');
  await bob.client.ok('file.rename',{project:pid,path:'shared.txt',new_path:'renamed.txt'});
  check((await sync(a,false)).path==='renamed.txt','Open file follows rename by stable ID');
  const personal=(await alice.client.ok('project.create',{name:'Move me',template:'python'})).id;
  check((await bob.client.call('files',null,{project:personal})).status===404,'Personal project remains private');
  await alice.client.ok('project.share',{id:personal,group});
  check((await bob.client.ok('files',null,{project:personal})).project.group_id===group,'Existing project moves into group');
  await admin.ok('admin.group.save',{id:group,name:'Team',users:[alice.id]});
  check((await bob.client.call('file.sync',{...payload,client:b.clientID,updates:[]})).status===404,'Membership removal immediately revokes open-file sync');
  check((await bob.client.call('project.bundle',{project:pid})).status===404,'Membership removal revokes preview');
  await admin.ok('admin.group.save',{id:group,name:'Team',users:[alice.id,bob.id]});
  // Delete a disposable group project with live editor presence and persisted changes.
  const doomed=(await alice.client.ok('project.create',{name:'Delete with files',template:'web',group})).id;
  const doomedFile=(await alice.client.ok('file',null,{project:doomed,path:'index.html'})).file;
  await alice.client.ok('file.sync',{project:doomed,file:doomedFile.id,client:'delete-test-client',version:doomedFile.version,updates:[ChangeSet.of({from:0,insert:'Deleted '},doomedFile.content.length).toJSON()]});
  const storageCounts=()=>{const result=spawnSync('php',['-r',"require 'app/bootstrap.php';echo json_encode([one('SELECT COUNT(*) n FROM files WHERE project_id=?',[$argv[1]])['n'],one('SELECT COUNT(*) n FROM file_updates WHERE file_id=?',[$argv[2]])['n'],one('SELECT COUNT(*) n FROM file_editors WHERE file_id=?',[$argv[2]])['n']]);",doomed,doomedFile.id],{env,encoding:'utf8'});assert.equal(result.status,0,result.stderr);return JSON.parse(result.stdout);};
  check(storageCounts().every(n=>n>0),'Deletion fixture contains project files, change history and editor presence');
  await alice.client.ok('project.delete',{id:doomed});
  check(storageCounts().every(n=>n===0),'Project deletion cascades to files, change history and editor presence');
  check((await bob.client.call('file.sync',{project:doomed,file:doomedFile.id,client:'delete-test-peer',version:doomedFile.version,updates:[]})).status===404,'Open group editor cannot recreate deleted project');
  check((await bob.client.ok('file',null,{project:pid,path:'renamed.txt'})).file.content===current.content,'Other group project survives whole-project deletion');
  await admin.ok('admin.user.delete',{id:alice.id});
  check((await bob.client.ok('files',null,{project:pid})).project.created_by===null,'Group project survives creator deletion');
  check((await bob.client.ok('file',null,{project:pid,path:'renamed.txt'})).file.content===current.content,'Group files survive creator deletion');
  // Simulate expired history without touching live application data.
  const prune=spawnSync('php',['-r',"require 'app/bootstrap.php';query('DELETE FROM file_updates WHERE file_id=?',[$argv[1]]);",file.id],{env,encoding:'utf8'});assert.equal(prune.status,0,prune.stderr);
  check((await bob.client.ok('file.sync',{project:pid,file:file.id,client:b.clientID,version:file.version,updates:[]})).resync===true,'Expired history returns explicit recovery, no overwrite');
  await admin.ok('admin.group.delete',{id:group});
  check((await bob.client.call('files',null,{project:pid})).status===404,'Group deletion removes group projects');
  console.log(`${checks} collaborative editing and group-project checks passed.`);
} finally {
  server.kill();await new Promise(r=>server.once('exit',r));await rm(privateDir,{recursive:true,force:true});
}
