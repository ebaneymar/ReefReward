// The update entry lives in the game itself, including classroom fullscreen.
function setGameUpdateReady(version){
 for(const id of ['gameUpdateButton','tankUpdateButton']){
  const button=$(id);if(!button)continue;
  button.textContent=version?'↻ Update ready':'↻ Update game';
  button.setAttribute('data-update-state',version?'available':'ready');
  button.setAttribute('aria-label',version?'Update game: version '+version+' available':'Update game');
  button.title=version?'Version '+version+' is ready to install':'Check for game updates';
 }
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
 preview.showModal();
}
function installGameUpdatesUI(){
 const originalAction=action;action=async function(el){if(el.dataset.action==='gameUpdates'){await openGameUpdates();return;}return originalAction(el);};
 setGameUpdateReady();
 window.reefDesktop?.onProgress?.(progress=>{if(progress.stage==='available')setGameUpdateReady(progress.version);});
}
