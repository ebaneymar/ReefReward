const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(require('path').join(__dirname,'../app/game.html'),'utf8'),source=html.match(/<script>([\s\S]*?)<\/script>/)[1];
function newGame(values=new Map(),failWrites=false){
 const gradient={addColorStop(){}},c=new Proxy({},{get:(o,k)=>k==='measureText'?s=>({width:String(s).length*7}):k==='createLinearGradient'||k==='createRadialGradient'?()=>gradient:()=>{},set:(o,k,v)=>(o[k]=v,true)}),nodes=new Map();
 function node(id){if(!nodes.has(id))nodes.set(id,{id,value:'',checked:false,disabled:false,open:false,innerHTML:'',textContent:'',width:300,height:180,attrs:{},style:{setProperty(){}},classList:{toggle(){},add(){},remove(){}},setAttribute(k,v){this.attrs[k]=String(v)},getContext:()=>c,getBoundingClientRect:()=>({width:960,height:560,left:0,top:0}),addEventListener(){},showModal(){this.open=true},close(){this.open=false},querySelectorAll(){return[]},click(){},appendChild(){},remove(){}});return nodes.get(id)}
 const sandbox={console,Math,Date,Set,Map,JSON,Number,String,Array,Error,SyntaxError,Uint8Array,Blob,Image:class{},URL:{createObjectURL(){return'blob:local'},revokeObjectURL(){}},crypto:require('crypto').webcrypto,matchMedia:()=>({matches:false}),localStorage:{getItem:k=>values.get(k)||null,setItem(k,v){if(failWrites)throw Error('Quota exceeded');values.set(k,v)}},document:{getElementById:node,createElement:()=>node('generated-'+Math.random()),body:node('body'),documentElement:node('html'),addEventListener(){}},window:{devicePixelRatio:1},ResizeObserver:class{observe(){}},requestAnimationFrame(){},setTimeout(){return 1},clearTimeout(){},performance:{now:()=>0}};
 vm.createContext(sandbox);vm.runInContext(source,sandbox);return {run:code=>vm.runInContext(code,sandbox),json:code=>JSON.parse(JSON.stringify(vm.runInContext(code,sandbox))),node,values};
}

module.exports={newGame};
