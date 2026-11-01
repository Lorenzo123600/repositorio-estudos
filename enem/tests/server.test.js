import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApp} from '../server/app.js';

test('contas, isolamento, sincronização entre dispositivos, conflitos e persistência',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'enem-test-')),dbPath=join(dir,'db.sqlite');let app,base;
 const start=async()=>{app=createApp({dbPath});await new Promise(r=>app.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+app.address().port;};
 const stop=()=>new Promise(r=>app.close(r));
 const call=async(path,{method='GET',body,cookie,origin=base,expectedUser}={})=>{const response=await fetch(base+'/api'+path,{method,headers:{'Content-Type':'application/json',Origin:origin,...(cookie?{Cookie:cookie}:{}),...(expectedUser?{'X-Study-User':expectedUser}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0],headers:response.headers};};
 try{
  await start();assert.equal((await call('/health')).status,200);assert.equal((await call('/progress')).status,401);
  assert.equal((await call('/register',{method:'POST',body:{email:'x',password:'short',name:'E'}})).status,400);
  const person={email:'estudo@example.com',name:'Estudante',password:'Senha forte 123!'};
  const reg=await call('/register',{method:'POST',body:person});assert.equal(reg.status,201);assert.match(reg.headers.get('set-cookie'),/HttpOnly; SameSite=Lax/);const cookie1=reg.cookie;
  const second=await call('/login',{method:'POST',body:person});assert.equal(second.status,200);const cookie2=second.cookie;
  assert.equal((await call('/login',{method:'POST',body:{...person,password:'Senha errada123'}})).status,401);
  const other=await call('/register',{method:'POST',body:{...person,email:'outra@example.com'}});assert.equal(other.status,201);
  assert.equal((await call('/me',{cookie:cookie1})).data.user.email,person.email);
  assert.equal((await call('/progress',{method:'PUT',cookie:cookie1,body:{revision:0,state:{done:[0],essay:'Meu texto'}}})).data.revision,1);
  assert.equal((await call('/progress',{cookie:cookie2})).data.state.essay,'Meu texto');
  assert.equal((await call('/progress',{cookie:other.cookie})).data.state,null);
  assert.equal((await call('/progress',{method:'PUT',cookie:other.cookie,expectedUser:reg.data.user.id,body:{revision:0,state:{essay:'de outra conta'}}})).status,401);
  assert.equal((await call('/progress',{method:'PUT',cookie:cookie2,body:{revision:0,state:{essay:'antigo'}}})).status,409);
  assert.equal((await call('/progress',{method:'PUT',cookie:cookie2,origin:'https://evil.test',body:{revision:1,state:{}}})).status,403);
  const racing=await Promise.all([1,2].map(i=>call('/progress',{method:'PUT',cookie:cookie1,body:{revision:1,state:{essay:'versão '+i}}})));assert.deepEqual(racing.map(r=>r.status).sort(),[200,409]);
  const updated=await call('/progress',{cookie:cookie2});assert.equal(updated.data.revision,2);
  await stop();await start();assert.deepEqual((await call('/progress',{cookie:cookie1})).data,updated.data);
  const pw=await call('/password',{method:'POST',cookie:cookie1,body:{currentPassword:person.password,password:'Minha nova senha123'}});assert.equal(pw.status,200);assert.equal((await call('/me',{cookie:cookie2})).status,401);
  assert.equal((await call('/login',{method:'POST',body:person})).status,401);
  assert.equal((await call('/logout',{method:'POST',cookie:pw.cookie,body:{}})).status,200);assert.equal((await call('/me',{cookie:pw.cookie})).status,401);
  assert.equal((await call('/register',{method:'POST',body:person})).status,409);
  assert.match(reg.data.recoveryCode,/^[a-f0-9]{48}$/);
  assert.equal((await call('/recover',{method:'POST',body:{email:person.email,password:'Senha recuperada123',code:'errado'}})).status,400);
  const recovered=await call('/recover',{method:'POST',body:{email:person.email,password:'Senha recuperada123',code:reg.data.recoveryCode}});assert.equal(recovered.status,200);assert.notEqual(recovered.data.recoveryCode,reg.data.recoveryCode);
  assert.equal((await call('/recover',{method:'POST',body:{email:person.email,password:'Senha recuperada123',code:reg.data.recoveryCode}})).status,400);
  assert.equal((await call('/progress',{cookie:recovered.cookie})).data.revision,2);
  const generated=await call('/recovery-code',{method:'POST',cookie:recovered.cookie,body:{currentPassword:'Senha recuperada123'}});assert.equal(generated.status,200);
  assert.equal((await call('/recover',{method:'POST',body:{email:person.email,password:'Outra senha nova123',code:recovered.data.recoveryCode}})).status,400);
  assert.equal((await call('/recover',{method:'POST',body:{email:person.email,password:'Outra senha nova123',code:generated.data.recoveryCode}})).status,200);
  assert.equal((await call('/me',{cookie:recovered.cookie})).status,401);

 }finally{if(app?.listening)await stop();rmSync(dir,{recursive:true,force:true});}
});
test('produção exige uma origem HTTPS explícita',()=>{assert.throws(()=>createApp({dbPath:':memory:',production:true}),/APP_ORIGIN/);assert.throws(()=>createApp({dbPath:':memory:',production:true,origin:'http://example.com'}),/HTTPS/);});
