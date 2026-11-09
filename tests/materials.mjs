import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {materialHref,materialMatches,materialSize} from '../src/materials.js';
assert.equal(materialHref({kind:'link',url:'javascript:alert(1)'}),'');assert.equal(materialHref({kind:'link',url:'https://user:secret@example.org'}),'');assert.equal(materialHref({kind:'link',url:'https://example.org/a?b=1'}),'https://example.org/a?b=1');assert.equal(materialHref({kind:'document',id:'a&b'}),'/material-file.php?id=a%26b');
assert.equal(materialSize(1048576),'1 MB');assert.equal(materialSize(1024),'1 KB');assert.equal(materialMatches({title:'Überblick',description:'Tag 1',category:'Kurs',kind:'link'},{query:'ÜBER',type:'link',category:'Kurs'}),true);assert.equal(materialMatches({title:'A',category:'B',kind:'document'},{type:'link'}),false);
const r=spawnSync('php',['tests/materials.php'],{encoding:'utf8'});assert.equal(r.status,0,r.stdout+r.stderr);process.stdout.write(r.stdout);

const http=spawnSync('python3',['tests/materials-http.py'],{encoding:'utf8'});assert.equal(http.status,0,http.stdout+http.stderr);process.stdout.write(http.stdout);
