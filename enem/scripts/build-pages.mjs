// Cloudflare serves normal ES modules; preserve relative chunk imports in the commercial edition.
if(process.env.CF_PAGES==='1'){console.log('Build comercial Cloudflare: chunks preservados em dist/.');process.exit(0);}
import {inlinePages} from './inline-pages.mjs';
import {readFile,writeFile} from 'node:fs/promises';
const html=await readFile('dist/index.html','utf8');
const jsPath=html.match(/<script[^>]+src="([^"]+)"[^>]*><\/script>/)?.[1];
const cssPath=html.match(/<link[^>]+href="([^"]+\.css)"[^>]*>/)?.[1];
if(!jsPath||!cssPath)throw new Error('Não foram encontrados os arquivos compilados.');
const assetPath=path=>'dist/assets/'+path.split('/').at(-1);
const js=await readFile(assetPath(jsPath),'utf8');
const css=await readFile(assetPath(cssPath),'utf8');
const standalone=inlinePages(html,js,css);
await writeFile('dist/index.html',standalone);
console.log('Publicação autocontida gerada em dist/index.html.');
