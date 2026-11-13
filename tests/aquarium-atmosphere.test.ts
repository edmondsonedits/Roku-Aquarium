import test from 'node:test';
import assert from 'node:assert/strict';
import {waterMotes} from '../lib/aquarium-atmosphere';
test('atmosphere is deterministic, bounded and independent of fish data',()=>{
 const a=waterMotes(30,1920,1080);
 assert.equal(a.length,28);assert.deepEqual(a,waterMotes(30,1920,1080));
 for(const p of a){assert.ok(p.x>=0&&p.x<=1920);assert.ok(p.y>=0&&p.y<=1080);assert.ok(p.radius>0&&p.radius<3);assert.ok(p.alpha<=.12);}
 assert.notDeepEqual(a,waterMotes(31,1920,1080));
});
test('an all-week display never drifts its particles outside the water',()=>{
 for(const time of [86400,7*86400,365*86400])for(const p of waterMotes(time,1920,1080))assert.ok(p.y>=0&&p.y<=1080);
});
