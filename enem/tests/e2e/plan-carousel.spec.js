import {test,expect} from '@playwright/test';

async function plan(page){await page.goto('/');await page.locator(page.viewportSize().width<=760?'[data-mobile-tab="Plano de 14 dias"]':'[data-tab="Plano de 14 dias"]').click()}
const root=page=>page.locator('.plan-carousel');

test('mobile: primeiro pendente, teclado, indicadores e navegação sem alterar progresso',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.addInitScript(()=>localStorage.setItem('enem-reta-final',JSON.stringify({done:[0,1],answers:{0:2}})));
 await plan(page);
 await expect(root(page)).toHaveAttribute('data-active-index','2');
 await expect(root(page)).toHaveAttribute('data-visible-count','1');
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('enem-reta-final')));
 await page.getByRole('button',{name:'Próximos dias',exact:true}).click();
 await expect(root(page)).toHaveAttribute('data-active-index','3');
 const track=page.getByRole('group',{name:'Cards dos dias',exact:true});
 await track.focus();await page.keyboard.press('End');await expect(root(page)).toHaveAttribute('data-active-index','13');
 await page.keyboard.press('Home');await expect(root(page)).toHaveAttribute('data-active-index','0');
 await page.keyboard.press('ArrowRight');await expect(root(page)).toHaveAttribute('data-active-index','1');
 await page.getByRole('button',{name:'Mostrar dia 1 de 14',exact:true}).click();
 await expect(root(page)).toHaveAttribute('data-active-index','0');
 await expect(page.locator('[data-plan-card="1"]')).toHaveAttribute('aria-hidden','true');
 await expect(page.locator('[data-plan-card="1"]')).toHaveJSProperty('inert',true);
 await page.locator('[data-plan-card="0"] summary').click();
 await expect(page.locator('[data-plan-practice="0"]')).toBeVisible();
 const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('enem-reta-final')));
 expect(after.done).toEqual(before.done);expect(after.planUnitsDone).toEqual(before.planUnitsDone);expect(after.answers).toEqual(before.answers);
 await expect(page.getByRole('region',{name:'Dias do plano de estudos'})).toBeVisible();
 await expect(page.getByRole('group',{name:'Dia 2 de 14',exact:true})).toHaveCount(0);
 await track.focus();
 for(let i=0;i<8;i++){await page.keyboard.press('Tab');expect(await page.evaluate(()=>!!document.activeElement.closest('[inert]'))).toBe(false)}
 await page.screenshot({path:test.info().outputPath('mobile.png'),fullPage:true});
});

test('responsividade, 180 dias e preferência por movimento reduzido',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await plan(page);
 await page.locator('#plan-days').fill('180');await page.locator('#plan-settings button[type=submit]').click();
 for(const width of [320,390,768,1365]){
  await page.setViewportSize({width,height:900});
  await expect(root(page)).toHaveAttribute('data-visible-count',width>=1100?'2':'1');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const geometry=await page.locator('.plan-carousel-track').evaluate(el=>{const r=el.getBoundingClientRect();return [...el.children].filter(c=>!c.inert).every(c=>{const b=c.getBoundingClientRect();return b.left>=r.left-2&&b.right<=r.right+2})});
  expect(geometry).toBe(true);
 }
 expect(await page.locator('[data-plan-position]').count()).toBeLessThanOrEqual(7);
 await page.getByRole('group',{name:'Cards dos dias',exact:true}).focus();await page.keyboard.press('End');
 await expect(root(page)).toHaveAttribute('data-active-index','178');
 await expect(page.getByRole('button',{name:'Próximos dias',exact:true})).toBeDisabled();
 await page.setViewportSize({width:390,height:844});await expect(root(page)).toHaveAttribute('data-visible-count','1');
 await page.locator('#plan-days').fill('1');await page.locator('#plan-settings button[type=submit]').click();
 await expect(page.getByRole('button',{name:'Próximos dias',exact:true})).toBeDisabled();
 await expect(page.getByRole('button',{name:'Dias anteriores',exact:true})).toBeDisabled();
});

test('gesto de toque nativo troca o dia sem concluir atividades',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 const page=await context.newPage();await plan(page);
 const storedBefore=await page.evaluate(()=>localStorage.getItem('enem-reta-final'));
 const track=page.locator('.plan-carousel-track');await track.scrollIntoViewIfNeeded();
 const box=await track.boundingBox();const session=await context.newCDPSession(page);
 const x=box.x+box.width*.85,y=box.y+100;
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
 for(let i=1;i<=12;i++){
  await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-box.width*.75*i/12,y}]});
  await page.waitForTimeout(25);
 }
 await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await expect(root(page)).toHaveAttribute('data-active-index','1');
 expect(await page.evaluate(()=>localStorage.getItem('enem-reta-final'))).toBe(storedBefore);
 await context.close();
});

test('treino de dia futuro preserva respostas e não burla desbloqueio',async({page})=>{
 await page.setViewportSize({width:390,height:844});await plan(page);
 await page.getByLabel('Escolher dias exibidos').selectOption('7');
 await page.locator('[data-plan-card="7"] summary').click();
 await page.locator('[data-plan-practice="7"]').click();
 for(let i=0;i<10;i++){
  await page.locator('[data-answer="0"]').click();await page.locator('#confirm-answer').click();
  if(i<9)await page.locator('#next').click();
 }
 await expect(page.locator('#content')).toContainText('termine os dias anteriores');
 const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('enem-reta-final')));
 expect(state.planUnitsDone).toEqual([]);expect(state.done).toEqual([]);expect(Object.keys(state.answers)).toHaveLength(10);
 await page.locator('#finish-training').click();await expect(root(page)).toHaveAttribute('data-active-index','0');
 await page.getByLabel('Escolher dias exibidos').selectOption('7');
 await expect(page.locator('[data-plan-card="7"]')).toContainText('10 de 10 questões da seleção respondidas');
 await page.locator('[data-plan-card="7"] summary').click();await expect(page.locator('[data-day="7"]')).toBeDisabled();
});
