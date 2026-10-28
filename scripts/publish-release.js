'use strict';
// GitHub's repository-local token is used only by CI, never shipped in the game.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
function publish({directory=path.resolve(__dirname,'../release'),repository=process.env.GITHUB_REPOSITORY,commit=process.env.RELEASE_COMMIT,run}={}){
 if(!/^[A-Za-z0-9-]+\/[A-Za-z0-9_.-]+$/.test(repository||''))throw Error('A repository is required');
 if(!/^[a-f0-9]{40}$/.test(commit||''))throw Error('An exact release commit is required');
 const manifest=JSON.parse(fs.readFileSync(path.join(directory,'update-manifest.json'),'utf8')),tag='v'+manifest.version;
 if(!/^v1\.1\.[1-9]\d*$/.test(tag)||manifest.app!=='reef-rewards')throw Error('Invalid automatic release version');
 const names=['update-manifest.json','Reef_Rewards_Update_'+manifest.version+'.zip','Reef_Rewards_Windows.exe','Reef_Rewards_Windows.zip','Reef_Rewards_Offline.html','SHA256SUMS.txt'];
 const assets=names.map(n=>path.join(directory,n));for(const file of [...assets,path.join(directory,'RELEASE_NOTES.txt')])if(!fs.statSync(file).isFile())throw Error('A release file is missing');
 const invoke=run||((args)=>spawnSync('gh',args,{encoding:'utf8',env:process.env}));
 function must(args){const result=invoke(args);if(result.error)throw result.error;if(result.status!==0)throw Error('GitHub release command failed: '+(result.stderr||result.stdout||result.status));return result;}
 const existing=invoke(['release','view',tag,'--repo',repository,'--json','isDraft']);
 if(existing.status===0&&!JSON.parse(existing.stdout).isDraft)return {status:'already-published',tag};
 if(existing.status===0)must(['release','upload',tag,...assets,'--repo',repository,'--clobber']);
 else must(['release','create',tag,...assets,'--repo',repository,'--target',commit,'--title','Reef Rewards '+tag,'--notes-file',path.join(directory,'RELEASE_NOTES.txt'),'--draft']);
 // The updater sees the release only after every matching asset is uploaded.
 must(['release','edit',tag,'--repo',repository,'--draft=false','--latest']);
 return {status:'published',tag};
}
module.exports={publish};
if(require.main===module)try{console.log(JSON.stringify(publish()));}catch(error){console.error(error.message);process.exitCode=1;}
