'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{newGame}=require('./game-fixture');
async function game(values){const g=newGame(values);await g.run('autosaveReady');return g;}
function award(g,id,key,exam='Math · Summative 1',score='38 / 40'){
 assert.equal(g.run(`openSummativeAward(${JSON.stringify(id)},${JSON.stringify(key)})`),true);
 g.node('summativeExam').value=exam;g.node('summativeScore').value=score;
 return g.run('confirmSummativeAward(pendingSummativeAward.token)');
}
test('Correct royal awards require teacher confirmation and reserve both variants without spending growth points',async()=>{
 const g=await game(),{run,json}=g;run("state.students[1].points=900;save()");const before=json('state.students.map(s=>({id:s.id,points:s.points,shells:s.shells}))');
 assert.equal(run("claimLimitedFish('demo-0','summative_heart_king')"),true);assert.equal(run("summativePairClaim('Hearts')"),null);assert.equal(run("confirmSummativeAward('stale')"),false);
 assert.equal(run('confirmSummativeAward(pendingSummativeAward.token)'),true);
 assert.equal(run("summativePairClaim('Hearts').id"),'demo-0');
 for(const key of ['summative_heart_king','summative_heart_queen'])assert.equal(run(`summativeStatus(state.students[1],'${key}')`),'sold');
 assert.equal(run("canUseLimited(state.students[0],'summative_heart_queen')"),false);assert.equal(run("canUseLimited(state.students[0],'summative_heart_king')"),true);
 assert.equal(run("openSummativeAward('demo-1','summative_heart_queen')"),false);assert.deepEqual(json('state.students.map(s=>({id:s.id,points:s.points,shells:s.shells}))'),before);
 run("claimLimitedFish('demo-1','cinderfang')");assert.equal(run("limitedOwner('cinderfang').id"),'demo-1','Original 100-point reward is independent');
});
test('Female awards, exam details, negative-score recovery and class backup restoration retain the selected royal fish',async()=>{
 const g=await game();g.run('state.students[0].points=-7');assert.equal(award(g,'demo-0','summative_letter_queen'),true);assert.equal(award(g,'demo-0','summative_scholar_queen','Science','40 / 40'),true);g.run('save()');
 const reopened=await game(g.values);assert.equal(reopened.run("summativePairClaim('Letters').key"),'summative_letter_queen');assert.equal(reopened.run("summativePairClaim('Letters').exam"),'Math · Summative 1');assert.equal(reopened.run("summativePairClaim('Letters').score"),'38 / 40');
 assert.equal(reopened.run("summativeStatus(state.students[1],'summative_letter_king')"),'sold');assert.equal(reopened.run("ownedSummative('demo-0').length"),2);
 reopened.run("reward(['demo-0'],7)");assert.equal(reopened.run('effectiveForm(state.students[0])'),'summative_scholar_queen');
 const restored=await game();restored.run('state=validateState('+JSON.stringify(reopened.json('state'))+')');assert.equal(restored.run("summativePairClaim('Celestial Scholars').id"),'demo-0');
});
test('Undo and deleting an owner release both royal variants; conflicting and orphaned reservations repair safely',async()=>{
 const g=await game();assert.equal(award(g,'demo-0','summative_heritage_king'),true);g.run('undo()');assert.equal(g.run("summativePairClaim('Heritage')"),null);
 assert.equal(award(g,'demo-1','summative_heritage_queen'),true);await g.run("action({dataset:{action:'deleteStudent',id:'demo-1'}})");assert.equal(g.run("summativePairClaim('Heritage')"),null);
 assert.equal(award(g,'demo-0','summative_heritage_king'),true);const reopened=await game(g.values);assert.equal(reopened.run("summativePairClaim('Heritage').id"),'demo-0');
 reopened.run("state.game.limited.claims.summative_heart_king={id:'deleted',name:'Old',time:1};state.game.limited.claims.summative_heart_queen={id:'demo-0',name:'Student 1',time:2};state.game.limited.claims.summative_infinity_king={id:'demo-0',name:'Student 1',time:3};state.game.limited.claims.summative_infinity_queen={id:'demo-2',name:'Student 3',time:4};state=validateState(JSON.parse(JSON.stringify(state)))");
 assert.equal(reopened.run("summativePairClaim('Hearts').key"),'summative_heart_queen');assert.equal(reopened.run("limitedOwner('summative_infinity_queen')"),null);
});
test('All twelve supplied royal fish use their own transparent art, animated rigs and powers and are never auto-awarded',async()=>{
 const g=await game(),{run,json}=g;assert.equal(run('SUMMATIVE_KEYS.length'),12);assert.equal(run('SUMMATIVE_PAIRS.length'),6);
 const rows=json("SUMMATIVE_KEYS.map(key=>{const f=FORMS[key],mesh=limitedMesh({width:500,height:500},f);return {key,animated:mesh.profile===limitedMotionProfiles[key],bundle:f.bundle,image:!!VISUALS.bundles[f.bundle],power:!!f.power,at:f.at}})");
 for(const r of rows){assert.ok(r.animated&&r.image&&r.power,r.key);assert.ok(r.bundle.startsWith('summative_'));assert.equal(r.at,0);}
 run("lookTab='summative';var sumPreviews=[];var sumHTML=buildLookStudio(state.students[0],sumPreviews)");assert.equal(run("(sumHTML.match(/data-summative-design=/g)||[]).length"),12);assert.equal(run('sumPreviews.length'),12);
 run("reward(['demo-0'],500)");assert.equal(run('SUMMATIVE_KEYS.some(key=>limitedOwner(key))'),false);assert.equal(award(g,'demo-1','summative_sunstar_king'),true);assert.equal(run('hasTrail(state.students[1])'),true);assert.equal(run("startCentennialPower('demo-1',true)"),true);
});
test('The mistaken v1.1.2 awards revert to original looks without losing later scores or legitimate fish, including after Undo and backup import',async()=>{
 const g=await game();g.run("reward(['demo-0'],100);claimLimitedFish('demo-0','cinderfang');state.students[1].points=100;claimLimitedFish('demo-1','emberlune');state.students[0].form='betta';state.students[0].skin='gold';state.students[0].hero='bat';var originalLook=captureMeta(state.students[0])");
 const raw=g.json('state'),before=g.json('originalLook'),wrong={...before,form:'summative_cinderfang',skin:'natural',hero:'none'};
 raw.students[0]={...raw.students[0],...wrong,points:130,shells:77,stats:{...wrong.stats,reading:8},form:'summative_cinderfang'};
 raw.students[2].form='summative_nebulina';raw.students[2].points=-5;
 raw.game.limited.claims.summative_cinderfang={id:'demo-0',name:'Student 1',time:10};raw.game.limited.claims.summative_nebulina={id:'demo-2',name:'Student 3',time:11};
 raw.history=[{label:'Mistaken summative award',time:10,changes:[{id:'demo-0',before:100,after:100,beforeMeta:before,afterMeta:wrong}],limitedBefore:{...raw.game.limited,claims:{cinderfang:raw.game.limited.claims.cinderfang,emberlune:raw.game.limited.claims.emberlune}}},{label:'Later classroom points',time:12,changes:[{id:'demo-0',before:120,after:130,beforeMeta:wrong,afterMeta:wrong}],limitedBefore:raw.game.limited}];
 const values=new Map([['reef-rewards-offline-v1',JSON.stringify(raw)]]),fixed=await game(values);
 assert.equal(fixed.run('state.students[0].form'),'betta');assert.equal(fixed.run('state.students[0].skin'),'gold');assert.equal(fixed.run('state.students[0].hero'),'bat');assert.equal(fixed.run('state.students[0].points'),130);assert.equal(fixed.run('state.students[0].shells'),77);assert.equal(fixed.run('state.students[0].stats.reading'),8);
 assert.equal(fixed.run('state.students[2].form'),'normal','Use the original fish when old look history is unavailable');assert.equal(fixed.run('state.students[2].points'),-5);
 assert.equal(fixed.run("limitedOwner('cinderfang').id"),'demo-0');assert.equal(fixed.run("limitedOwner('emberlune').id"),'demo-1');assert.equal(fixed.run('SUMMATIVE_KEYS.some(key=>limitedOwner(key))'),false);
 assert.equal(fixed.run('LEGACY_SUMMATIVE_KEYS.some(key=>limitedOwner(key))'),false);assert.equal(fixed.run('state.history.length'),1);
 fixed.run('undo()');assert.equal(fixed.run('state.students[0].points'),120);assert.equal(fixed.run('state.students[0].form'),'betta');assert.equal(fixed.run('LEGACY_SUMMATIVE_KEYS.some(key=>limitedOwner(key))'),false);
 const imported=await game();imported.run('state=validateState('+JSON.stringify(raw)+')');assert.equal(imported.run('state.students[0].form'),'betta');assert.equal(imported.run("summativePairClaim('Hearts')"),null);
});

test('Left-facing supplied variants are mirrored once in the sprite cache while other art keeps its orientation',async()=>{
 const g=await game();
 g.run("var mirrorCalls=[];document.createElement=()=>({width:0,height:0,getContext:()=>({save(){},restore(){},translate(){},scale(x,y){mirrorCalls.push([x,y])},drawImage(){},filter:'none'})});bundleReady.summative_infinity=true;bundleReady.summative_hearts=true;bundleImages.summative_infinity={};bundleImages.summative_hearts={};spriteCache.clear()");
 g.run("spriteFor({...state.students[0],form:'summative_infinity_queen',skin:'natural',hero:'none',_showcase:true})");
 assert.deepEqual(g.json('mirrorCalls'),[[-1,1]]);
 g.run("spriteFor({...state.students[0],form:'summative_infinity_queen',skin:'natural',hero:'none',_showcase:true})");
 assert.equal(g.run('mirrorCalls.length'),1,'Repeated frames reuse the oriented sprite');
 g.run("spriteFor({...state.students[0],form:'summative_heart_queen',skin:'natural',hero:'none',_showcase:true})");
 assert.equal(g.run('mirrorCalls.length'),1,'Right-facing art is not mirrored');
});
