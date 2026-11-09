import './regression.mjs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {basketExample,basketMetrics,basketPairRules,basketsFromTable,BASKET_PRACTICE,BASKET_EXAMPLES} from '../src/statistics-models.js';
const c=basketExample(),m=basketMetrics(c),near=(a,b)=>assert(Math.abs(a-b)<1e-12);
assert.deepEqual([m.n,m.na,m.nb,m.both],[19,10,12,8]);near(m.support,8/19);near(m.confidence,.8);near(m.lift,19/15);
const reverse=basketMetrics({...c,rule:{antecedent:['Schuhe'],consequent:['Hemd']}});near(reverse.support,m.support);near(reverse.lift,m.lift);near(reverse.confidence,8/12);
for(let i=0;i<=c.baskets.length;i++){const prefix=basketMetrics(c,i);assert.equal(prefix.n,i);assert.equal(prefix.both,c.baskets.slice(0,i).filter(r=>r.items.includes('Hemd')&&r.items.includes('Schuhe')).length);}
const empty=basketMetrics({...c,baskets:[]});assert.equal(empty.support,null);assert.equal(empty.confidence,null);assert.equal(empty.lift,null);
const independent={products:['A','B'],baskets:[{id:'1',items:['A','B']},{id:'2',items:['A']},{id:'3',items:['B']},{id:'4',items:[]}],rule:{antecedent:['A'],consequent:['B']},minSupport:0,minConfidence:0};
assert.equal(basketMetrics(independent).lift,1);assert.equal(basketMetrics({...independent,baskets:independent.baskets.slice(1)}).lift,0);assert.equal(basketMetrics({...independent,rule:{antecedent:[],consequent:['B']}}).support,null);
const multi={...c,rule:{antecedent:['Hemd','Jeans'],consequent:['Schuhe','T-Shirt']}};assert.equal(basketMetrics(multi).both,2);
for(const r of basketPairRules(c)){const exact=basketMetrics({...c,rule:{antecedent:[r.a],consequent:[r.b]}});near(r.support,exact.support);near(r.confidence,exact.confidence);near(r.lift,exact.lift);}
assert(basketPairRules({...c,minSupport:50,minConfidence:90}).every(r=>r.support>=.5&&r.confidence>=.9));
const table={name:'Positions',columns:[{name:'order'},{name:'product'}],rows:[{order:1,product:'A'},{order:1,product:'A'},{order:1,product:'B'},{order:2,product:'A'}]},map={basketColumn:'order',productColumn:'product'};
const imported=basketsFromTable(table,map);assert.equal(imported.baskets.length,2);assert.deepEqual(imported.baskets[0].items,['A','B']);assert.equal(basketMetrics(imported).confidence,.5);
assert.throws(()=>basketsFromTable({...table,truncated:true},map),/Ausschnitt/);assert.throws(()=>basketsFromTable({...table,rows:[{order:null,product:'A'}]},map),/IDs/);assert.throws(()=>basketsFromTable(table,{...map,productColumn:'order'}),/unterschiedliche/);
const matrix={name:'Matrix',columns:[{name:'id'},{name:'A'},{name:'B'}],rows:[{id:'1',A:1,B:false},{id:'2',A:'0',B:'true'}]},mapping={format:'matrix',basketColumn:'id',productColumns:['A','B']};
assert.deepEqual(basketsFromTable(matrix,mapping).baskets,[{id:'1',items:['A']},{id:'2',items:['B']}]);
for(const value of [2,-1,'yes',null,undefined,'',[],{}])assert.throws(()=>basketsFromTable({...matrix,rows:[{id:'1',A:value,B:0}]},mapping),/0\/1/);
assert.throws(()=>basketsFromTable({...matrix,rows:[matrix.rows[0],matrix.rows[0]]},mapping),/eindeutig/);
assert.throws(()=>basketsFromTable({...table,rows:[{order:1,product:'__proto__'}]},map),/IDs/);
const contract=spawnSync('php',['tests/statistics.php'],{input:JSON.stringify(c),encoding:'utf8'});assert.equal(contract.status,0,contract.stdout+contract.stderr);process.stdout.write(contract.stdout);
console.log('Basket analysis verified: counts, direction, itemsets, zero denominators, independent/negative associations, every playback prefix, pair ranking, strict imports and deduplication.');
const expected={bookshop:[24,10,9,6,1.6],maintenance:[24,12,13,9,18/13],campaigns:[20,10,9,6,4/3]};
for(const [key,spec] of Object.entries(BASKET_PRACTICE)){
 const sample=basketExample(key),m=basketMetrics(sample),[n,a,b,both,lift]=expected[key];assert.equal(sample.basketExample,key);assert(BASKET_EXAMPLES[key].includes(spec.title));assert.match(sample.sourceLabel,/synthetische/);
 assert.deepEqual([m.n,m.na,m.nb,m.both],[n,a,b,both]);near(m.support,both/n);near(m.confidence,both/a);near(m.lift,lift);
 const reverse=basketMetrics({...sample,rule:{antecedent:sample.rule.consequent,consequent:sample.rule.antecedent}});near(reverse.support,m.support);near(reverse.lift,m.lift);near(reverse.confidence,both/b);assert.notEqual(reverse.confidence,m.confidence);
 assert.equal(new Set(sample.baskets.map(row=>row.id)).size,n);assert(sample.baskets.every(row=>row.items.length&&new Set(row.items).size===row.items.length&&row.items.every(item=>sample.products.includes(item))));
 for(let i=0;i<=n;i++){const prefix=basketMetrics(sample,i);assert.equal(prefix.n,i);assert.equal(prefix.both,spec.values.slice(0,i).filter(items=>items.includes(spec.a)&&items.includes(spec.b)).length);}
 const before=structuredClone(spec);sample.products[0]='Modified';sample.baskets[0].items.length=0;assert.deepEqual(spec,before,'Example templates remain unchanged by participant edits');assert.notDeepEqual(basketExample(key).baskets[0].items,sample.baskets[0].items);
 const persisted=spawnSync('php',['tests/statistics.php'],{input:JSON.stringify(basketExample(key)),encoding:'utf8'});assert.equal(persisted.status,0,persisted.stdout+persisted.stderr);
 console.log(`${key}: ${n} baskets, exact initial counts, reversal, every counting prefix, independent copies and persisted context verified.`);
}
const campaigns=basketExample('campaigns'),display=basketMetrics({...campaigns,rule:{antecedent:['Newsletterplatzierung'],consequent:['Display-Banner']}});near(display.confidence,.5);near(display.baseline,.65);assert(display.lift<1,'A common booked format need not be positively associated with the starting format');
