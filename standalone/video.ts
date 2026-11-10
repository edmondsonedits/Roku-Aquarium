import {mkdir,readFile,writeFile,rename,unlink} from 'node:fs/promises';
import {createReadStream,createWriteStream} from 'node:fs';
import {resolve} from 'node:path';
import {Readable,Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {aquariumRequest,type AquariumEnv} from '../server/aquarium';
export function videoRange(header:string,size:number){const m=/^bytes=(\d*)-(\d*)$/.exec(header);if(!m||(!m[1]&&!m[2])||size<=0)return null;const start=m[1]?Number(m[1]):Math.max(0,size-Number(m[2]));const end=m[1]?(m[2]?Math.min(Number(m[2]),size-1):size-1):size-1;if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=size||end<start||(!m[1]&&Number(m[2])===0))return null;return{start,end};}
type Meta={name:string;size:number;type:string;file:string};
// Serialize only the metadata swap, not the potentially multi-GB upload.
const commits = new Map<string, Promise<void>>();
async function commitBackdrop<T>(key:string,operation:()=>Promise<T>):Promise<T>{
 const previous=commits.get(key)??Promise.resolve();
 let release!:()=>void;
 const current=new Promise<void>(resolve=>{release=resolve;});
 commits.set(key,current);
 await previous;
 try{return await operation();}finally{release();if(commits.get(key)===current)commits.delete(key);}
}
async function readMeta(path:string):Promise<Meta|null>{try{return JSON.parse(await readFile(path,'utf8'));}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return null;throw e;}}

const response=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
export async function backdropRequest(req:Request,code:string,env:AquariumEnv,dataDir:string){const url=new URL(req.url);if(req.method==='POST'&&req.headers.get('origin')!==url.origin)return response({error:'Open this aquarium directly before making changes.'},403);const auth=await aquariumRequest(new Request(`${url.origin}/api/aquariums/${code}`,{headers:{cookie:req.headers.get('cookie')||''}}),env);const state=await auth.json() as {role?:string};if(state.role!=='host')return response({error:'Only the host can manage the background video.'},403);const dir=resolve(dataDir,'backdrops',code);await mkdir(dir,{recursive:true,mode:0o700});const metaPath=resolve(dir,'current.json');const old=await readMeta(metaPath);
 const publicMeta=(m:Meta)=>({name:m.name,size:m.size,type:m.type,url:`/api/aquariums/${code}/backdrop/video`});
 if(req.method==='GET'&&url.pathname.endsWith('/backdrop'))return response(old?publicMeta(old):null);
 if(req.method==='GET'&&url.pathname.endsWith('/backdrop/video')){if(!old)return response({error:'No saved background video.'},404);const header=req.headers.get('range'),range=header?videoRange(header,old.size):null;if(header&&!range)return new Response(null,{status:416,headers:{'content-range':`bytes */${old.size}`}});const start=range?.start??0,end=range?.end??old.size-1;const stream=createReadStream(resolve(dir,old.file),{start,end});return new Response(Readable.toWeb(stream) as ReadableStream,{status:range?206:200,headers:{'content-type':old.type,'content-length':String(end-start+1),'accept-ranges':'bytes','cache-control':'private, no-store','x-content-type-options':'nosniff',...(range?{'content-range':`bytes ${start}-${end}/${old.size}`}:{})}});}
 if(req.method!=='POST'||!url.pathname.endsWith('/backdrop'))return response({error:'Method not allowed.'},405);
 const type=req.headers.get('content-type')?.split(';')[0]||'';if(!/^video\/[a-zA-Z0-9.+-]+$/.test(type)||!req.body)return response({error:'Choose a video file.'},400);const max=4*1024**3;if(Number(req.headers.get('content-length'))>max)return response({error:'Choose a video no larger than 4 GB.'},413);let name='Aquarium background';try{name=decodeURIComponent(req.headers.get('x-video-name')||name).replace(/[\u0000-\u001f]/g,'').slice(0,200);}catch{return response({error:'Invalid video name.'},400);}const id=crypto.randomUUID(),file=id+'.video',temp=resolve(dir,id+'.upload'),target=resolve(dir,file),metaTemp=resolve(dir,id+'.json');let size=0,committed=false;
 try{await pipeline(Readable.fromWeb(req.body as unknown as import('node:stream/web').ReadableStream<Uint8Array>),new Transform({transform(chunk,_encoding,callback){size+=chunk.length;callback(size>max?new Error('VIDEO_TOO_LARGE'):null,chunk);}}),createWriteStream(temp,{flags:'wx',mode:0o600}));if(size===0)throw new Error('EMPTY_VIDEO');await rename(temp,target);const meta={name,size,type,file};await writeFile(metaTemp,JSON.stringify(meta),{mode:0o600,flag:'wx'});await commitBackdrop(dir,async()=>{const previous=await readMeta(metaPath);await rename(metaTemp,metaPath);committed=true;if(previous)await unlink(resolve(dir,previous.file)).catch(()=>{});});return response(publicMeta(meta),201);}catch(e){const reason=(e as Error).message;return response({error:reason==='VIDEO_TOO_LARGE'?'Choose a video no larger than 4 GB.':'This video could not be saved. Check free disk space and reload to check the saved backdrop before retrying.'},reason==='VIDEO_TOO_LARGE'?413:500);}finally{await unlink(temp).catch(()=>{});await unlink(metaTemp).catch(()=>{});if(!committed)await unlink(target).catch(()=>{});}
}
