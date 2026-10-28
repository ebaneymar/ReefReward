'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib');
const core=require('../app/update-core');
const {zip,payload,manifest,html,source,temporary}=require('./fixtures');
test('GitHub repository and raw-manifest sources normalize without guessing another repository',()=>{
 assert.equal(source.manifestUrl,'https://github.com/teacher/reef-rewards/releases/latest/download/update-manifest.json');assert.equal(core.normalizeSource('https://github.com/teacher/reef-rewards.git').repository,'teacher/reef-rewards');assert.equal(core.normalizeSource('https://github.com/teacher/reef-rewards/blob/main/update-manifest.json').manifestUrl,'https://raw.githubusercontent.com/teacher/reef-rewards/main/update-manifest.json');
 assert.equal(core.normalizeSource('').manifestUrl,'');for(const url of ['http://github.com/a/b','https://evil.test/a/b','https://user:password@github.com/a/b','https://github.com/a/b#evil'])assert.throws(()=>core.normalizeSource(url));
});
test('GitHub package URLs stay in the configured repository, with HTTPS release redirects',()=>{
 assert.equal(core.allowedURL('https://raw.githubusercontent.com/teacher/reef-rewards/main/update.zip',source).protocol,'https:');assert.equal(core.allowedURL('https://release-assets.githubusercontent.com/example?token=example',source,true).hostname,'release-assets.githubusercontent.com');
 for(const url of ['https://github.com/teacher/another/update.zip','https://raw.githubusercontent.com/attacker/reef-rewards/main/a.zip','file:///C:/classroom.json','https://evil.test/update.zip'])assert.throws(()=>core.allowedURL(url,source));assert.throws(()=>core.allowedURL('https://release-assets.githubusercontent.com/example',source));
});
test('Strict version ordering handles 1.10.0, rejects malformed releases and prereleases',()=>{assert.equal(core.compareVersions('1.10.0','1.9.9'),1);assert.equal(core.compareVersions('1.0.0','1.0.0'),0);assert.equal(core.compareVersions('1.0.0','2.0.0'),-1);for(const v of ['v1.0.0','1.0','01.2.3','1.0.0-evil','../../x','1.0.Infinity'])assert.throws(()=>core.version(v));});
test('Only matching Reef Rewards manifests are accepted',()=>{
 assert.equal(core.validateManifest(manifest(),source).version,'1.0.1');
 for(const patch of [{app:'ARALVERSE'},{format:2},{sha256:'bad'},{size:core.MAX_PACKAGE+1},{size:-1},{url:'https://github.com/other/other/x.zip'},{packageType:'executable'},{version:'1.0.0-beta'},{minDesktopVersion:'2.0.0'}])assert.throws(()=>core.validateManifest({...manifest(),...patch},source));
});
test('A real deflated two-file ZIP is checked and read without filesystem extraction',()=>{const bytes=payload(),m=core.validateManifest(manifest(bytes),source),out=core.verifyPayload(core.readUpdateZIP(bytes),m);assert.equal(out.html,html);assert.equal(out.meta.version,'1.0.1');});
test('ZIP traversal, duplicate names, extra files, wrong versions and corrupt data are rejected',()=>{
 for(const entries of [[['../game.html',html],['release.json','{}']],[['game.html',html],['game.html',html]],[['game.html',html],['release.json','{}'],['main.js','bad']]])assert.throws(()=>core.readUpdateZIP(zip(entries)));
 assert.throws(()=>core.verifyPayload(core.readUpdateZIP(payload('1.0.2')),manifest()),/version does not match/);
 assert.throws(()=>core.verifyPayload(core.readUpdateZIP(payload('1.0.1','<!doctype html><html>Other game</html>')),manifest()),/complete Reef Rewards/);
 const bad=payload();bad[70]^=0xff;assert.throws(()=>core.readUpdateZIP(bad));
 const crc=payload();const cd=crc.indexOf(Buffer.from([0x50,0x4b,0x01,0x02]));crc.writeUInt32LE(0,cd+16);assert.throws(()=>core.readUpdateZIP(crc),/integrity/);
});
test('Update staging is atomic, preserves a previous game, and supports health confirmation and rollback',t=>{
 const d=temporary(t),bundled=path.join(d,'app');fs.mkdirSync(bundled);fs.writeFileSync(path.join(bundled,'game.html'),html);core.atomicJSON(path.join(bundled,'release.json'),{version:'1.0.0'});const store=new core.UpdateStore(path.join(d,'data'),bundled),m=manifest(),p=core.verifyPayload(core.readUpdateZIP(payload()),m);
 assert.equal(store.read().active.version,'1.0.0');store.stage(p);assert.equal(store.read().pending,true);assert.equal(store.read().active.version,'1.0.1');assert.equal(fs.readFileSync(store.file(),'utf8'),html);store.healthy();assert.equal(store.read().pending,false);assert.equal(store.read().previous.version,'1.0.0');assert.throws(()=>store.stage(p),/already installed/);assert.equal(store.rollback(),true);assert.equal(store.read().active.version,'1.0.0');
});
test('Damaged downloaded game files fall back to the previous valid game',t=>{
 const d=temporary(t),bundled=path.join(d,'app');fs.mkdirSync(bundled);fs.writeFileSync(path.join(bundled,'game.html'),html);core.atomicJSON(path.join(bundled,'release.json'),{version:'1.0.0'});const store=new core.UpdateStore(path.join(d,'data'),bundled);store.stage(core.verifyPayload(core.readUpdateZIP(payload()),manifest()));fs.writeFileSync(store.file(),'damaged');assert.equal(store.read().active.version,'1.0.0');assert.equal(store.read().pending,false);
});
test('Class backups preserve negative points, all limited claims, and older recovery data',t=>{
 const d=temporary(t),store=new core.ClassroomStore(d),value={version:1,students:[{id:'a',name:'Student 1',points:-6,form:'cinderfang'}],savedAt:1,revision:2,game:{limited:{claims:{cinderfang:{id:'a',name:'Student 1'}}}}};
 store.write({[core.STORAGE_KEY]:JSON.stringify(value)});assert.deepEqual(JSON.parse(store.read().localStorage[core.STORAGE_KEY]),value);const backup=store.backup('before-1.0.1');assert.deepEqual(JSON.parse(fs.readFileSync(backup,'utf8')),value);
 value.students[0].points=0;store.write({[core.STORAGE_KEY]:JSON.stringify(value)});assert.equal(JSON.parse(JSON.parse(fs.readFileSync(path.join(d,'Classroom/Classroom.previous.json'),'utf8')).localStorage[core.STORAGE_KEY]).students[0].points,-6);
 assert.throws(()=>store.write({other:'erase'}));assert.equal(JSON.parse(store.read().localStorage[core.STORAGE_KEY]).students[0].points,0);
});
test('The packaged aquarium is the complete existing offline game',()=>{
 const s=fs.readFileSync(path.join(__dirname,'../app/game.html'),'utf8');for(const required of ['CENTENNIAL100_FORMS','installNegativeGrowth','Noisy','Standing','mysteryWinnerName','COLLECTOR20_FORMS','reef-rewards-offline-v1'])assert.ok(s.includes(required),required);assert.ok(!/\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/.test(s.split('<script>')[1].split('</script>')[0]));
});
