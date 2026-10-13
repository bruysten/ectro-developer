import assert from 'node:assert/strict';
import {EditorState} from '@codemirror/state';
import {mapColorRange,parseColor,formatColor,rgbToLab,labToRgb,rgbToHsv,hsvToRgb,colorAt} from '../src/color.js';
let checks=0;const near=(a,b,t=.02)=>{assert.ok(Math.abs(a-b)<t,`${a} ≠ ${b}`);checks++;};
const sample=rgbToLab(parseColor('#7654CD').rgb);[44.36,36.05,-58.99].forEach((v,i)=>near(sample[i],v));
for(const hex of ['#000000','#FFFFFF','#FF0000','#00FF00','#0000FF','#B2026C','#CC9040']){const color=parseColor(hex);labToRgb(rgbToLab(color.rgb)).forEach((v,i)=>near(v,color.rgb[i],.00001));hsvToRgb(rgbToHsv(color.rgb)).forEach((v,i)=>near(v,color.rgb[i],.00001));assert.equal(formatColor(color,'hex'),hex);checks++;}
assert.equal(formatColor(parseColor('#abcd'),'hex'),'#AABBCCDD');assert.equal(formatColor(parseColor('rgba(255, 0, 0, 0.5)'),'rgb'),'rgb(255 0 0 / 0.5)');assert.equal(formatColor(parseColor('rgb(100% 0% 0%)'),'hex'),'#FF0000');
for(const invalid of ['#12','rgb(999 0 0)','rgb(1 2)','lab(101 0 0)','rgb(NaN 0 0)','rgb(0 0 0 / 2)','red; background:url(x)'])assert.equal(parseColor(invalid),null);
const state=EditorState.create({doc:'h1 { color: #CC9040; background: rgb(0 0 0 / 0.5); }'});const target=colorAt(state.doc,{empty:true,head:16,from:16,to:16});assert.equal(state.doc.sliceString(target.from,target.to),'#CC9040');assert.equal(target.color.format,'hex');const selected=colorAt(state.doc,{empty:false,from:5,to:10});assert.equal(selected.color,null);assert.equal(selected.to,10);
assert.ok(labToRgb([50,150,150]).some(n=>n<0||n>1));
const before=state.update({changes:{from:0,insert:'/* note */'}}).changes;assert.deepEqual(mapColorRange(target,before),{range:{from:target.from+10,to:target.to+10},conflicted:false});
const overlapping=state.update({changes:{from:target.from+1,to:target.to,insert:'FFFFFF'}}).changes;assert.equal(mapColorRange(target,overlapping).conflicted,true);
const elsewhere=state.update({changes:{from:state.doc.length,insert:'\n'}}).changes;assert.equal(mapColorRange(target,elsewhere).conflicted,false);
const insertion=state.update({changes:{from:5,insert:'x'}}).changes;assert.equal(mapColorRange({from:5,to:5},insertion).conflicted,true);
console.log(`${checks+19} color conversion, parsing and editor-context checks passed.`);
