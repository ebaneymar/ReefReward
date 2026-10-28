'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{newGame}=require('./game-fixture');
async function game(values){const g=newGame(values);await g.run('autosaveReady');return g;}
function award(g,id,key,exam='Math · Summative 1',score='38 / 40'){
 assert.equal(g.run(`openSummativeAward(${JSON.stringify(id)},${JSON.stringify(key)})`),true);
 g.node('summativeExam').value=exam;g.node('summativeScore').value=score;
 return g.run('confirmSummativeAward(pendingSummativeAward.token)');
}
test('Summative awards require teacher confirmation, ignore growth points, and reserve both versions for one chosen fish',async()=>{
 const g=await game(),{run,json}=g;
 run("state.students[0].points=0;state.students[1].points=900;save()");
 const before=json('state.students.map(s=>({id:s.id,points:s.points,shells:s.shells}))');
 assert.equal(run("claimLimitedFish('demo-0','summative_cinderfang')"),true);
 assert.equal(run("summativePairClaim('Fire')"),null,'Opening an award never claims it');
 assert.equal(run("confirmSummativeAward('stale-token')"),false);
 g.node('summativeExam').value='Math';g.node('summativeScore').value='38 / 40';
 assert.equal(run('confirmSummativeAward(pendingSummativeAward.token)'),true);
 assert.equal(run("summativePairClaim('Fire').id"),'demo-0','Teacher may select a different student from the points leader');
 assert.equal(run("summativeStatus(state.students[1],'summative_cinderfang')"),'sold');
 assert.equal(run("summativeStatus(state.students[1],'summative_emberlune')"),'sold');
 assert.equal(run("canUseLimited(state.students[0],'summative_emberlune')"),false,'The unchosen partner stays reserved, including for the owner');
 assert.equal(run("canUseLimited(state.students[0],'summative_cinderfang')"),true);
 assert.equal(run("effectiveForm(state.students[0])"),'summative_cinderfang');
 assert.equal(run("openSummativeAward('demo-1','summative_emberlune')"),false);
 assert.deepEqual(json('state.students.map(s=>({id:s.id,points:s.points,shells:s.shells}))'),before);
 assert.equal(run("ownedCentennial100('demo-0')"),null,'Existing point-reward ownership stays separate');
 run("claimLimitedFish('demo-1','cinderfang')");assert.equal(run("limitedOwner('cinderfang').id"),'demo-1');
});
test('Male and female summative choices persist, retain exam details and return after a negative score recovers',async()=>{
 const g=await game();g.run('state.students[0].points=-7');
 assert.equal(award(g,'demo-0','summative_snowlira'),true);
 assert.equal(award(g,'demo-0','summative_nebulina','Science','40 / 40'),true,'One winner may earn separate pairs for separate exams');
 g.run('save()');const reopened=await game(g.values);
 assert.equal(reopened.run("summativeStatus(state.students[1],'summative_glacierion')"),'sold');
 assert.equal(reopened.run("summativePairClaim('Ice').key"),'summative_snowlira');
 assert.equal(reopened.run("summativePairClaim('Ice').exam"),'Math · Summative 1');
 assert.equal(reopened.run("summativePairClaim('Ice').score"),'38 / 40');
 assert.equal(reopened.run("ownedSummative('demo-0').length"),2);
 reopened.run("reward(['demo-0'],7)");assert.equal(reopened.run('state.students[0].form'),'summative_nebulina');
 assert.equal(reopened.run('effectiveForm(state.students[0])'),'summative_nebulina');
 const backup=reopened.json('state'),restored=await game();restored.run('state=validateState('+JSON.stringify(backup)+')');
 assert.equal(restored.run("summativePairClaim('Cosmic').id"),'demo-0');
});
test('Undo and owner deletion free the whole pair; reloading repairs orphaned and conflicting reservations',async()=>{
 const g=await game();assert.equal(award(g,'demo-0','summative_auricrown'),true);g.run('undo()');
 assert.equal(g.run("summativePairClaim('Royal')"),null);
 assert.equal(award(g,'demo-1','summative_pearloria'),true);
 await g.run("action({dataset:{action:'deleteStudent',id:'demo-1'}})");
 assert.equal(g.run("summativePairClaim('Royal')"),null);
 assert.equal(award(g,'demo-0','summative_auricrown'),true);
 const reopened=await game(g.values);assert.equal(reopened.run("summativePairClaim('Royal').id"),'demo-0');
 reopened.run("state.game.limited.claims.summative_cinderfang={id:'deleted-owner',name:'Old owner',time:1};state.game.limited.claims.summative_emberlune={id:'demo-0',name:'Student 1',time:2};state.game.limited.claims.summative_glacierion={id:'demo-0',name:'Student 1',time:3};state.game.limited.claims.summative_snowlira={id:'demo-2',name:'Student 3',time:4};state=validateState(JSON.parse(JSON.stringify(state)))");
 assert.equal(reopened.run("summativePairClaim('Fire').key"),'summative_emberlune','An orphan does not hide a live owner');
 assert.equal(reopened.run("limitedOwner('summative_snowlira')"),null,'Only one live claim survives for a pair');
 assert.equal(reopened.run("summativePairClaim('Ice').id"),'demo-0');
});
test('Summative designs retain all twenty animated rigs and powers, stay visible at zero points, and never award themselves',async()=>{
 const g=await game(),{run,json}=g;
 assert.equal(run('SUMMATIVE_KEYS.length'),20);assert.equal(run('SUMMATIVE_PAIRS.length'),10);
 const rows=json("SUMMATIVE_KEYS.map(key=>{const f=FORMS[key],art={width:500,height:500},mesh=limitedMesh(art,f);return {key,animated:mesh.profile===limitedMotionProfiles[f.summativeSource],image:!!VISUALS.bundles[f.bundle],power:!!f.power,at:f.at}})");
 for(const row of rows){assert.ok(row.animated&&row.image&&row.power,row.key);assert.equal(row.at,0);}
 assert.equal(run("(buildSummativeGallery(state.students[0]).match(/data-summative-design=/g)||[]).length"),20);
 assert.equal(run("buildLookStudio(state.students[0],[]).includes('lookTab-summative')"),true);
 run("reward(['demo-0'],500)");assert.equal(run('SUMMATIVE_KEYS.some(key=>limitedOwner(key))'),false);
 assert.equal(award(g,'demo-1','summative_solarius'),true);
 assert.equal(run("hasTrail(state.students[1])"),true,'Champion trails do not need 20 points');
 assert.equal(run("startCentennialPower('demo-1',true)"),true,'Owned champion powers work at zero growth points');
});
