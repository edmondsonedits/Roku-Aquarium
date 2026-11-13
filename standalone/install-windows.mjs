// Local, offline installer. Save data is deliberately outside this directory.
import { mkdir, readFile, writeFile, readdir, copyFile, rename, rm, lstat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname, isAbsolute } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { homedir } from 'node:os';
import { createConnection } from 'node:net';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const marker = '.aquarium-package.json';
async function exists(path) { try { await lstat(path); return true; } catch(e) { if(e.code==='ENOENT') return false; throw e; } }
async function filesAt(root, sub='') {
  const out=[];
  for(const entry of await readdir(resolve(root,sub),{withFileTypes:true})) {
    const path=sub ? `${sub}/${entry.name}` : entry.name;
    if(entry.isSymbolicLink()) throw new Error('Symbolic links are not allowed in the app package.');
    if(entry.isDirectory()) out.push(path+'/',...await filesAt(root,path));
    else if(entry.isFile()) out.push(path); else throw new Error('Unexpected package entry.');
  }
  return out.sort();
}
export async function verifyPackage(root, {allowLegacy=false}={}) {
  const manifest=JSON.parse(await readFile(resolve(root,marker),'utf8'));
  if(manifest.kind!=='work-aquarium-app-v1' || !manifest.files || typeof manifest.files!=='object') throw new Error('Unrecognized app package.');
  const names=Object.keys(manifest.files).sort();
  if(!names.includes('runtime/server.mjs') || !names.includes('dist-local/index.html')) throw new Error('Incomplete app package.');
  if(!allowLegacy && !names.includes('drizzle/0000_remarkable_korg.sql')) throw new Error('Incomplete app package: database migrations missing. Extract the complete updated download.');
  for(const name of names) {
    if(!/^(runtime\/server\.mjs|dist-local\/[a-zA-Z0-9_./-]+|drizzle\/[a-zA-Z0-9_-]+\.sql)$/.test(name) || name.split('/').includes('..')) throw new Error('Unsafe package path.');
    const full=resolve(root,name);
    let prefix=root; for(const part of name.split('/')) { prefix=resolve(prefix,part); if((await lstat(prefix)).isSymbolicLink()) throw new Error('Symbolic link in package.'); }
    if(hash(await readFile(full))!==manifest.files[name]) throw new Error(`App package check failed: ${name}`);
  }
  return manifest;
}
async function requireManagedOnly(root) {
  if((await lstat(root)).isSymbolicLink()) throw new Error('Managed app folder must not be a symbolic link.');
  const m=await verifyPackage(root,{allowLegacy:true});
  const actual=await filesAt(root);
  const expected=new Set([...Object.keys(m.files),marker]);
  for(const name of Object.keys(m.files)){const parts=name.split('/');parts.pop();while(parts.length){expected.add(parts.join('/')+'/');parts.pop();}}
  if(JSON.stringify(actual)!==JSON.stringify([...expected].sort())) throw new Error('Unexpected files in installed app; nothing was removed.');
}
export async function installPackage(source, destination, hook=async()=>{}) {
  const manifest=await verifyPackage(source);
  await mkdir(destination,{recursive:true});
  if((await lstat(destination)).isSymbolicLink()) throw new Error('Install folder must not be a symbolic link.');
  const current=resolve(destination,'current'), previous=resolve(destination,'previous');
  // Recover an interrupted swap before doing anything else.
  if(!await exists(current) && await exists(previous)) { await requireManagedOnly(previous); await rename(previous,current); }
  if(await exists(current)) await requireManagedOnly(current);
  if(await exists(previous)) await requireManagedOnly(previous);
  if(await exists(current)) {
    const installed=await verifyPackage(current,{allowLegacy:true});
    if(JSON.stringify(installed)===JSON.stringify(manifest)) return current;
  }
  const stage=resolve(destination,`staging-${process.pid}-${Date.now()}`);
  await mkdir(stage);
  try {
    for(const name of Object.keys(manifest.files)) { await mkdir(dirname(resolve(stage,name)),{recursive:true}); await copyFile(resolve(source,name),resolve(stage,name)); }
    await writeFile(resolve(stage,marker),JSON.stringify(manifest));
    await requireManagedOnly(stage);
    await hook('staged');
    if(await exists(previous)) await rm(previous,{recursive:true}); // verified equivalent old application only
    if(await exists(current)) await rename(current,previous);
    await hook('before-activate');
    await rename(stage,current);
    await requireManagedOnly(current);
    // The old app is deliberately retained for this launch; next successful update replaces it.
    return current;
  } catch(e) {
    if(!await exists(current) && await exists(previous)) await rename(previous,current);
    if(await exists(stage)) await rm(stage,{recursive:true});
    throw e;
  }
}
export async function removeVerifiedPrevious(destination) {
  const current=resolve(destination,'current'), previous=resolve(destination,'previous');
  await requireManagedOnly(current);
  if(await exists(previous)) { await requireManagedOnly(previous); await rm(previous,{recursive:true}); }
}
async function isRunning() {
  return new Promise(resolveResult=>{const socket=createConnection({host:'127.0.0.1',port:4317}); socket.setTimeout(1000); socket.once('connect',()=>{socket.destroy();resolveResult(true);}); socket.once('error',()=>resolveResult(false)); socket.once('timeout',()=>{socket.destroy();resolveResult(false);});});
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  let heldLock;
  const releaseLock=async()=>{if(heldLock){await rm(heldLock,{recursive:true});heldLock=undefined;}};
  try {
    if(process.platform!=='win32') throw new Error('Use START-WINDOWS.bat on Windows.');
    if(await isRunning()) throw new Error('Close the existing aquarium command window, then run START-WINDOWS.bat again.');
    if(process.env.AQUARIUM_DATA_DIR && !isAbsolute(process.env.AQUARIUM_DATA_DIR)) throw new Error('Set AQUARIUM_DATA_DIR to its full absolute save-folder path before updating. Nothing was moved.');
    const destination=resolve(homedir(),'.work-aquarium-app');
    if(process.env.AQUARIUM_DATA_DIR && resolve(process.env.AQUARIUM_DATA_DIR).toLowerCase().startsWith(destination.toLowerCase())) throw new Error('Custom save folder overlaps the app install folder. Nothing was changed.');
    const lock=resolve(destination,'.update-lock');
    await mkdir(destination,{recursive:true});
    try { await mkdir(lock); } catch { throw new Error('Another update may be running. Close it before retrying. If interrupted, remove only the empty .update-lock folder.'); }
    heldLock=lock;
    const current=await installPackage(resolve(dirname(fileURLToPath(import.meta.url)),'..'),destination);
    const launcher="@echo off\r\nrem Work Aquarium managed launcher v1\r\nnode -e \"if(process.env.AQUARIUM_DATA_DIR&&!require('node:path').isAbsolute(process.env.AQUARIUM_DATA_DIR)){console.error('AQUARIUM_DATA_DIR must be a full absolute path.');process.exit(1)}\"\r\nif errorlevel 1 (pause & exit /b 1)\r\nnode \"%USERPROFILE%\\.work-aquarium-app\\current\\runtime\\server.mjs\"\r\npause\r\n";
    const launchPath=resolve(destination,'START-AQUARIUM.bat');
    if(await exists(launchPath) && (await lstat(launchPath)).isSymbolicLink()) throw new Error('Launcher is a symbolic link; it was not overwritten.');
    if(await exists(launchPath) && !(await readFile(launchPath,'utf8')).includes('rem Work Aquarium managed launcher v1')) throw new Error('Unrecognized launcher file; it was not overwritten.');
    await writeFile(launchPath,launcher);
    console.log('App updated in one permanent folder. Saved fish and backdrop were NOT moved, copied or deleted.');
    console.log('You may delete the downloaded ZIP and extracted download folder.');
    console.log(`Next time: ${resolve(destination,'START-AQUARIUM.bat')}`);
    console.log('Keep this window open. Open http://localhost:4317');
    if(process.env.AQUARIUM_DATA_DIR) process.env.AQUARIUM_DATA_DIR=resolve(process.env.AQUARIUM_DATA_DIR);
    process.chdir(current);
    const {createAquariumServer}=await import(pathToFileURL(resolve(current,'runtime/server.mjs')).href);
    const {server,port}=await createAquariumServer();
    server.once('error',error=>{console.error(`Could not start aquarium: ${error.message}. Previous app retained for recovery.`);process.exitCode=1;releaseLock().catch(console.error);server.close();});
    server.listen(port,'0.0.0.0',()=>{ console.log(`Aquarium ready: http://localhost:${port}`); removeVerifiedPrevious(destination).catch(error=>console.error(`Old app cleanup skipped: ${error.message}`)).finally(releaseLock); });
    for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close(()=>process.exit(0)));
  } catch(e) { await releaseLock(); console.error(`Aquarium update stopped safely: ${e.message}`); process.exitCode=1; }
}
