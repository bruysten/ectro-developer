import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {agentExample,agentsMarkdown,skillMarkdown,parseSkill,AGENT_TOOLS} from '../src/agent-models.js';
const c=agentExample();assert.equal(c.source.rows.length,4);assert.match(agentsMarkdown(c),/AGENTS.md/);assert.match(agentsMarkdown(c),/source.read/);assert.equal(AGENT_TOOLS['report.create'].write,true);assert.equal(AGENT_TOOLS['source.read'].write,false);
const skill={name:'analyse-pruefen',description:'Bei einer Datenauswertung: "Prüfen"',instructions:'Summen und fehlende Werte prüfen.',enabled:true};assert.deepEqual(parseSkill(skillMarkdown(skill)),skill);assert.throws(()=>parseSkill('---\nname: ../evil\ndescription: Test\n---\nBody'));assert.throws(()=>parseSkill('---\nname: valid\ndescription: Test\nallowed-tools: shell\n---\nBody'));assert.throws(()=>parseSkill('name: valid'));assert.throws(()=>parseSkill('---\nname: valid\nname: dup\ndescription: Test\n---\nBody'));
const out=spawnSync('php',['tests/agent.php'],{input:JSON.stringify({example:c,markdown:agentsMarkdown(c)}),encoding:'utf8'});assert.equal(out.status,0,out.stdout+out.stderr);process.stdout.write(out.stdout);

const http=spawnSync('python3',['tests/agent-http.py'],{encoding:'utf8'});assert.equal(http.status,0,http.stdout+http.stderr);process.stdout.write(http.stdout);
