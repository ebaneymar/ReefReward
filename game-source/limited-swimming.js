// Continuous deformation keeps faces rigid and flexible fins intact.
const limitedMotionProfiles={
 av_captain:{face:[.62,.30,1,.70],stiff:.74},av_iron:{face:[.62,.26,1,.72],stiff:.48},av_hulk:{face:[.61,.29,1,.74],stiff:.60},av_thor:{face:[.67,.27,1,.70],stiff:.65},av_panther:{face:[.61,.30,1,.73],stiff:.66},
 fire_dragon:{face:[.66,.40,1,.72],flow:1.15},ice_dragon:{face:[.66,.37,1,.70],stiff:.70},water_spirit:{face:[.63,.32,1,.69],flow:1.25},earth_guardian:{face:[.65,.32,1,.76],stiff:.40},light_angel:{face:[.66,.33,1,.69],flow:1.1},
 void_shark:{face:[.63,.33,1,.74],stiff:.73},mecha_shark:{face:[.65,.29,1,.72],stiff:.40},mantis_fish:{face:[.64,.25,1,.66],stiff:.75},king_shark:{face:[.65,.30,1,.74],stiff:.55},galaxy_whale:{face:[.64,.33,1,.72],flow:.85},
 sun_queen:{face:[.65,.30,1,.67],flow:1.2},moon_empress:{face:[.66,.33,1,.67],flow:1.1},pearl_princess:{face:[.66,.31,1,.65],flow:1.2},frost_empress:{face:[.65,.30,1,.66],flow:1.05},rose_queen:{face:[.66,.31,1,.66],flow:1.25},
 emerald_enchantress:{face:[.62,.28,1,.64],flow:1.05},scarlet_witch:{face:[.64,.30,1,.66],flow:1.18},wasp_heroine:{face:[.63,.30,1,.68],stiff:.85},cosmic_captain:{face:[.66,.25,1,.59],flow:1.2},black_widow:{face:[.66,.28,1,.61],flow:1.3},
 cinderfang:{face:[.65,.39,1,.64],vertical:true,flow:1.05},emberlune:{face:[.68,.33,1,.58],vertical:true,flow:1.3},glacierion:{face:[.65,.09,1,.34],vertical:true,stiff:.72},snowlira:{face:[.54,.08,1,.32],vertical:true,flow:1.2},voltaris:{face:[.65,.24,1,.52],vertical:true,stiff:.78},
 stormelle:{face:[.53,.26,.94,.46],vertical:true,flow:1.22},mosswarden:{face:[.60,.30,1,.77],stiff:.48},florabelle:{face:[.58,.25,.97,.47],vertical:true,flow:1.25},umbrafang:{face:[.64,.50,1,.76],vertical:true,stiff:.73},eclipsia:{face:[.64,.35,1,.63],vertical:true,flow:1.3},
 solarius:{face:[.61,.33,1,.61],vertical:true,flow:1.05},halora:{face:[.65,.31,1,.57],vertical:true,flow:1.28},orioncrest:{face:[.63,.34,1,.60],vertical:true,flow:1.12},nebulina:{face:[.65,.32,1,.57],vertical:true,flow:1.35},titanbyte:{face:[.63,.13,1,.41],vertical:true,stiff:.40},
 chromalyn:{face:[.51,.16,.98,.43],vertical:true,stiff:.65},auricrown:{face:[.61,.32,1,.63],vertical:true,flow:1.08},pearloria:{face:[.59,.24,.98,.54],vertical:true,flow:1.25},tiderex:{face:[.56,.08,1,.37],vertical:true,flow:1.15},mariselle:{face:[.63,.25,1,.54],vertical:true,flow:1.35}
};
function motionSmooth(value){const x=clamp(value,0,1);return x*x*(3-2*x);}
function limbInfluence(u,v,root,tip,width){
 const ax=tip[0]-root[0],ay=tip[1]-root[1],length=Math.hypot(ax,ay),t=((u-root[0])*ax+(v-root[1])*ay)/(length*length),side=Math.abs((u-root[0])*ay-(v-root[1])*ax)/length;
 return {weight:motionSmooth(t)*Math.pow(1-motionSmooth(side/width),2),lag:clamp(t,0,1),nx:-ay/length,ny:ax/length};
}
function limitedVertex(profile,u,v,time,drive=1){
 const [l,t,r,b]=profile.face,distance=Math.hypot(Math.max(l-u,0,u-r),Math.max(t-v,0,v-b)),flexible=motionSmooth(distance/.12);if(!flexible)return {u,v};
 const strength=profile.stiff||1,flow=profile.flow||.70;
 const tail=limbInfluence(u,v,profile.vertical?[.61,.47]:[.58,.52],profile.vertical?[.36,.96]:[.02,.51],.48),upper=limbInfluence(u,v,[.64,.48],[.32,.04],.35),lower=limbInfluence(u,v,[.69,.55],[.40,.95],.35),hair=limbInfluence(u,v,[.72,.42],[.08,.16],.33);
 const finBeat=time*(profile.stiff?3.9:5.2),tailWave=(Math.sin(time*2.6-tail.lag*2.1)+.23*Math.sin(time*5.2-tail.lag*3.2))*.040*strength*drive,upperWave=Math.sin(finBeat-upper.lag*1.7+.7)*.026*strength*drive,lowerWave=Math.sin(finBeat-lower.lag*1.9+2.1)*.029*strength*drive,hairWave=(Math.sin(time*1.3-hair.lag*2.7)+.28*Math.sin(time*2.6-hair.lag*4.1))*.033*flow;
 const dx=tail.nx*tail.weight*tailWave+upper.nx*upper.weight*upperWave+lower.nx*lower.weight*lowerWave+hair.weight*hairWave*.35,dy=tail.ny*tail.weight*tailWave+upper.ny*upper.weight*upperWave+lower.ny*lower.weight*lowerWave+hair.weight*hairWave;
 return {u:u+dx*flexible,v:v+dy*flexible};
}
const limitedMeshCache=new WeakMap(),limitedPoseCache=new Map(),LIMITED_SWIM_PERIOD=Math.PI*4/2.6,LIMITED_SWIM_POSES=32;
let limitedPosePixels=0,limitedMeshSerial=0;
function limitedMesh(image,form){
 let entry=limitedMeshCache.get(image);if(entry?.key===form.bundle+':'+form.index)return entry;
 const profile=limitedMotionProfiles[Object.keys(FORMS).find(k=>FORMS[k]===form)];if(!profile)return null;
 const [l,t,r,b]=profile.face,axis=(a,b)=>[...new Set([0,1/3,2/3,1,a,b])].sort((x,y)=>x-y),xs=axis(l,r),ys=axis(t,b),vertices=[],triangles=[];
 for(const v of ys)for(const u of xs)vertices.push({u,v});
 for(let y=0;y<ys.length-1;y++)for(let x=0;x<xs.length-1;x++){const a=y*xs.length+x,b=a+1,d=a+xs.length,c=d+1;triangles.push([a,b,c],[a,c,d]);}
 entry={id:++limitedMeshSerial,key:form.bundle+':'+form.index,profile,vertices,triangles,blend:null};limitedMeshCache.set(image,entry);return entry;
}
function textureTriangle(c,image,source,destination){
 const [s0,s1,s2]=source,[p0,p1,p2]=destination,det=(s1.x-s0.x)*(s2.y-s0.y)-(s2.x-s0.x)*(s1.y-s0.y);if(Math.abs(det)<.00001)return;
 const a=((p1.x-p0.x)*(s2.y-s0.y)-(p2.x-p0.x)*(s1.y-s0.y))/det,b=((p1.y-p0.y)*(s2.y-s0.y)-(p2.y-p0.y)*(s1.y-s0.y))/det,cc=((p2.x-p0.x)*(s1.x-s0.x)-(p1.x-p0.x)*(s2.x-s0.x))/det,d=((p2.y-p0.y)*(s1.x-s0.x)-(p1.y-p0.y)*(s2.x-s0.x))/det,cx=(p0.x+p1.x+p2.x)/3,cy=(p0.y+p1.y+p2.y)/3;
 const expanded=destination.map(p=>{const dx=p.x-cx,dy=p.y-cy,n=Math.hypot(dx,dy)||1;return {x:p.x+dx/n*.42,y:p.y+dy/n*.42};});
 c.save();c.beginPath();expanded.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.clip();c.transform(a,b,cc,d,p0.x-a*s0.x-cc*s0.y,p0.y-b*s0.x-d*s0.y);c.drawImage(image,0,0);c.restore();
}
function limitedPose(mesh,image,index,drive,resolution){
 const key=mesh.id+':'+resolution+':'+drive+':'+index;
 if(limitedPoseCache.has(key)){const pose=limitedPoseCache.get(key);limitedPoseCache.delete(key);limitedPoseCache.set(key,pose);return pose;}
 const factor=Math.min(1,resolution/Math.max(image.width,image.height)),width=Math.ceil(image.width*factor),height=Math.ceil(image.height*factor),pad=12,canvas=document.createElement('canvas');canvas.width=width+pad*2;canvas.height=height+pad*2;
 const g=canvas.getContext('2d'),time=index/LIMITED_SWIM_POSES*LIMITED_SWIM_PERIOD,source=mesh.vertices.map(p=>({x:p.u*image.width,y:p.v*image.height})),destination=mesh.vertices.map(p=>{const q=limitedVertex(mesh.profile,p.u,p.v,time,drive);return {x:pad+q.u*width,y:pad+q.v*height};});
 for(const triangle of mesh.triangles)textureTriangle(g,image,triangle.map(i=>source[i]),triangle.map(i=>destination[i]));
 const pose={canvas,width,height,pad,pixels:canvas.width*canvas.height};limitedPoseCache.set(key,pose);limitedPosePixels+=pose.pixels;
 while(limitedPosePixels>32000000&&limitedPoseCache.size>2){const oldest=limitedPoseCache.keys().next().value;limitedPosePixels-=limitedPoseCache.get(oldest).pixels;limitedPoseCache.delete(oldest);}
 return pose;
}
function drawLimitedSwimming(c,image,left,top,width,height,motion,form,still,time){
 if(still){c.drawImage(image,left,top,width,height);return;}
 const mesh=limitedMesh(image,form);if(!mesh){c.drawImage(image,left,top,width,height);return;}
 const transform=c.getTransform?.(),density=transform?Math.max(Math.hypot(transform.a,transform.b),Math.hypot(transform.c,transform.d)):1,pixels=Math.max(width,height)*density,requested=motion.quality||pixels,resolution=requested<=112?112:requested<=176?176:requested<=256?256:360,drive=(motion.effort||1)>1.15?1.3:(motion.effort||1)<.85?.7:1;
 const phase=((time%LIMITED_SWIM_PERIOD)+LIMITED_SWIM_PERIOD)%LIMITED_SWIM_PERIOD/LIMITED_SWIM_PERIOD*LIMITED_SWIM_POSES,index=Math.floor(phase),mix=phase-index,a=limitedPose(mesh,image,index,drive,resolution),b=limitedPose(mesh,image,(index+1)%LIMITED_SWIM_POSES,drive,resolution);
 if(!mesh.blend||mesh.blend.width!==a.canvas.width||mesh.blend.height!==a.canvas.height){mesh.blend=document.createElement('canvas');mesh.blend.width=a.canvas.width;mesh.blend.height=a.canvas.height;}
 const g=mesh.blend.getContext('2d');g.clearRect(0,0,mesh.blend.width,mesh.blend.height);
 // Interpolate premultiplied alpha on a clear surface, preserving opaque faces.
 g.globalAlpha=1-mix;g.drawImage(a.canvas,0,0);g.globalCompositeOperation='lighter';g.globalAlpha=mix;g.drawImage(b.canvas,0,0);g.globalAlpha=1;g.globalCompositeOperation='source-over';
 if(image.reefMetal){const w=mesh.blend.width,h=mesh.blend.height,x=(((time*.22)%1.7)-.35)*w,shine=g.createLinearGradient(x-w*.24,0,x+w*.24,h*.15);shine.addColorStop(0,'#fff8df00');shine.addColorStop(.34,'#fff8df00');shine.addColorStop(.47,'#fffaf570');shine.addColorStop(.5,'#ffffffa5');shine.addColorStop(.55,'#fff8e344');shine.addColorStop(.76,'#fff8df00');shine.addColorStop(1,'#fff8df00');g.globalCompositeOperation='source-atop';g.fillStyle=shine;g.fillRect(0,0,w,h);g.globalCompositeOperation='source-over';}
 const px=width/a.width,py=height/a.height;c.drawImage(mesh.blend,left-a.pad*px,top-a.pad*py,width+a.pad*2*px,height+a.pad*2*py);
}
