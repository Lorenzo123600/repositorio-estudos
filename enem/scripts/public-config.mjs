export function validatePublicConfig(env){
 const url=env.VITE_SUPABASE_URL,key=env.VITE_SUPABASE_PUBLISHABLE_KEY;
 if(!url&&!key)return;
 if(!url||!key)throw Error('Defina as duas variáveis públicas do Supabase.');
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url))throw Error('VITE_SUPABASE_URL deve ser a URL HTTPS do projeto Supabase.');
 if(/^sb_publishable_[A-Za-z0-9_-]+$/.test(key))return;
 try{const payload=JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString());if(payload.role==='anon')return;}catch{}
 throw Error('VITE_SUPABASE_PUBLISHABLE_KEY deve conter somente a chave pública publishable/anon. Chaves secret/service_role são proibidas no frontend.');
}
