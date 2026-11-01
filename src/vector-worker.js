import {vectorSpace} from './vector-space.js';
onmessage=({data})=>{try{postMessage({space:vectorSpace(data.vectors,data.query)});}catch(e){postMessage({error:e.message});}};
