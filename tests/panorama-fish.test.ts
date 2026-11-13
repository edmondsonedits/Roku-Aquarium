import test from 'node:test';
import assert from 'node:assert/strict';
import {samplePanoramaFish} from '../lib/panorama-fish';
import {swimPersonality} from '../lib/fish-motion';
test('panorama fish travels in depth with a visible near/far size change',()=>{
 const p=swimPersonality('fish'); const poses=Array.from({length:1200},(_,i)=>samplePanoramaFish(p,i/10));
 assert.ok(Math.max(...poses.map(p=>p.depth))-Math.min(...poses.map(p=>p.depth))>.4);
 assert.ok(Math.max(...poses.map(p=>p.scale))/Math.min(...poses.map(p=>p.scale))>1.35);
 assert.ok(poses.some(p=>p.turn===1)&&poses.some(p=>p.turn===-1));
 assert.ok(poses.some(p=>p.yaw<.3)&&poses.some(p=>p.yaw>.9));
 assert.ok(poses.every(p=>Object.values(p).every(Number.isFinite)));
});
test('reduced motion is deterministic and keeps drawings readable',()=>{
 const p=swimPersonality('other');
 assert.deepEqual(samplePanoramaFish(p,2,true),samplePanoramaFish(p,100,true));
 assert.equal(samplePanoramaFish(p,0,true).yaw,1);
 assert.equal(samplePanoramaFish(p,0,true).amplitude,0);
});
test('sampling does not alter personality or accumulate frame-rate drift',()=>{
 const p=swimPersonality('stable'); const original={...p};
 const expected=samplePanoramaFish(p,30);
 for(let i=0;i<300;i++)samplePanoramaFish(p,i/10);
 assert.deepEqual(samplePanoramaFish(p,30),expected);assert.deepEqual(p,original);
});

import {riseAcrossCoral} from '../lib/panorama-fish';
import {separateFish} from '../lib/fish-motion';
test('coral crossover rise runs after separation',()=>{
 const pose={...samplePanoramaFish(swimPersonality(4),2),depth:.58,y:.5};
 const result=separateFish([pose]).map(p=>riseAcrossCoral(p));
 assert.equal(result[0]!.y,.135);assert.equal(riseAcrossCoral(pose,true),pose);
});

test('artwork stays broadside for most travel, compressing only briefly for reversals',()=>{
 const poses=Array.from({length:1200},(_,i)=>samplePanoramaFish(swimPersonality('readable'),i/10));
 assert.ok(poses.filter(p=>p.yaw<.3).length/poses.length<.06);
});

test('panorama cruising stays calm even when panorama is wider than the TV',()=>{
 for(let seed=0;seed<20;seed++){
  const p=swimPersonality(seed);
  for(let t=0;t<120;t+=.2){
   const a=samplePanoramaFish(p,t),b=samplePanoramaFish(p,t+.05);
   assert.ok(Math.abs(b.x-a.x)/.05<.055,`fish ${seed} moves too fast at ${t}`);
  }
 }
});
test('depth crossings rise gradually without artificially shrinking the fish',()=>{
 const p=swimPersonality('crossing');
 for(let t=0;t<180;t+=.1){
  const base=samplePanoramaFish(p,t),a=riseAcrossCoral(base),b=riseAcrossCoral(samplePanoramaFish(p,t+.05));
  assert.equal(a.scale,base.scale);
  assert.ok(Math.abs(b.y-a.y)/.05<.05,'coral transition should not launch fish upward');
 }
});

test('simultaneous horizontal and depth turns cannot snap the artwork across screen',()=>{
 for(let seed=0;seed<40;seed++){
  const p=swimPersonality(seed);
  let previous=samplePanoramaFish(p,0);
  for(let frame=1;frame<7200;frame++){
   const pose=samplePanoramaFish(p,frame/60);
   assert.ok(Math.abs(pose.facing*pose.yaw-previous.facing*previous.yaw)<.09,`turn snap seed=${seed} t=${frame/60}`);
   previous=pose;
  }
 }
});
