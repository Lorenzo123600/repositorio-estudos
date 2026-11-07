import {test,expect} from '@playwright/test';
const uid='11111111-1111-4111-8111-111111111111',plan='33333333-3333-4333-8333-333333333333';
const user={id:uid,aud:'authenticated',email:'payment@example.test',email_confirmed_at:new Date().toISOString(),app_metadata:{provider:'email'},user_metadata:{name:'Estudante'},identities:[],created_at:new Date().toISOString()};
const jwt='eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({sub:uid,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})).toString('base64url')+'.fixture';
test('planos: login, retry idempotente, retorno não confiável, recarga e outro dispositivo (serviços simulados)',async({browser})=>{
 let status='pending',attempts=[],hasAccess=false;const errors=[];
 async function prepare(context){
  await context.route('https://enem-test.supabase.co/**',async route=>{
   const req=route.request(),url=new URL(req.url()),path=url.pathname;let data={},code=200;
   if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'*'}});
   if(path.endsWith('/token'))data={access_token:jwt,refresh_token:'refresh-fixture',expires_in:3600,token_type:'bearer',user};
   else if(path.endsWith('/user'))data=user;
   else if(path.endsWith('/load_enem_study_progress'))data={state:{},revision:0};
   else if(path.endsWith('/enem_payment_plans'))data=[{id:plan,name:'Plano de teste',price:14.90,currency:'BRL',duration_days:null,access_expires_at:'2027-01-01T03:00:00Z'}];
   else if(path.endsWith('/enem_payments'))data=attempts.length?[{id:'payment',user_id:uid,plan_id:plan,idempotency_key:attempts[0].idempotency_key,amount:10,currency:'BRL',environment:'production',status}]:[];
   else if(path.endsWith('/enem_access_status'))data=hasAccess?[{payment_id:'payment',plan_id:plan,environment:'production',status:'active',activated_at:new Date(Date.now()-1000).toISOString(),expires_at:new Date(Date.now()+86400000).toISOString()}]:[];
   else if(path.endsWith('/create-mercadopago-order')){
    expect(req.headers().authorization).toBe('Bearer '+jwt);const body=req.postDataJSON();expect(Object.keys(body).sort()).toEqual(['idempotency_key','plan_id']);attempts.push(body);
    if(attempts.length===1){code=503;data={error:'provider_unavailable'};}else data={payment_id:'payment',environment:'test',checkout_url:'https://www.mercadopago.com.br/checkout/v1/redirect?order_id=ORDTSTfixture'};
   }else throw Error('Unexpected request: '+path);
   await route.fulfill({status:code,json:data,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*'}});
  });
  await context.route('https://www.mercadopago.com.br/checkout/**',route=>route.fulfill({body:'<html><title>Checkout simulado</title><p>Fixture sem cobrança</p></html>',contentType:'text/html'}));
 }
 async function login(page){await page.goto('/');await page.locator('#account-open').click();await page.locator('#account-form [name=email]').fill(user.email);await page.locator('#account-form [name=password]').fill('Senha fixture123');await page.locator('#account-form button[name=action]').click();await expect(page.locator('#account-title')).toHaveText('Sua conta');await page.locator('#account-close').click();}
 const a=await browser.newContext({viewport:{width:390,height:844}});await prepare(a);const one=await a.newPage();one.on('pageerror',e=>errors.push(e.message));
 await one.goto('/?payment_return=1&payment_status=approved');await expect(one.locator('#payments-body')).toContainText('Entre na sua conta');await expect(one.locator('.public-plan-price')).toHaveText('R$ 14,90');await one.locator('#payment-login').click();await expect(one.locator('#account-dialog')).toBeVisible();await one.locator('#account-close').click();
 await login(one);await one.locator('#payments-open').click();await expect(one.locator('#payments-body')).toContainText('Acesso até 31/12/2026');await one.locator('[data-buy-plan]').click();await expect(one.locator('#payment-message')).toContainText('Tente novamente');await one.locator('[data-buy-plan]').click();await expect(one).toHaveTitle('Checkout simulado');expect(attempts).toHaveLength(2);expect(attempts[0]).toEqual(attempts[1]);
 await one.goto('/?payment_return=1&payment_status=approved');await expect(one.locator('#payments-body')).toContainText('Pagamento pendente');expect(new URL(one.url()).searchParams.has('payment_return')).toBe(false);await expect(one.locator('#payments-body')).toContainText('Seu acesso completo ainda não está ativo');
 status='approved';hasAccess=true;await one.locator('#payment-refresh').click();await expect(one.locator('#payments-dialog')).toHaveCount(0);await one.locator('#payments-open').click();await expect(one.locator('#payments-body')).toContainText('Seu acesso está ativo');await expect(one.locator('#payments-body')).toContainText('Pagamento aprovado');await expect(one.locator('[data-buy-plan]')).toHaveCount(0);
 await one.reload();await expect(one.locator('#storage-note')).toContainText('Sincronizado');await one.locator('#payments-open').click();await expect(one.locator('#payments-body')).toContainText('Seu acesso está ativo');expect(await one.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const b=await browser.newContext();await prepare(b);const two=await b.newPage();await login(two);await two.locator('#payments-open').click();await expect(two.locator('#payments-body')).toContainText('Seu acesso está ativo');
 for(const [state,label] of [['rejected','Pagamento recusado'],['cancelled','Pagamento cancelado'],['refunded','Pagamento reembolsado']]){status=state;hasAccess=false;await two.locator('#payment-refresh').click();await expect(two.locator('#payments-body')).toContainText(label);await expect(two.locator('#payments-body')).toContainText('Seu acesso completo ainda não está ativo');}
 expect(errors).toEqual([]);await a.close();await b.close();
});
