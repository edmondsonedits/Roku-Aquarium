import {listenFailureMessage} from './startup-error';
import {createServer} from 'node:http';
import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import {hostname,homedir} from 'node:os';
import {resolve,extname,sep,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {openStorage} from './storage';
import {allowedHost,lanOrigins} from './network';
import {backdropRequest} from './video';
import {aquariumRequest,type AquariumEnv} from '../server/aquarium';
if(Number(process.versions.node.split('.')[0])<24)throw new Error('The Work Aquarium requires Node.js 24 or newer.');
export async function createAquariumServer(options:{port?:number;dataDir?:string;staticDir?:string}={}){
const args=process.argv;const portIndex=args.indexOf('--port');
const port=options.port??Number((portIndex>=0?args[portIndex+1]:undefined)||process.env.PORT||4317);if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT must be between 1 and 65535.');
const dataDir=resolve(options.dataDir||process.env.AQUARIUM_DATA_DIR||resolve(homedir(),'.work-aquarium'));
const staticRoot=options.staticDir?resolve(options.staticDir):resolve(dirname(fileURLToPath(import.meta.url)),'../dist-local');
const entry=await stat(resolve(staticRoot,'index.html')).catch(()=>null);
if(!entry?.isFile())throw new Error('The aquarium package is incomplete. Use Extract All on the full download and keep its folders together, or rebuild with npm run build:local. Your saved fish have not been changed.');
const storage=await openStorage(dataDir),env=storage as unknown as AquariumEnv;
const mime:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.woff2':'font/woff2'};
const server=createServer(async(incoming,outgoing)=>{try{
 const host=incoming.headers.host||'';if(!allowedHost(host,hostname())){outgoing.writeHead(403,{'content-type':'text/plain'});outgoing.end('Unrecognized host. Open the aquarium using this computer’s localhost or private LAN address.');return;}
 const url=new URL(incoming.url||'/',`http://${host}`);const headers=new Headers();for(const [key,value] of Object.entries(incoming.headers)){if(value)headers.set(key,Array.isArray(value)?value.join(','):value);}headers.set('cf-connecting-ip',incoming.socket.remoteAddress||'local');headers.delete('x-forwarded-host');headers.delete('x-forwarded-proto');headers.delete('forwarded');
 if(url.pathname.startsWith('/api/')){let response:Response;if(url.pathname==='/api/network'&&incoming.method==='GET')response=Response.json({origins:lanOrigins(port),hostname:hostname(),port},{headers:{'cache-control':'no-store'}});else{const request=new Request(url,{method:incoming.method,headers,...(!['GET','HEAD'].includes(incoming.method||'GET')?{body:Readable.toWeb(incoming),duplex:'half'}:{})} as RequestInit);const video=/^\/api\/aquariums\/([A-Z2-9]{6})\/backdrop(?:\/video)?$/.exec(url.pathname);response=video?await backdropRequest(request,video[1],env,dataDir):await aquariumRequest(request,env);}outgoing.writeHead(response.status,Object.fromEntries(response.headers.entries()));if(response.body)await pipeline(Readable.fromWeb(response.body as unknown as import('node:stream/web').ReadableStream<Uint8Array>),outgoing);else outgoing.end();return;}
 if(!['GET','HEAD'].includes(incoming.method||'')){outgoing.writeHead(405);outgoing.end();return;}
 let path=resolve(staticRoot,'.'+decodeURIComponent(url.pathname));if(path!==staticRoot&&!path.startsWith(staticRoot+sep)){outgoing.writeHead(403);outgoing.end();return;}let info=await stat(path).catch(()=>null);if(!info?.isFile()){if(extname(path)){outgoing.writeHead(404);outgoing.end('File not found');return;}path=resolve(staticRoot,'index.html');info=await stat(path).catch(()=>null);}if(!info){outgoing.writeHead(503,{'content-type':'text/plain'});outgoing.end('Build the aquarium first with npm run build:local.');return;}outgoing.writeHead(200,{'content-type':mime[extname(path)]||'application/octet-stream','content-length':info.size,'x-content-type-options':'nosniff','referrer-policy':'same-origin','cache-control':'no-cache'});if(incoming.method==='HEAD')outgoing.end();else await pipeline(createReadStream(path),outgoing);
 }catch(e){console.error('Local aquarium request failed',e);if(!outgoing.headersSent)outgoing.writeHead(500,{'content-type':'application/json'});outgoing.end(JSON.stringify({error:'The request could not be completed.'}));}});
server.requestTimeout=60*60*1000;server.headersTimeout=60000;
server.on('close',()=>storage.close());
return {server,port,dataDir};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
const {server,port,dataDir}=await createAquariumServer();
server.once('error',(error)=>{console.error(listenFailureMessage(error,port));process.exitCode=1;server.close();});
server.listen(port,'0.0.0.0',()=>{console.log(`The Work Aquarium: http://localhost:${port}`);console.log(`Phone addresses: ${lanOrigins(port).join(', ')||'No private LAN address detected'}`);console.log(`Saved fish and backgrounds: ${dataDir}`);});
for(const signal of ['SIGTERM','SIGINT'] as const)process.on(signal,()=>server.close(()=>process.exit(0)));
}
