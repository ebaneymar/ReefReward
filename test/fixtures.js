'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib');
const core=require('../app/update-core');
const html='<!doctype html><html><head><title>Reef Rewards</title></head><body><canvas id="tank"></canvas><script>const KEY="reef-rewards-offline-v1";</script></body></html>';
function zip(files){
 let offset=0;const locals=[],centrals=[];
 for(const [name,bytes] of files){const data=Buffer.from(bytes),packed=zlib.deflateRawSync(data),label=Buffer.from(name),crc=zlib.crc32(data),local=Buffer.alloc(30);local.writeUInt32LE(0x04034b50);local.writeUInt16LE(20,4);local.writeUInt16LE(8,8);local.writeUInt32LE(crc,14);local.writeUInt32LE(packed.length,18);local.writeUInt32LE(data.length,22);local.writeUInt16LE(label.length,26);locals.push(local,label,packed);
  const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt16LE(8,10);central.writeUInt32LE(crc,16);central.writeUInt32LE(packed.length,20);central.writeUInt32LE(data.length,24);central.writeUInt16LE(label.length,28);central.writeUInt32LE(offset,42);centrals.push(central,label);offset+=local.length+label.length+packed.length;
 }
 const cd=Buffer.concat(centrals),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(cd.length,12);end.writeUInt32LE(offset,16);return Buffer.concat([...locals,cd,end]);
}
function payload(v='1.0.1',content=html){return zip([['game.html',content],['release.json',JSON.stringify({app:core.APP_ID,format:1,version:v,minDesktopVersion:'1.0.0'})]]);}
const source=core.normalizeSource('teacher/reef-rewards');
function manifest(bytes=payload(),v='1.0.1'){return {app:core.APP_ID,format:1,packageType:'reef-content',version:v,minDesktopVersion:'1.0.0',url:'https://github.com/teacher/reef-rewards/releases/download/v'+v+'/Reef_Rewards_Update_'+v+'.zip',sha256:crypto.createHash('sha256').update(bytes).digest('hex'),size:bytes.length,notes:['New fish']};}
function temporary(t){const d=fs.mkdtempSync(path.join(os.tmpdir(),'reef-update-test-'));t.after(()=>fs.rmSync(d,{recursive:true,force:true}));return d;}

module.exports={zip,payload,manifest,html,source,temporary};
