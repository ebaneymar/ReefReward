'use strict';
const {contextBridge,ipcRenderer}=require('electron');
const GAME=location.href==='reef://app/game.html',KEY='reef-rewards-offline-v1';
function snapshot(){const result={};for(const key of [KEY,KEY+'.recovery'])try{const value=localStorage.getItem(key);if(value!==null)result[key]=value;}catch{}return result;}
function stamp(text){try{const s=JSON.parse(text);return s.version===1&&Array.isArray(s.students)?[Number(s.savedAt)||0,Number(s.revision)||0]:null;}catch{return null;}}
function newer(a,b){return a&&(!b||a[0]>b[0]||a[0]===b[0]&&a[1]>b[1]);}
let lastSaved='';
function mirror(sync=false){
 if(!GAME)return;const values=snapshot(),signature=JSON.stringify(values);if(!values[KEY]||signature===lastSaved)return;
 if(sync){try{if(ipcRenderer.sendSync('reef:save-classroom-sync',values))lastSaved=signature;}catch{}}
 else ipcRenderer.invoke('reef:save-classroom',values).then(()=>{lastSaved=signature;}).catch(()=>{});
}
if(GAME){
 try{const saved=ipcRenderer.sendSync('reef:load-classroom')?.localStorage||{};if(newer(stamp(saved[KEY]),stamp(localStorage.getItem(KEY))))for(const key of [KEY,KEY+'.recovery'])if(typeof saved[key]==='string')localStorage.setItem(key,saved[key]);}catch{}
 setInterval(()=>mirror(),600);window.addEventListener('beforeunload',()=>mirror(true));ipcRenderer.on('reef:flush-classroom',()=>mirror(true));
 window.addEventListener('DOMContentLoaded',()=>{
  // Current games render their own prominent button. Older restored games get a fallback.
  if(!document.getElementById('gameUpdateButton')){
   const button=document.createElement('button');button.id='desktopUpdatesButton';button.textContent='↻ Update game';button.setAttribute('aria-label','Update game');button.title='Check for game updates';button.style.cssText='padding:10px 14px;background:#acffdd;color:#073b3c;border:1px solid #cffff0;border-radius:12px;font-weight:700;white-space:nowrap';
   button.addEventListener('click',()=>ipcRenderer.invoke('reef:open-updates'));document.querySelector('.top-actions')?.prepend(button);
   ipcRenderer.on('reef:update-progress',(_event,p)=>{if(p.stage==='available'){button.textContent='↻ Update ready';button.title='Version '+p.version+' is available';}});
  }
  let tries=0;const health=setInterval(()=>{tries++;if(document.querySelector('#saveState[data-autosave-status]')&&document.querySelector('#classSummary')?.textContent.includes('fish ·')){clearInterval(health);ipcRenderer.send('reef:game-ready');}else if(tries>80)clearInterval(health);},200);
 });
}
contextBridge.exposeInMainWorld('reefDesktop',{
 isDesktop:true,
 openUpdates:()=>ipcRenderer.invoke('reef:open-updates'),
 info:()=>ipcRenderer.invoke('reef:update-info'),
 saveConfig:input=>ipcRenderer.invoke('reef:save-update-config',input),
 check:()=>ipcRenderer.invoke('reef:check-update'),
 install:()=>ipcRenderer.invoke('reef:install-update'),
 rollback:()=>ipcRenderer.invoke('reef:rollback'),
 openData:()=>ipcRenderer.invoke('reef:open-data'),
 makeShortcut:()=>ipcRenderer.invoke('reef:make-shortcut'),
 onProgress:callback=>{if(typeof callback!=='function')return()=>{};const listener=(_event,value)=>callback(value);ipcRenderer.on('reef:update-progress',listener);return()=>ipcRenderer.removeListener('reef:update-progress',listener);}
});
