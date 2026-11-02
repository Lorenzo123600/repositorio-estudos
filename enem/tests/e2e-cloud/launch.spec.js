import {test,expect} from '@playwright/test';
const id='11111111-1111-4111-8111-111111111111';
const user={id,aud:'authenticated',email:'launch@example.com',email_confirmed_at:new Date().toISOString(),app_metadata:{provider:'email'},user_metadata:{name:'Teste'},identities:[],created_at:new Date().toISOString()};
const jwt='eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({sub:id,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})).toString('base64url')+'.test';
async function setup(page,{paid=false,expired=false,store={state:null,revision:0,premium:null}}={}){
 await page.route('https://enem-test.supabase.co/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname;let data={},status=200;
  if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'*'}});
  if(path.endsWith('/token'))data={access_token:jwt,refresh_token:'test',expires_in:3600,token_type:'bearer',user};
  else if(path.endsWith('/user'))data=user;
  else if(path.endsWith('/load_enem_study_progress'))data={state:store.state,revision:store.revision};
  else if(path.endsWith('/save_enem_study_progress')){store.state=req.postDataJSON().p_state;data={revision:++store.revision};}
  else if(path.endsWith('/enem_access'))data={premium:paid&&!expired,expiresAt:new Date(Date.now()+(expired?-1:1)*3600000).toISOString()};
  else if(path.endsWith('/save_enem_premium_progress')){store.premium=req.postDataJSON().p_state;data={revision:1};}
  else if(path.endsWith('/enem_has_premium'))data=paid&&!expired;
  else if(path.endsWith('/enem_premium_sessions')){
   if(req.method()==='POST'){store.premium=req.postDataJSON().data;data={id:'session'};}else data=store.premium?{data:store.premium}:null;
  }else if(path.endsWith('/logout'))data={};
  else throw Error('Unexpected '+path);
  await route.fulfill({status,json:data,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*'}});
 });return store;
}
async function login(page){await page.locator('#account-open').click();await page.locator('#account-form [name=email]').fill(user.email);await page.locator('#account-form [name=password]').fill('Teste123456789');await page.locator('#account-form button').click();await expect(page.locator('dialog h2')).toHaveText('Sua conta');await page.locator('#account-close').click();}
for(const width of [320,375,390,430,768,1024,1440])test(`mobile ${width}: visitante, modal, plano, questão e cronômetro`,async({page})=>{
 await page.setViewportSize({width,height:900});await setup(page,{paid:true});await page.goto('/#view=Plano+de+14+dias');
 await expect(page.locator('#required-login')).toBeVisible();
 await page.evaluate(()=>localStorage.setItem('premium','true'));await page.reload();await expect(page.locator('#required-login')).toBeVisible();
 await login(page);await expect(page.locator('[data-plan-unit="0"]')).toBeVisible();
 await page.locator('[data-plan-unit="0"]').click();await expect(page.locator('.plan-context')).toContainText('Organize sua largada');
 await page.reload();await expect(page.locator('.plan-context')).toContainText('Organize sua largada');
 await page.locator('#focus-toggle').click();await expect(page.locator('#focus-global-control')).toBeVisible();await page.locator('#focus-global-control').click();await page.locator('#focus-toggle').click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 if(width<=760){const timer=await page.locator('#focus-global-root').boundingBox(),nav=await page.locator('.mobile-bottom').boundingBox();expect(timer.y+timer.height).toBeLessThanOrEqual(nav.y);}
 const box=await page.locator('#back-to-plan').boundingBox();expect(box.height).toBeGreaterThanOrEqual(44);
 await page.locator('#back-to-plan').focus();await page.keyboard.press('Enter');await expect(page.locator('#plan-days')).toBeVisible();
 for(const view of ['Redação','Desafios','Simulados']){
  await page.goto('/#'+new URLSearchParams({view}));
  if(view==='Simulados'){await page.locator('#check-premium').click();await expect(page.locator('[data-start-exam="10"]')).toBeVisible();}
  else await expect(page.locator(view==='Redação'?'#essay':'.challenge-welcome')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),view).toBe(true);
 }
 if(width===320||width===1440)await page.screenshot({path:`/tmp/enem-${width}.png`,fullPage:true});
});
for(const mode of ['unpaid','expired','approved'])test(`premium ${mode}: URL direta e localStorage não concedem acesso`,async({page})=>{
 await setup(page,{paid:mode!=='unpaid',expired:mode==='expired'});await page.goto('/#view=Simulados');await login(page);
 await page.evaluate(()=>localStorage.setItem('enem-reta-final',JSON.stringify({premium:true,paid:true,activeExam:{ids:[1],deadline:9999999999999}})));
 await page.locator('#check-premium').click();
 if(mode==='approved'){await expect(page.locator('[data-start-exam="10"]')).toBeVisible();await page.locator('[data-start-exam="10"]').click();await expect(page.locator('#exam-clock')).toBeVisible();await expect(page.locator('#premium-sync')).toHaveText('Simulado sincronizado');await page.reload();await page.locator('#check-premium').click();await expect(page.locator('#exam-clock')).toBeVisible();}
 else {await expect(page.locator('#content')).toContainText('não possui um acesso premium vigente');await expect(page.locator('[data-start-exam]')).toHaveCount(0);}
});
test('plano: responder, concluir, recarregar e continuar em outro dispositivo',async({browser})=>{
 const store={state:null,revision:0,premium:null};const a=await browser.newPage(),b=await browser.newPage();await setup(a,{store});await setup(b,{store});
 await a.goto('/#view=Plano+de+14+dias');await login(a);await a.locator('[data-plan-unit="0"]').click();
 for(let i=0;i<10;i++){await a.locator('[data-answer="0"]').click();await a.locator('#confirm-answer').click();if(i<9)await a.locator('#next').click();}
 await a.locator('#complete-plan-unit').click();await expect(a.locator('[data-day="0"]')).toContainText('Concluído');await expect(a.locator('#storage-note')).toHaveText('Sincronizado com sua conta');
 await b.goto('/#view=Plano+de+14+dias');await login(b);await expect(b.locator('[data-day="0"]')).toContainText('Concluído');await b.reload();await expect(b.locator('[data-day="0"]')).toContainText('Concluído');await a.close();await b.close();
});
