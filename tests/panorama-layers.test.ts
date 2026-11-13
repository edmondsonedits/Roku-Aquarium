import {test} from 'node:test';
import assert from 'node:assert/strict';
import {foregroundFronds} from '../lib/panorama-layers';
test('foreground moves in camera space and sways without affecting saved art',()=>{
 const start=foregroundFronds(0,1920,1080,0), end=foregroundFronds(1,1920,1080,3);
 assert.equal(start.length,9);assert.ok(end[4]!.x<start[4]!.x);
 assert.notEqual(end[4]!.sway,start[4]!.sway);
 for(const p of end)for(const n of Object.values(p))assert.ok(Number.isFinite(n));
});

test('plants form irregular clumps instead of an evenly spaced fence',()=>{
 const plants=foregroundFronds(.5,1920,1080,0);
 const gaps=plants.slice(1).map((p,i)=>Math.round(p.x-plants[i]!.x));
 assert.ok(new Set(gaps).size>3);
 assert.ok(new Set(plants.map(p=>Math.round(p.height))).size>4);
});
