import {build as buildClient} from 'vite';
import {build as bundle} from 'esbuild';
await buildClient({configFile:'vite.local.config.ts'});
await bundle({entryPoints:['standalone/server.ts'],outfile:'runtime/server.mjs',bundle:true,platform:'node',target:'node24',format:'esm',external:['node:*'],minify:false});
console.log('Standalone aquarium built: runtime/server.mjs + dist-local');
