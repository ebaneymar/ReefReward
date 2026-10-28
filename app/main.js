'use strict';
const {app,BrowserWindow,ipcMain,protocol,session,Menu,shell,dialog}=require('electron');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const core=require('./update-core');
const DESKTOP_VERSION=require('./package.json').version;
const DEFAULT_UPDATE_REPOSITORY='ebaneymar/ReefReward';
protocol.registerSchemesAsPrivileged([{scheme:'reef',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true,stream:true}}]);
app.setName('Reef Rewards');
app.setPath('userData',path.join(app.getPath('appData'),'Reef Rewards'));
app.setAppUserModelId('com.reefrewards.classroom');
let gameWindow=null,updatesWindow=null,store,classroom,readyTimer=null,installBusy=false,pendingNotice='',lastCheck=null;
const root=()=>app.getPath('userData'),configFile=()=>path.join(root(),'UpdateSource.json');
function log(message){try{fs.mkdirSync(root(),{recursive:true});fs.appendFileSync(path.join(root(),'Desktop.log'),new Date().toISOString()+' '+String(message)+'\n');}catch{}}
function config(){const raw=core.readJSON(configFile(),{});try{return {...core.normalizeSource(raw.manifestUrl||raw.repository||DEFAULT_UPDATE_REPOSITORY),autoCheck:raw.autoCheck!==false};}catch{return {...core.normalizeSource(DEFAULT_UPDATE_REPOSITORY),autoCheck:true};}}
function status(){const state=store.read();return {desktopVersion:DESKTOP_VERSION,version:state.active.version,config:config(),hasPrevious:!!state.previous,installedPending:state.pending,dataLocation:root(),notice:pendingNotice,checking:installBusy};}
function sendProgress(data){for(const win of [gameWindow,updatesWindow])if(win&&!win.isDestroyed())win.webContents.send('reef:update-progress',data);}
function trusted(event,kind='either'){
 const allowed=kind==='game'?[gameWindow]:kind==='updates'?[updatesWindow]:[gameWindow,updatesWindow];
 return allowed.some(w=>w&&!w.isDestroyed()&&event.sender===w.webContents&&event.senderFrame===w.webContents.mainFrame&&event.senderFrame.url==='reef://app/'+(w===gameWindow?'game.html':'updates.html'));
}
function guard(event,kind){if(!trusted(event,kind))throw Error('This desktop action is unavailable from this window.');}
function contentFile(){return store.file();}
async function checkUpdate(){
 const source=config(),current=store.read().active.version;if(!source.manifestUrl)return {ok:false,status:'not-configured',currentVersion:current};
 try{
  const u=new URL(source.manifestUrl);u.searchParams.set('reef_check',String(Date.now()));
  const response=await core.request(u.href,{source,maxBytes:1024*1024,timeout:30000});
  const manifest=core.validateManifest(JSON.parse(response.buffer.toString('utf8')),source,DESKTOP_VERSION),available=core.compareVersions(manifest.version,current)>0;
  lastCheck={ok:true,status:available?'available':'up-to-date',currentVersion:current,latestVersion:manifest.version,manifest:available?manifest:null};
  if(available)sendProgress({stage:'available',version:manifest.version});return lastCheck;
 }catch(e){return {ok:false,status:'error',currentVersion:current,error:e.message||'The update source could not be reached.'};}
}
function relaunch(){
 session.defaultSession.flushStorageData();
 const portable=process.env.PORTABLE_EXECUTABLE_FILE;
 app.relaunch(portable&&fs.existsSync(portable)?{execPath:portable,args:[]}:{});app.quit();
}
async function installUpdate(){
 if(installBusy)return {ok:false,error:'An update is already running.'};installBusy=true;
 let temp;try{
  const checked=await checkUpdate();if(!checked.ok||checked.status!=='available')return checked;
  const manifest=checked.manifest,source=config();temp=path.join(root(),'Downloads',crypto.randomUUID());fs.mkdirSync(temp,{recursive:true});const zip=path.join(temp,'update.zip');
  sendProgress({stage:'downloading',version:manifest.version,percent:0});
  const response=await core.request(manifest.url,{source,file:zip,maxBytes:Math.min(core.MAX_PACKAGE,manifest.size),timeout:180000,onProgress:p=>sendProgress({stage:'downloading',version:manifest.version,...p,percent:p.received/manifest.size*100})});
  if(response.received!==manifest.size||response.sha256!==manifest.sha256)throw Error('The update ZIP does not match its checksum or size. Upload its matching manifest and ZIP together, then retry.');
  sendProgress({stage:'verifying',version:manifest.version});const payload=core.verifyPayload(core.readUpdateZIP(fs.readFileSync(zip)),manifest);
  // Ask the live game to mirror its latest committed class before staging code.
  gameWindow?.webContents.send('reef:flush-classroom');await new Promise(resolve=>setTimeout(resolve,350));
  classroom.backup('before-'+manifest.version);sendProgress({stage:'installing',version:manifest.version});store.stage(payload);
  sendProgress({stage:'restarting',version:manifest.version});setTimeout(relaunch,650);return {ok:true,status:'installed-restarting',version:manifest.version};
 }catch(e){log('Update: '+e.message);return {ok:false,status:'error',error:e.message||'The update was not installed. The current game is unchanged.'};}
 finally{installBusy=false;if(temp)try{fs.rmSync(temp,{recursive:true,force:true});}catch{}}
}
function lockWindow(win){
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 win.webContents.on('will-navigate',(event,url)=>{if(!['reef://app/game.html','reef://app/updates.html'].includes(url))event.preventDefault();});
 win.webContents.on('will-attach-webview',event=>event.preventDefault());
}
function openUpdates(){
 if(updatesWindow&&!updatesWindow.isDestroyed()){updatesWindow.show();updatesWindow.focus();return;}
 updatesWindow=new BrowserWindow({title:'Reef Rewards · Updates',width:740,height:770,minWidth:580,minHeight:600,parent:gameWindow||undefined,autoHideMenuBar:true,backgroundColor:'#092c3d',icon:path.join(__dirname,'assets','reef.png'),webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
 updatesWindow.setMenu(null);lockWindow(updatesWindow);updatesWindow.on('closed',()=>{updatesWindow=null;});updatesWindow.loadURL('reef://app/updates.html');
}
function rollbackFailedLaunch(reason){
 clearTimeout(readyTimer);if(!store.read().pending)return;
 if(store.rollback()){pendingNotice='The last game update could not start. Your previous game was restored; classroom data was kept.';log('Rolled back: '+reason);gameWindow?.loadURL('reef://app/game.html');}
}
function createWindow(){
 gameWindow=new BrowserWindow({title:'Reef Rewards',width:1440,height:960,minWidth:960,minHeight:680,show:false,autoHideMenuBar:true,backgroundColor:'#07334e',icon:path.join(__dirname,'assets','reef.png'),webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false}});
 lockWindow(gameWindow);
 gameWindow.on('ready-to-show',()=>{gameWindow.maximize();gameWindow.show();});
 gameWindow.on('closed',()=>{gameWindow=null;});
 gameWindow.webContents.on('did-fail-load',(_event,code,description)=>rollbackFailedLaunch(code+' '+description));
 gameWindow.webContents.on('render-process-gone',(_event,details)=>rollbackFailedLaunch(details.reason));
 gameWindow.webContents.on('did-finish-load',()=>{
  clearTimeout(readyTimer);if(store.read().pending)readyTimer=setTimeout(()=>rollbackFailedLaunch('Game readiness timeout'),20000);
 });
 gameWindow.loadURL('reef://app/game.html').catch(e=>{log(e.message);rollbackFailedLaunch(e.message);});
}
function setupIPC(){
 ipcMain.on('reef:load-classroom',event=>{try{guard(event,'game');event.returnValue=classroom.read();}catch{event.returnValue={localStorage:{}};}});
 ipcMain.on('reef:save-classroom-sync',(event,input)=>{try{guard(event,'game');classroom.write(input);event.returnValue=true;}catch(e){log('Class backup: '+e.message);event.returnValue=false;}});
 ipcMain.handle('reef:save-classroom',async(event,input)=>{guard(event,'game');classroom.write(input);return {ok:true};});
 ipcMain.on('reef:game-ready',event=>{if(!trusted(event,'game'))return;clearTimeout(readyTimer);store.healthy();});
 ipcMain.handle('reef:open-updates',async event=>{guard(event,'game');openUpdates();return {ok:true};});
 ipcMain.handle('reef:update-info',async event=>{guard(event);return status();});
 ipcMain.handle('reef:save-update-config',async(event,input)=>{
  guard(event,'updates');if(installBusy)return {ok:false,error:'Wait for the current update to finish.'};
  try{const source=core.normalizeSource(input?.source||'');const cfg={...source,autoCheck:input?.autoCheck!==false};core.atomicJSON(configFile(),cfg);lastCheck=null;return {ok:true,config:cfg};}catch(e){return {ok:false,error:e.message};}
 });
 ipcMain.handle('reef:check-update',async event=>{guard(event,'updates');if(installBusy)return {ok:false,error:'An update is already running.'};return checkUpdate();});
 ipcMain.handle('reef:install-update',async event=>{guard(event,'updates');return installUpdate();});
 ipcMain.handle('reef:rollback',async event=>{
  guard(event,'updates');if(installBusy)return {ok:false,error:'Wait for the current update to finish.'};if(!store.read().previous)return {ok:false,error:'No previous downloaded version is available.'};
  classroom.backup('before-rollback');store.rollback();setTimeout(relaunch,400);return {ok:true};
 });
 ipcMain.handle('reef:open-data',async event=>{guard(event);await shell.openPath(root());return {ok:true};});
 ipcMain.handle('reef:make-shortcut',async event=>{
  guard(event,'updates');if(process.platform!=='win32')return {ok:false,error:'Desktop shortcuts are available on Windows.'};
  const target=process.env.PORTABLE_EXECUTABLE_FILE||process.execPath,icon=path.join(root(),'ReefRewards.ico');fs.copyFileSync(path.join(__dirname,'assets','reef.ico'),icon);
  return {ok:shell.writeShortcutLink(path.join(app.getPath('desktop'),'Reef Rewards.lnk'),'create',{target,cwd:path.dirname(target),icon,iconIndex:0,description:'Reef Rewards classroom aquarium'})};
 });
}
const gotLock=app.requestSingleInstanceLock();
if(!gotLock)app.quit();else{
 app.on('second-instance',()=>{if(gameWindow){if(gameWindow.isMinimized())gameWindow.restore();gameWindow.show();gameWindow.focus();}});
 app.whenReady().then(()=>{
  store=new core.UpdateStore(root(),__dirname,DESKTOP_VERSION);classroom=new core.ClassroomStore(root());
  const csp="default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; media-src 'self' data: blob:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
  protocol.handle('reef',request=>{
   const u=new URL(request.url);if(u.host!=='app'||request.method!=='GET')return new Response('Not found',{status:404});
   const routes={'/game.html':()=>contentFile(),'/updates.html':()=>path.join(__dirname,'updates.html'),'/updates.js':()=>path.join(__dirname,'updates.js'),'/updates.css':()=>path.join(__dirname,'updates.css')};
   const route=routes[u.pathname];if(!route)return new Response('Not found',{status:404});
   try{const mime=u.pathname.endsWith('.js')?'text/javascript':u.pathname.endsWith('.css')?'text/css':'text/html';return new Response(fs.readFileSync(route()),{headers:{'Content-Type':mime+'; charset=utf-8','Content-Security-Policy':csp,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}catch(e){log('Local game read: '+e.message);return new Response('The local game could not be opened.',{status:500});}
  });
  const ses=session.defaultSession;
  ses.setPermissionRequestHandler((wc,permission,callback)=>callback(permission==='fullscreen'&&wc===gameWindow?.webContents));
  ses.setPermissionCheckHandler((wc,permission)=>permission==='fullscreen'&&wc===gameWindow?.webContents);
  // The aquarium renderer stays offline; the privileged updater fetches only GitHub.
  ses.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*','ws://*/*','wss://*/*']},(_details,callback)=>callback({cancel:true}));
  Menu.setApplicationMenu(Menu.buildFromTemplate([{label:'Reef Rewards',submenu:[{label:'Updates…',click:openUpdates},{label:'Class data folder',click:()=>shell.openPath(root())},{type:'separator'},{role:'quit'}]},{label:'Edit',submenu:[{role:'undo'},{role:'redo'},{type:'separator'},{role:'cut'},{role:'copy'},{role:'paste'},{role:'selectAll'}]},{label:'View',submenu:[{role:'resetZoom'},{role:'zoomIn'},{role:'zoomOut'},{role:'togglefullscreen',accelerator:'F11'}]}]));
  setupIPC();createWindow();setTimeout(()=>{if(config().autoCheck)checkUpdate().catch(e=>log(e.message));},9000);
 }).catch(e=>{log(e.stack||e.message);dialog.showErrorBox('Reef Rewards could not start',e.message+'\nYour classroom data has not been deleted.');app.quit();});
 app.on('window-all-closed',()=>app.quit());
}
