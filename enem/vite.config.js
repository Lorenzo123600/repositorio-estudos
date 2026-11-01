import {defineConfig,loadEnv} from 'vite';
import {validatePublicConfig} from './scripts/public-config.mjs';
export default defineConfig(({mode})=>{
 validatePublicConfig({...loadEnv(mode,process.cwd(),'VITE_'),...process.env});
 return {server:{proxy:{'/api':{target:'http://127.0.0.1:3000',changeOrigin:false}}}};
});
