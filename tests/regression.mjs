import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {regressionExample,regressionFit,regressionLine,regressionPredict,regressionErrors,regressionFromTable,regressionBounds} from '../src/regression-models.js';
const near=(a,b,eps=1e-9)=>assert(Math.abs(a-b)<=eps,`${a} != ${b}`),points=p=>p.map(([x,y],i)=>({id:String(i),label:String(i),x,y,included:true}));
const c=regressionExample(),fit=regressionFit(c.points);
near(fit.meanX,41.6);near(fit.meanY,46);near(fit.sxx,2605.2);near(fit.sxy,2437);near(fit.slope,.9354368186703517);near(fit.intercept,7.085828343313366);near(fit.sse,90.34047290035308);near(fit.r2,.9618816570040705);
const fitted={...c,mode:'fit'};near(regressionPredict(fitted,44),48.24504836480884);near(regressionErrors(fitted).sse,fit.sse);near(fit.residuals.reduce((a,r)=>a+r.residual,0),0);
const perfect=regressionFit(points([[-2,-4],[-1,-1],[0,2],[1,5],[2,8]]));near(perfect.slope,3);near(perfect.intercept,2);near(perfect.r2,1);near(perfect.sse,0);
const negative=regressionFit(points([[0,10],[1,8],[2,6],[3,4]]));near(negative.slope,-2);near(negative.intercept,10);
const constant=regressionFit(points([[1,4],[2,4],[3,4]]));assert.equal(constant.r2,null);assert.equal(constant.slope,0);assert.equal(constant.sse,0);
for(const input of [[],points([[1,2]]),points([[2,1],[2,9]])])assert.equal(regressionFit(input).valid,false);
assert.equal(regressionFit(regressionExample('curve').points).r2,0);
assert.equal(regressionLine({...c,points:[],mode:'fit'}),null);assert.equal(regressionPredict({...c,points:[],mode:'fit'},3),null);
for(const dm of [-2,-.1,0,.1,2])for(const db of [-5,-.2,0,.2,5]){const trial={...c,mode:'manual',line:{slope:fit.slope+dm,intercept:fit.intercept+db}};assert(regressionErrors(trial).sse>=fit.sse-1e-8,'OLS minimizes the squared vertical residuals');}
const shifted=regressionFit(c.points.map(p=>({...p,x:p.x+1e7,y:p.y-1e7})));near(shifted.slope,fit.slope,1e-9);near(shifted.r2,fit.r2,1e-9);
const excluded={...c,points:[...c.points,{id:'outlier',x:40,y:300,included:false}]};near(regressionFit(excluded.points).sse,fit.sse);excluded.points.at(-1).included=true;assert(regressionFit(excluded.points).sse>fit.sse*10);assert.equal(c.points.length,5);
assert.equal(regressionFit(points([[1e-200,1],[2e-200,2]])).valid,false);assert.equal(regressionFit(points([[1,1e-200],[2,2e-200]])).valid,false);
assert.equal(regressionExample('empty').points.length,0);assert.deepEqual(regressionExample('books'),c);
const bounds=regressionBounds(points([[5,5],[5,5]]));assert(bounds.xmax>bounds.xmin&&bounds.ymax>bounds.ymin);
const data={name:'Numbers',columns:[{name:'x',type:'number'},{name:'y',type:'number'},{name:'label',type:'text'}],rows:[{x:1,y:3,label:'One'},{x:2,y:5,label:'<img src=x>'}]},mapping={xColumn:'x',yColumn:'y',labelColumn:'label'};
const imported=regressionFromTable(data,mapping);assert.equal(imported.points[1].label,'<img src=x>');near(regressionFit(imported.points).slope,2);assert.throws(()=>regressionFromTable({...data,truncated:true},mapping),/Ausschnitt/);
for(const bad of [null,'',false,'3',Infinity,NaN,1e9,{},[]])assert.throws(()=>regressionFromTable({...data,rows:[{x:bad,y:1}]},mapping),/Zahl/);
assert.throws(()=>regressionFromTable(data,{xColumn:'x',yColumn:'x'}),/unterschiedliche/);
// The visual fit transition interpolates coefficients; every frame has a real, nonincreasing error.
let previous=Infinity;for(let i=0;i<=30;i++){const t=i/30,trial={...c,line:{slope:fit.slope*t,intercept:c.line.intercept+(fit.intercept-c.line.intercept)*t}};const error=regressionErrors(trial).sse;assert(error<=previous+1e-8);previous=error;}
const php=spawnSync('php',['tests/regression.php'],{input:JSON.stringify(c),encoding:'utf8'});assert.equal(php.status,0,php.stdout+php.stderr);process.stdout.write(php.stdout);
console.log('Linear regression verified: exact sample, optimum, signed slopes, zero/constant/identical data, stable offsets, exclusion, strict import, prediction and real interpolation errors.');
