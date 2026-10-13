import assert from 'node:assert/strict';
import {cropGeometry} from '../src/profile-picture.js';
let checks=0;
for(const [w,h] of [[800,400],[400,800],[500,500]])for(const angle of [0,90,180,270])for(const zoom of [1,2,3]){const g=cropGeometry(w,h,angle,zoom,5,-5,512);const rw=angle%180?h:w,rh=angle%180?w:h;assert.ok(rw*g.scale>=512&&rh*g.scale>=512);assert.ok(Math.abs(g.x)<=g.maxX&&Math.abs(g.y)<=g.maxY);checks+=2;}
const small=cropGeometry(100,100,0,1,0,0,192),large=cropGeometry(100,100,0,1,0,0,512);assert.ok(Math.abs(large.scale/small.scale-512/192)<1e-10);checks++;
console.log(`${checks} profile crop geometry checks passed.`);
