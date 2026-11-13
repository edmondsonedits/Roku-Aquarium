import {build as buildClient} from 'vite';
import {build as bundle} from 'esbuild';
await buildClient({configFile:'vite.local.config.ts'});
await bundle({entryPoints:['standalone/server.ts'],outfile:'runtime/server.mjs',bundle:true,platform:'node',target:'node24',format:'esm',external:['node:*'],minify:false});
console.log('Standalone aquarium built: runtime/server.mjs + dist-local');
const {readdir,readFile,writeFile}=await import('node:fs/promises');
const {createHash}=await import('node:crypto');
async function entries(dir){const out=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=`${dir}/${e.name}`;if(e.isDirectory())out.push(...await entries(p));else out.push(p);}return out;}
const files={};
for(const p of ['runtime/server.mjs',...await entries('dist-local')].sort()) files[p]=createHash('sha256').update(await readFile(p)).digest('hex');
await writeFile('.aquarium-package.json',JSON.stringify({kind:'work-aquarium-app-v1',files},null,2)+'\n');
