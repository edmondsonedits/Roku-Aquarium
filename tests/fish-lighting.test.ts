import test from 'node:test';
import assert from 'node:assert/strict';
import {fishWaterLighting} from '../lib/fish-lighting';
test('far fish receive restrained water lighting without fading their opacity',()=>{
 const far=fishWaterLighting(.25),near=fishWaterLighting(.85);
 assert.ok(far.haze>near.haze);assert.ok(far.brightness<near.brightness);
 for(const d of [-20,0,.5,1,20,NaN]){const p=fishWaterLighting(d);assert.ok(p.brightness>=.9&&p.brightness<=1);assert.ok(p.haze>=0&&p.haze<=.08);}
});
