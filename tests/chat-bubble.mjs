import assert from 'node:assert/strict';
import {constrainBubble} from '../src/chat-bubble.js';
for(const [w,h] of [[390,844],[1280,720],[320,480]])for(const point of [{x:-100,y:-100},{x:5000,y:5000},{x:180,y:200}]){const p=constrainBubble(point,w,h);assert.ok(p.x>=12&&p.x+56<=w-12);assert.ok(p.y>=12&&p.y+56<=h-12);}
assert.deepEqual(constrainBubble({x:100,y:200},1280,720),{x:100,y:200});
console.log('19 chat bubble viewport-boundary checks passed.');
