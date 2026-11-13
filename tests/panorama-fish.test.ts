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
