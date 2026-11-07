import {test,expect} from '@playwright/test';

async function authFixture(page,{signupError=false}={}){
 const uid='11111111-1111-4111-8111-111111111111';
 const user={id:uid,aud:'authenticated',email:'student@example.test',email_confirmed_at:new Date().toISOString(),app_metadata:{provider:'email'},user_metadata:{name:'Estudante'},identities:[],created_at:new Date().toISOString()};
 const jwt='eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({sub:uid,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})).toString('base64url')+'.fixture';
 const calls=[];
 await page.route('https://enem-test.supabase.co/**',async route=>{
  const request=route.request(),path=new URL(request.url()).pathname;
  const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'*','X-Supabase-Api-Version':'2024-01-01','Access-Control-Expose-Headers':'X-Supabase-Api-Version'};
  if(request.method()==='OPTIONS')return route.fulfill({status:204,headers});
  calls.push(path);
  if(path.endsWith('/signup'))return route.fulfill({status:signupError?429:200,headers,json:signupError?{code:'over_email_send_rate_limit',msg:'Email rate limit exceeded'}:{user:{...user,email_confirmed_at:null},session:null}});
  let data;
  if(path.endsWith('/recover'))data={};
  else if(path.endsWith('/token'))data={access_token:jwt,refresh_token:'fixture-refresh',expires_in:3600,token_type:'bearer',user};
  else if(path.endsWith('/user'))data=user;
  else if(path.endsWith('/enem_access_status'))data=[];
  else if(path.endsWith('/enem_payment_plans'))data=[{id:'enem-2026',name:'Edição ENEM 2026',price:14.9,currency:'BRL',access_expires_at:'2027-01-01T02:59:00Z'}];
  else if(path.endsWith('/enem_payments'))data=[];
  else throw Error('Unexpected request: '+path);
  await route.fulfill({json:data,headers});
 });
 return {calls,user};
}
async function register(page){
 await page.locator('#store-login').click();
 await page.locator('[data-auth="register"]').click();
 await page.locator('[name=name]').fill('Estudante');
 await page.locator('[name=email]').fill('student@example.test');
 await page.locator('[name=password]').fill('Senha fixture123');
 await page.locator('#store-auth-form [type=submit]').click();
}

test('registration becomes a visible confirmation step and continues to login without repeating signup',async({page})=>{
 const {calls,user}=await authFixture(page);
 await page.setViewportSize({width:390,height:844});await page.goto('/');await register(page);
 await expect(page.getByRole('heading',{name:'Confirme seu e-mail',exact:true})).toBeVisible();
 await expect(page.locator('#store-auth-next-title')).toBeFocused();
 await expect(page.locator('#store-auth-next-title')).toBeInViewport();
 await expect(page.locator('#store-auth-form')).toBeHidden();
 await expect(page.locator('#store-auth-step')).toContainText('Spam ou Lixo eletrônico');
 await expect(page.locator('#store-auth-step')).toContainText(user.email);
 await expect(page.locator('#store-auth-continue')).toBeInViewport();
 await page.screenshot({path:'/tmp/enem-auth-confirmation-mobile.png'});
 await page.locator('#store-auth-continue').click();
 await expect(page.locator('[data-auth="login"]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('[name=email]')).toHaveValue(user.email);
 await expect(page.locator('[name=password]')).toBeFocused();
 await page.locator('[name=password]').fill('Senha fixture123');
 await page.locator('#store-auth-form [type=submit]').click();
 await expect(page.locator('#store-auth')).toHaveCount(0);
 await expect(page.locator('#store-account-welcome')).toBeVisible();
 expect(calls.filter(p=>p.endsWith('/signup'))).toHaveLength(1);
 expect(calls.some(p=>p.endsWith('/token'))).toBe(true);
});

test('already have an account opens login after a closed registration dialog',async({page})=>{
 await authFixture(page);await page.goto('/');await page.locator('#store-login').click();
 await page.locator('[data-auth="register"]').click();await page.locator('#store-auth-close').click();await page.locator('#store-access').click();
 await expect(page.locator('#store-auth-title')).toHaveText('Entre na sua conta');
 await expect(page.locator('#store-auth-form [type=submit]')).toHaveText('Entrar');
 await expect(page.locator('[name=name]')).toHaveCount(0);
});

test('email rate limit is prominent, focused, and does not automatically repeat registration',async({page})=>{
 const {calls}=await authFixture(page,{signupError:true});await page.goto('/');await register(page);
 await expect(page.locator('#store-auth-status')).toContainText('Aguarde alguns minutos');
 await expect(page.locator('#store-auth-status')).toBeFocused();
 await expect(page.locator('#store-auth-status')).toBeInViewport();
 await expect(page.locator('#store-auth-form [type=submit]')).toBeEnabled();
 expect(calls.filter(p=>p.endsWith('/signup'))).toHaveLength(1);
});

test('confirmation lets the student correct the email without sending another request',async({page})=>{
 const {calls}=await authFixture(page);await page.goto('/');await register(page);await page.locator('#store-auth-edit-email').click();
 await expect(page.locator('[name=email]')).toBeFocused();
 await expect(page.locator('[name=email]')).toHaveValue('student@example.test');
 await expect(page.locator('[name=name]')).toHaveValue('Estudante');
 await expect(page.locator('[name=password]')).toHaveValue('');
 expect(calls.filter(p=>p.endsWith('/signup'))).toHaveLength(1);
});

test('password recovery explains the email step without disclosing whether an account exists',async({page})=>{
 await authFixture(page);await page.goto('/');await page.locator('#store-login').click();await page.locator('[data-auth="recover"]').click();
 await page.locator('[name=email]').fill('student@example.test');await page.locator('#store-auth-form [type=submit]').click();
 await expect(page.locator('#store-auth-step')).toContainText('Se houver uma conta');
 await expect(page.locator('#store-auth-step')).toContainText('Spam ou Lixo eletrônico');
 await expect(page.locator('#store-auth-form')).toBeHidden();
});

test('login from payment returns the student to available plans',async({page})=>{
 await authFixture(page);await page.goto('/');await page.locator('#store-buy').click();await page.locator('#payment-login').click();
 await page.locator('[name=email]').fill('student@example.test');await page.locator('[name=password]').fill('Senha fixture123');await page.locator('#store-auth-form [type=submit]').click();
 await expect(page.locator('#payments-dialog[open]')).toBeVisible();await expect(page.locator('[data-buy-plan]')).toHaveCount(1);
});

test('registration fits a short desktop window and narrow mobile without a visible scrollbar',async({page})=>{
 await authFixture(page);await page.setViewportSize({width:1356,height:600});await page.goto('/');await page.locator('#store-login').click();await page.locator('[data-auth="register"]').click();
 await expect(page.locator('#store-auth-form [type=submit]')).toBeInViewport();
 expect(await page.locator('#store-auth').evaluate(e=>({fits:e.scrollHeight<=e.clientHeight,scrollbar:getComputedStyle(e).scrollbarWidth}))).toEqual({fits:true,scrollbar:'none'});
 await page.screenshot({path:'/tmp/enem-auth-register-desktop.png'});
 await page.setViewportSize({width:320,height:640});
 await expect(page.locator('#store-auth-form [type=submit]')).toBeInViewport();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
