// Teacher-awarded exam editions share artwork, never point-reward ownership.
const SUMMATIVE_KEYS=CENTENNIAL100_KEYS.map(key=>'summative_'+key);
const SUMMATIVE_PAIRS=[...new Set(CENTENNIAL100_KEYS.map(key=>FORMS[key].pair))];
for(const source of CENTENNIAL100_KEYS){
 const key='summative_'+source,f=FORMS[source];
 FORMS[key]={...f,name:f.name+' · Summative',at:0,summative:true,summativeSource:source,trail:key,trailName:'Champion '+f.trailName.toLowerCase()};
}
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
  `<section class="summative-confirm"><div class="summative-confirm-art"><img src="${VISUALS.bundles[f.bundle].image}" alt="${esc(f.name)}"></div><span class="summative-kicker">${esc(f.pair.toUpperCase())} PAIR · ONE WINNER</span><h3>${esc(s.name)}</h3><p>You are awarding <strong>${esc(FORMS[f.summativeSource].name)}</strong> (${f.sex.toLowerCase()}) to the highest scorer. <strong>Both the male and female versions will be sold out.</strong></p><label class="field"><span>Exam (optional)</span><input id="summativeExam" maxlength="60" value="Summative exam" placeholder="e.g. Math · Summative 1"></label><label class="field"><span>Exam score (optional)</span><input id="summativeScore" maxlength="24" placeholder="e.g. 38 / 40"></label><p class="summative-note">You select the winner. Classroom growth points are not used to decide this award and will stay the same.</p>${note}</section>`,
  `<button data-action="summativeCancel">Back to collection</button><button class="primary" data-action="summativeConfirm" data-token="${pendingSummativeAward.token}">Award to ${esc(s.name)}</button>`);
 if(!preview.open)preview.showModal();return true;
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
 showCelebration('Summative champion!',s.name+' · '+FORMS[f.summativeSource].name+' · '+f.pair+' pair reserved.','🏆');
 toast('Award saved · both versions of the '+f.pair+' pair are sold out.',true);return true;
}
const claimBeforeSummative=claimLimitedFish;
claimLimitedFish=function(id,key){return SUMMATIVE_KEYS.includes(key)?openSummativeAward(id,key):claimBeforeSummative(id,key);};
function buildSummativeGallery(s){
 const awarded=SUMMATIVE_PAIRS.filter(pair=>summativePairClaim(pair)).length;
 return `<section id="summativeGallery" class="summative-gallery" aria-label="Summative champion fish"><div class="summative-heading"><span class="summative-trophy" aria-hidden="true">🏆</span><div><span class="summative-kicker">SUMMATIVE CHAMPIONS · TEACHER AWARDS</span><h3>One pair. One exam champion.</h3><p>All twenty designs can be viewed from the start. Select the highest scorer yourself, then award either fish. Claiming one sells out both versions of its pair.</p></div><strong>${SUMMATIVE_PAIRS.length-awarded}<small>of 10 pairs available</small></strong></div><div class="summative-selected">Awarding to <strong>${esc(s.name)}</strong><span>No growth-point requirement · you choose the exam winner</span></div>${SUMMATIVE_PAIRS.map(pair=>{
  const owner=summativePairClaim(pair),ownerName=owner?displayLimitedName(owner):'',exam=owner?.exam||'Summative exam';
  return `<section class="summative-pair ${owner?'pair-sold':''}" data-summative-pair="${pair}"><div class="summative-pair-heading"><div><span>${owner?'PAIR SOLD OUT':'PAIR AVAILABLE'} · 1 WINNER</span><h4>${pair} champions</h4></div>${owner?`<p><strong>${esc(ownerName)}</strong><small>${esc(exam)}${owner.score?' · '+esc(owner.score):''}</small></p>`:'<p>Choose male <em>or</em> female.<small>Only one can be awarded.</small></p>'}</div><div class="summative-pair-grid">${SUMMATIVE_KEYS.filter(key=>FORMS[key].pair===pair).map(key=>{
   const f=FORMS[key],status=summativeStatus(s,key),yours=status==='owned',equipped=yours&&s.form===key,ready=status==='ready';
   const label=equipped?'✓ Equipped':yours?'Equip your champion':owner?'Sold out · pair reserved':'Award to '+s.name;
   return `<article class="summative-card ${equipped?'chosen':''}" data-summative-design="${key}" style="--fish-glow:${f.glow}"><div class="summative-art"><img src="${VISUALS.bundles[f.bundle].image}" alt="${esc(FORMS[f.summativeSource].name)}, ${f.sex.toLowerCase()} ${pair.toLowerCase()} summative fish" width="512" height="512" loading="lazy" decoding="async"><span>${f.sex}</span>${yours?'<b>YOUR AWARD</b>':''}</div><div class="summative-copy"><small>${f.rarity}</small><h5>${FORMS[f.summativeSource].name}</h5><p>${f.detail}</p><span>✧ ${f.trailName}</span><span>↻ ${f.power}</span><button class="${ready?'claim-ready':''}" data-action="summativeAward" data-id="${esc(s.id)}" data-form="${key}" aria-label="${yours?'Equip':owner?'Sold out':'Award'} ${esc(FORMS[f.summativeSource].name)} summative fish" ${ready||yours?'':'disabled'}>${esc(label)}</button>${equipped?`<button data-action="centennialPower" data-id="${esc(s.id)}" ${s.points<0?'disabled':''}>Perform champion move</button>`:''}</div></article>`;
  }).join('')}</div></section>`;
 }).join('')}<p class="limited-rules">Summative editions have separate ownership from the existing 100-point collection. Only the chosen version can be equipped; its partner stays reserved. Awards, exam labels and scores autosave and travel with your class backup. Changing looks or points keeps the pair reserved. Undo can correct a claim. Deleting its owner makes both versions available again.</p></section>`;
}
function installSummative(){
 const oldStudio=buildLookStudio;buildLookStudio=function(s,previews){const html=oldStudio(s,previews);if(lookTab!=='summative')return html;previews.splice(0,previews.length);return '<div class="look-studio summative-studio">'+html.slice(html.indexOf('<div class="look-tabs"'));};
 const oldCallout=limitedCallout;limitedCallout=function(s){const mine=ownedSummative(s.id),available=SUMMATIVE_PAIRS.filter(pair=>!summativePairClaim(pair)).length;return `<button class="limited-callout summative-callout ${mine.length?'owned':''}" data-action="summativeOpen" data-id="${esc(s.id)}"><span>🏆 Summative champions${mine.length?' · '+mine.length+' awarded':''}</span><small>Teacher selects the highest scorer · ${available} pairs available ↗</small></button>`+oldCallout(s);};
 const oldParticle=drawSignatureParticle;drawSignatureParticle=function(c,p,time){
  if(!FORMS[p.kind]?.summative)return oldParticle(c,p,time);
  drawCentennialGlyph(c,p.kind,p.x,p.y,p.size,time+(p.seed||0));star(c,p.x+p.size*1.5,p.y-p.size,p.size*.5,'#ffe5a3',time);
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
