'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),https=require('node:https'),zlib=require('node:zlib');
const {Transform}=require('node:stream'),{pipeline}=require('node:stream/promises');
const APP_ID='reef-rewards',MAX_PACKAGE=96*1024*1024,MAX_CONTENT=128*1024*1024;
const VERSION=/^(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})$/;
function version(v){if(typeof v!=='string'||!VERSION.test(v))throw Error('Use a version such as 1.0.1.');return v;}
function compareVersions(a,b){const aa=version(a).split('.').map(Number),bb=version(b).split('.').map(Number);for(let i=0;i<3;i++)if(aa[i]!==bb[i])return aa[i]>bb[i]?1:-1;return 0;}
function repositoryName(owner,repo){if(!/^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/.test(owner)||! /^[A-Za-z0-9_.-]{1,100}$/.test(repo)||['.','..'].includes(repo))throw Error('Enter a valid GitHub owner and repository.');return owner+'/'+repo;}
function normalizeSource(input){
 let raw=String(input||'').trim();if(!raw)return {repository:'',manifestUrl:''};
 if(/^[\w.-]+\/[\w.-]+$/.test(raw))raw='https://github.com/'+raw;
 let u;try{u=new URL(raw);}catch{throw Error('Paste a GitHub repository link or its update-manifest.json link.');}
 if(u.protocol!=='https:'||u.username||u.password||u.port||u.hash)throw Error('The update source must be a normal HTTPS GitHub link.');
 const parts=u.pathname.split('/').filter(Boolean);let repo=parts[1]?.replace(/\.git$/,'');const repository=repositoryName(parts[0]||'',repo||'');
 if(u.hostname==='github.com'&&parts.length===2)return {repository,manifestUrl:'https://github.com/'+repository+'/releases/latest/download/update-manifest.json'};
 if(u.hostname==='github.com'&&parts[2]==='blob'&&parts.length>=5)u=new URL('https://raw.githubusercontent.com/'+repository+'/'+parts.slice(3).join('/'));
 else if(u.hostname==='github.com'&&parts[2]==='releases'&&parts.length>=6&&parts.at(-1).endsWith('.json')){}
 else if(u.hostname==='raw.githubusercontent.com'&&parts.length>=4&&parts.at(-1).endsWith('.json')){}
 else throw Error('Use a GitHub repository, GitHub release manifest, or raw GitHub JSON link.');
 u.search='';return {repository,manifestUrl:u.href};
}
function allowedURL(raw,source,redirect=false){
 let u;try{u=new URL(raw);}catch{throw Error('The update contains an invalid download address.');}
 if(u.protocol!=='https:'||u.username||u.password||u.port||u.hash)throw Error('Updates must use HTTPS.');
 const cdn=['release-assets.githubusercontent.com','objects.githubusercontent.com'];
 if(redirect&&cdn.includes(u.hostname))return u;
 const parts=u.pathname.split('/').filter(Boolean),prefix=(parts[0]+'/'+parts[1]).toLowerCase();
 if(!['github.com','raw.githubusercontent.com'].includes(u.hostname)||prefix!==source.repository.toLowerCase())throw Error('The update must come from the configured GitHub repository.');
 return u;
}
function validateManifest(m,source,currentDesktopVersion='1.0.0'){
 if(!m||typeof m!=='object'||m.app!==APP_ID||m.format!==1||m.packageType!=='reef-content')throw Error('This is not a Reef Rewards desktop update.');
 const v=version(m.version),minimum=version(m.minDesktopVersion||'1.0.0');
 if(compareVersions(minimum,currentDesktopVersion)>0)throw Error('This release needs a newer desktop launcher. Download its Windows package first.');
 const url=allowedURL(m.url||m.downloadUrl,source).href;
 if(!/^[0-9a-f]{64}$/i.test(m.sha256||''))throw Error('The update checksum is missing or invalid.');
 if(!Number.isSafeInteger(m.size)||m.size<=0||m.size>MAX_PACKAGE)throw Error('The update package size is invalid.');
 return {app:APP_ID,format:1,packageType:'reef-content',version:v,minDesktopVersion:minimum,url,sha256:m.sha256.toLowerCase(),size:m.size,notes:Array.isArray(m.notes)?m.notes.filter(x=>typeof x==='string').slice(0,12).map(x=>x.slice(0,300)):[],published:typeof m.published==='string'?m.published.slice(0,40):''};
}
function request(url,{source,file,maxBytes=1024*1024,onProgress,redirects=0,timeout=180000}={}){
 return new Promise((resolve,reject)=>{
  if(redirects>5)return reject(Error('Too many update redirects.'));
  let target;try{target=allowedURL(url,source,redirects>0);}catch(e){return reject(e);}
  const req=https.get(target,{headers:{'User-Agent':'ReefRewards-Desktop/1.0','Accept':file?'application/octet-stream':'application/json','Cache-Control':'no-cache'}},res=>{
   if([301,302,303,307,308].includes(res.statusCode)&&res.headers.location){res.resume();clearTimeout(timer);request(new URL(res.headers.location,target).href,{source,file,maxBytes,onProgress,redirects:redirects+1,timeout}).then(resolve,reject);return;}
   if(res.statusCode<200||res.statusCode>=300){res.resume();clearTimeout(timer);reject(Error(res.statusCode===404?'No published update was found at this GitHub source.':'GitHub returned HTTP '+res.statusCode+'.'));return;}
   const total=Number(res.headers['content-length'])||0;if(total>maxBytes){res.destroy();clearTimeout(timer);reject(Error('The download exceeds the size limit.'));return;}
   let received=0,last=0;const hash=crypto.createHash('sha256'),chunks=[];
   const monitor=new Transform({transform(chunk,_encoding,callback){received+=chunk.length;if(received>maxBytes)return callback(Error('The download exceeds the size limit.'));hash.update(chunk);if(!file)chunks.push(chunk);if(onProgress&&Date.now()-last>100){last=Date.now();onProgress({received,total,percent:total?Math.min(100,received/total*100):null});}callback(null,chunk);}});
   const sink=file?fs.createWriteStream(file,{flags:'wx'}):new Transform({transform(_c,_e,cb){cb();}});if(!file)sink.resume();
   pipeline(res,monitor,sink).then(()=>{clearTimeout(timer);resolve({buffer:file?undefined:Buffer.concat(chunks),received,sha256:hash.digest('hex')});},e=>{clearTimeout(timer);if(file)try{fs.unlinkSync(file);}catch{}reject(e);});
  });
  const timer=setTimeout(()=>req.destroy(Error('The update request timed out.')),timeout);timer.unref?.();req.setTimeout(30000,()=>req.destroy(Error('GitHub did not respond in time.')));req.on('error',e=>{clearTimeout(timer);reject(e);});
 });
}
function readUpdateZIP(buffer){
 if(!Buffer.isBuffer(buffer)||buffer.length>MAX_PACKAGE||buffer.length<22)throw Error('Invalid update ZIP.');
 let end=-1;for(let p=buffer.length-22;p>=Math.max(0,buffer.length-65557);p--)if(buffer.readUInt32LE(p)===0x06054b50&&p+22+buffer.readUInt16LE(p+20)===buffer.length){end=p;break;}
 if(end<0||buffer.readUInt16LE(end+4)!==0||buffer.readUInt16LE(end+6)!==0)throw Error('Unsupported update ZIP format.');
 const count=buffer.readUInt16LE(end+10),centralSize=buffer.readUInt32LE(end+12),centralOffset=buffer.readUInt32LE(end+16);
 if(count!==2||buffer.readUInt16LE(end+8)!==2||centralOffset+centralSize!==end)throw Error('The update ZIP must contain only game.html and release.json.');
 const entries=new Map(),ranges=[];let p=centralOffset,total=0;
 for(let i=0;i<count;i++){
  if(p+46>end||buffer.readUInt32LE(p)!==0x02014b50)throw Error('Invalid ZIP directory.');
  const flags=buffer.readUInt16LE(p+8),method=buffer.readUInt16LE(p+10),crc=buffer.readUInt32LE(p+16),packed=buffer.readUInt32LE(p+20),size=buffer.readUInt32LE(p+24),nl=buffer.readUInt16LE(p+28),el=buffer.readUInt16LE(p+30),cl=buffer.readUInt16LE(p+32),disk=buffer.readUInt16LE(p+34),mode=buffer.readUInt32LE(p+38)>>>16,offset=buffer.readUInt32LE(p+42);
  if(p+46+nl+el+cl>end)throw Error('Truncated ZIP directory.');const name=buffer.toString('utf8',p+46,p+46+nl);
  if(!['game.html','release.json'].includes(name)||entries.has(name)||disk||flags&1||![0,8].includes(method)||(mode&0xf000)===0xa000)throw Error('The ZIP contains unsupported or unsafe entries.');
  total+=size;if(total>MAX_CONTENT||size<=0||size===0xffffffff||packed===0xffffffff||offset+30>centralOffset)throw Error('Invalid update entry size.');
  if(buffer.readUInt32LE(offset)!==0x04034b50||buffer.readUInt16LE(offset+6)!==flags||buffer.readUInt16LE(offset+8)!==method)throw Error('ZIP headers do not match.');
  const localNameLength=buffer.readUInt16LE(offset+26),localExtra=buffer.readUInt16LE(offset+28),start=offset+30+localNameLength+localExtra,stop=start+packed;
  if(stop>centralOffset||buffer.toString('utf8',offset+30,offset+30+localNameLength)!==name||ranges.some(([a,b])=>offset<b&&stop>a))throw Error('Invalid ZIP data range.');ranges.push([offset,stop]);
  let data;try{data=method===0?Buffer.from(buffer.subarray(start,stop)):zlib.inflateRawSync(buffer.subarray(start,stop),{maxOutputLength:size+1});}catch{throw Error('The update ZIP could not be decompressed.');}
  if(data.length!==size||zlib.crc32(data)!==crc)throw Error('The update ZIP failed its integrity check.');entries.set(name,data);p+=46+nl+el+cl;
 }
 if(p!==end)throw Error('Unexpected ZIP directory data.');return entries;
}
function verifyPayload(entries,manifest){
 let meta;try{meta=JSON.parse(entries.get('release.json').toString('utf8'));}catch{throw Error('The release information could not be read.');}
 if(meta.app!==APP_ID||meta.format!==1||meta.version!==manifest.version||version(meta.minDesktopVersion||'1.0.0')!==manifest.minDesktopVersion)throw Error('The ZIP version does not match its update manifest.');
 const bytes=entries.get('game.html'),html=bytes.toString('utf8');if(!Buffer.from(html).equals(bytes)||!/^\s*<!doctype html>/i.test(html)||!html.includes('reef-rewards-offline-v1')||!/<canvas\b[^>]*\bid=["']tank["']/i.test(html)||!/<\/html>\s*$/i.test(html))throw Error('The ZIP does not contain a complete Reef Rewards game.');
 return {meta,html,bytes};
}
function atomicJSON(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const temp=file+'.'+crypto.randomUUID()+'.tmp';try{fs.writeFileSync(temp,JSON.stringify(value,null,2),'utf8');fs.renameSync(temp,file);}finally{try{fs.unlinkSync(temp);}catch{}}}
function readJSON(file,fallback){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}}
function contentHash(file){return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');}
class UpdateStore{
 constructor(root,bundledDir,desktopVersion='1.0.0'){this.root=path.resolve(root);this.bundledDir=path.resolve(bundledDir);this.desktopVersion=version(desktopVersion);this.pointerFile=path.join(this.root,'updates.json');this.versionsDir=path.join(this.root,'Versions');this.bundledVersion=version(readJSON(path.join(this.bundledDir,'release.json'),{}).version);fs.mkdirSync(this.versionsDir,{recursive:true});}
 descriptor(raw){
  if(!raw||typeof raw!=='object')return null;
  try{version(raw.version);if(raw.bundled===true&&raw.version===this.bundledVersion)return {version:this.bundledVersion,bundled:true};
   if(typeof raw.folder!=='string'||!/^\d+\.\d+\.\d+-[0-9a-f]{12}$/.test(raw.folder)||! /^[0-9a-f]{64}$/.test(raw.sha256||''))return null;
   const file=path.join(this.versionsDir,raw.folder,'game.html');if(!fs.existsSync(file)||contentHash(file)!==raw.sha256)return null;return {version:raw.version,folder:raw.folder,sha256:raw.sha256};
  }catch{return null;}
 }
 read(){const raw=readJSON(this.pointerFile,{}),previous=this.descriptor(raw.previous),active=this.descriptor(raw.active);if(!active){if(raw.active)atomicJSON(this.pointerFile,{active:previous||{version:this.bundledVersion,bundled:true},previous:null,pending:false});return {active:previous||{version:this.bundledVersion,bundled:true},previous:null,pending:false};}return {active,previous,pending:raw.pending===true};}
 file(descriptor=this.read().active){return descriptor.bundled?path.join(this.bundledDir,'game.html'):path.join(this.versionsDir,descriptor.folder,'game.html');}
 stage(payload){
  const current=this.read();if(compareVersions(payload.meta.version,current.active.version)<=0)throw Error('This version is already installed.');
  const sha=crypto.createHash('sha256').update(payload.bytes).digest('hex'),folder=payload.meta.version+'-'+sha.slice(0,12),destination=path.join(this.versionsDir,folder),temp=destination+'.'+crypto.randomUUID()+'.tmp';
  fs.mkdirSync(temp,{recursive:true});try{fs.writeFileSync(path.join(temp,'game.html'),payload.bytes);atomicJSON(path.join(temp,'release.json'),payload.meta);if(fs.existsSync(destination)){
    if(contentHash(path.join(destination,'game.html'))!==sha)throw Error('An installed version has damaged files.');fs.rmSync(temp,{recursive:true,force:true});
   }else fs.renameSync(temp,destination);
   const active={version:payload.meta.version,folder,sha256:sha};atomicJSON(this.pointerFile,{active,previous:current.active,pending:true});return active;
  }catch(e){fs.rmSync(temp,{recursive:true,force:true});throw e;}
 }
 healthy(){const state=this.read();if(state.pending)atomicJSON(this.pointerFile,{...state,pending:false});}
 rollback(){const state=this.read();if(!state.previous)return false;atomicJSON(this.pointerFile,{active:state.previous,previous:null,pending:false});return true;}
}
const STORAGE_KEY='reef-rewards-offline-v1';
function validClassText(text){try{if(typeof text!=='string'||text.length>6*1024*1024)return false;const s=JSON.parse(text);return s.version===1&&Array.isArray(s.students)&&s.students.length<=80&&s.students.every(x=>typeof x.name==='string'&&Number.isInteger(x.points)&&x.points>=-99999&&x.points<=99999);}catch{return false;}}
class ClassroomStore{
 constructor(root){this.folder=path.join(root,'Classroom');this.file=path.join(this.folder,'Classroom.json');}
 read(){const data=readJSON(this.file,{localStorage:{}});return data&&validClassText(data.localStorage?.[STORAGE_KEY])?data:{localStorage:{}};}
 write(input){
  if(!input||typeof input!=='object'||!validClassText(input[STORAGE_KEY]))throw Error('The local classroom backup is invalid.');
  const localStorage={[STORAGE_KEY]:input[STORAGE_KEY]};if(validClassText(input[STORAGE_KEY+'.recovery']))localStorage[STORAGE_KEY+'.recovery']=input[STORAGE_KEY+'.recovery'];
  const previous=this.read();if(previous.localStorage?.[STORAGE_KEY]===localStorage[STORAGE_KEY])return;
  if(previous.localStorage?.[STORAGE_KEY])atomicJSON(path.join(this.folder,'Classroom.previous.json'),previous);
  atomicJSON(this.file,{version:1,savedAt:new Date().toISOString(),localStorage});
 }
 backup(label){const current=this.read();if(!current.localStorage?.[STORAGE_KEY])return null;const file=path.join(this.folder,'Backups',new Date().toISOString().replace(/[:.]/g,'-')+'-'+label+'.json');atomicJSON(file,JSON.parse(current.localStorage[STORAGE_KEY]));return file;}
}
module.exports={APP_ID,MAX_PACKAGE,MAX_CONTENT,STORAGE_KEY,version,compareVersions,normalizeSource,allowedURL,validateManifest,request,readUpdateZIP,verifyPayload,atomicJSON,readJSON,contentHash,UpdateStore,ClassroomStore,validClassText};
