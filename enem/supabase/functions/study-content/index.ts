import {createClient} from 'npm:@supabase/supabase-js@2.118.0';
import {studyContentHandler} from '../_shared/study-content.js';
import payload from '../_shared/study-content.payload.json' with {type:'json'};

if(payload.encoding!=='gzip-base64')throw Error('invalid_study_content');
const bytes=Uint8Array.from(atob(payload.data),character=>character.charCodeAt(0));
const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
const json=await new Response(stream).text();
const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(json))),byte=>byte.toString(16).padStart(2,'0')).join('');
if(hash!==payload.sha256)throw Error('invalid_study_content');
const content=JSON.parse(json);

const url=Deno.env.get('SUPABASE_URL')!;
const service=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
Deno.serve(studyContentHandler({
 origin:Deno.env.get('PAYMENTS_APP_ORIGIN'),
 content,
 authenticate:async(token:string)=>{const {data,error}=await service.auth.getUser(token);return error?null:data.user;},
 hasAccess:async(token:string)=>{
  // This client executes with the student's verified JWT, never the service role.
  const client=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await client.rpc('enem_has_paid_access');
  if(error)throw Error('access_check_failed');
  return data===true;
 }
}));
