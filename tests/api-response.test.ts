import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {fetchJson} from '../lib/network-request';
import {api} from '../app/components/useAquarium';

async function withResponse(status:number,body:string,run:(url:string,count:()=>number)=>Promise<void>){
 let requests=0;
 const server=createServer((_req,res)=>{requests++;res.writeHead(status);res.end(body);});
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{await run(`http://127.0.0.1:${(server.address() as {port:number}).port}`,()=>requests);}
 finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
}
test('HTML error response offers aquarium connection guidance, not JSON syntax',async()=>{
 await withResponse(502,'<html>gateway failed</html>',async url=>{
  await assert.rejects(fetchJson(url),/aquarium computer.*Wi-Fi/i);
 });
});
test('null and unrecognized error bodies retain HTTP status instead of throwing property errors',async()=>{
 for(const body of ['null','{"error":42}','{}'])await withResponse(503,body,async url=>{
  await assert.rejects(fetchJson(url),/503/);
 });
});
test('malformed successful mutation warns outcome is unconfirmed and is never retried',async()=>{
 await withResponse(201,'',async(url,count)=>{
  await assert.rejects(api(url,{title:'New room'}),/check.*before.*again/i);
  assert.equal(count(),1);
 });
});
test('valid JSON error messages survive shared parsing',async()=>{
 for(const body of ['{"error":"Aquarium is full."}','{"error":{"message":"Aquarium is full."}}','{"message":"Aquarium is full."}'])await withResponse(409,body,async url=>{
  await assert.rejects(api(url,{}),/^Error: Aquarium is full\.$/);
 });
});
test('legitimate null, array and object responses remain supported',async()=>{
 for(const body of ['null','[]','{"ok":true}'])await withResponse(200,body,async url=>{
  assert.deepEqual(await fetchJson(url),JSON.parse(body));
 });
});
test('body transport cancellation retains AbortError identity',async()=>{
 const {readJsonResponse}=await import('../lib/network-request');
 const aborted=new DOMException('Cancelled by navigation','AbortError');
 const response=new Response(new ReadableStream({start(controller){controller.error(aborted);}}));
 await assert.rejects(readJsonResponse(response),error=>error===aborted);
});
