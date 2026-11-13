"use client";
import {useEffect,useRef,useState} from 'react';
import type {AquariumFish} from '../../lib/aquarium-contracts';
import {separateFish,swimPersonality,fishSeed} from '../../lib/fish-motion';
import {panoramaCamera,panoramaLayout,PANORAMA_OCCLUSION_DEPTH} from '../../lib/panorama-motion';
import {samplePanoramaFish,riseAcrossCoral} from '../../lib/panorama-fish';
import {foregroundFronds,frondBlade} from '../../lib/panorama-layers';
import {waterMotes} from '../../lib/aquarium-atmosphere';
import {entryFor} from './AquariumCanvas';
import {PanoramaFishRenderer} from './fish/PanoramaFishRenderer';

type Sprite={fish:AquariumFish,image:HTMLImageElement,ready:boolean;failedAt:number};

export function PanoramaAquariumCanvas({fish,reducedMotion,paused,bubbles,quality}:{fish:AquariumFish[];reducedMotion:boolean;paused:boolean;bubbles:boolean;quality:1080|2160}){
 const dirtyRef=useRef(true);
 // Begin mid-traverse so the first few seconds visibly move, not in an eased endpoint dwell.
 const elapsedRef=useRef(12);
 const canvas=useRef<HTMLCanvasElement>(null);
 const sprites=useRef(new Map<string,Sprite>());
 const [status,setStatus]=useState('Loading bundled panorama…');
 useEffect(()=>{
  dirtyRef.current=true;const active=fish.filter(f=>f.active).slice(0,40);const wanted=new Set(active.map(f=>f.id));
  for(const [id,s] of sprites.current)if(!wanted.has(id)){s.image.onload=null;s.image.onerror=null;sprites.current.delete(id);}
  for(const f of active){const old=sprites.current.get(f.id);if(old?.fish.imageUrl===f.imageUrl){old.fish=f;continue;}
   const image=new Image();const sprite={fish:f,image,ready:false,failedAt:0};sprites.current.set(f.id,sprite);
   image.onload=()=>{sprite.ready=true;sprite.failedAt=0;dirtyRef.current=true;};
   image.onerror=()=>{sprite.ready=false;sprite.failedAt=Date.now();};image.src=f.imageUrl;
  }
 },[fish]);
 useEffect(()=>{
  const el=canvas.current;if(!el)return;const ctx=el.getContext('2d',{alpha:false});if(!ctx)return;
  let disposed=false,frame=0,last=0,elapsed=elapsedRef.current,w=1,h=1,lastDraw=0;
  let ready=false;const image=new Image();
  const renderer=new PanoramaFishRenderer();
  const foreground=new Image();let foregroundReady=false;foreground.onload=()=>{foregroundReady=true;dirtyRef.current=true;};foreground.src='/panorama/foreground-coral.png';
  image.onload=()=>{if(disposed)return;ready=true;dirtyRef.current=true;setStatus('');};
  image.onerror=()=>{if(!disposed)setStatus('Panorama could not load. Choose Uploaded video to use your saved background.');};image.src='/panorama/coral-cutout.png';
  const resize=()=>{const box=el.getBoundingClientRect();const scale=Math.min(window.devicePixelRatio||1,quality/Math.max(1,box.height),(quality*16/9)/Math.max(1,box.width));w=Math.max(1,Math.round(box.width*scale));h=Math.max(1,Math.round(box.height*scale));el.width=w;el.height=h;dirtyRef.current=true;};
  const observer=new ResizeObserver(resize);observer.observe(el);resize();
  const render=(now:number)=>{
   frame=0;if(disposed||document.hidden){last=0;return;}
   const still=paused||reducedMotion;
   if(!dirtyRef.current&&((still&&now-lastDraw<1000)||(!still&&now-lastDraw<1000/60))){frame=requestAnimationFrame(render);return;}
   const dt=last?Math.min(.1,(now-last)/1000):0;last=now;lastDraw=now;dirtyRef.current=false;
   if(!still)elapsed+=dt;
   el.dataset.motion=still?'still':'playing';el.dataset.sceneTime=elapsed.toFixed(2);
   const water=ctx.createLinearGradient(0,0,0,h);water.addColorStop(0,'#68cafa');water.addColorStop(.6,'#078fc1');water.addColorStop(1,'#07566b');ctx.fillStyle=water;ctx.fillRect(0,0,w,h);
   const progress=panoramaCamera(elapsed,reducedMotion);
   const layout=panoramaLayout(image.naturalWidth||3,image.naturalHeight||1,w,h,progress);

   for(const s of sprites.current.values())if(s.failedAt&&Date.now()-s.failedAt>30000){s.failedAt=0;s.image.src=s.fish.imageUrl;}
   const items=Array.from(sprites.current.values()).filter(s=>s.ready);
   const poses=separateFish(items.map(s=>samplePanoramaFish(swimPersonality(fishSeed(s.fish.id)),elapsed,reducedMotion))).map(p=>riseAcrossCoral(p,reducedMotion));
   const sorted=items.map((s,i)=>({s,p:poses[i]!})).sort((a,b)=>a.p.depth-b.p.depth);
   renderer.prepare(sorted.map(({s,p})=>({image:s.image,entry:entryFor(s.fish),pose:p})),w,h);
   const drawBand=(front:boolean)=>{
    const band=sorted.filter(({p})=>(p.depth>=PANORAMA_OCCLUSION_DEPTH)===front).map(({s,p})=>({image:s.image,entry:entryFor(s.fish),pose:{...p,x:(p.x*layout.width+layout.x)/w,y:(p.y*layout.height+layout.y)/h}}));
    renderer.drawBand(ctx,band,w,h);
   };
   // Light and suspended specks live behind the animals, never wash out their art.
   if(bubbles&&!reducedMotion){
    for(let i=0;i<3;i++){
     const x=w*(.12+i*.34)+Math.sin(elapsed*.055+i)*w*.025;
     const light=ctx.createLinearGradient(x,0,x+w*.14,h*.78);
     light.addColorStop(0,'rgba(230,255,255,.065)');light.addColorStop(1,'rgba(230,255,255,0)');
     ctx.fillStyle=light;ctx.beginPath();ctx.moveTo(x-w*.018,0);ctx.lineTo(x+w*.02,0);ctx.lineTo(x+w*.23,h*.78);ctx.lineTo(x+w*.05,h*.78);ctx.closePath();ctx.fill();
    }
    for(const mote of waterMotes(elapsed,w,h)){ctx.fillStyle=`rgba(221,250,247,${mote.alpha})`;ctx.beginPath();ctx.arc(mote.x,mote.y,mote.radius,0,Math.PI*2);ctx.fill();}
   }
   drawBand(false);
   // Actual coral alpha occludes rear fish, replacing coarse polygon patches.
   if(ready)ctx.drawImage(image,layout.x,layout.y,layout.width,layout.height);
   drawBand(true);
   el.dataset.fishRenderer=renderer.mode;
   if(foregroundReady){const fw=h*.48,fh=fw*foreground.naturalHeight/foreground.naturalWidth;for(const anchor of [.035,.965]){const x=anchor*w-(progress-.5)*w*.22;ctx.drawImage(foreground,x-fw/2,h-fh*.78,fw,fh);}}
   // Irregular, tapered blades. No thick central stroke or uniform fence spacing.
   ctx.save();
   for(const [index,plant] of foregroundFronds(progress,w,h,reducedMotion?0:elapsed).entries()){
    for(let j=0;j<5;j++){
     const factor=.57+((j*3+index)%7)*.07;
     const blade=frondBlade(plant.height*factor,plant.width*(.75+j*.09),plant.lean+(j-2)*h*.023,plant.sway*(.6+j*.17));
     const baseX=plant.x+(j-2)*h*.004;
     const shade=ctx.createLinearGradient(baseX,plant.y,baseX+blade.tip.x,plant.y+blade.tip.y);
     shade.addColorStop(0,`hsla(${plant.hue},40%,18%,.94)`);shade.addColorStop(.5,`hsla(${plant.hue},40%,29%,.86)`);shade.addColorStop(1,`hsla(${plant.hue+8},38%,43%,.72)`);
     ctx.fillStyle=shade;ctx.beginPath();ctx.moveTo(baseX,plant.y);
     ctx.bezierCurveTo(baseX+blade.leftControl1.x,plant.y+blade.leftControl1.y,baseX+blade.leftControl2.x,plant.y+blade.leftControl2.y,baseX+blade.tip.x,plant.y+blade.tip.y);
     ctx.bezierCurveTo(baseX+blade.rightControl1.x,plant.y+blade.rightControl1.y,baseX+blade.rightControl2.x,plant.y+blade.rightControl2.y,baseX,plant.y);ctx.fill();
    }
   }ctx.restore();
   if(bubbles&&!reducedMotion){ctx.strokeStyle='rgba(220,250,255,.24)';ctx.lineWidth=Math.max(1,h/1080);for(let i=0;i<22;i++){const x=layout.x+((i*.6180339)%1)*layout.width+Math.sin(elapsed*.6+i)*h*.006;const y=h-((elapsed*(.015+i%4*.004)+i*.137)%1)*h;ctx.beginPath();ctx.arc(x,y,h*(.0015+(i%4)*.0007),0,Math.PI*2);ctx.stroke();}}
   frame=requestAnimationFrame(render);
  };
  const visibility=()=>{cancelAnimationFrame(frame);last=0;dirtyRef.current=true;if(!document.hidden)frame=requestAnimationFrame(render);};
  document.addEventListener('visibilitychange',visibility);if(!document.hidden)frame=requestAnimationFrame(render);
  return()=>{elapsedRef.current=elapsed;disposed=true;cancelAnimationFrame(frame);observer.disconnect();renderer.dispose();foreground.onload=null;image.onload=null;image.onerror=null;document.removeEventListener('visibilitychange',visibility);};
 },[quality,reducedMotion,paused,bubbles]);
 useEffect(()=>()=>{for(const s of sprites.current.values()){s.image.onload=null;s.image.onerror=null;}sprites.current.clear();},[]);
 return <><canvas ref={canvas} aria-label="Panoramic aquarium with your saved fish" style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none'}}/>{status&&<p role="status" style={{position:'absolute',top:'40%',left:'10%',right:'10%',background:'#073541',padding:16,color:'white',zIndex:2}}>{status}</p>}</>;
}
