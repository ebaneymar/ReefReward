// Settings and aquarium shortcuts share the same desktop updater.
let gameUpdateAvailableVersion='';
function setGameUpdateReady(version=''){
 gameUpdateAvailableVersion=typeof version==='string'?version:'';
 version=gameUpdateAvailableVersion;
 for(const id of ['gameUpdateButton','tankUpdateButton','settingsUpdateButton']){
  const button=$(id);if(!button)continue;
  button.textContent=version?'↻ Update ready':'↻ Update game';
  button.setAttribute('data-update-state',version?'available':'ready');
  button.setAttribute('aria-label',version?'Update game: version '+version+' available':'Update game');
  button.title=version?'Version '+version+' is ready to install':'Check for game updates';
 }
 const message=$('settingsUpdateMessage');
 if(message)message.textContent=version?'Version '+version+' is ready to install.':'Check for the latest Reef Rewards improvements.';
}
async function openGameUpdates(){
 if(aquariumFullscreen)await toggleAquariumFullscreen();
 if(window.reefDesktop?.isDesktop){
  try{await window.reefDesktop.openUpdates();}catch{toast('The update window could not open. Your game is still saved.');}
  return;
 }
 preview.innerHTML=dialogShell('Game updates','Your aquarium keeps working offline.',
  '<div class="game-update-info"><span class="update-mark">↻</span><h3>Updates inside the Windows game.</h3><p>Open Reef Rewards for Windows to check and install updates here. Your class, points, and limited fish stay saved.</p><a class="game-download-link" href="https://github.com/ebaneymar/ReefReward/releases/latest" target="_blank" rel="noopener noreferrer">Get the Windows game ↗</a><p class="muted">Moving from this HTML file? Use Settings → Export backup, then Restore backup in the Windows game once.</p></div>',
  '<button data-action="close">Back to my reef</button>');
 if(!preview.open)preview.showModal();
}
function installGameUpdatesUI(){
 const originalSettings=settingsContent;settingsContent=function(){
  const version=gameUpdateAvailableVersion,ready=!!version;
  const message=ready?'Version '+version+' is ready to install.':'Check for the latest Reef Rewards improvements.';
  const label=ready?'Update game: version '+version+' available':'Update game';
  return '<section class="settings-section game-update-settings" aria-labelledby="settingsUpdatesHeading"><h3 id="settingsUpdatesHeading">Game updates</h3><p id="settingsUpdateMessage" role="status">'+esc(message)+'</p><div class="settings-buttons"><button id="settingsUpdateButton" class="reef-update-button" data-action="gameUpdates" data-update-state="'+(ready?'available':'ready')+'" aria-label="'+esc(label)+'" title="'+esc(ready?'Version '+version+' is ready to install':'Check for game updates')+'">'+(ready?'↻ Update ready':'↻ Update game')+'</button></div><p>Your class, points, and fish stay saved when you update. Internet is needed to download an update.</p></section>'+originalSettings();
 };
 const originalAction=action;action=async function(el){if(el.dataset.action==='gameUpdates'){await openGameUpdates();return;}return originalAction(el);};
 setGameUpdateReady();
 window.reefDesktop?.onProgress?.(progress=>{if(progress.stage==='available')setGameUpdateReady(progress.version);});
}
