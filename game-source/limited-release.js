// Repair old saves and new deletions against the current class roster.
function releaseOrphanedLimited(pool,students){
 const live=new Set(students.map(s=>s.id));
 pool.returned=Array.isArray(pool.returned)?pool.returned.filter(k=>LIMITED_KEYS.includes(k)):[];
 for(const [key,owner] of Object.entries(pool.claims))if(!live.has(owner.id)){
  delete pool.claims[key];if(LIMITED_KEYS.includes(key)&&!pool.returned.includes(key))pool.returned.push(key);
 }
 pool.returned=pool.returned.filter(key=>!pool.claims[key]);
 pool.qualifiers=pool.qualifiers.filter(r=>live.has(r.id));
 pool.queue=pool.queue.map(batch=>batch.filter(r=>live.has(r.id))).filter(batch=>batch.length);
 if(pool.pending){pool.pending.candidates=pool.pending.candidates.filter(r=>live.has(r.id));pool.pending.slots=Math.min(pool.pending.slots,pool.pending.candidates.length,5-pool.qualifiers.length);if(!pool.pending.slots)pool.pending=null;}
 return pool;
}
const normalizeBeforeRelease=normalizeLimited;
normalizeLimited=function(raw,students=[],migrate=true){
 const pool=normalizeBeforeRelease(raw,students,migrate);
 pool.returned=[...new Set((Array.isArray(raw?.returned)?raw.returned:[]).filter(k=>LIMITED_KEYS.includes(k)&&!pool.claims[k]))];
 return migrate?releaseOrphanedLimited(pool,students):pool;
};
function heroClaimEligible(s,key){const pool=limitedState();return isLimitedQualifier(s.id)||!!(s.points>=20&&!pool.pending&&pool.qualifiers.length<5&&pool.returned?.includes(key));}
function limitedSwimEffort(s,previewMode){
 if(previewMode||!FORMS[effectiveForm(s)].limited)return 1;
 const w=swimmers.get(s.id);if(!w)return 1;
 const target=isFocusCalm()?.65:foods.some(f=>f.owner===s.id&&!f.eaten)||chaseRoles.has(s.id)||w.trick?1.36:1;
 w.flexEffort=(w.flexEffort||1)+(target-(w.flexEffort||1))*.13;return Math.round(w.flexEffort*100)/100;
}
