import {trainEpoch,trainSample,evaluate} from './neural.js';
onmessage=({data})=>{try{
 const {network,epochs,rate}=data,record=metrics=>{network.history=[...(network.history||[]),{epoch:network.epochs,train:metrics.train.loss,test:metrics.test.loss}].slice(-1000);};
 if(epochs===1&&data.trace){const samples=network.samples.map((sample,index)=>({sample,index})).filter(({sample})=>!sample.test);if(!samples.length)throw Error('Mindestens ein Trainingsbeispiel hinzufügen.');for(const [step,{sample,index}] of samples.entries()){trainSample(network,sample,rate);if(step%Math.max(1,Math.ceil(samples.length/12))===0||step===samples.length-1)postMessage({network,trace:{sample,index,step:step+1,total:samples.length}});}network.epochs=(network.epochs||0)+1;const metrics=evaluate(network);record(metrics);postMessage({network,metrics,done:true});return;}
 const interval=Math.max(25,Math.ceil(epochs/24));for(let i=0;i<epochs;i++){const metrics=trainEpoch(network,rate);if(i===epochs-1||i%interval===0){record(metrics);postMessage({network,metrics,done:i===epochs-1});}}
}catch(e){postMessage({error:e.message});}};
