export const NETWORK_LESSONS={
 xor:{title:'XOR · Klassifikation',goal:'Genau eine Eingabe ist 1: Dann soll die Ausgabe 1 werden.',inputs:['A','B'],outputs:['XOR'],layers:[2,1]},
 colors:{title:'Farben · RGB',goal:'Aus Rot-, Grün- und Blauanteilen die dominante Farbfamilie erkennen.',inputs:['Rot','Grün','Blau'],outputs:['Rot','Grün','Blau'],layers:[3,3]},
 colors2:{title:'Farben · 2 Eingaben',goal:'Rotanteil und Grünanteil genügen: Blau ist der Rest bis 1. Die Helligkeit bleibt außen vor.',inputs:['R-Anteil','G-Anteil'],outputs:['Rot','Grün','Blau'],layers:[2,3]},
 numbers:{title:'Zahlen · Quadrat',goal:'Für Zahlen zwischen 0 und 1 den Wert x² annähern.',inputs:['x'],outputs:['x²'],layers:[1,1]},
 letters:{title:'Buchstaben · A/B',goal:'Ein 8 × 8 Pixelmuster als A oder B erkennen.',inputs:[],outputs:['A','B'],layers:[64,2]},
 custom:{title:'Eigenes Experiment',goal:'Eingaben und Zielwerte festlegen und die Vorhersage mit dem Ziel vergleichen.'},
};
export function networkLesson(net){
 const compatible=key=>NETWORK_LESSONS[key]?.layers?.every((size,i)=>size===(i?net.layers.at(-1):net.layers[0]));
 if(net.example)return net.example==='custom'||!compatible(net.example)?'custom':net.example;
 // Recover older saved examples from their data, never from dimensions alone.
 const signature=samples=>JSON.stringify(samples.map(s=>[s.input,s.output,!!s.test]));
 for(const key of ['xor','colors','colors2','numbers','letters'])if(compatible(key)&&signature(net.samples||[])===signature(networkExample(key).samples))return key;
 return 'custom';
}
export const rgbHex=input=>'#'+input.map(v=>Math.round(Math.max(0,Math.min(1,v))*255).toString(16).padStart(2,'0')).join('');
export function resetNetwork(net,layers=net.layers){const next=createNetwork(layers);if(layers[0]===net.layers[0]&&layers.at(-1)===net.layers.at(-1)){next.samples=structuredClone(net.samples);next.example=networkLesson(net);}else next.example='custom';return {...next,learningRate:net.learningRate??.3,trainingEpochs:net.trainingEpochs??500};}
export function createNetwork(layers=[2,4,1],seed=42){
  let state=seed>>>0;const random=()=>{state=(1664525*state+1013904223)>>>0;return state/4294967296;};
  return {layers:[...layers],weights:layers.slice(1).map((n,l)=>Array.from({length:n},()=>Array.from({length:layers[l]},()=>(random()*2-1)*Math.sqrt(6/(layers[l]+n))))),biases:layers.slice(1).map(n=>Array(n).fill(0)),samples:[],history:[],epochs:0};
}
export function forward(net,input){
  if(input.length!==net.layers[0]||input.some(v=>!Number.isFinite(v)))throw Error('Eingabe passt nicht zum Netz.');
  const activations=[[...input]];net.weights.forEach((matrix,l)=>{activations.push(matrix.map((row,j)=>{const z=row.reduce((sum,w,k)=>sum+w*activations[l][k],net.biases[l][j]);return 1/(1+Math.exp(-Math.max(-700,Math.min(700,z))));}));});return activations;
}
export function trainSample(net,sample,rate=.3){
  if(sample.test)throw Error('Testbeispiele werden nicht trainiert.');
  const a=forward(net,sample.input),d=Array(net.weights.length);const last=d.length-1;d[last]=a.at(-1).map((v,j)=>2*(v-sample.output[j])*v*(1-v)/sample.output.length);
    for(let l=last-1;l>=0;l--)d[l]=a[l+1].map((v,j)=>net.weights[l+1].reduce((sum,row,k)=>sum+row[j]*d[l+1][k],0)*v*(1-v));
    net.weights.forEach((matrix,l)=>matrix.forEach((row,j)=>{row.forEach((w,k)=>row[k]=Math.max(-100,Math.min(100,w-rate*d[l][j]*a[l][k])));net.biases[l][j]=Math.max(-100,Math.min(100,net.biases[l][j]-rate*d[l][j]));}));

  return net;
}
export function trainEpoch(net,rate=.3){
  const samples=net.samples.filter(s=>!s.test);if(!samples.length)throw Error('Mindestens ein Trainingsbeispiel hinzufügen.');
  for(const sample of samples)trainSample(net,sample,rate);
  net.epochs=(net.epochs||0)+1;return evaluate(net);
}
export function evaluate(net){
  const classification=['xor','colors','colors2','letters'].includes(networkLesson(net));
  const metrics=test=>{const samples=net.samples.filter(s=>!!s.test===test),classes=net.layers.at(-1)===1?2:net.layers.at(-1),confusion=Array.from({length:classes},()=>Array(classes).fill(0));let loss=0,correct=0;
    const cls=v=>v.length===1?Number(v[0]>=.5):v.indexOf(Math.max(...v));for(const s of samples){const out=forward(net,s.input).at(-1);loss+=out.reduce((sum,v,i)=>sum+(v-s.output[i])**2,0)/out.length;const actual=cls(s.output),predicted=cls(out);if(classification){confusion[actual][predicted]++;if(actual===predicted)correct++;}}return {count:samples.length,loss:samples.length?loss/samples.length:null,accuracy:classification&&samples.length?correct/samples.length:null,confusion:classification?confusion:[]};};return {train:metrics(false),test:metrics(true)};
}
export function networkExample(kind='xor'){
  if(!['xor','numbers','colors','colors2','letters'].includes(kind))throw Error('Unbekanntes Netzbeispiel.');
  if(kind==='xor'){const n=createNetwork();n.samples=[{input:[0,0],output:[0]},{input:[0,1],output:[1]},{input:[1,0],output:[1]},{input:[1,1],output:[0]},{input:[.1,.1],output:[0],test:true},{input:[.9,.1],output:[1],test:true}];return {...n,example:kind};}
  if(kind==='colors'){const n=createNetwork([3,6,3]);n.samples=[{input:[1,0,0],output:[1,0,0]},{input:[0,1,0],output:[0,1,0]},{input:[0,0,1],output:[0,0,1]},{input:[.8,.2,.1],output:[1,0,0],test:true},{input:[.1,.8,.2],output:[0,1,0],test:true},{input:[.2,.1,.8],output:[0,0,1],test:true}];return {...n,example:kind};}
  if(kind==='colors2'){const n=createNetwork([2,6,3]);n.samples=networkExample('colors').samples.map(s=>{const total=s.input.reduce((a,b)=>a+b,0);return {...s,input:[s.input[0]/total,s.input[1]/total]};});return {...n,example:kind};}
  if(kind==='letters'){const n=createNetwork([64,12,2]);const shapes=['0011110001100110011001100111111001100110011001100110011000000000','0111110001100110011001100111110001100110011001100111110000000000'];n.samples=shapes.map((s,i)=>({input:[...s].map(Number),output:i?[0,1]:[1,0]}));return {...n,example:kind};}
  const n=createNetwork([1,5,1]);n.samples=Array.from({length:20},(_,i)=>({input:[i/19],output:[(i/19)**2],test:i%4===0}));return {...n,example:kind};
}

export const networkRGB=(net,input)=>networkLesson(net)==='colors2'?[input[0],input[1],Math.max(0,1-input[0]-input[1])]:input;
export function dominantRGB(input){const max=Math.max(...input),indices=input.map((v,i)=>Math.abs(v-max)<1e-10?i:-1).filter(i=>i>=0);return indices.length===1?indices[0]:null;}
