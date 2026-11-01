import assert from 'node:assert/strict';
import {dataLabAccess,dataLabView,dataLabHref,legacyConverterHash,dataLabNavigation} from '../src/data-lab-navigation.js';
import {datasetRows,datasetFromRows} from '../src/converter-data.js';
import {convertData,parseData,serializeData} from '../src/data-converter.js';

for(const files of [false,true])for(const data_lab of [false,true])for(const converter of [false,true]){
  const flags={files,data_lab,converter},access=dataLabAccess(flags),defaultView=dataLabView(flags,new URLSearchParams());
  assert.equal(access.datasets,files&&data_lab);assert.equal(access.convert,converter);
  assert.equal(defaultView,files&&data_lab?'datasets':converter?'convert':null);
  assert.equal(dataLabView(flags,new URLSearchParams('view=convert')),converter?'convert':files&&data_lab?'datasets':null);
  const nav=dataLabNavigation(flags,defaultView,{},v=>v);
  assert.equal(nav.includes('>Datensätze<'),files&&data_lab);assert.equal(nav.includes('>Umwandeln<'),converter);
}
const legacy=legacyConverterHash('#converter?project=p&object=d&participant=u');
assert.equal(legacy.split('?')[0],'#data-lab');const params=new URLSearchParams(legacy.split('?')[1]);
assert.equal(params.get('view'),'convert');assert.equal(params.get('project'),'p');assert.equal(params.get('object'),'d');assert.equal(params.get('participant'),'u');
assert.equal(legacyConverterHash('#graph?project=p'),'#graph?project=p');
assert.equal(dataLabView({files:true,data_lab:true,converter:true},new URLSearchParams('tab=convert')),'convert','Instructor follow links restore converter view');
assert.equal(dataLabView({files:true,data_lab:true,converter:true},new URLSearchParams('view=datasets&tab=convert')),'datasets','Explicit navigation takes precedence over a previous instructor tab');
assert.equal(new URLSearchParams(dataLabHref('convert',{project:'p',object:'a&b'}).split('?')[1]).get('object'),'a&b');

const original={columns:[{name:'Name',type:'text'},{name:'Wert',type:'number'}],rows:[{Name:'A',Wert:12},{Name:'B',Wert:null}]};
const rows=datasetRows(original);assert.deepEqual(rows,original.rows);
assert.deepEqual(datasetFromRows(parseData(serializeData(rows,'json'),'json')),original,'Project dataset survives JSON export and conversion import');
const csv=serializeData([{Name:'A, "B"',Wert:'Zeile\n2'}],'csv');
assert.deepEqual(parseData(csv,'csv'),[{Name:'A, "B"',Wert:'Zeile\n2'}]);
assert.deepEqual(JSON.parse(convertData('\uFEFFName;Ort\nAda;London','csv','json')),[{Name:'Ada',Ort:'London'}]);
assert.equal(datasetFromRows([{PLZ:'00123'}]).rows[0].PLZ,'00123','Identifiers keep leading zeros');
const nested=datasetFromRows([{active:true,count:3,details:{x:1}},{active:false,count:4,details:[2]}]);
assert.deepEqual(nested.columns.map(c=>c.type),['boolean','number','text']);assert.equal(nested.rows[0].details,'{"x":1}');
assert.equal(datasetFromRows([{x:1},{x:'text'}]).rows[0].x,'1','Mixed columns use explicit text consistently');
assert.equal(datasetFromRows([{x:1},{}]).rows[1].x,null);
assert.throws(()=>datasetFromRows([]),/keine/);assert.throws(()=>datasetFromRows(Array(3).fill({x:1}),2),/2 Zeilen/);
assert.throws(()=>datasetFromRows([Object.fromEntries(Array.from({length:51},(_,i)=>['c'+i,1]))]),/50 Spalten/);
assert.throws(()=>datasetFromRows(JSON.parse('[{"__proto__":"bad"}]')),/gültige/);
assert.throws(()=>datasetFromRows([{' x':1,x:2}]),/eindeutige/);
assert(serializeData([{Name:'<Ada & Grace>'}],'xml').includes('&lt;Ada &amp; Grace&gt;'));
console.log('Data-Lab integration verified: independent permissions, legacy routes, instructor links, typed data transfer, nested values and limits.');
