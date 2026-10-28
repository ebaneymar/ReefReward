'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{EventEmitter}=require('node:events');
const core=require('../app/update-core'),{payload,manifest,temporary}=require('./fixtures');
async function harness(t,options={}){
 const directory=temporary(t),handlers=new Map(),listeners=new Map(),windows=[],protocols=new Map(),timers=[];let settings={},restarts=0;
 class Contents extends EventEmitter{constructor(){super();this.mainFrame={url:''};this.sent=[];}setWindowOpenHandler(fn){this.windowOpen=fn;}send(...args){this.sent.push(args);}}
 class Window extends EventEmitter{constructor(){super();this.webContents=new Contents();this.destroyed=false;windows.push(this);}setMenu(){}maximize(){}show(){}focus(){}isMinimized(){return false;}restore(){}isDestroyed(){return this.destroyed;}loadURL(url){this.webContents.mainFrame.url=url;this.webContents.emit('did-finish-load');return Promise.resolve();}}
 const app=new EventEmitter();Object.assign(app,{setName(){},setAppUserModelId(){},setPath(k,v){settings[k]=v;},getPath(k){return settings[k]||directory;},requestSingleInstanceLock:()=>true,whenReady:()=>Promise.resolve(),relaunch(){restarts++;},quit(){}});
 const ses={flushStorageData(){},setPermissionRequestHandler(fn){this.permission=fn;},setPermissionCheckHandler(fn){this.checkPermission=fn;},webRequest:{onBeforeRequest(_filter,fn){this.callback=fn;}}};
 const electron={app,BrowserWindow:Window,ipcMain:{handle(k,fn){handlers.set(k,fn);},on(k,fn){listeners.set(k,fn);}},protocol:{registerSchemesAsPrivileged(){},handle(k,fn){protocols.set(k,fn);}},session:{defaultSession:ses},Menu:{setApplicationMenu(){},buildFromTemplate:x=>x},shell:{openPath:async()=>'',writeShortcutLink:()=>true},dialog:{showErrorBox(){}}};
 const zip=payload(),m={...manifest(zip),...options.manifest};let requests=0;
 const request=async(url,params)=>{requests++;if(options.networkError)throw Error('Offline');if(params.file){fs.writeFileSync(params.file,zip);params.onProgress?.({received:zip.length,total:zip.length,percent:100});return {received:zip.length,sha256:require('node:crypto').createHash('sha256').update(zip).digest('hex')};}return {buffer:Buffer.from(JSON.stringify({...m,url:m.url.replace('teacher/reef-rewards',params.source.repository)}))};};
 const bundle=path.join(directory,'test-bundle');fs.cpSync(path.resolve(__dirname,'../app'),bundle,{recursive:true});core.atomicJSON(path.join(bundle,'release.json'),{app:'reef-rewards',format:1,version:'1.0.0'});
 const context={require:name=>name==='electron'?electron:name==='./update-core'?{...core,request}:name==='./package.json'?{version:'1.0.0'}:require(name),__dirname:bundle,process,console,URL,Response,Buffer,Promise,setTimeout:(fn,ms)=>{if(ms===350)return setTimeout(fn,0);const timer={fn,ms};timers.push(timer);return timer;},clearTimeout(){}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../app/main.js'),'utf8'),context,{filename:'reef-main.js'});await new Promise(resolve=>setImmediate(resolve));
 function event(w=windows[0]){return {sender:w.webContents,senderFrame:w.webContents.mainFrame};}
 await handlers.get('reef:open-updates')(event());const updates=windows[1];
 return {directory,data:path.join(directory,'Reef Rewards'),windows,handlers,listeners,event,updates,ses,timers,protocols,requests:()=>requests,restarts:()=>restarts,call:(name,input)=>handlers.get(name)(event(updates),input)};
}
test('Desktop updater rejects IPC from unrelated windows and subframes',async t=>{
 const h=await harness(t);await assert.rejects(()=>h.handlers.get('reef:update-info')({sender:{},senderFrame:{url:'reef://app/updates.html'}}));
 await assert.rejects(()=>h.handlers.get('reef:save-update-config')({...h.event(h.updates),senderFrame:{url:'reef://app/updates.html'}},{source:'attacker/other'}));
 assert.equal((await h.call('reef:update-info')).version,'1.0.0');assert.equal((await h.call('reef:update-info')).config.repository,'ebaneymar/ReefReward');assert.equal((await h.call('reef:check-update')).status,'available');
});
test('A matching GitHub update installs at a stable local origin and keeps negative points and claims',async t=>{
 const h=await harness(t);const data={version:1,students:[{id:'student-1',name:'Student 1',points:-6,form:'cinderfang'}],game:{limited:{claims:{cinderfang:{id:'student-1'}}}},savedAt:100,revision:2};
 const saveEvent=h.event();h.listeners.get('reef:save-classroom-sync')(saveEvent,{[core.STORAGE_KEY]:JSON.stringify(data)});assert.equal(saveEvent.returnValue,true);
 assert.equal((await h.call('reef:save-update-config',{source:'teacher/reef-rewards',autoCheck:true})).ok,true);assert.equal((await h.call('reef:check-update')).status,'available');
 const installing=h.call('reef:install-update');assert.equal((await h.call('reef:install-update')).ok,false,'Concurrent updates are rejected');assert.equal((await installing).status,'installed-restarting');
 const state=core.readJSON(path.join(h.data,'updates.json'),{});assert.equal(state.active.version,'1.0.1');assert.equal(state.previous.version,'1.0.0');assert.equal(state.pending,true);
 const classroom=new core.ClassroomStore(h.data);assert.deepEqual(JSON.parse(classroom.read().localStorage[core.STORAGE_KEY]),data);assert.equal(fs.readdirSync(path.join(h.data,'Classroom/Backups')).length,1);
 const response=await h.protocols.get('reef')({url:'reef://app/game.html',method:'GET'});assert.equal(response.status,200);assert.match(await response.text(),/reef-rewards-offline-v1/);assert.match(response.headers.get('Content-Security-Policy'),/connect-src 'none'/);
 h.listeners.get('reef:game-ready')(h.event());assert.equal(core.readJSON(path.join(h.data,'updates.json'),{}).pending,false);
});
test('Checksum failure leaves the current game and classroom untouched',async t=>{
 const h=await harness(t,{manifest:{sha256:'0'.repeat(64)}});await h.call('reef:save-update-config',{source:'teacher/reef-rewards'});const result=await h.call('reef:install-update');assert.equal(result.ok,false);assert.match(result.error,/checksum/);assert.equal((await h.call('reef:update-info')).version,'1.0.0');assert.equal(fs.existsSync(path.join(h.data,'updates.json')),false);
});
test('Offline checks do not replace the installed game',async t=>{
 const h=await harness(t,{networkError:true});await h.call('reef:save-update-config',{source:'teacher/reef-rewards'});const result=await h.call('reef:check-update');assert.equal(result.ok,false);assert.match(result.error,/Offline/);assert.equal((await h.call('reef:update-info')).version,'1.0.0');
});
test('Failed first launch rolls back game code without changing classroom storage',async t=>{
 const h=await harness(t);await h.call('reef:save-update-config',{source:'teacher/reef-rewards'});await h.call('reef:install-update');h.windows[0].webContents.emit('did-fail-load',{},-2,'Test load failure');const info=await h.call('reef:update-info');assert.equal(info.version,'1.0.0');assert.match(info.notice,/previous game was restored/);
});
test('Only the trusted game can enter fullscreen; renderer network and extra windows stay blocked',async t=>{
 const h=await harness(t);let permission;h.ses.permission(h.windows[0].webContents,'fullscreen',x=>permission=x);assert.equal(permission,true);h.ses.permission(h.updates.webContents,'fullscreen',x=>permission=x);assert.equal(permission,false);h.ses.permission(h.windows[0].webContents,'media',x=>permission=x);assert.equal(permission,false);
 let network;h.ses.webRequest.callback({},x=>network=x);assert.equal(network.cancel,true);assert.equal(h.windows[0].webContents.windowOpen().action,'deny');
 const blocked=await h.protocols.get('reef')({url:'reef://app/../../Classroom/Classroom.json',method:'GET'});assert.equal(blocked.status,404);
});
