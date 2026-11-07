import {defineConfig,loadEnv} from 'vite';
import {validatePublicConfig} from './scripts/public-config.mjs';
import {commercialBuild} from './scripts/commercial-build.mjs';
import {cloudflareSecurityHeaders} from './scripts/security-headers.mjs';
export default defineConfig(({mode})=>{
 const env={...loadEnv(mode,process.cwd(),'VITE_'),...process.env};
 validatePublicConfig(env);
 const commercial=mode==='commercial'||process.env.CF_PAGES==='1';
 if(commercial&&(!env.VITE_SUPABASE_URL||!env.VITE_SUPABASE_PUBLISHABLE_KEY))throw Error('O build comercial exige a configuração pública do Supabase.');
 return {plugins:commercial?[commercialBuild(),cloudflareSecurityHeaders(env.VITE_SUPABASE_URL),{name:'commercial-entry',transformIndexHtml:{order:'pre',handler:html=>html.replace('/src/main.js','/src/entry.js')}}]:[],define:commercial?{'import.meta.env.VITE_PAID_EDITION':JSON.stringify('true')}:{},server:{proxy:{'/api':{target:'http://127.0.0.1:3000',changeOrigin:false}}}};
});
