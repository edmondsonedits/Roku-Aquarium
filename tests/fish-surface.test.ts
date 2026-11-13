import test from 'node:test';
import assert from 'node:assert/strict';
import {buildFishSurface} from '../lib/fish-surface';
test('artwork surface covers every pixel without alpha occupancy holes or stepped silhouette',()=>{
 const {vertices,indices}=buildFishSurface();
 let area=0;
 for(let i=0;i<indices.length;i+=3){const p=[0,1,2].map(n=>vertices.slice(indices[i+n]!*5,indices[i+n]!*5+5));area+=Math.abs((p[1]![0]!-p[0]![0]!)*(p[2]![1]!-p[0]![1]!)-(p[2]![0]!-p[0]![0]!)*(p[1]![1]!-p[0]![1]!))/2;}
 assert.ok(Math.abs(area-1)<1e-6);
 for(let i=0;i<vertices.length;i+=5){assert.equal(vertices[i],vertices[i+3]);assert.equal(vertices[i+1],vertices[i+4]);assert.equal(vertices[i+2],0);}
 assert.ok(vertices.length/5<2000);
});
