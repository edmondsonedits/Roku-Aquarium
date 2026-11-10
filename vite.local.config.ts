import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
export default defineConfig({root:path.resolve('standalone'),plugins:[react()],build:{outDir:path.resolve('dist-local'),emptyOutDir:true,target:'es2022'},server:{fs:{allow:[process.cwd()]}}});
