'use strict';
const fs=require('node:fs'),path=require('node:path');
const run=process.env.GITHUB_RUN_NUMBER;if(!/^[1-9]\d{0,5}$/.test(run||''))throw Error('A GitHub Actions run number is required');
const version='1.1.'+run,root=path.resolve(__dirname,'..');
for(const name of ['package.json','app/package.json','app/release.json']){const file=path.join(root,name),value=JSON.parse(fs.readFileSync(file));value.version=version;fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');}
if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,'version='+version+'\n');
console.log('Release version '+version);
