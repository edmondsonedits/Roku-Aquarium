import {ReadableStream} from 'node:stream/web';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer,get} from 'node:http';
import {Readable} from 'node:stream';
import {once} from 'node:events';
import {streamResponse} from './response-stream';

for(const kind of ['io','premature'] as const)test(`source ${kind} failure remains observable`,async()=>{
 let failure:unknown;
 const server=createServer(async(_req,res)=>{
  const source=new Readable({read(){this.push(Buffer.alloc(8));setImmediate(()=>this.destroy(kind==='io'?Object.assign(new Error('disk failure'),{code:'EIO'}):undefined));this._read=()=>{};}});
  try{await streamResponse(source,res);}catch(error){failure=error;}
 });
 server.listen(0,'127.0.0.1');await once(server,'listening');
 try{
  const address=server.address();assert.ok(address&&typeof address==='object');
  await new Promise<void>(resolve=>{const req=get(`http://127.0.0.1:${address.port}`,res=>{res.resume();res.once('close',resolve);});req.once('error',()=>resolve());});
  await new Promise(resolve=>setTimeout(resolve,30));
  assert.equal((failure as NodeJS.ErrnoException)?.code,kind==='io'?'EIO':'ERR_STREAM_PREMATURE_CLOSE');
 }finally{server.close();await once(server,'close');}
});

test('cancelled Web response stream is released without swallowing source failures',async()=>{
 let failure:unknown;let cancelled=false;
 const server=createServer(async(_req,res)=>{
  const source=Readable.fromWeb(new ReadableStream<Uint8Array>({pull(controller){controller.enqueue(new Uint8Array(65536));},cancel(){cancelled=true;}}));
  try{await streamResponse(source,res);}catch(error){failure=error;}
 });
 server.listen(0,'127.0.0.1');await once(server,'listening');
 try{
  const address=server.address();assert.ok(address&&typeof address==='object');
  await new Promise<void>((resolve,reject)=>{const req=get(`http://127.0.0.1:${address.port}`,res=>{res.once('data',()=>{res.destroy();resolve();});});req.once('error',reject);});
  await new Promise(resolve=>setTimeout(resolve,50));
  assert.equal(failure,undefined);assert.equal(cancelled,true);
 }finally{server.close();await once(server,'close');}
});
