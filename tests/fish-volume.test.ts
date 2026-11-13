import assert from 'node:assert/strict';
import test from 'node:test';
import {buildFishVolume} from '../lib/fish-volume';
const anchors={head:{x:.8,y:.5},body:{x:.5,y:.5},tail:{x:.16,y:.5}};
function image(opaque:(u:number,v:number)=>boolean){const width=128,height=96,data=new Uint8ClampedArray(width*height*4);for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*4;data[i]=60;data[i+1]=130;data[i+2]=200;data[i+3]=opaque((x+.5)/width,(y+.5)/height)?255:0;}return {width,height,data};}
test('empty art has no visible mesh triangles',()=>{const mesh=buildFishVolume(image(()=>false),anchors);assert.equal(mesh.indices.length,0);assert.ok([...mesh.vertices].every(Number.isFinite));});
test('closed artwork volume has nonzero thin fins and explicit UV coordinates',()=>{const mesh=buildFishVolume(image((u,v)=>u>.1&&u<.9&&v>.3&&v<.7),anchors);assert.equal(mesh.vertices.length%5,0);assert.ok(mesh.indices.length>0);assert.ok(Math.max(...mesh.indices)<mesh.vertices.length/5);let fin=false;for(let i=0;i<mesh.vertices.length;i+=5){const [x,,z,u,v]=mesh.vertices.slice(i,i+5);assert.ok(Number.isFinite(z));assert.ok(Math.abs(z!)<=.100001);assert.ok(u!>=0&&u!<=1&&v!>=0&&v!<=1);if(x!<.25&&Math.abs(z!)>.005)fin=true;}assert.ok(fin,'tail must have volume when edge-on');});
test('surface is watertight after welding coincident positions, including a deliberate art hole',()=>{const mesh=buildFishVolume(image((u,v)=>u>.15&&u<.85&&v>.2&&v<.8&&!(u>.4&&u<.6&&v>.4&&v<.6)),anchors);const edges=new Map<string,number>();const point=(i:number)=>Array.from(mesh.vertices.slice(i*5,i*5+3)).map(n=>n.toFixed(6)).join(',');for(let i=0;i<mesh.indices.length;i+=3){const p=[point(mesh.indices[i]!),point(mesh.indices[i+1]!),point(mesh.indices[i+2]!)];for(let j=0;j<3;j++){const edge=[p[j],p[(j+1)%3]].sort().join('|');edges.set(edge,(edges.get(edge)||0)+1);}}assert.ok(edges.size>0);assert.ok([...edges.values()].every(n=>n===2),'each edge must meet exactly two triangles');});
test('worst-case checkerboard stays within Uint16 index budget and preserves source pixels',()=>{const pixels=image((u,v)=>(Math.floor(u*64)+Math.floor(v*48))%2===0),before=pixels.data.slice();const mesh=buildFishVolume(pixels,anchors);assert.ok(mesh.vertices.length/5<=65535);assert.ok(mesh.indices instanceof Uint16Array);assert.deepEqual(pixels.data,before);});

test('faint visible artwork requests fallback instead of disappearing',()=>{
 const data=new Uint8ClampedArray(16*16*4);for(let i=3;i<data.length;i+=4)data[i]=64;
 assert.throws(()=>buildFishVolume({width:16,height:16,data},anchors),/fallback/);
});
