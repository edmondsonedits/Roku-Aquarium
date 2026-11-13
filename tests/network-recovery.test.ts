import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {fetchJson} from '../lib/network-request';

test('stalled room request times out so the next poll can recover',async()=>{
 const server=createServer((req,res)=>{if(req.url==='/ready'){res.setHeader('Content-Type','application/json');res.end('{"ready":true}');}});
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 const address=server.address() as {port:number};const url=`http://127.0.0.1:${address.port}`;
 try {await assert.rejects(fetchJson(url+'/stalled',{},30),/timed out/i);assert.deepEqual(await fetchJson(url+'/ready'),{ready:true});}
 finally {server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
test('caller cancellation stops a pending request',async()=>{
 const controller=new AbortController();controller.abort();
 await assert.rejects(fetchJson('http://127.0.0.1:1',{signal:controller.signal}),/abort/i);
});
