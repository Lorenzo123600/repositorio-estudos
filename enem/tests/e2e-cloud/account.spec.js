import {test,expect} from '@playwright/test';
// HTTP fixtures exercise the REAL Supabase SDK, without a hosted project or credentials.
const id='11111111-1111-4111-8111-111111111111';
const user={id,aud:'authenticated',email:'study@example.com',email_confirmed_at:new Date().toISOString(),app_metadata:{provider:'email'},user_metadata:{name:'Estudante'},identities:[],created_at:new Date().toISOString()};
const jwt='eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({sub:id,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})).toString('base64url')+'.test';
test('SDK Supabase: confirmação, login, progresso em duas sessões e recuperação por e-mail',async({browser})=>{
 let state=null,revision=0,resetRequested=false;const errors=[];
 async function setup(context){await context.route('https://enem-test.supabase.co/**',async route=>{
  const request=route.request(),path=new URL(request.url()).pathname;let data={},status=200;
  if(request.method()==='OPTIONS')return route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'*'}});
  if(path.endsWith('/signup'))data={user,session:null};
  else if(path.endsWith('/token'))data={access_token:jwt,refresh_token:'refresh-example',expires_in:3600,token_type:'bearer',user};
  else if(path.endsWith('/user'))data=user;
  else if(path.endsWith('/recover')){resetRequested=true;data={};}
  else if(path.endsWith('/load_enem_study_progress'))data={state,revision};
  else if(path.endsWith('/save_enem_study_progress')){const body=request.postDataJSON();if(body.p_revision!==revision){status=409;data={code:'PT409',message:'Conflict'};}else{state=body.p_state;data={revision:++revision};}}
  else if(path.endsWith('/enem_access_status'))data=[{environment:'production',status:'active',activated_at:new Date(Date.now()-1000).toISOString(),expires_at:new Date(Date.now()+86400000).toISOString()}];
  else if(path.endsWith('/logout'))data={};
  else throw Error('Unexpected cloud request: '+path);
  await route.fulfill({status,json:data,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*'}});
 });}
 const a=await browser.newContext(),b=await browser.newContext();await setup(a);await setup(b);const one=await a.newPage(),two=await b.newPage();one.on('pageerror',e=>errors.push(e.message));two.on('pageerror',e=>errors.push(e.message));
 async function login(page){await page.goto('/');await page.locator('#account-open').click();await page.locator('#account-form [name=email]').fill(user.email);await page.locator('#account-form [name=password]').fill('Senha de estudo123');await page.locator('#account-form button[name=action]').click();await expect(page.locator('dialog h2')).toHaveText('Sua conta');await page.locator('#account-close').click();}
 await one.goto('/');await one.locator('#account-open').click();await one.locator('[data-account-mode=register]').click();await one.locator('#register-form [name=name]').fill('Estudante');await one.locator('#register-form [name=email]').fill(user.email);await one.locator('#register-form [name=password]').fill('Senha de estudo123');await one.locator('#register-form button[name=action]').click();await expect(one.locator('#account-status')).toContainText('confirmação');await one.locator('#account-close').click();
 await login(one);await one.locator('[data-tab="Redação"]').click();await one.locator('#essay').fill('Minha redação no plano gratuito');await expect(one.locator('#storage-note')).toHaveText('Sincronizado com sua conta');
 // Browsing the carousel is presentation only: no progress RPC or account mutation.
 const savedRevision=revision,savedState=JSON.stringify(state);
 await one.locator('[data-tab="Plano de 14 dias"]').click();
 await one.getByLabel('Escolher dias exibidos').selectOption('7');
 await one.getByRole('button',{name:'Dias anteriores',exact:true}).click();
 await expect(one.locator('.plan-carousel')).toHaveAttribute('data-active-index','6');
 await one.waitForTimeout(900); // Beyond the account's 600ms save debounce.
 expect(revision).toBe(savedRevision);expect(JSON.stringify(state)).toBe(savedState);
 await one.locator('[data-tab="Redação"]').click();
 await login(two);await two.locator('[data-tab="Redação"]').click();await expect(two.locator('#essay')).toHaveValue('Minha redação no plano gratuito');
 await two.locator('#account-open').click();await expect(two.locator('#recovery-code-form')).toHaveCount(0);await two.locator('#account-logout').click();await two.locator('#account-open').click();await two.getByText('Esqueci minha senha',{exact:true}).click();await two.locator('#recover-form [name=email]').fill(user.email);await expect(two.locator('#recover-form [name=code]')).toHaveCount(0);await two.getByRole('button',{name:'Recuperar acesso',exact:true}).click();await expect(two.locator('#account-status')).toContainText('link');expect(resetRequested).toBe(true);
 await two.locator('#account-close').click();await two.goto('about:blank');await two.goto('/#access_token='+jwt+'&refresh_token=refresh-example&expires_in=3600&token_type=bearer&type=recovery');await expect(two.locator('#password-details')).toHaveAttribute('open','');await expect(two.locator('#password-form [name=currentPassword]')).toHaveCount(0);await two.locator('#password-form [name=password]').fill('Nova senha de estudo123');await two.getByRole('button',{name:'Salvar nova senha',exact:true}).click();await expect(two.locator('#account-status')).toContainText('Senha alterada');
 // Signing out in another tab must erase the old account's private UI immediately.
 const three=await a.newPage();await three.goto('/');await three.locator('#account-open').click();
 await expect(three.locator('#account-logout')).toBeVisible();await three.locator('#account-logout').click();
 await expect(one.locator('#essay')).toHaveCount(0);
 expect(await one.evaluate(()=>JSON.parse(localStorage.getItem('enem-reta-final')||'{}').essay||'')).toBe('');
 expect(errors).toEqual([]);await a.close();await b.close();
});
