import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createAquariumServer} from './server';
test('incomplete extracted package refuses startup before creating saved data',async()=>{
 const root=await mkdtemp(join(tmpdir(),'aquarium-package-'));
 const dataDir=join(root,'data');
 try {
  await assert.rejects(createAquariumServer({dataDir,staticDir:join(root,'missing-ui')}),/incomplete.*Extract All/i);
  await assert.rejects(stat(dataDir),{code:'ENOENT'});
 } finally {await rm(root,{recursive:true,force:true});}
});
