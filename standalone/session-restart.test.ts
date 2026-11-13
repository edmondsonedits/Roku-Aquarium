import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {deflateSync} from 'node:zlib';
import {openStorage} from './storage';
import {aquariumRequest,type AquariumEnv} from '../server/aquarium';
import {backdropRequest} from './video';
import {fishPngCrc} from '../server/fish-png';
function png(){const chunk=(type:string,data:Uint8Array)=>{const out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length);out.write(type,4);out.set(data,8);out.writeUInt32BE(fishPngCrc(out.subarray(4,-4)),out.length-4);return out;};const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(2);ihdr.writeUInt32BE(1,4);ihdr[8]=8;ihdr[9]=6;return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(Buffer.from([0,255,0,0,255,0,0,0,0]))),chunk('IEND',Buffer.alloc(0))]);}

const origin='http://localhost:4317';
test('saved coworker session survives end shift, disk restart and restore',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'aquarium-session-'));
 let storage=await openStorage(dir), env=storage as unknown as AquariumEnv;
 const call=(path:string,body?:unknown,cookie?:string)=>aquariumRequest(new Request(origin+'/api/aquariums'+path,{method:body===undefined?'GET':'POST',headers:{origin,'content-type':'application/json',...(cookie?{cookie}:{})},body:body===undefined?undefined:JSON.stringify(body)}),env);
 try{
  const created=await call('',{title:'Restart session'});assert.equal(created.status,201);
  const {code}=await created.json() as {code:string};
  const host=created.headers.get('set-cookie')!.split(';')[0];
  const joined=await call('/'+code+'/join',{name:'Test Coworker'});assert.equal(joined.status,200);
  const phone=joined.headers.get('set-cookie')!.split(';')[0], bytes=png();
  const upload=()=>new Request(`${origin}/api/aquariums/${code}/fish`,{method:'POST',headers:{origin,cookie:phone,'content-type':'image/png','x-fish-name':'Test Fish','x-action-id':'restart_session_fish'},body:bytes});
  const saved=await aquariumRequest(upload(),env);assert.equal(saved.status,201);
  const {fishId}=await saved.json() as {fishId:string};
  const videoUrl=`${origin}/api/aquariums/${code}/backdrop`;
  const video=await backdropRequest(new Request(videoUrl,{method:'POST',headers:{origin,cookie:host,'content-type':'video/mp4','x-video-name':'Test.mp4'},body:new Uint8Array([10,20,30,40,50])}),code,env,dir);assert.equal(video.status,201);
  assert.equal((await call('/'+code+'/control',{action:'end'},host)).status,200);
  storage.close();storage=await openStorage(dir);env=storage as unknown as AquariumEnv;
  const state=await (await call('/'+code,undefined,host)).json() as {savedCount:number;activeCount:number;accepting:boolean};
  assert.equal(state.savedCount,1);assert.equal(state.activeCount,0);assert.equal(state.accepting,false);
  const media=await call('/'+code+'/media/'+fishId,undefined,phone);assert.equal(media.status,200);assert.deepEqual(Buffer.from(await media.arrayBuffer()),bytes);
  const retry=await aquariumRequest(upload(),env);assert.equal(retry.status,200);assert.equal((await retry.json() as {fishId:string}).fishId,fishId);
  const range=await backdropRequest(new Request(videoUrl+'/video',{headers:{cookie:host,range:'bytes=1-3'}}),code,env,dir);assert.equal(range.status,206);assert.deepEqual(new Uint8Array(await range.arrayBuffer()),new Uint8Array([20,30,40]));
  assert.equal((await call('/'+code+'/control',{action:'start'},host)).status,200);
  const restored=await call('/'+code+'/control',{action:'set-active',ids:[fishId]},host);
  const final=await restored.json() as {activeCount:number;savedCount:number};assert.equal(final.activeCount,1);assert.equal(final.savedCount,1);
 }finally{try{storage.close();}finally{await rm(dir,{recursive:true,force:true});}}
});
