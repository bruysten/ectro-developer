const appOrigin=new URL(import.meta.url).origin;
addEventListener('message',function render(e){
  if(e.source!==parent||e.origin!==appOrigin||e.data?.type!=='render'||typeof e.data.html!=='string')return;
  removeEventListener('message',render);
  document.open();document.write(e.data.html);document.close();
});
parent.postMessage({type:'renderer-ready'},'*');
