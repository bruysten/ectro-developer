import assert from 'node:assert/strict';
import {buildUserDirectory,normalizeUserDirectory,userDirectoryDefaults,NO_GROUP} from '../src/user-directory.js';
const groups=[{id:'a',name:'Kurs 2'},{id:'b',name:'Kurs 10'},{id:'empty',name:'Leere Gruppe'}];
const users=[
  {id:'1',name:'Änne',email:'anne@example.test',role:'user',active:true,last_login:'2026-11-01T10:00:00Z',groups:[groups[1],groups[0]]},
  {id:'2',name:'Bert',email:'bert@example.test',role:'teacher',active:true,last_login:'2026-10-30T10:00:00Z',groups:[groups[0]]},
  {id:'3',name:'Zoe',email:'zoe@example.test',role:'user',active:false,last_login:null,groups:[]},
  {id:'4',name:'Carla',email:'carla@example.test',role:'admin',active:true,last_login:'2026-10-31T10:00:00Z',groups:[groups[1]]},
];
const original=structuredClone(users),view=state=>buildUserDirectory(users,state,groups),ids=result=>result.users.map(u=>u.id);
assert.deepEqual(ids(view({})),['1','2','4','3']);
assert.deepEqual(ids(view({group:'a'})),['1','2']);
assert.deepEqual(ids(view({group:NO_GROUP})),['3']);
assert.deepEqual(ids(view({group:'empty'})),[]);
assert.deepEqual(ids(view({group:'a',role:'teacher',status:'active'})),['2']);
assert.deepEqual(ids(view({group:'a',status:'blocked'})),[]);
assert.deepEqual(ids(view({search:'anne KURS 10'})),['1'],'Search is accent-insensitive and includes memberships');
assert.deepEqual(ids(view({search:'carla@example'})),['4']);
assert.deepEqual(ids(view({sort:'name',direction:'desc'})),['3','4','2','1']);
assert.deepEqual(ids(view({sort:'login',direction:'desc'})),['1','4','2','3'],'Never logged in stays last');
assert.deepEqual(ids(view({sort:'login',direction:'asc'})),['2','4','1','3']);
assert.deepEqual(ids(view({sort:'group'})),['1','2','4','3'],'First group is sorted numerically, independent of membership order');
assert.deepEqual(ids(view({sort:'group',direction:'desc'})),['4','1','2','3']);
assert.deepEqual(ids(view({sort:'role',direction:'desc'})),['4','2','1','3']);
assert.deepEqual(ids(view({sort:'status'})),['1','2','4','3']);
const grouped=view({view:'groups'});assert.equal(grouped.users.length,4,'Total counts distinct people');
assert.deepEqual(grouped.sections.map(s=>[s.id,s.users.map(u=>u.id)]),[['a',['1','2']],['b',['1','4']],[NO_GROUP,['3']]],'Multi-members appear in both groups, unassigned get their own bucket');
assert.equal(grouped.sections.reduce((n,g)=>n+g.users.length,0),5);
assert.deepEqual(view({group:'b',view:'groups'}).sections.map(g=>g.id),['b'],'Group filter does not display unrelated group sections');
assert.deepEqual(view({view:'groups',sort:'group',direction:'desc'}).sections.map(g=>g.id),['b','a',NO_GROUP]);
assert.deepEqual(view({view:'groups',search:'Zoe'}).sections.map(g=>g.id),[NO_GROUP]);
assert.deepEqual(normalizeUserDirectory({sort:'invalid',group:'deleted',view:'bad',role:'__proto__',status:'x',direction:42,search:[],unknown:true},groups),userDirectoryDefaults());
assert.deepEqual(users,original,'Filtering and sorting never change users or memberships');
console.log('23 user-directory checks passed: combined filters, multi-group membership, unique totals, sorting, empty states and immutable source data.');
