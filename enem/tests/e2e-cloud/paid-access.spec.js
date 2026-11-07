import {test,expect} from '@playwright/test';

test('demo preserves progress; only a current production purchase unlocks study',async({page})=>{
 const uid='11111111-1111-4111-8111-111111111111';
 const user={id:uid,aud:'authenticated',email:'demo@example.test',email_confirmed_at:new Date().toISOString(),app_metadata:{provider:'email'},user_metadata:{name:'Estudante'},identities:[],created_at:new Date().toISOString()};
 const jwt='eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({sub:uid,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})).toString('base64url')+'.fixture';
 let access=[],writes=0;
 await page.route('https://enem-test.supabase.co/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'*'};
  if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers});
  let data;
  if(path.endsWith('/token'))data={access_token:jwt,refresh_token:'fixture-refresh',expires_in:3600,token_type:'bearer',user};
  else if(path.endsWith('/user'))data=user;
  else if(path.endsWith('/load_enem_study_progress'))data={state:{essay:'Rascunho preservado'},revision:0};
  else if(path.endsWith('/save_enem_study_progress')){writes++;data={revision:writes};}
  else if(path.endsWith('/enem_access_status'))data=access;
  else if(path.endsWith('/logout'))data={};
  else throw Error('Unexpected request: '+path);
  await route.fulfill({json:data,headers});
 });
 await page.goto('/?payment_status=approved');
 await expect(page.locator('.sale-offer')).toContainText('R$ 14,90');
 await page.locator('[data-tab="Redação"]').click();await expect(page.locator('#essay')).toHaveCount(0);
 await page.locator('#offer-demo').click();
 await expect(page.locator('#content')).toContainText('Questão 1 de 10');
 await page.locator('[data-demo-answer="0"]').click();await page.locator('#demo-confirm').click();await expect(page.locator('.feedback')).toBeVisible();
 await page.waitForTimeout(11000);await expect(page.locator('.feedback')).toBeVisible();
 for(let i=0;i<9;i++)await page.locator('#demo-next').click();await expect(page.locator('#content')).toContainText('Questão 10 de 10');await expect(page.locator('#demo-next')).toHaveCount(0);expect(writes).toBe(0);
 await page.locator('[data-tab="Painel"]').click();await page.locator('#offer-login').click();
 await page.locator('#account-form [name=email]').fill(user.email);await page.locator('#account-form [name=password]').fill('Senha fixture123');await page.locator('#account-form button[name=action]').click();await expect(page.locator('#account-title')).toHaveText('Sua conta');await page.locator('#account-close').click();
 const grant={environment:'test',status:'active',activated_at:new Date(Date.now()-1000).toISOString(),expires_at:new Date(Date.now()+86400000).toISOString()};
 access=[grant];const testResponse=page.waitForResponse(r=>r.url().includes('/enem_access_status'));await page.locator('#offer-refresh').click();await (await testResponse).finished();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await expect(page.locator('.sale-offer')).toBeVisible();
 access=[{...grant,environment:'production'}];await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(page.locator('.sale-offer')).toHaveCount(0);
 await page.locator('[data-tab="Redação"]').click();await expect(page.locator('#essay')).toHaveValue('Rascunho preservado');
 access=[];await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(page.locator('.sale-offer')).toBeVisible();await expect(page.locator('#essay')).toHaveCount(0);expect(writes).toBe(0);
});
