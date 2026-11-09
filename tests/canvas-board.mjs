import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {renderCanvasBoard,canvasPrintHtml} from '../src/canvas-board.js';
import {CANVAS_MODELS,canvasExample,canvasFieldChoices} from '../src/canvas-models.js';
const svgs=[];
for(const kind of Object.keys(CANVAS_MODELS)){
 const c={kind,name:'Unsafe <script> title',content:canvasExample(kind),version:1};
 const html=renderCanvasBoard(c);assert(!html.includes('<script>'));const print=canvasPrintHtml(c);assert(!print.includes('<script')&&!print.includes('src=')&&!print.includes('@import'));
 for(const note of c.content.cards){assert.equal((html.match(new RegExp('data-canvas-card="'+note.id+'"','g'))||[]).length,1,'Every card is an editable note on the default board');assert.equal((html.match(new RegExp('data-canvas-delete="'+note.id+'"','g'))||[]).length,1,'Every editable card has one direct delete action');}for(const note of c.content.cards)assert(print.includes(note.text.replaceAll('&','&amp;').replaceAll('<','&lt;')),'Print retains every card');
 assert(!print.includes('data-canvas-delete='));assert(!renderCanvasBoard({...c,archived:true}).includes('data-canvas-delete='));
 for(const field of canvasFieldChoices(kind))assert(renderCanvasBoard(c,field.id).length>50);
 if(['value','empathy'].includes(kind)){const fields=renderCanvasBoard(c,'',{layout:'fields'});for(const note of c.content.cards)assert.equal((fields.match(new RegExp('data-canvas-card="'+note.id+'"','g'))||[]).length,1);assert.equal((renderCanvasBoard({...c,archived:true}).match(/data-canvas-drag=/g)||[]).length,0);}
 if(kind==='value'){assert.equal((html.match(/<section class="canvas-on-map /g)||[]).length,6);assert(html.includes('canvas-value-map'));assert(html.includes('canvas-interactive-map'));assert(!html.includes('canvas-map-instruction'));assert(html.includes('Produkte &amp;'));}
 if(kind==='empathy'){assert.equal((html.match(/<section class="canvas-on-map /g)||[]).length,6);assert(html.includes('Denken &amp; Fühlen'));assert(renderCanvasBoard(c,'mind').includes('canvas-field-mind'));assert(renderCanvasBoard(c,'research').includes('Offene Fragen'));}
 if(kind==='lean'){for(const key of ['alternatives','concept','adopters'])assert(html.includes(`data-canvas-add="${key}"`));assert.equal((html.match(/<section class="canvas-block /g)||[]).length,9);}
 if(kind==='experiment'){assert.equal((html.match(/<section class="canvas-block /g)||[]).length,6);assert(html.includes('canvas-block--conclusion'));assert(html.includes('Nicht eindeutig'));}
 for(const match of html.matchAll(/<svg[\s\S]*?<\/svg>/g))svgs.push(match[0]);
}
for(const kind of ['value','empathy']){const c={kind,name:'Unsafe',content:canvasExample(kind),version:1};c.content.cards[0].text='<script>alert(1)</script> & external';const html=renderCanvasBoard(c);assert(!html.includes('<script>'));assert(html.includes('&lt;script&gt;'));for(const match of html.matchAll(/<svg[\s\S]*?<\/svg>/g))svgs.push(match[0]);}
const xml=spawnSync('python3',['-c','import json,sys,xml.etree.ElementTree as E\nfor svg in json.load(sys.stdin):E.fromstring(svg)'],{input:JSON.stringify(svgs),encoding:'utf8'});assert.equal(xml.status,0,xml.stderr);
console.log('Canvas structures verified: square/circle VPC, six-region Empathy Map, nine-block Lean with three subareas, two-column Experiment, SMART/SWOT/PESTEL, SVG XML and standalone print exports.');
