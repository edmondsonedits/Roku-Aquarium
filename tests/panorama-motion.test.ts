import {test} from 'node:test';
import assert from 'node:assert/strict';
import {panoramaCamera,panoramaLayout} from '../lib/panorama-motion';
test('panorama stays bounded and pauses at both turning points',()=>{
 for(let i=0;i<10000;i++)assert.ok(panoramaCamera(i/10)>=0&&panoramaCamera(i/10)<=1);
 assert.equal(panoramaCamera(48),1);assert.equal(panoramaCamera(49),1);
 assert.equal(panoramaCamera(98),0);assert.equal(panoramaCamera(99),0);
 assert.equal(panoramaCamera(0),panoramaCamera(100));assert.equal(panoramaCamera(500,true),.5);
});
test('camera has gentle zero-velocity departures and arrivals',()=>{
 assert.ok(panoramaCamera(.01)<.000001);
 assert.ok(1-panoramaCamera(47.99)<.000001);
});
test('panorama always covers viewport without exposing edges',()=>{
 for(const [w,h] of [[3840,2160],[360,780],[2400,800]])for(const p of [0,.5,1]){
 const r=panoramaLayout(6000,2160,w,h,p);
 assert.ok(r.width>=w&&r.height>=h);assert.ok(r.x<=0&&r.x+r.width>=w-.00001);
 }
});
