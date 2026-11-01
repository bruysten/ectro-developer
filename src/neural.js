export function createNetwork(layers=[2,4,1],seed=42){
  let state=seed>>>0;const random=()=>{state=(1664525*state+1013904223)>>>0;return state/4294967296;};
  return {layers:[...layers],weights:layers.slice(1).map((n,l)=>Array.from({length:n},()=>Array.from({length:layers[l]},()=>(random()*2-1)*Math.sqrt(6/(layers[l]+n))))),biases:layers.slice(1).map(n=>Array(n).fill(0)),samples:[],history:[],epochs:0};
}
export function forward(net,input){
  if(input.length!==net.layers[0]||input.some(v=>!Number.isFinite(v)))throw Error('Eingabe passt nicht zum Netz.');
  const activations=[[...input]];net.weights.forEach((matrix,l)=>{activations.push(matrix.map((row,j)=>{const z=row.reduce((sum,w,k)=>sum+w*activations[l][k],net.biases[l][j]);return 1/(1+Math.exp(-Math.max(-700,Math.min(700,z))));}));});return activations;
}
export function trainEpoch(net,rate=.3){
  const samples=net.samples.filter(s=>!s.test);if(!samples.length)throw Error('Mindestens ein Trainingsbeispiel hinzufügen.');
  for(const sample of samples){const a=forward(net,sample.input),d=Array(net.weights.length);const last=d.length-1;d[last]=a.at(-1).map((v,j)=>2*(v-sample.output[j])*v*(1-v)/sample.output.length);
    for(let l=last-1;l>=0;l--)d[l]=a[l+1].map((v,j)=>net.weights[l+1].reduce((sum,row,k)=>sum+row[j]*d[l+1][k],0)*v*(1-v));
    net.weights.forEach((matrix,l)=>matrix.forEach((row,j)=>{row.forEach((w,k)=>row[k]=Math.max(-100,Math.min(100,w-rate*d[l][j]*a[l][k])));net.biases[l][j]=Math.max(-100,Math.min(100,net.biases[l][j]-rate*d[l][j]));}));
  }net.epochs=(net.epochs||0)+1;return evaluate(net);
}
export function evaluate(net){
  const metrics=test=>{const samples=net.samples.filter(s=>!!s.test===test),classes=net.layers.at(-1)===1?2:net.layers.at(-1),confusion=Array.from({length:classes},()=>Array(classes).fill(0));let loss=0,correct=0;
    const cls=v=>v.length===1?Number(v[0]>=.5):v.indexOf(Math.max(...v));for(const s of samples){const out=forward(net,s.input).at(-1);loss+=out.reduce((sum,v,i)=>sum+(v-s.output[i])**2,0)/out.length;const actual=cls(s.output),predicted=cls(out);confusion[actual][predicted]++;if(actual===predicted)correct++;}return {count:samples.length,loss:samples.length?loss/samples.length:null,accuracy:samples.length?correct/samples.length:null,confusion};};return {train:metrics(false),test:metrics(true)};
}
export function networkExample(kind){
  if(kind==='xor'){const n=createNetwork();n.samples=[{input:[0,0],output:[0]},{input:[0,1],output:[1]},{input:[1,0],output:[1]},{input:[1,1],output:[0]},{input:[.1,.1],output:[0],test:true},{input:[.9,.1],output:[1],test:true}];return n;}
  if(kind==='colors'){const n=createNetwork([3,6,3]);n.samples=[{input:[1,0,0],output:[1,0,0]},{input:[0,1,0],output:[0,1,0]},{input:[0,0,1],output:[0,0,1]},{input:[.8,.2,.1],output:[1,0,0],test:true},{input:[.1,.8,.2],output:[0,1,0],test:true},{input:[.2,.1,.8],output:[0,0,1],test:true}];return n;}
  if(kind==='letters'){const n=createNetwork([64,12,2]);const shapes=['0011110001100110011001100111111001100110011001100110011000000000','0111110001100110011001100111110001100110011001100111110000000000'];n.samples=shapes.map((s,i)=>({input:[...s].map(Number),output:i?[0,1]:[1,0]}));return n;}
  const n=createNetwork([1,5,1]);n.samples=Array.from({length:20},(_,i)=>({input:[i/19],output:[(i/19)**2],test:i%4===0}));return n;
}
