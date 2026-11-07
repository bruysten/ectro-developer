import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {CANVAS_MODELS,canvasExample,canvasOperation,canvasProgress,canvasAcceptsVersion} from '../src/canvas-models.js';
import {STUDIO_LABELS} from '../src/studio-models.js';
assert.equal(STUDIO_LABELS.canvas,undefined,'Standalone boards must not become project-template seed kinds');
const fixtures={};for(const [kind,model] of Object.entries(CANVAS_MODELS)){const c=canvasExample(kind);fixtures[kind]=c;assert.equal(new Set(model.fields.map(f=>f.id)).size,model.fields.length);assert(c.cards.every(c=>model.fields.some(f=>f.id===c.section)));assert.equal(canvasProgress({kind,content:c}).filled,c.cards.length);}
assert.equal(CANVAS_MODELS.business.fields.length,9);assert.equal(CANVAS_MODELS.value.fields.length,6);assert.equal(CANVAS_MODELS.lean.fields.length,9);
assert.equal(canvasAcceptsVersion({id:'a',version:5},{id:'a',version:4}),false,'A delayed poll must never roll back a newer saved revision');
assert.equal(canvasAcceptsVersion({id:'a',version:5},{id:'a',version:6}),true);
assert.equal(canvasAcceptsVersion({id:'a',version:5},{id:'b',version:1}),true);
const payload={id:'a',op:'put',card_id:'b',card_version:1,card:{text:'Draft'}};const first=canvasOperation(null,payload);assert.equal(canvasOperation(first,structuredClone(payload)),first);assert.notEqual(canvasOperation(first,{...payload,card:{text:'Changed draft'}}).payload.mutation,first.payload.mutation);assert.deepEqual(payload.card,{text:'Draft'});
const php=spawnSync('php',['tests/canvases.php'],{input:JSON.stringify(fixtures),encoding:'utf8'});assert.equal(php.status,0,php.stderr+php.stdout);console.log(php.stdout.trim());console.log('Five canvas models and stable/replaced mutation identities verified.');
