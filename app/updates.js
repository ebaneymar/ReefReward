'use strict';
const api=window.reefDesktop,$=id=>document.getElementById(id);let current=null,busy=false;
function message(title,text){$('statusTitle').textContent=title;$('statusText').textContent=text;}
function lock(value){busy=value;document.body.classList.toggle('busy',value);for(const id of ['check','saveSource','source','autoCheck','install','rollback'])$(id).disabled=value;}
function showError(error){message('Your current reef is ready to play.',error||'The update could not be reached. Try again when connected.');}
async function refresh(){
 if(!api){message('Open this screen in Reef Rewards.exe.','This is the desktop update screen. Your downloaded app includes the updater.');lock(true);return;}
 current=await api.info();$('versionBadge').textContent='v'+current.version;$('engineVersion').textContent='Desktop '+current.desktopVersion;$('source').value=current.config.manifestUrl||current.config.repository||'';$('autoCheck').checked=current.config.autoCheck;$('rollback').hidden=!current.hasPrevious;
 if(current.notice){$('notice').hidden=false;$('notice').textContent=current.notice;}
 if(!current.config.manifestUrl)message('Choose where your reef gets updates.','Paste your GitHub repository below once. After that, new fish and features install here without downloading HTML files.');
 else message('Ready for your next update.','Game v'+current.version+' is installed. Your classroom stays saved while updates are checked.');
}
function applyCheck(result){
 $('releaseCard').hidden=true;if(result.status==='not-configured'){message('Add your GitHub source first.','Paste the repository link below and choose Save update source.');$('source').focus();return;}
 if(!result.ok){showError(result.error);return;}
 if(result.status==='available'){
  $('releaseCard').hidden=false;$('releaseVersion').textContent='Version '+result.latestVersion;const list=$('releaseNotes');list.replaceChildren();
  for(const note of result.manifest.notes){const li=document.createElement('li');li.textContent=note;list.append(li);}
  message('A new reef is ready.','Install the update when your class is ready for a quick restart. Your points and fish will be kept.');
 }else message('Your reef is up to date.','Version '+result.currentVersion+' is installed. The aquarium is ready for offline play.');
}
$('check').addEventListener('click',async()=>{if(busy)return;lock(true);message('Checking GitHub…','Your current game stays available if there is no connection.');try{applyCheck(await api.check());}catch(e){showError(e.message);}finally{lock(false);}});
$('saveSource').addEventListener('click',async()=>{if(busy)return;lock(true);try{const result=await api.saveConfig({source:$('source').value,autoCheck:$('autoCheck').checked});if(!result.ok){$('sourceFeedback').textContent=result.error;return;}$('sourceFeedback').textContent='Update source saved. Choose Check for updates.';$('source').value=result.config.manifestUrl;message('Your update source is saved.','Future game updates can be installed from this screen.');$('releaseCard').hidden=true;}catch(e){$('sourceFeedback').textContent=e.message;}finally{lock(false);}});
$('install').addEventListener('click',async()=>{if(busy)return;lock(true);$('downloadProgress').hidden=false;try{const result=await api.install();if(result.ok&&result.status==='installed-restarting'){message('Update installed. Restarting…','Your reef will reopen with your saved class.');return;}applyCheck(result);lock(false);}catch(e){showError(e.message);lock(false);}});
$('openData').addEventListener('click',()=>api?.openData());
$('shortcut').addEventListener('click',async()=>{try{const r=await api.makeShortcut();$('sourceFeedback').textContent=r.ok?'Reef Rewards shortcut created on your desktop.':r.error||'The shortcut could not be created.';}catch(e){$('sourceFeedback').textContent=e.message;}});
$('rollback').addEventListener('click',async()=>{if(busy)return;lock(true);try{const result=await api.rollback();if(result.ok)message('Restoring the previous game…','The app will restart. Your class data stays on this computer.');else{showError(result.error);lock(false);}}catch(e){showError(e.message);lock(false);}});
api?.onProgress(progress=>{
 if(progress.stage==='available'){if(!busy)message('A new game version is available.','Choose Check for updates to see version '+progress.version+'.');return;}
 $('downloadProgress').hidden=false;
 const labels={downloading:'Downloading update',verifying:'Checking update integrity',installing:'Saving the new game',restarting:'Restarting Reef Rewards'};
 $('progressText').textContent=(labels[progress.stage]||'Updating')+(progress.stage==='downloading'?' · '+Math.round(progress.percent||0)+'%':'…');
 $('progressFill').style.width=progress.stage==='downloading'?Math.max(0,Math.min(100,progress.percent||0))+'%':'100%';
});
refresh().then(async()=>{if(api&&current?.config?.manifestUrl){lock(true);message('Checking for game updates…','Your class stays saved while we check.');try{applyCheck(await api.check());}catch(e){showError(e.message);}finally{lock(false);}}}).catch(e=>showError(e.message));
