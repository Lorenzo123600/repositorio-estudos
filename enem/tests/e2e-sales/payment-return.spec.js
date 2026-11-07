import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const content=JSON.parse(readFileSync(new URL('../../supabase/functions/_shared/study-content.json',import.meta.url),'utf8'));

async function buyer(page,{paid=true}={}){
 const state={paid};
 const uid='11111111-1111-4111-8111-111111111111',plan='33333333-3333-4333-8333-333333333333';
 const user={id:uid,aud:'authenticated',email:'buyer@example.test',email_confirmed_at:new Date().toISOString(),app_metadata:{provider:'email'},user_metadata:{name:'Estudante'},identities:[],created_at:new Date().toISOString()};
 const expires=Math.floor(Date.now()/1000)+3600;
 const jwt='eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({sub:uid,exp:expires,role:'authenticated'})).toString('base64url')+'.fixture';
 await page.addInitScript(session=>localStorage.setItem('enem-supabase-auth',JSON.stringify(session)),{access_token:jwt,refresh_token:'fixture-refresh',expires_in:3600,expires_at:expires,token_type:'bearer',user});
 await page.route('https://enem-test.supabase.co/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname;
  const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'*'};
  if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});
  let data;
  if(path.endsWith('/user'))data=user;
  else if(path.endsWith('/enem_access_status'))data=state.paid?[{payment_id:'fixture-payment',plan_id:plan,kind:'purchase',environment:'production',status:'active',activated_at:new Date(Date.now()-1000).toISOString(),expires_at:new Date(Date.now()+86400000).toISOString()}]:[];
  else if(path.endsWith('/enem_payment_plans'))data=[{id:plan,name:'Acesso completo',price:14.9,currency:'BRL',access_expires_at:'2027-01-01T03:00:00Z'}];
  else if(path.endsWith('/enem_payments'))data=[{id:'fixture-payment',plan_id:plan,status:state.paid?'approved':'pending',amount:14.9,currency:'BRL',environment:'production'}];
  else if(path.endsWith('/study-content')){
   if(!state.paid)return route.fulfill({status:403,json:{error:'paid_access_required'},headers});
   data=content;
  }else if(path.endsWith('/load_enem_study_progress'))data={state:{},revision:0};
  else throw Error('Unexpected request: '+path);
  await route.fulfill({json:data,headers});
 });
 return state;
}

test('approved payment return goes directly to studying without reopening payments',async({page})=>{
 await buyer(page);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/?payment_return=1');
 await expect(page.locator('.home-welcome')).toBeVisible();
 await expect.poll(()=>new URL(page.url()).searchParams.has('payment_return')).toBe(false);
 await expect(page.locator('#payments-dialog')).toHaveCount(0);
 await expect(page.locator('#content')).toBeFocused();
 expect(errors).toEqual([]);
});

test('pending return waits for server confirmation and closes when the page regains focus',async({page})=>{
 const state=await buyer(page,{paid:false});
 await page.goto('/?payment_return=1&payment_status=approved');
 await expect(page.locator('#payments-dialog[open]')).toBeVisible();
 await expect(page.locator('#payments-body')).toContainText('Pagamento pendente');
 await expect(page.locator('.home-welcome')).toHaveCount(0);
 state.paid=true;
 // Returning to the tab may confirm access and remove the modal before a click.
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await expect(page.locator('.home-welcome')).toBeVisible();
 await expect(page.locator('#payments-dialog')).toHaveCount(0);
});

test('active customers see purchase history and continue studying, without another buy button',async({page})=>{
 await buyer(page);await page.goto('/');await expect(page.locator('.home-welcome')).toBeVisible();
 await page.locator('#payments-open').click();
 await expect(page.locator('#payments-body')).toContainText('Seu acesso está ativo.');
 await expect(page.locator('#payments-body')).toContainText('Pagamento aprovado');
 await expect(page.locator('[data-buy-plan]')).toHaveCount(0);
 await page.locator('#payment-continue').click();
 await expect(page.locator('#payments-dialog')).toHaveCount(0);
 await expect(page.locator('#content')).toBeFocused();
});
