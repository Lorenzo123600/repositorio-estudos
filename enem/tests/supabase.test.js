import test from 'node:test';
import assert from 'node:assert/strict';
import {createSupabaseTransport} from '../src/supabase-account.js';
const user={email_confirmed_at:'2026-11-01T12:00:00Z',id:'user-one',email:'teste@example.com',user_metadata:{name:'Estudante'}};
function mock(){const calls=[];return {calls,auth:{getUser:async()=>({data:{user}}),signUp:async body=>{calls.push(['signup',body]);return {data:{user,session:null}};},signInWithPassword:async body=>{calls.push(['login',body]);return {data:{user}};},resetPasswordForEmail:async(...args)=>{calls.push(['reset',...args]);return {data:{}};},updateUser:async body=>{calls.push(['password',body]);return {data:{user}};},signOut:async body=>{calls.push(['logout',body]);return {data:{}};}},rpc:async(name,args)=>{calls.push([name,args]);return {data:name==='load_enem_study_progress'?{state:{done:[0]},revision:3}:{revision:4}};}};}
test('Supabase: confirmação, login, recuperação e logout usam o serviço de autenticação',async()=>{
 const client=mock(),api=createSupabaseTransport(client,{redirectTo:'https://example.com/enem/'});
 assert.deepEqual(await api.request('/register',{body:JSON.stringify({email:' e@example.com ',name:' Nome ',password:'Senha segura123'})}),{requiresConfirmation:true});
 assert.equal(client.calls[0][1].options.emailRedirectTo,'https://example.com/enem/');
 assert.equal((await api.request('/login',{body:JSON.stringify({email:' e@example.com ',password:'Senha segura123'})})).user.id,user.id);
 assert.match((await api.request('/recover',{body:'{"email":"e@example.com"}'})).message,/link/);
 await api.request('/logout');assert.deepEqual(client.calls.at(-1),['logout',{scope:'local'}]);
});
test('Supabase: RPC preserva revisões e recusa mudança de conta em outra aba',async()=>{
 const client=mock(),api=createSupabaseTransport(client);
 assert.equal((await api.request('/progress')).revision,3);
 assert.equal((await api.request('/progress',{method:'PUT',body:'{"state":{"done":[0]},"revision":3}'})).revision,4);
 assert.deepEqual(client.calls.at(-1),['save_enem_study_progress',{p_state:{done:[0]},p_revision:3}]);
 await assert.rejects(api.request('/progress',{headers:{'X-Study-User':'other-user'}}),e=>e.status===401);
 client.rpc=async()=>({error:{code:'PT409',message:'conflict'}});await assert.rejects(api.request('/progress'),e=>e.status===409);
});
test('Supabase: link de recuperação permite nova senha sem exigir a antiga',async()=>{
 const client=mock(),api=createSupabaseTransport(client,{isRecovery:()=>true});await api.request('/password',{body:'{"password":"Nova senha segura123"}'});
 assert.deepEqual(client.calls,[['password',{password:'Nova senha segura123'}]]);
 const normal=createSupabaseTransport(client);await normal.request('/password',{body:'{"currentPassword":"antiga123456","password":"nova12345678"}'});assert.equal(client.calls.at(-2)[0],'login');
});
test('compilação recusa chaves administrativas antes de gerar qualquer bundle público',async()=>{
 const {validatePublicConfig}=await import('../scripts/public-config.mjs');const url='https://example.supabase.co';
 const jwt=role=>'eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({role})).toString('base64url')+'.example';
 assert.doesNotThrow(()=>validatePublicConfig({}));
 assert.doesNotThrow(()=>validatePublicConfig({VITE_SUPABASE_URL:url,VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test'}));
 assert.doesNotThrow(()=>validatePublicConfig({VITE_SUPABASE_URL:url,VITE_SUPABASE_PUBLISHABLE_KEY:jwt('anon')}));
 for(const key of ['sb_secret_test',jwt('service_role'),'invalid'])assert.throws(()=>validatePublicConfig({VITE_SUPABASE_URL:url,VITE_SUPABASE_PUBLISHABLE_KEY:key}));
 assert.throws(()=>validatePublicConfig({VITE_SUPABASE_URL:url}));
});

test('empacotamento Pages preserva strings literais do SDK e fecha scripts com segurança',async()=>{
 const {inlinePages}=await import('../scripts/inline-pages.mjs');const html='<script type="module" src="./assets/app.js"></script><link href="./assets/app.css" rel="stylesheet">';
 const js='const replacement = "$& $1"; const closing = "</script>";';
 const output=inlinePages(html,js,'.test::after{content:"$&"}');assert.ok(output.includes('"$& $1"'));assert.ok(output.includes('content:"$&"'));assert.ok(output.includes('<\\/script>'));assert.equal((output.match(/<script /g)||[]).length,1);
});

test('cadastro com sessão automática não abre conta e encerra a sessão recebida',async()=>{
 const client=mock();client.auth.signUp=async()=>({data:{user,session:{access_token:'test'}}});
 const api=createSupabaseTransport(client);assert.deepEqual(await api.request('/register',{body:JSON.stringify({name:'Nome',email:user.email,password:'Senha segura123'})}),{confirmationUnavailable:true});
 assert.deepEqual(client.calls,[['logout',{scope:'local'}]]);
});
test('contas sem confirmação não entram, não restauram sessão e não consultam progresso',async()=>{
 for(const path of ['/login','/me','/progress']){
  const client=mock(),unconfirmed={...user,email_confirmed_at:null};
  client.auth.getUser=async()=>({data:{user:unconfirmed}});client.auth.signInWithPassword=async()=>({data:{user:unconfirmed}});
  const api=createSupabaseTransport(client);await assert.rejects(api.request(path,{body:JSON.stringify({email:user.email,password:'Senha segura123'})}),e=>e.status===401&&/Confirme/.test(e.message));
  assert.deepEqual(client.calls,[['logout',{scope:'local'}]]);
 }
});
