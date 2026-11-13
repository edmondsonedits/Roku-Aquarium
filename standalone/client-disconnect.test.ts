import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {get} from 'node:http';
import {once} from 'node:events';
import {setTimeout as delay} from 'node:timers/promises';
import {createAquariumServer} from './server';

test('cancelled static downloads do not log server failures and server stays usable',async()=>{
 const root=await mkdtemp(join(tmpdir(),'aquarium-disconnect-'));
 await writeFile(join(root,'index.html'),'ok');await writeFile(join(root,'large.bin'),Buffer.alloc(16*1024*1024));
 const errors:unknown[][]=[];const original=console.error;
 const {server}=await createAquariumServer({dataDir:join(root,'data'),staticDir:root});
 try{
  console.error=(...args)=>errors.push(args);
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const address=server.address();assert.ok(address&&typeof address==='object');
  const url=`http://127.0.0.1:${address.port}`;
  await new Promise<void>((resolve,reject)=>{const req=get(url+'/large.bin',res=>{res.once('data',()=>{res.destroy();resolve();});});req.on('error',reject);});
  await delay(100);
  const response=await fetch(url+'/');assert.equal(response.status,200);assert.equal(await response.text(),'ok');
  assert.deepEqual(errors,[]);
 }finally{console.error=original;server.close();await once(server,'close');await rm(root,{recursive:true,force:true});}
});
