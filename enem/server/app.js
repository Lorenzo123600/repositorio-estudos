import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes, scrypt as derive, timingSafeEqual, createHash} from 'node:crypto';
import {promisify} from 'node:util';
import {mkdirSync, readFileSync, existsSync, statSync} from 'node:fs';
import {dirname, resolve, extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const scrypt=promisify(derive), root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const hash=s=>createHash('sha256').update(s).digest('hex');
export function createApp({dbPath=process.env.DATABASE_PATH||resolve(root,'var/enem.sqlite'),production=process.env.NODE_ENV==='production',origin=process.env.APP_ORIGIN}={}){
 if(production&&!origin)throw new Error('APP_ORIGIN é obrigatório em produção (origem HTTPS pública).');
 if(production&&new URL(origin).protocol!=='https:')throw new Error('APP_ORIGIN deve usar HTTPS em produção.');
 mkdirSync(dirname(dbPath),{recursive:true});
 const db=new DatabaseSync(dbPath);db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
 CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,name TEXT NOT NULL,password TEXT NOT NULL,created_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS recovery(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,token TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS progress(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,data TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 0);
 `);
 const attempts=new Map();
 const send=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 const limited=req=>{const key=req.socket.remoteAddress;const now=Date.now();for(const [k,v] of attempts)if(v.until<now)attempts.delete(k);let v=attempts.get(key);if(!v){v={count:0,until:now+15*60000};attempts.set(key,v);}return ++v.count>30;};
 const body=async req=>{let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>1024*1024)throw Object.assign(new Error('Dados excedem 1 MB.'),{status:413});}try{return JSON.parse(raw||'{}');}catch{throw Object.assign(new Error('JSON inválido.'),{status:400});}};
 const publicUser=u=>({id:u.id,email:u.email,name:u.name});
 const session=(req)=>{const token=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('enem_session='))?.slice(13);if(!token||!/^[a-f0-9]{64}$/.test(token))return null;return db.prepare('SELECT users.* FROM sessions JOIN users ON users.id=sessions.user_id WHERE token=? AND expires>?').get(hash(token),Date.now());};
 const cookie=(res,token,maxAge)=>res.setHeader('Set-Cookie',`enem_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${production?'; Secure':''}`);
 const newSession=(res,id)=>{const token=randomBytes(32).toString('hex');db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hash(token),id,Date.now()+30*86400000);cookie(res,token,30*86400);};
 async function passwordHash(password){const salt=randomBytes(16).toString('hex');return salt+':'+Buffer.from(await scrypt(password,salt,64)).toString('hex');}
 async function verify(password,stored){const [salt,key]=stored.split(':');const candidate=await scrypt(password,salt,64);return timingSafeEqual(Buffer.from(key,'hex'),candidate);}
 function validPassword(p){return typeof p==='string'&&p.length>=10&&p.length<=128;}
 const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
  try{
   const url=new URL(req.url,'http://localhost'),path=url.pathname;
   if(!path.startsWith('/api/')){
    if(!['GET','HEAD'].includes(req.method))return send(res,405,{error:'Método inválido.'});
    const dist=resolve(root,'dist'),file=resolve(dist,'.'+decodeURIComponent(path==='/'?'/index.html':path));
    if(!file.startsWith(dist+'/')||!existsSync(file)||!statSync(file).isFile())return send(res,404,{error:'Página não encontrada. Execute npm run build.'});
    const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'};
    res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});return res.end(req.method==='HEAD'?undefined:readFileSync(file));
   }
   if(!['GET','HEAD'].includes(req.method)){
    const allowed=origin||`http://${req.headers.host}`;
    if(req.headers.origin!==allowed||!req.headers['content-type']?.startsWith('application/json'))return send(res,403,{error:'Origem da requisição inválida.'});
   }
   if(path==='/api/health'&&req.method==='GET'){db.prepare('SELECT 1').get();return send(res,200,{ok:true});}
   if(['/api/register','/api/login','/api/recover'].includes(path)&&req.method==='POST'){
    if(limited(req))return send(res,429,{error:'Muitas tentativas. Aguarde 15 minutos.'});
    const b=await body(req),email=typeof b.email==='string'?b.email.trim().toLowerCase():'';
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||!validPassword(b.password))return send(res,400,{error:'Informe e-mail válido e senha de 10 a 128 caracteres.'});
    if(path==='/api/recover'){
     const u=db.prepare('SELECT users.* FROM users JOIN recovery ON users.id=recovery.user_id WHERE email=? AND recovery.token=?').get(email,hash(typeof b.code==='string'?b.code.trim():''));
     if(!u)return send(res,400,{error:'E-mail ou código de recuperação inválido.'});
     const password=await passwordHash(b.password),code=randomBytes(24).toString('hex');
     // Consume the code atomically even when two recovery requests arrive together.
     db.exec('BEGIN IMMEDIATE');
     try{const result=db.prepare('UPDATE recovery SET token=? WHERE user_id=? AND token=?').run(hash(code),u.id,hash(b.code.trim()));
      if(!result.changes){db.exec('ROLLBACK');return send(res,400,{error:'Código já utilizado.'});}
      db.prepare('UPDATE users SET password=? WHERE id=?').run(password,u.id);db.prepare('DELETE FROM sessions WHERE user_id=?').run(u.id);db.exec('COMMIT');
     }catch(e){db.exec('ROLLBACK');throw e;}
     newSession(res,u.id);return send(res,200,{user:publicUser(u),recoveryCode:code});
    }
    if(path==='/api/register'){
     const name=typeof b.name==='string'?b.name.trim():'';if(!name||name.length>80)return send(res,400,{error:'Informe seu nome (até 80 caracteres).'});
     const password=await passwordHash(b.password),id=randomBytes(16).toString('hex');
     try{db.prepare('INSERT INTO users VALUES(?,?,?,?,?)').run(id,email,name,password,Date.now());}catch(e){if(e.errcode===2067||e.errcode===1555||e.code?.includes('CONSTRAINT'))return send(res,409,{error:'Não foi possível criar a conta com esse e-mail.'});throw e;}
     const recoveryCode=randomBytes(24).toString('hex');db.prepare('INSERT INTO recovery VALUES(?,?)').run(id,hash(recoveryCode));newSession(res,id);return send(res,201,{user:{id,email,name},recoveryCode});
    }
    const u=db.prepare('SELECT * FROM users WHERE email=?').get(email);
    // Equal-cost verification for unknown users avoids an immediate timing oracle.
    const stored=u?.password||'00000000000000000000000000000000:'+ '0'.repeat(128);
    if(!await verify(b.password,stored)||!u)return send(res,401,{error:'E-mail ou senha incorretos.'});
    newSession(res,u.id);return send(res,200,{user:publicUser(u)});
   }
   const user=session(req);if(!user)return send(res,401,{error:'Entre na sua conta para sincronizar.'});
   if(req.headers['x-study-user']&&req.headers['x-study-user']!==user.id)return send(res,401,{error:'A conta mudou em outra aba. Entre novamente; suas alterações locais foram preservadas.'});
   if(path==='/api/me'&&req.method==='GET')return send(res,200,{user:publicUser(user)});
   if(path==='/api/logout'&&req.method==='POST'){
    const token=(req.headers.cookie||'').match(/(?:^|;\s*)enem_session=([a-f0-9]{64})/)?.[1];if(token)db.prepare('DELETE FROM sessions WHERE token=?').run(hash(token));cookie(res,'',0);return send(res,200,{ok:true});
   }
   if(path==='/api/recovery-code'&&req.method==='POST'){
    if(limited(req))return send(res,429,{error:'Muitas tentativas. Aguarde 15 minutos.'});
    const b=await body(req);if(typeof b.currentPassword!=='string'||b.currentPassword.length>128||!await verify(b.currentPassword,user.password))return send(res,400,{error:'Senha atual incorreta.'});
    const recoveryCode=randomBytes(24).toString('hex');db.prepare('INSERT INTO recovery VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET token=excluded.token').run(user.id,hash(recoveryCode));return send(res,200,{recoveryCode});
   }
   if(path==='/api/password'&&req.method==='POST'){
    if(limited(req))return send(res,429,{error:'Muitas tentativas. Aguarde 15 minutos.'});
    const b=await body(req);if(!validPassword(b.password)||typeof b.currentPassword!=='string'||b.currentPassword.length>128||!await verify(b.currentPassword,user.password))return send(res,400,{error:'Confira a senha atual e use uma nova senha de 10 a 128 caracteres.'});
    db.prepare('UPDATE users SET password=? WHERE id=?').run(await passwordHash(b.password),user.id);db.prepare('DELETE FROM sessions WHERE user_id=?').run(user.id);newSession(res,user.id);return send(res,200,{ok:true});
   }
   if(path==='/api/progress'&&req.method==='GET'){
    const row=db.prepare('SELECT data,revision FROM progress WHERE user_id=?').get(user.id);return send(res,200,{state:row?JSON.parse(row.data):null,revision:row?.revision||0});
   }
   if(path==='/api/progress'&&req.method==='PUT'){
    const b=await body(req);if(!b.state||typeof b.state!=='object'||Array.isArray(b.state)||!Number.isSafeInteger(b.revision)||b.revision<0)return send(res,400,{error:'Progresso inválido.'});
    // One transaction: competing devices can never silently overwrite a newer revision.
    db.exec('BEGIN IMMEDIATE');try{
     const row=db.prepare('SELECT revision FROM progress WHERE user_id=?').get(user.id);
     if((row?.revision||0)!==b.revision){db.exec('ROLLBACK');return send(res,409,{error:'Outro dispositivo atualizou seu progresso. Escolha qual versão manter.'});}
     db.prepare('INSERT INTO progress VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data,revision=excluded.revision').run(user.id,JSON.stringify(b.state),b.revision+1);db.exec('COMMIT');
    }catch(e){db.exec('ROLLBACK');throw e;}
    return send(res,200,{revision:b.revision+1});
   }
   send(res,404,{error:'Rota não encontrada.'});
  }catch(e){send(res,e.status||500,{error:e.status?e.message:'Não foi possível concluir. Tente novamente.'});}
 });
 server.on('close',()=>db.close());return server;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const port=Number(process.env.PORT||3000);createApp().listen(port,'0.0.0.0',()=>console.log(`Reta Final ENEM: porta ${port}`));}
