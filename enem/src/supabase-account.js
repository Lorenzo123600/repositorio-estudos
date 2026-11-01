import {createClient} from '@supabase/supabase-js';
const error=(message,status=400)=>Object.assign(new Error(message),{status});
const profile=u=>({id:u.id,email:u.email,name:u.user_metadata?.name||u.email?.split('@')[0]||'Estudante'});
function check(result){
 if(!result.error)return result.data;
 const e=result.error;
 if(e.code==='PT409')throw error('Outro dispositivo atualizou seu progresso.',409);
 const messages={invalid_credentials:'E-mail ou senha incorretos.',email_not_confirmed:'Confirme seu e-mail antes de entrar.',over_email_send_rate_limit:'Aguarde alguns minutos antes de pedir outro e-mail.',user_already_exists:'Já existe uma conta com esse e-mail.'};
 throw error(messages[e.code]||e.message||'Não foi possível conectar à sua conta.',e.status||400);
}
// Injection keeps the provider boundary testable without a live project or keys.
export function createSupabaseTransport(client,{redirectTo,isRecovery=()=>false}={}){
 async function current(expected){
  const {user}=check(await client.auth.getUser());
  if(!user)throw error('Entre na sua conta para sincronizar.',401);
  if(expected&&user.id!==expected)throw error('A conta mudou em outra aba. Entre novamente; a cópia local foi preservada.',401);
  return user;
 }
 return {kind:'supabase',isRecovering:isRecovery,async request(path,options={}){
  const body=options.body?JSON.parse(options.body):{},expected=options.headers?.['X-Study-User'];
  if(path==='/register'){
   const data=check(await client.auth.signUp({email:body.email.trim(),password:body.password,options:{data:{name:body.name.trim()},emailRedirectTo:redirectTo}}));
   return data.session?{user:profile(data.user)}:{requiresConfirmation:true};
  }
  if(path==='/login'){const data=check(await client.auth.signInWithPassword({email:body.email.trim(),password:body.password}));return {user:profile(data.user)};}
  if(path==='/recover'){check(await client.auth.resetPasswordForEmail(body.email.trim(),{redirectTo}));return {message:'Se o endereço estiver cadastrado, você receberá um link para definir uma nova senha. Confira também o spam.'};}
  const user=await current(expected);
  if(path==='/me')return {user:profile(user)};
  if(path==='/logout'){check(await client.auth.signOut({scope:'local'}));return {ok:true};}
  if(path==='/password'){
   if(!isRecovery())check(await client.auth.signInWithPassword({email:user.email,password:body.currentPassword}));
   check(await client.auth.updateUser({password:body.password}));return {ok:true};
  }
  if(path==='/progress'){
   if(options.method==='PUT')return check(await client.rpc('save_study_progress',{p_state:body.state,p_revision:body.revision}));
   return check(await client.rpc('load_study_progress'));
  }
  throw error('Operação indisponível.',404);
 }};
}
export function configuredSupabase(){
 const env=import.meta.env||{},url=env.VITE_SUPABASE_URL,key=env.VITE_SUPABASE_PUBLISHABLE_KEY;
 if(!url&&!key)return null;
 if(!url||!key)throw error('O serviço de contas ainda não está configurado.',503);
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url))throw error('Endereço do serviço de contas inválido.',503);
 // Only the public publishable/legacy anon key belongs in a browser bundle.
 if(key.startsWith('sb_secret_'))throw error('Use a chave pública do projeto para conectar o aplicativo.',503);
 if(!key.startsWith('sb_publishable_')){
  try{const payload=JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));if(payload.role!=='anon')throw Error();}catch{throw error('A chave configurada não é uma chave pública anon/publishable.',503);}
 }
 let recovery=new URLSearchParams(window.location.hash.slice(1)).get('type')==='recovery';
 const client=createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'enem-supabase-auth'}});
 client.auth.onAuthStateChange(event=>{if(event==='PASSWORD_RECOVERY')recovery=true;if(event==='SIGNED_OUT')recovery=false;});
 return createSupabaseTransport(client,{redirectTo:window.location.origin+window.location.pathname,isRecovery:()=>recovery});
}
