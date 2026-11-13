import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm,rename} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {installPackage,removeVerifiedPrevious} from '../standalone/install-windows.mjs';
async function fixture(t){const root=await mkdtemp(join(tmpdir(),'aquarium-install-'));t.after(()=>rm(root,{recursive:true,force:true}));const source=join(root,'source'),dest=join(root,'app');await mkdir(source);await mkdir(join(root,'saves'));await writeFile(join(root,'saves','fish'),'keep');return {root,source,dest};}
async function pack(source,text){const files={};for(const p of ['runtime/server.mjs','dist-local/index.html','drizzle/0000_remarkable_korg.sql']){await mkdir(join(source,p,'..'),{recursive:true});await writeFile(join(source,p),text);files[p]=createHash('sha256').update(text).digest('hex');}await writeFile(join(source,'.aquarium-package.json'),JSON.stringify({kind:'work-aquarium-app-v1',files}));}
test('installs and updates same managed location without touching saves or downloaded source',async t=>{const {root,source,dest}=await fixture(t);await pack(source,'old');await installPackage(source,dest);await pack(source,'new');await installPackage(source,dest);assert.equal(await readFile(join(dest,'previous/runtime/server.mjs'),'utf8'),'old');await removeVerifiedPrevious(dest);assert.equal(await readFile(join(dest,'current/runtime/server.mjs'),'utf8'),'new');assert.equal(await readFile(join(root,'saves/fish'),'utf8'),'keep');assert.equal(await readFile(join(source,'runtime/server.mjs'),'utf8'),'new');});
test('failed swap restores previous app',async t=>{const {source,dest}=await fixture(t);await pack(source,'old');await installPackage(source,dest);await pack(source,'new');await assert.rejects(installPackage(source,dest,async stage=>{if(stage==='before-activate')throw Error('power failure');}));assert.equal(await readFile(join(dest,'current/runtime/server.mjs'),'utf8'),'old');});
test('recovers interrupted rename and refuses unknown files instead of deleting',async t=>{const {source,dest}=await fixture(t);await pack(source,'old');await installPackage(source,dest);await rename(join(dest,'current'),join(dest,'previous'));await installPackage(source,dest);await writeFile(join(dest,'current','my-fish.png'),'personal');await pack(source,'new');await assert.rejects(installPackage(source,dest),/Unexpected files/);assert.equal(await readFile(join(dest,'current','my-fish.png'),'utf8'),'personal');});
test('corrupt download cannot replace installed app',async t=>{const {source,dest}=await fixture(t);await pack(source,'old');await installPackage(source,dest);await pack(source,'new');await writeFile(join(source,'runtime/server.mjs'),'corrupt');await assert.rejects(installPackage(source,dest),/check failed/);assert.equal(await readFile(join(dest,'current/runtime/server.mjs'),'utf8'),'old');});
test('unexpected empty folders block cleanup',async t=>{const {source,dest}=await fixture(t);await pack(source,'old');await installPackage(source,dest);await mkdir(join(dest,'current','personal-folder'));await pack(source,'new');await assert.rejects(installPackage(source,dest),/Unexpected files/);});

test('interruption after staging preserves installed app and exact saved artwork bytes', async t => {
  const { root, source, dest } = await fixture(t);
  const image = Buffer.from([137, 80, 78, 71, 0, 255, 128, 42]);
  const imagePath = join(root, 'saves', 'fish.png');
  await writeFile(imagePath, image);
  await pack(source, 'old');
  await installPackage(source, dest);
  await pack(source, 'new');
  await assert.rejects(installPackage(source, dest, async stage => {
    if (stage === 'staged') throw new Error('interrupted before swap');
  }), /interrupted before swap/);
  assert.equal(await readFile(join(dest, 'current/runtime/server.mjs'), 'utf8'), 'old');
  assert.deepEqual(await readFile(imagePath), image);
  // A subsequent successful retry is safe and does not require rebuilding saves.
  await installPackage(source, dest);
  assert.equal(await readFile(join(dest, 'current/runtime/server.mjs'), 'utf8'), 'new');
  assert.deepEqual(await readFile(imagePath), image);
});

test('successful-start cleanup preserves unexpected files in the previous app', async t => {
  const { source, dest } = await fixture(t);
  await pack(source, 'old');
  await installPackage(source, dest);
  await pack(source, 'new');
  await installPackage(source, dest);
  const personalPath = join(dest, 'previous', 'my-drawing.png');
  await writeFile(personalPath, 'irreplaceable drawing');
  await assert.rejects(removeVerifiedPrevious(dest), /Unexpected files/);
  assert.equal(await readFile(personalPath, 'utf8'), 'irreplaceable drawing');
  assert.equal(await readFile(join(dest, 'previous/runtime/server.mjs'), 'utf8'), 'old');
  assert.equal(await readFile(join(dest, 'current/runtime/server.mjs'), 'utf8'), 'new');
});

test('missing migrations are rejected before replacing current, but legacy installed package upgrades',async t=>{
 const {source,dest}=await fixture(t);
 await pack(source,'old');await installPackage(source,dest);
 const current=join(dest,'current');
 const m=JSON.parse(await readFile(join(current,'.aquarium-package.json'),'utf8'));
 delete m.files['drizzle/0000_remarkable_korg.sql'];
 await rm(join(current,'drizzle'),{recursive:true});
 await writeFile(join(current,'.aquarium-package.json'),JSON.stringify(m));
 await pack(source,'new');
 const incomplete=JSON.parse(await readFile(join(source,'.aquarium-package.json'),'utf8'));
 delete incomplete.files['drizzle/0000_remarkable_korg.sql'];
 await writeFile(join(source,'.aquarium-package.json'),JSON.stringify(incomplete));
 await assert.rejects(installPackage(source,dest),/migrations missing/);
 assert.equal(await readFile(join(current,'runtime/server.mjs'),'utf8'),'old');
 await pack(source,'new');await installPackage(source,dest);
 assert.equal(await readFile(join(current,'drizzle/0000_remarkable_korg.sql'),'utf8'),'new');
 await removeVerifiedPrevious(dest);
});
