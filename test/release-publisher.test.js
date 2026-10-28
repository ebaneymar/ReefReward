'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{temporary}=require('./fixtures'),{publish}=require('../scripts/publish-release');
function fixture(t){const directory=temporary(t);fs.writeFileSync(path.join(directory,'update-manifest.json'),JSON.stringify({app:'reef-rewards',version:'1.1.1'}));for(const n of ['Reef_Rewards_Update_1.1.1.zip','Reef_Rewards_Windows.exe','Reef_Rewards_Windows.zip','Reef_Rewards_Offline.html','SHA256SUMS.txt','RELEASE_NOTES.txt'])fs.writeFileSync(path.join(directory,n),'test');return {directory,repository:'teacher/reef-rewards',commit:'a'.repeat(40)};}
test('A new release stays a draft until every matching asset is uploaded',t=>{
 const input=fixture(t),calls=[];const result=publish({...input,run:args=>{calls.push(args);return args[1]==='view'?{status:1,stderr:'Not found'}:{status:0,stdout:''};}});
 assert.equal(result.status,'published');assert.equal(calls[1][1],'create');assert.ok(calls[1].includes('--draft'));assert.ok(calls[1].includes(input.commit));assert.deepEqual(calls[2].slice(0,3),['release','edit','v1.1.1']);assert.ok(calls[2].includes('--draft=false'));
});
test('A failed upload does not publish a half-complete update',t=>{
 const input=fixture(t),calls=[];assert.throws(()=>publish({...input,run:args=>{calls.push(args);return {status:1,stderr:'Upload failed'};}}),/Upload failed/);assert.equal(calls.some(x=>x[1]==='edit'),false);
});
test('A draft can resume while an existing published version remains immutable',t=>{
 const input=fixture(t),calls=[];publish({...input,run:args=>{calls.push(args);return args[1]==='view'?{status:0,stdout:'{"isDraft":true}'}:{status:0,stdout:''};}});assert.equal(calls[1][1],'upload');assert.equal(calls[2][1],'edit');
 const published=[];const result=publish({...input,run:args=>{published.push(args);return {status:0,stdout:'{"isDraft":false}'};}});assert.equal(result.status,'already-published');assert.equal(published.length,1);
});
