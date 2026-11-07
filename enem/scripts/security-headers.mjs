import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

export function securityHeaders(supabaseUrl){
 const endpoint=new URL(supabaseUrl);
 if(endpoint.protocol!=='https:'||!endpoint.hostname.endsWith('.supabase.co')||endpoint.port)throw Error('Origem Supabase inválida para a política de segurança.');
 const csp=["default-src 'self'","base-uri 'self'","object-src 'none'","frame-ancestors 'none'","frame-src 'none'","script-src 'self'","script-src-attr 'none'","style-src 'self' 'unsafe-inline'","img-src 'self' data: blob: https:","font-src 'self' data:",`connect-src 'self' ${endpoint.origin} wss://${endpoint.hostname}`,"form-action 'self'"];
 return {
  'Content-Security-Policy':csp.join('; '),
  'X-Frame-Options':'DENY',
  'X-Content-Type-Options':'nosniff',
  'Referrer-Policy':'strict-origin-when-cross-origin',
  'Permissions-Policy':'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security':'max-age=31536000'
 };
}

export function cloudflareSecurityHeaders(supabaseUrl){
 let output;
 return {name:'cloudflare-security-headers',configResolved(config){output=resolve(config.root,config.build.outDir);},async closeBundle(){
  const headers=securityHeaders(supabaseUrl);
  await writeFile(resolve(output,'_headers'),'/*\n'+Object.entries(headers).map(([name,value])=>`  ${name}: ${value}`).join('\n')+'\n');
 }};
}
