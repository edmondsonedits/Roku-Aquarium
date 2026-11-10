import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { mkdir, readFile, readdir, rename, writeFile, unlink } from 'node:fs/promises';
import { resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
class Prepared {
 constructor(readonly db:DatabaseSync,readonly sql:string,readonly args:unknown[]=[]){ }
 bind(...args:unknown[]){return new Prepared(this.db,this.sql,args);}
 async first<T=Record<string,unknown>>(){return (this.db.prepare(this.sql).get(...this.args as SQLInputValue[])??null) as T|null;}
 async all<T=Record<string,unknown>>(){return{results:this.db.prepare(this.sql).all(...this.args as SQLInputValue[]) as T[],success:true};}
 execute(){const result=this.db.prepare(this.sql).run(...this.args as SQLInputValue[]);return{success:true,meta:{changes:Number(result.changes),last_row_id:Number(result.lastInsertRowid)}};}
 async run(){return this.execute();}
}
export async function openStorage(dataDir:string){await mkdir(dataDir,{recursive:true,mode:0o700});const db=new DatabaseSync(resolve(dataDir,'aquarium.sqlite'));db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');const migrations=resolve(dirname(fileURLToPath(import.meta.url)),'../drizzle');const files=(await readdir(migrations)).filter(f=>f.endsWith('.sql')).sort();const version=Number((db.prepare('PRAGMA user_version').get() as {user_version:number}).user_version);for(let i=version;i<files.length;i++){const sql=await readFile(resolve(migrations,files[i]),'utf8');db.exec('BEGIN IMMEDIATE');try{db.exec(sql);db.exec(`PRAGMA user_version=${i+1}; COMMIT`);}catch(e){db.exec('ROLLBACK');db.close();throw e;}}
 const DB={prepare:(sql:string)=>new Prepared(db,sql),batch:async(statements:Prepared[])=>{db.exec('BEGIN IMMEDIATE');try{const results=statements.map(s=>s.execute());db.exec('COMMIT');return results;}catch(e){db.exec('ROLLBACK');throw e;}}};
 const root=resolve(dataDir,'objects');await mkdir(root,{recursive:true,mode:0o700});function path(key:string){const target=resolve(root,key);if(!target.startsWith(root+sep))throw new Error('Invalid object key');return target;}
 const BUCKET={put:async(key:string,bytes:Uint8Array)=>{const target=path(key);await mkdir(dirname(target),{recursive:true,mode:0o700});const tmp=target+'.'+crypto.randomUUID()+'.tmp';try{await writeFile(tmp,bytes,{mode:0o600,flag:'wx'});await rename(tmp,target);}finally{await unlink(tmp).catch(()=>{});}},get:async(key:string)=>{try{return{body:new Uint8Array(await readFile(path(key))) };}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return null;throw e;}},delete:async(key:string)=>{await unlink(path(key)).catch((e:NodeJS.ErrnoException)=>{if(e.code!=='ENOENT')throw e;});}};
 return{DB,BUCKET,close:()=>db.close()};
}
