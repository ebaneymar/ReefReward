VISUALS.bundles["summative_hearts"]={"image":"@@REEF_IMAGE_039@@","regions":[[107,9,687,869],[970,36,623,838]],"mirror":[false,false]};
VISUALS.bundles["summative_letters"]={"image":"@@REEF_IMAGE_040@@","regions":[[94,14,725,860],[973,34,701,833]],"mirror":[false,false]};
VISUALS.bundles["summative_infinity"]={"image":"@@REEF_IMAGE_041@@","regions":[[35,2,745,874],[1083,20,658,855]],"mirror":[false,true]};
VISUALS.bundles["summative_heritage"]={"image":"@@REEF_IMAGE_042@@","regions":[[50,2,658,884],[1149,27,574,859]],"mirror":[false,true]};
VISUALS.bundles["summative_sunstar"]={"image":"@@REEF_IMAGE_043@@","regions":[[73,4,757,880],[1101,33,633,843]],"mirror":[false,false]};
VISUALS.bundles["summative_scholars"]={"image":"@@REEF_IMAGE_044@@","regions":[[47,11,633,865],[1168,12,582,864]],"mirror":[false,false]};
// These are the six new user-supplied royal pairs, independent of point rewards.
const SUMMATIVE_FORMS={
 summative_heart_king:{name:'Aurelian Heartfin',sex:'Male',pair:'Hearts',bundle:'summative_hearts',index:0,glow:'#ffb9a3',motif:'heart',style:'crown',move:'circle',power:'Royal heart parade',trailName:'Ruby heart pearls',detail:'Crimson scales, a heart crown, and flowing gold-edged fins.'},
 summative_heart_queen:{name:'Rosalune Heartfin',sex:'Female',pair:'Hearts',bundle:'summative_hearts',index:1,glow:'#ffd0e8',motif:'heart',style:'pearls',move:'eight',power:'Pearl heart waltz',trailName:'Rose heart ribbons',detail:'Rose-pink ribbons, pearl ornaments, and a jeweled heart crown.'},
 summative_letter_king:{name:'Lexicon Tidekeeper',sex:'Male',pair:'Letters',bundle:'summative_letters',index:0,glow:'#a4e7ff',motif:'letters',style:'orbit',move:'circle',power:'Golden alphabet orbit',trailName:'Golden letters',detail:'A blue-and-gold scholar with a floating book and feather quill.'},
 summative_letter_queen:{name:'Lyrabelle Scrollfin',sex:'Female',pair:'Letters',bundle:'summative_letters',index:1,glow:'#dccaff',motif:'letters',style:'sway',move:'eight',power:'Story ribbon dance',trailName:'Pearl alphabet',detail:'A lavender and turquoise scholar with scrolls and luminous letters.'},
 summative_infinity_king:{name:'Infinitus Starweaver',sex:'Male',pair:'Infinity',bundle:'summative_infinity',index:0,glow:'#a5b6ff',motif:'infinity',style:'planet',move:'circle',power:'Infinite constellation orbit',trailName:'Infinity constellations',detail:'Midnight fins traced with geometry, planets, and infinity jewels.'},
 summative_infinity_queen:{name:'Eternelle Orbitfin',sex:'Female',pair:'Infinity',bundle:'summative_infinity',index:1,glow:'#dfc2ff',motif:'infinity',style:'nebula',move:'eight',power:'Infinity figure eight',trailName:'Violet infinity loops',detail:'Lavender star ribbons and pearl planets beneath an infinity crown.'},
 summative_heritage_king:{name:'Hiraya Goldweave',sex:'Male',pair:'Heritage',bundle:'summative_heritage',index:0,glow:'#ffd09d',motif:'weave',style:'crown',move:'circle',power:'Golden weave procession',trailName:'Golden woven stars',detail:'Ruby-and-cream fins with intricate gold patterns and a pearl sun crown.'},
 summative_heritage_queen:{name:'Mutya Pearlweave',sex:'Female',pair:'Heritage',bundle:'summative_heritage',index:1,glow:'#ffe2bb',motif:'weave',style:'pearls',move:'eight',power:'Pearl ribbon waltz',trailName:'Woven pearl blossoms',detail:'Ivory and crimson ribbons, golden weaving, flowers, and pearls.'},
 summative_sunstar_king:{name:'Lakan Suncrest',sex:'Male',pair:'Sun & Stars',bundle:'summative_sunstar',index:0,glow:'#ffe097',motif:'sun',style:'sunburst',move:'spin',power:'Suncrest victory spiral',trailName:'Sunburst stars',detail:'Red, blue, white, and gold fins with a radiant sun crown.'},
 summative_sunstar_queen:{name:'Tala Starcrest',sex:'Female',pair:'Sun & Stars',bundle:'summative_sunstar',index:1,glow:'#fff0c4',motif:'sun',style:'ribbon',move:'circle',power:'Starlight ribbon whirl',trailName:'Pearl sunbeams',detail:'Flowing red-and-blue ribbons with a pearl sun and golden star chains.'},
 summative_scholar_king:{name:'Astraeus Lorefin',sex:'Male',pair:'Celestial Scholars',bundle:'summative_scholars',index:0,glow:'#b8daff',motif:'book',style:'planet',move:'circle',power:'Celestial scholar orbit',trailName:'Starlit golden books',detail:'A celestial scholar with a golden book, planets, letters, and infinity gems.'},
 summative_scholar_queen:{name:'Seraphina Lorefin',sex:'Female',pair:'Celestial Scholars',bundle:'summative_scholars',index:1,glow:'#ffcff0',motif:'book',style:'nebula',move:'eight',power:'Pearl wisdom dance',trailName:'Pearl pages and stars',detail:'Pink and lavender fins carry golden books, heart jewels, and little planets.'}
};
const SUMMATIVE_KEYS=Object.keys(SUMMATIVE_FORMS),SUMMATIVE_PAIRS=[...new Set(SUMMATIVE_KEYS.map(key=>SUMMATIVE_FORMS[key].pair))];
for(const [key,f] of Object.entries(SUMMATIVE_FORMS))FORMS[key]={...f,at:0,boost:1.1,limited:true,ownCrown:true,centennial100:true,summative:true,element:'summative',rarity:'Summative Exclusive',trail:key};
for(const key of SUMMATIVE_KEYS)limitedMotionProfiles[key]={face:FORMS[key].pair==='Sun & Stars'?[.64,.10,1,.40]:[.58,.16,1,.44],vertical:true,flow:FORMS[key].sex==='Female'?1.25:1.1,tailRoot:[.56,.50],tailTip:FORMS[key].pair==='Celestial Scholars'?[.20,.90]:[.78,.96]};
const LEGACY_SUMMATIVE_KEYS=CENTENNIAL100_KEYS.map(key=>'summative_'+key);
function repairMistakenSummativeAwards(raw){
 if(!raw||!Array.isArray(raw.students))return raw;
 const legacy=key=>LEGACY_SUMMATIVE_KEYS.includes(key),claims=raw.game?.limited?.claims||{},history=Array.isArray(raw.history)?raw.history.filter(h=>h&&Array.isArray(h.changes)):[];
 if(!raw.students.some(s=>legacy(s.form))&&!Object.keys(claims).some(legacy)&&!history.some(h=>(h.changes||[]).some(c=>legacy(c.beforeMeta?.form)||legacy(c.afterMeta?.form))||Object.keys(h.limitedBefore?.claims||{}).some(legacy)))return raw;
 const fixed=JSON.parse(JSON.stringify(raw)),looks=new Map();
 for(const s of fixed.students){
  let previous=null;
  for(const h of history){const c=(h.changes||[]).find(c=>c.id===s.id&&legacy(c.afterMeta?.form)&&c.beforeMeta&&!legacy(c.beforeMeta.form));if(c){previous=c.beforeMeta;break;}}
  const form=previous?.form&&Object.hasOwn(FORMS,previous.form)&&(!FORMS[previous.form].limited||claims[previous.form]?.id===s.id)?previous.form:'normal';
  const look={form,skin:previous?.skin&&Object.hasOwn(SKINS,previous.skin)?previous.skin:'natural',hero:previous?.hero&&Object.hasOwn(HEROES,previous.hero)?previous.hero:'none'};looks.set(s.id,look);
  if(legacy(s.form))Object.assign(s,look);
 }
 const clearClaims=pool=>{if(pool?.claims)for(const key of LEGACY_SUMMATIVE_KEYS)delete pool.claims[key];};clearClaims(fixed.game?.limited);
 fixed.history=(Array.isArray(fixed.history)?fixed.history:[]).filter(h=>h&&Array.isArray(h.changes)&&!h.changes.some(c=>legacy(c.afterMeta?.form)&&c.beforeMeta&&!legacy(c.beforeMeta.form)&&c.before===c.after)).map(h=>{
  clearClaims(h.limitedBefore);for(const c of h.changes||[])for(const field of ['beforeMeta','afterMeta'])if(legacy(c[field]?.form))Object.assign(c[field],looks.get(c.id)||{form:'normal',skin:'natural',hero:'none'});return h;
 });return fixed;
}
const validateBeforeSummativeCorrection=validateState;
validateState=function(raw){return validateBeforeSummativeCorrection(repairMistakenSummativeAwards(raw));};
function summativeText(value,max){return typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max):'';}
const normalizeBeforeSummative=normalizeLimited;
normalizeLimited=function(raw,students=[],migrate=true){
 const pool=normalizeBeforeSummative(raw,students,migrate),live=new Set(students.map(s=>s.id)),pairs=new Set();
 const records=SUMMATIVE_KEYS.map(key=>({key,record:limitedRecord(raw?.claims?.[key])})).filter(x=>x.record&&(!migrate||live.has(x.record.id))).sort((a,b)=>a.record.time-b.record.time);
 for(const {key,record} of records){const pair=FORMS[key].pair;if(pairs.has(pair))continue;pairs.add(pair);pool.claims[key]={...record,exam:summativeText(raw.claims[key].exam,60),score:summativeText(raw.claims[key].score,24)};}
 return pool;
};
function summativePairClaim(pair,pool=limitedState()){
 const key=SUMMATIVE_KEYS.find(key=>FORMS[key].pair===pair&&pool?.claims?.[key]);
 return key?{key,...pool.claims[key]}:null;
}
function ownedSummative(id){return SUMMATIVE_KEYS.filter(key=>limitedOwner(key)?.id===id);}
function summativeStatus(s,key){
 if(!s||!SUMMATIVE_KEYS.includes(key))return 'invalid';
 const owner=summativePairClaim(FORMS[key].pair);
 return owner?(owner.key===key&&owner.id===s.id?'owned':'sold'):'ready';
}
const useBeforeSummative=canUseLimited;
canUseLimited=function(s,key){return SUMMATIVE_KEYS.includes(key)?!!s&&limitedOwner(key)?.id===s.id:useBeforeSummative(s,key);};
let pendingSummativeAward=null;
function openSummativeAward(id,key){
 const s=state.students.find(s=>s.id===id),status=summativeStatus(s,key);
 if(status==='invalid')return false;
 if(status==='owned'){chooseFishStyle(id,'form',key);return true;}
 if(status==='sold'){toast('Both fish in this pair are sold out. Choose an available pair.');return false;}
 const f=FORMS[key];pendingSummativeAward={id,key,token:uid()};stylePreviews=[];previewFish=null;
 const note=s.points<0?'<p class="summative-note">The award stays saved while this creature grows back to 0 points.</p>':'';
 preview.innerHTML=dialogShell('Award a summative champion','Teacher choice · highest summative exam score',
  `<section class="summative-confirm"><div class="summative-confirm-art"><canvas id="summativeConfirmArt" width="600" height="380" aria-label="${esc(f.name)}"></canvas></div><span class="summative-kicker">${esc(f.pair.toUpperCase())} PAIR · ONE WINNER</span><h3>${esc(s.name)}</h3><p>You are awarding <strong>${esc(f.name)}</strong> (${f.sex.toLowerCase()}) to the highest scorer. <strong>Both the male and female versions will be sold out.</strong></p><label class="field"><span>Exam (optional)</span><input id="summativeExam" maxlength="60" value="Summative exam" placeholder="e.g. Math · Summative 1"></label><label class="field"><span>Exam score (optional)</span><input id="summativeScore" maxlength="24" placeholder="e.g. 38 / 40"></label><p class="summative-note">You select the winner. Classroom growth points are not used to decide this award and will stay the same.</p>${note}</section>`,
  `<button data-action="summativeCancel">Back to collection</button><button class="primary" data-action="summativeConfirm" data-token="${pendingSummativeAward.token}">Award to ${esc(s.name)}</button>`);
 const shown={...s,form:key,points:Math.max(0,s.points),skin:'natural',hero:'none',equipped:'none',_showcase:true};stylePreviews=[{id:'summativeConfirmArt',s:shown,live:true}];if(!preview.open)preview.showModal();drawCardFish($('summativeConfirmArt'),shown);return true;
}
function confirmSummativeAward(token){
 const pending=pendingSummativeAward;if(!pending||pending.token!==token)return false;
 const s=state.students.find(s=>s.id===pending.id);if(!s){pendingSummativeAward=null;toast('This student is no longer in the class.');return false;}
 if(summativeStatus(s,pending.key)!=='ready'){pendingSummativeAward=null;toast('This pair has already been awarded. Both versions are sold out.');lookTab='summative';openGameDialog('styles',s.id);return false;}
 const f=FORMS[pending.key],beforeMeta=captureMeta(s),reefBefore=JSON.parse(JSON.stringify(state.game.reef)),limitedBefore=cloneLimited();
 limitedState().claims[pending.key]={id:s.id,name:s.name,time:Date.now(),exam:summativeText($('summativeExam').value,60),score:summativeText($('summativeScore').value,24)};
 s.form=pending.key;s.skin='natural';s.hero='none';selectedId=s.id;pendingSummativeAward=null;
 finishGameChange(s.name+': summative champion · '+f.pair,[{id:s.id,before:s.points,after:s.points,beforeMeta,afterMeta:captureMeta(s)}],reefBefore,limitedBefore);
 lookTab='summative';openGameDialog('styles',s.id);preview.scrollTop=0;
 showCelebration('Summative champion!',s.name+' · '+f.name+' · '+f.pair+' pair reserved.','🏆');
 toast('Award saved · both versions of the '+f.pair+' pair are sold out.',true);return true;
}
const claimBeforeSummative=claimLimitedFish;
claimLimitedFish=function(id,key){return SUMMATIVE_KEYS.includes(key)?openSummativeAward(id,key):claimBeforeSummative(id,key);};
function buildSummativeGallery(s,previews=[]){
 const awarded=SUMMATIVE_PAIRS.filter(pair=>summativePairClaim(pair)).length;
 return `<section id="summativeGallery" class="summative-gallery" aria-label="Summative champion fish"><div class="summative-heading"><span class="summative-trophy" aria-hidden="true">🏆</span><div><span class="summative-kicker">SUMMATIVE CHAMPIONS · TEACHER AWARDS</span><h3>One pair. One exam champion.</h3><p>All ${SUMMATIVE_KEYS.length} royal fish designs can be viewed from the start. Select the highest scorer yourself, then award either fish. Claiming one sells out both versions of its pair.</p></div><strong>${SUMMATIVE_PAIRS.length-awarded}<small>of ${SUMMATIVE_PAIRS.length} pairs available</small></strong></div><div class="summative-selected">Awarding to <strong>${esc(s.name)}</strong><span>No growth-point requirement · you choose the exam winner</span></div>${SUMMATIVE_PAIRS.map(pair=>{
  const owner=summativePairClaim(pair),ownerName=owner?displayLimitedName(owner):'',exam=owner?.exam||'Summative exam';
  return `<section class="summative-pair ${owner?'pair-sold':''}" data-summative-pair="${pair}"><div class="summative-pair-heading"><div><span>${owner?'PAIR SOLD OUT':'PAIR AVAILABLE'} · 1 WINNER</span><h4>${pair} champions</h4></div>${owner?`<p><strong>${esc(ownerName)}</strong><small>${esc(exam)}${owner.score?' · '+esc(owner.score):''}</small></p>`:'<p>Choose male <em>or</em> female.<small>Only one can be awarded.</small></p>'}</div><div class="summative-pair-grid">${SUMMATIVE_KEYS.filter(key=>FORMS[key].pair===pair).map(key=>{
   const f=FORMS[key],status=summativeStatus(s,key),yours=status==='owned',equipped=yours&&s.form===key,ready=status==='ready';
   const label=equipped?'✓ Equipped':yours?'Equip your champion':owner?'Sold out · pair reserved':'Award to '+s.name;
   const artId='summativeArt-'+key;previews.push({id:artId,s:{...s,form:key,points:Math.max(0,s.points),hero:'none',skin:'natural',equipped:'none',_showcase:true},live:true});
   return `<article class="summative-card ${equipped?'chosen':''}" data-summative-design="${key}" style="--fish-glow:${f.glow}"><div class="summative-art"><canvas id="${artId}" width="480" height="340" aria-label="${esc(f.name)}, ${f.sex.toLowerCase()} ${esc(pair.toLowerCase())} summative fish"></canvas><span>${f.sex}</span>${yours?'<b>YOUR AWARD</b>':''}</div><div class="summative-copy"><small>${f.rarity}</small><h5>${f.name}</h5><p>${f.detail}</p><span>✧ ${f.trailName}</span><span>↻ ${f.power}</span><button class="${ready?'claim-ready':''}" data-action="summativeAward" data-id="${esc(s.id)}" data-form="${key}" aria-label="${yours?'Equip':owner?'Sold out':'Award'} ${esc(f.name)} summative fish" ${ready||yours?'':'disabled'}>${esc(label)}</button>${equipped?`<button data-action="centennialPower" data-id="${esc(s.id)}" ${s.points<0?'disabled':''}>Perform champion move</button>`:''}</div></article>`;
  }).join('')}</div></section>`;
 }).join('')}<p class="limited-rules">These new royal awards are separate from the existing 100-point collection. Only the chosen version can be equipped; its partner stays reserved. Awards, exam labels and scores autosave and travel with your class backup. Changing looks or points keeps the pair reserved. Undo can correct a claim. Deleting its owner makes both versions available again.</p></section>`;
}
function drawSummativeGlyph(c,key,x,y,r,time){
 const f=FORMS[key];if(!f?.summative)return;c.save();c.translate(x,y);c.rotate(Math.sin(time*.7)*.16);c.fillStyle=f.glow;c.strokeStyle='#ffe3a0';c.lineWidth=.8;c.shadowColor=f.glow;c.shadowBlur=5;
 if(f.motif==='heart')path(c,[['M',0,r*1.5],['C',-r*2,-r*.1,-r*1.5,-r*1.8,0,-r*.7],['C',r*1.5,-r*1.8,r*2,-r*.1,0,r*1.5],['Z']],f.sex==='Male'?'#ff9aab':'#ffd0ed','#ffe4a3',.7);
 else if(f.motif==='letters'||f.motif==='infinity'){c.font='bold '+Math.max(7,r*3)+'px Georgia,serif';c.textAlign='center';c.textBaseline='middle';c.fillText(f.motif==='infinity'?'∞':['A','B','C'][Math.floor(time*.4)%3],0,0);}
 else if(f.motif==='weave'){path(c,[['M',0,-r*1.6],['L',r*1.3,0],['L',0,r*1.6],['L',-r*1.3,0],['Z']],null,'#ffe7b1',1);ellipse(c,0,0,r*.45,r*.45,'#fff4db');}
 else if(f.motif==='sun'){ellipse(c,0,0,r*.65,r*.65,'#ffe4a0');for(let i=0;i<8;i++){const a=i*Math.PI/4+time*.2;path(c,[['M',Math.cos(a)*r,Math.sin(a)*r],['L',Math.cos(a)*r*1.7,Math.sin(a)*r*1.7]],null,'#ffe4a0',.8);}}
 else{path(c,[['M',0,r],['L',-r*1.5,r*.5],['L',-r*1.5,-r],['L',0,-r*.6],['L',r*1.5,-r],['L',r*1.5,r*.5],['Z']],f.glow+'66','#ffe6af',.8);path(c,[['M',0,-r*.6],['L',0,r]],null,'#fff4d7',.8);star(c,0,-r*1.7,r*.6,'#ffe7ad',time);}
 c.restore();
}
function installSummative(){
 const oldStudio=buildLookStudio;buildLookStudio=function(s,previews){const html=oldStudio(s,previews);if(lookTab!=='summative')return html;for(let i=previews.length-1;i>=0;i--)if(previews[i].id==='lookFeatured')previews.splice(i,1);return '<div class="look-studio summative-studio">'+html.slice(html.indexOf('<div class="look-tabs"'));};
 const oldCard=drawCardFish;drawCardFish=function(canvas,s,time=0,animate=false){if(!FORMS[effectiveForm(s)].summative)return oldCard(canvas,s,time,animate);if(!canvas)return;const c=canvas.getContext('2d'),ratio=fishGeometry(s).width/100,height=Math.min(canvas.height*.88,canvas.width*.88/ratio);c.clearRect(0,0,canvas.width,canvas.height);drawFish(c,s,canvas.width/2,canvas.height*.51,height/100,1,time,0,!animate);};
 const oldCallout=limitedCallout;limitedCallout=function(s){const mine=ownedSummative(s.id),available=SUMMATIVE_PAIRS.filter(pair=>!summativePairClaim(pair)).length;return `<button class="limited-callout summative-callout ${mine.length?'owned':''}" data-action="summativeOpen" data-id="${esc(s.id)}"><span>🏆 Summative champions${mine.length?' · '+mine.length+' awarded':''}</span><small>Teacher selects the highest scorer · ${available} pairs available ↗</small></button>`+oldCallout(s);};
 const oldParticle=drawSignatureParticle;drawSignatureParticle=function(c,p,time){
  if(!FORMS[p.kind]?.summative)return oldParticle(c,p,time);
  drawSummativeGlyph(c,p.kind,p.x,p.y,p.size,time+(p.seed||0));
 };
 const oldPerformance=drawFishPerformance;drawFishPerformance=function(c,s,w){
  if(FORMS[effectiveForm(s)].summative&&s.points>=0&&!state.settings.reduced&&!state.settings.paused&&!isFocusCalm()&&!boneEffectActive(w,Date.now())){
   c.save();c.globalAlpha=.38+.1*Math.sin(clock*1.8+w.phase);c.strokeStyle='#ffe4a1';c.lineWidth=1;c.shadowColor='#ffe4a1';c.shadowBlur=7;
   const rx=fishGeometry(s).width*w.scale*.55+8,ry=54*w.scale+6;c.beginPath();c.ellipse(w.x,w.y,rx,ry,0,0,Math.PI*2);c.stroke();
   for(let i=0;i<3;i++){const a=clock*.6+i*Math.PI*2/3;star(c,w.x+Math.cos(a)*rx,w.y+Math.sin(a)*ry,2.8*clamp(w.scale,.7,1.4),'#ffe4a1',clock);}c.restore();
  }
  oldPerformance(c,s,w);
 };
 const oldAction=action;action=async function(el){
  const a=el.dataset.action,id=el.dataset.id||selectedId;
  if(a==='summativeOpen'){if(aquariumFullscreen)await toggleAquariumFullscreen();pendingSummativeAward=null;lookTab='summative';workflowDialog=null;openGameDialog('styles',id);return;}
  if(a==='summativeAward'){openSummativeAward(id,el.dataset.form);return;}
  if(a==='summativeConfirm'){confirmSummativeAward(el.dataset.token);return;}
  if(a==='summativeCancel'){const id=pendingSummativeAward?.id||selectedId;pendingSummativeAward=null;lookTab='summative';openGameDialog('styles',id);return;}
  if(a==='close'||a==='lookTab')pendingSummativeAward=null;
  return oldAction(el);
 };
}
