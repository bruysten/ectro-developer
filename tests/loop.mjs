import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {loopExample,loopSlot,loopInput,loopStatus,loopReport} from '../src/loop-models.js';
const c=loopExample('connection');assert.equal(c.agents.length,3);assert.equal(loopSlot(c,0).round,1);assert.equal(loopSlot(c,3).agent.id,'draft');assert.equal(loopSlot(c,3).round,2);assert.equal(loopSlot(c,5).agent.id,'refine');assert.equal(loopSlot(c,0).total,6);assert.equal(loopInput(c,[]),c.input);assert.equal(loopInput(c,[{text:'Previous output'}]),'Previous output');assert.equal(loopStatus({runtime:{status:'ready'},halt:1,busy:true}),'Pause nach diesem Schritt');assert.equal(loopStatus({runtime:{status:'done'},halt:1,busy:false}),'Abgeschlossen');
const report=loopReport({config:c,runtime:{results:[{text:'Actual text',model:'Synthetic',tokens:10}],error:null},created:'test'});assert.match(report,/Actual text/);assert.match(report,/Entwurf/);
const result=spawnSync('php',['tests/loop.php'],{input:JSON.stringify(loopExample()),encoding:'utf8'});assert.equal(result.status,0,result.stdout+result.stderr);process.stdout.write(result.stdout);

const http=spawnSync('python3',['tests/loop-http.py'],{encoding:'utf8'});assert.equal(http.status,0,http.stdout+http.stderr);process.stdout.write(http.stdout);
