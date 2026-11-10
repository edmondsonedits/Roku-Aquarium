import test from 'node:test';
import assert from 'node:assert/strict';
import { saveLocalVideo, loadLocalVideo, videoStorageError, type VideoStorageBackend, type StoredVideo } from '../lib/local-video-storage';
function backend() {
 let record: StoredVideo | null = null; const files = new Map<string, Blob>();
 const api: VideoStorageBackend = { estimate: async () => ({quota:2_000_000_000,usage:0}), persist:async()=>true, readRecord:async()=>record, writeRecord:async value=>{record=value;}, clearRecord:async()=>{record=null;}, writeFile:async(key,blob,onProgress)=>{files.set(key,blob);onProgress?.(blob.size,blob.size);return 'opfs';}, readFile:async rec=>files.get(rec.fileName)??null, deleteFile:async rec=>{files.delete(rec.fileName);} };
 return {api,files};
}
const file = () => new File([new Uint8Array(1024)],'reef.mp4',{type:'video/mp4'});
test('saved background restores across independent loads without reading file into memory', async () => {
 const b=backend(); const input=file(); input.arrayBuffer=()=>{throw Error('must not read whole file');};
 const saved=await saveLocalVideo('ABCDEF',input,b.api); const restored=await loadLocalVideo('ABCDEF',b.api);
 assert.equal(saved.persistent,true); assert.equal(restored?.record.name,'reef.mp4'); assert.equal(restored?.blob.size,1024);
});
test('insufficient space refuses a 1GB file before any copy and retains previous background',async()=>{
 const b=backend(); await saveLocalVideo('ABCDEF',file(),b.api); b.api.estimate=async()=>({quota:1000,usage:900}); let wrote=false; b.api.writeFile=async()=>{wrote=true;return 'opfs';};
 await assert.rejects(saveLocalVideo('ABCDEF',file(),b.api),/space/i); assert.equal(wrote,false); assert.equal((await loadLocalVideo('ABCDEF',b.api))?.record.name,'reef.mp4');
});
test('failed new copy leaves previously saved video intact',async()=>{
 const b=backend(); await saveLocalVideo('ABCDEF',file(),b.api); b.api.writeFile=async()=>{throw new DOMException('disk full','QuotaExceededError');};
 await assert.rejects(saveLocalVideo('ABCDEF',file(),b.api)); assert.equal((await loadLocalVideo('ABCDEF',b.api))?.blob.size,1024);
});
test('successful replacement cleans old copy only after metadata is committed',async()=>{
 const b=backend(); await saveLocalVideo('ABCDEF',file(),b.api); await saveLocalVideo('ABCDEF',new File(['v2'],'new.webm',{type:'video/webm'}),b.api); assert.equal(b.files.size,1); assert.equal((await loadLocalVideo('ABCDEF',b.api))?.record.name,'new.webm');
});
test('persistence refusal is reported accurately but still permits best-effort local saving',async()=>{
 const b=backend();b.api.persist=async()=>false;const saved=await saveLocalVideo('ABCDEF',file(),b.api);assert.equal(saved.persistent,false);
});
test('quota and unavailable storage errors have useful fallback guidance',()=>{assert.match(videoStorageError(new DOMException('full','QuotaExceededError')),/space/i);assert.match(videoStorageError(new Error('blocked')),/choose|session/i);});
