import {test} from 'node:test';
import assert from 'node:assert/strict';
import {foregroundFronds} from '../lib/panorama-layers';
test('foreground moves in camera space and sways without affecting saved art',()=>{
 const start=foregroundFronds(0,1920,1080,0), end=foregroundFronds(1,1920,1080,3);
 assert.equal(start.length,9);assert.ok(end[4]!.x<start[4]!.x);
 assert.notEqual(end[4]!.sway,start[4]!.sway);
 for(const p of end)for(const n of Object.values(p))assert.ok(Number.isFinite(n));
});
