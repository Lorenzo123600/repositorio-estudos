import {test,expect} from '@playwright/test';
const uid='11111111-1111-4111-8111-111111111111';
const user={id:uid,aud:'authenticated',email:'modal@example.test',email_confirmed_at:new Date().toISOString(),app_metadata:{provider:'email'},user_metadata:{name:'Estudante'},identities:[],created_at:new Date().toISOString()};
const jwt='eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({sub:uid,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})).toString('base64url')+'.fixture';
async function fixture(page,{multiple=false}={}){
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://enem-test.supabase.co/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname;let data={};
  if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'*'}});
  if(path.endsWith('/token'))data={access_token:jwt,refresh_token:'fixture',expires_in:3600,token_type:'bearer',user};
  else if(path.endsWith('/user'))data=user;
  else if(path.endsWith('/load_enem_study_progress'))data={state:{},revision:0};
  else if(path.endsWith('/enem_payment_plans'))data=Array.from({length:multiple?2:1},(_,i)=>({id:'fixture-'+i,name:'Plano fixture '+(i+1),price:14.90+i,currency:'BRL',duration_days:null,access_expires_at:'2027-01-01T03:00:00Z'}));
  else if(path.endsWith('/enem_payments'))data=Array.from({length:8},(_,i)=>({id:'payment-'+i,plan_id:'fixture-0',status:'pending',amount:14.90,currency:'BRL',environment:'production'}));
  else if(path.endsWith('/enem_access_status'))data=[];
  else throw Error('Unexpected request: '+path);
  await route.fulfill({json:data,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*'}});
 });return errors;
}
async function login(page){await page.locator('#account-open').click();await page.locator('#account-form [name=email]').fill(user.email);await page.locator('#account-form [name=password]').fill('Senha fixture123');await page.locator('#account-form button[name=action]').click();await expect(page.locator('#account-title')).toHaveText('Sua conta');await page.locator('#account-close').click()}
for(const width of [320,390,768,1365])test(`modal compacto, foco, Escape e rolagem única em ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:width===320?568:900});const errors=await fixture(page);await page.goto('/');
 await page.locator('#payments-open').click();const dialog=page.getByRole('dialog',{name:'Planos e pagamentos'});
 await expect(dialog).toBeVisible();await expect(page.locator('#payments-close')).toBeFocused();
 await expect(page.locator('.public-plan-price')).toHaveText('R$ 14,90');await expect(page.locator('.payment-validity')).toContainText('31/12/2026');
 expect(await page.locator('[data-payment-next]').count()).toBe(0);
 expect(await dialog.evaluate(el=>{const r=el.getBoundingClientRect();return r.width<=760&&r.height<=innerHeight*.85+1&&Math.abs(r.left-(innerWidth-r.width)/2)<2&&el.scrollWidth<=el.clientWidth})).toBe(true);
 expect(await page.evaluate(()=>getComputedStyle(document.documentElement).overflow)).toBe('hidden');
 await page.keyboard.press('Tab');await expect(page.locator('#payment-login')).toBeFocused();
 await page.keyboard.press('Tab');await expect(page.locator('#payments-close')).toBeFocused();
 await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(page.locator('#payments-open')).toBeFocused();
 expect(await page.evaluate(()=>getComputedStyle(document.documentElement).overflow)).not.toBe('hidden');
 await page.locator('#payments-open').click();await page.locator('#payment-login').click();await expect(page.locator('#account-dialog')).toBeVisible();await page.locator('#account-close').click();
 await login(page);await page.locator('#payments-open').click();await expect(page.locator('.payment-plan-card')).toHaveCount(1);
 await page.locator('#payments-body').evaluate(el=>el.scrollTop=el.scrollHeight);
 const close=await page.locator('#payments-close').boundingBox(),box=await dialog.boundingBox();expect(close.y).toBeGreaterThanOrEqual(box.y);expect(close.y+close.height).toBeLessThanOrEqual(box.y+box.height);
 expect(await page.locator('#payments-body').evaluate(el=>el.scrollHeight>el.clientHeight&&el.scrollWidth<=el.clientWidth)).toBe(true);
 await page.screenshot({path:test.info().outputPath('modal.png')});await page.keyboard.press('Escape');expect(errors).toEqual([]);
});

test('catálogo múltiplo: setas, teclado, toque e atualização preservam a posição e o foco',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const page=await context.newPage();const errors=await fixture(page,{multiple:true});await page.goto('/');await login(page);await page.locator('#payments-open').click();
 const track=page.locator('.payment-plans');await expect(page.locator('.payment-plan-card')).toHaveCount(2);
 await page.getByRole('button',{name:'Próximo plano',exact:true}).click();await expect(track).toHaveAttribute('data-index','1');
 await expect(page.locator('.payment-plan-card').first()).toHaveJSProperty('inert',true);
 await track.focus();await page.keyboard.press('Home');await expect(track).toHaveAttribute('data-index','0');await page.keyboard.press('End');await expect(track).toHaveAttribute('data-index','1');
 await page.locator('#payment-refresh').click();await expect(page.locator('#payment-refresh')).toBeFocused();await expect(track).toHaveAttribute('data-index','1');
 await track.focus();await page.keyboard.press('Home');await expect(track).toHaveAttribute('data-index','0');
 await track.scrollIntoViewIfNeeded();const box=await track.boundingBox(),session=await context.newCDPSession(page),x=box.x+box.width*.85,y=box.y+100;
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
 for(let i=1;i<=12;i++){await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-box.width*.75*i/12,y}]});await page.waitForTimeout(25)}
 await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await expect(track).toHaveAttribute('data-index','1');
 expect(await page.locator('#payments-body').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
 await page.keyboard.press('Escape');expect(errors).toEqual([]);await context.close();
});
