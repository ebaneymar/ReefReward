'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../scripts/Make_Update_Manifest.html'),'utf8'),script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const start=script.indexOf('function localSHA256('),end=script.indexOf("$('create').addEventListener",start),hash=vm.runInNewContext(script.slice(start,end)+'\nlocalSHA256');
test('The offline publisher checksum matches standard SHA-256 with or without Web Crypto',()=>{
 for(const input of [Buffer.alloc(0),Buffer.from('abc'),Buffer.alloc(55,0xff),Buffer.alloc(56,1),Buffer.alloc(64,12),Buffer.alloc(1000000,97),crypto.randomBytes(1307)])assert.equal(hash(input),crypto.createHash('sha256').update(input).digest('hex'));
});
