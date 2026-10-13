import {unzipSync,strFromU8} from 'fflate';
self.onmessage=({data})=>{
  try {
    let total=0,count=0;
    const parts=unzipSync(new Uint8Array(data),{filter:entry=>{
      if(!/^(word\/document\.xml|xl\/(sharedStrings\.xml|worksheets\/sheet[0-9]+\.xml)|ppt\/slides\/slide[0-9]+\.xml|content\.xml)$/.test(entry.name))return false;
      if(++count>20||entry.originalSize>2097152||(entry.compression===0&&entry.size!==entry.originalSize)||(total+=entry.originalSize)>4194304)throw Error('Das Dokument ist für die Textvorschau zu umfangreich.');
      return true;
    }});
    self.postMessage({parts:Object.entries(parts).map(([name,bytes])=>({name,xml:strFromU8(bytes)}))});
  } catch(e){self.postMessage({error:'Die Office-Vorschau konnte nicht erstellt werden. Bitte das Original herunterladen.'});}
};
