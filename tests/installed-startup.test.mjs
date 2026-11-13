import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {installPackage} from '../standalone/install-windows.mjs';
test('actual managed package starts with SQLite and preserves existing saved objects on restart',async t=>{
 const root=await mkdtemp(join(tmpdir(),'aquarium-real-install-'));
 t.after(()=>rm(root,{recursive:true,force:true}));
 const dataDir=join(root,'saves'),destination=join(root,'managed');
 const current=await installPackage(resolve('.'),destination);
 const {createAquariumServer}=await import(pathToFileURL(join(current,'runtime/server.mjs')).href);
 const run=async()=>{
  const {server}=await createAquariumServer({port:4317,dataDir});
  await new Promise((r,j)=>{server.once('error',j);server.listen(0,'127.0.0.1',r)});
  try {
   const base='http://127.0.0.1:'+server.address().port;
   assert.equal((await fetch(base)).status,200);
   assert.equal((await fetch(base+'/panorama/aquarium.png')).status,200);
   assert.equal((await fetch(base+'/api/network')).status,200);
  } finally {server.closeAllConnections();await new Promise(r=>server.close(r));}
 };
 await run();
 const db=new DatabaseSync(join(dataDir,'aquarium.sqlite'));
 assert.ok(db.prepare('PRAGMA user_version').get().user_version>0);
 db.exec('CREATE TABLE preservation_probe(value TEXT); INSERT INTO preservation_probe VALUES ("saved fish metadata")'.replaceAll('"',"'"));db.close();
 await mkdir(join(dataDir,'objects','fish'),{recursive:true});
 const art=Buffer.from([137,80,78,71,42,0,255]);
 await writeFile(join(dataDir,'objects','fish','saved.png'),art);
 await installPackage(resolve('.'),destination);
 await run();
 assert.deepEqual(await readFile(join(dataDir,'objects','fish','saved.png')),art);
 const reopened=new DatabaseSync(join(dataDir,'aquarium.sqlite'));
 assert.equal(reopened.prepare('SELECT value FROM preservation_probe').get().value,'saved fish metadata');reopened.close();
});
