import {test,expect} from '@playwright/test';
import {readFileSync,readdirSync} from 'node:fs';
const content=JSON.parse(readFileSync(new URL('../../supabase/functions/_shared/study-content.json',import.meta.url),'utf8'));

test('commercial artifacts contain the demo but no full question bank, plans or essay prompts',()=>{
 const assets=new URL('../../dist/assets/',import.meta.url);
 const output=readdirSync(assets).filter(f=>f.endsWith('.js')).map(f=>readFileSync(new URL(f,assets),'utf8')).join('\n');
 for(const privateText of [content.activities.bank.at(-1).text,content.data.plan[1][2],content.essays.essayTopics.at(-1).guide]){
  expect(output).not.toContain(privateText.slice(0,70));
 }
 expect(output).toContain('__ENEM_CONTENT__');
});

test('public demo, authenticated content loading, saved progress and revocation',async({page})=>{
 const uid='11111111-1111-4111-8111-111111111111';
 const user={id:uid,aud:'authenticated',email:'buyer@example.test',email_confirmed_at:new Date().toISOString(),app_metadata:{provider:'email'},user_metadata:{name:'Estudante'},identities:[],created_at:new Date().toISOString()};
 const jwt='eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({sub:uid,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})).toString('base64url')+'.fixture';
 let access=[],contentRequests=0,writes=0;
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://enem-test.supabase.co/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'*'};
  if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers});
  let data;
  if(path.endsWith('/token'))data={access_token:jwt,refresh_token:'fixture-refresh',expires_in:3600,token_type:'bearer',user};
  else if(path.endsWith('/user'))data=user;
  else if(path.endsWith('/load_enem_study_progress'))data={state:{essay:'Meu rascunho anterior',answers:{91:1}},revision:0};
  else if(path.endsWith('/save_enem_study_progress')){writes++;data={revision:writes};}
  else if(path.endsWith('/enem_user_access'))data=access;
  else if(path.endsWith('/study-content')){
   expect(route.request().headers().authorization).toBe('Bearer '+jwt);contentRequests++;
   if(!access.some(a=>a.environment==='production'))return route.fulfill({status:403,json:{error:'paid_access_required'},headers});
   data=content;
  }else if(path.endsWith('/logout'))data={};
  else throw Error('Unexpected request: '+path);
  await route.fulfill({json:data,headers});
 });
 await page.setViewportSize({width:390,height:844});await page.goto('/?payment_status=approved');
 await expect(page.locator('#store-buy')).toBeVisible();expect(contentRequests).toBe(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator('#store-demo').click();await page.locator('[data-demo-answer="0"]').click();await page.locator('#demo-confirm').click();await expect(page.locator('.feedback')).toBeVisible();
 await page.locator('#demo-next').click();await page.locator('#demo-next').click();await expect(page.locator('#demo-next')).toHaveCount(0);expect(writes).toBe(0);expect(contentRequests).toBe(0);
 await page.locator('#store-login').click();await page.locator('#store-auth-form [name=email]').fill(user.email);await page.locator('#store-auth-form [name=password]').fill('Senha fixture123');await page.locator('#store-auth-form [type=submit]').click();await expect(page.locator('#store-auth')).toHaveCount(0);
 await expect(page.locator('#store-status')).toContainText('Seu acesso completo ainda não está ativo');expect(contentRequests).toBe(0);
 access=[{environment:'production',status:'active',activated_at:new Date(Date.now()-1000).toISOString(),expires_at:new Date(Date.now()+86400000).toISOString()}];
 await page.locator('#store-refresh').click();await expect(page.locator('#store-login')).toHaveCount(0);await expect(page.locator('.home-welcome')).toBeVisible();await page.locator('#mobile-menu').click();await page.locator('[data-tab="Redação"]').click();await expect(page.locator('#essay')).toHaveValue('Meu rascunho anterior');expect(contentRequests).toBe(1);
 access=[];await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(page.locator('.sale-offer')).toBeVisible();await expect(page.locator('#essay')).toHaveCount(0);expect(writes).toBe(0);expect(errors).toEqual([]);
});
