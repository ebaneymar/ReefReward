'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{newGame}=require('./game-fixture');
async function game(values){const g=newGame(values);await g.run('autosaveReady');return g;}
test('Deleting an owner releases all collections, preserves other students, and allows exclusive saved reclaims',async()=>{
 const g=await game(),{run,json}=g;
 run("reward(['demo-0'],100);claimLimitedFish('demo-0','av_captain');claimLimitedFish('demo-0','fire_dragon');claimLimitedFish('demo-0','sun_queen');claimLimitedFish('demo-0','cinderfang');state.students[1].points=100;claimLimitedFish('demo-1','emberlune');state.students[2].points=-6;save()");
 const other=json("state.students.find(s=>s.id==='demo-2')");await run("action({dataset:{action:'deleteStudent',id:'demo-0'}})");
 for(const k of ['av_captain','fire_dragon','sun_queen','cinderfang'])assert.equal(run(`limitedOwner('${k}')`),null,k+' available again');
 assert.equal(run("limitedOwner('emberlune').id"),'demo-1');assert.deepEqual(json("state.students.find(s=>s.id==='demo-2')"),other);
 assert.equal(run("limitedState().qualifiers.some(q=>q.id==='demo-0')"),false);
 run('state.students[2].points=100');assert.equal(run("heroClaimEligible(state.students[2],'av_captain')"),true);
 for(const k of ['av_captain','fire_dragon','sun_queen','cinderfang'])run(`claimLimitedFish(state.students[2].id,'${k}')`);
 const id=run('state.students[2].id');for(const k of ['av_captain','fire_dragon','sun_queen','cinderfang'])assert.equal(run(`limitedOwner('${k}').id`),id);
 assert.equal(run("claimLimitedFish('demo-1','cinderfang')"),false,'Live ownership stays exclusive');
 const reopened=await game(g.values);for(const k of ['av_captain','fire_dragon','sun_queen','cinderfang'])assert.equal(reopened.run(`limitedOwner('${k}').id`),id);
});
test('Older saves release deleted-owner reservations; undo and pending tickets do not resurrect deleted owners',async()=>{
 const old=await game();old.run("reward(['demo-0'],100);claimLimitedFish('demo-0','av_iron');claimLimitedFish('demo-0','black_widow');claimLimitedFish('demo-0','tiderex');state.students=state.students.filter(s=>s.id!=='demo-0');localStorage.setItem(KEY,JSON.stringify(state))");
 const migrated=await game(old.values);for(const k of ['av_iron','black_widow','tiderex'])assert.equal(migrated.run(`limitedOwner('${k}')`),null);
 migrated.run('state.students[0].points=100');assert.equal(migrated.run("heroClaimEligible(state.students[0],'av_iron')"),true);assert.equal(migrated.run("claimLimitedFish(state.students[0].id,'tiderex')"),true);
 const undone=await game();undone.run("reward(['demo-0'],100);claimLimitedFish('demo-0','cinderfang');reward(['demo-1'],20)");await undone.run("action({dataset:{action:'deleteStudent',id:'demo-0'}})");undone.run('undo()');assert.equal(undone.run("limitedOwner('cinderfang')"),null);
 const q=await game();q.run('reward(state.students.map(s=>s.id),20)');await q.run("action({dataset:{action:'deleteStudent',id:'demo-0'}})");assert.equal(q.run("limitedState().pending.candidates.some(r=>r.id==='demo-0')"),false);
});
test('All 45 swimming meshes keep faces rigid, remain bounded, loop seamlessly, cache poses, and bound memory',async()=>{
 const g=await game(),{run,json}=g;
 const rows=json(`Object.entries(limitedMotionProfiles).map(([key,p])=>{const [l,t,r,b]=p.face,head=[(l+r)/2,(t+b)/2],mesh=limitedMesh({width:500,height:500},FORMS[key]);let maximum=0,ratio=Infinity,travel=0;
 for(let frame=0;frame<120;frame++){const time=frame/12,v=mesh.vertices.map(x=>limitedVertex(p,x.u,x.v,time,1.36));for(let i=0;i<v.length;i++)maximum=Math.max(maximum,Math.hypot(v[i].u-mesh.vertices[i].u,v[i].v-mesh.vertices[i].v));for(const [a,b,c] of mesh.triangles){const area=x=>(x[b].u-x[a].u)*(x[c].v-x[a].v)-(x[c].u-x[a].u)*(x[b].v-x[a].v);ratio=Math.min(ratio,area(v)/area(mesh.vertices));}const h=limitedVertex(p,...head,time,1.36);if(h.u!==head[0]||h.v!==head[1])throw Error('Face moved: '+key);const a=limitedVertex(p,.12,.15,time),b=limitedVertex(p,.12,.15,time+.1);travel+=Math.hypot(a.u-b.u,a.v-b.v);}
 const firstPose=limitedVertex(p,.12,.84,.7),lastPose=limitedVertex(p,.12,.84,.7+LIMITED_SWIM_PERIOD);return {key,maximum,ratio,travel,loop:Math.hypot(firstPose.u-lastPose.u,firstPose.v-lastPose.v)};})`);
 assert.equal(rows.length,45);for(const r of rows){assert.ok(Number.isFinite(r.maximum)&&r.maximum<.11,r.key);assert.ok(r.ratio>.05,r.key+' mesh does not fold');assert.ok(r.travel>.001,r.key+' fins move');assert.ok(r.loop<1e-12,r.key+' seamless loop');}
 run("var nativeCreate=document.createElement,created=0;document.createElement=(tag)=>{if(tag==='canvas')created++;return nativeCreate(tag)};var art={width:500,height:500},target=nativeCreate('canvas').getContext('2d');drawLimitedSwimming(target,art,0,0,100,100,{effort:1},FORMS.emberlune,false,.7)");
 const warm=run('created');for(let i=0;i<20;i++)run("drawLimitedSwimming(target,art,0,0,100,100,{effort:1},FORMS.emberlune,false,.7)");assert.equal(run('created'),warm);
 run("drawLimitedSwimming(target,art,0,0,100,100,{effort:1},FORMS.emberlune,true,.8)");assert.equal(run('created'),warm,'Pause and Gentle use original still art');
 run("var samples=Object.keys(limitedMotionProfiles).map(key=>({key,art:{width:500,height:500}}));for(const s of samples)for(let i=0;i<8;i++)limitedPose(limitedMesh(s.art,FORMS[s.key]),s.art,i,1,360)");assert.ok(run('limitedPosePixels')<=32000000);
});
