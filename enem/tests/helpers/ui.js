import {expect} from '@playwright/test';
export async function showPlanCard(locator){
 const card=locator.locator('xpath=ancestor-or-self::*[@data-plan-card][1]');
 if(!await card.count()||!await card.evaluate(el=>el.inert))return;
 const select=locator.page().locator('.plan-carousel-jump select');
 const index=Number(await card.getAttribute('data-plan-card'));
 await select.selectOption(String(Math.min(index,await select.locator('option').count()-1)));
 await expect(card).toHaveJSProperty('inert',false);
 await expect.poll(()=>card.evaluate(el=>{const r=el.getBoundingClientRect(),t=el.closest('.plan-carousel-track').getBoundingClientRect();return r.left>=t.left-2&&r.right<=t.right+2})).toBe(true);
}
export async function expandFor(locator){
 await showPlanCard(locator);
 const details=locator.locator('xpath=ancestor::details[1]');
 if(await details.count()&&!(await details.evaluate(el=>el.open)))await details.locator(':scope > summary').click();
}
export async function clickPlanDay(page,index){const button=page.locator(`[data-day="${index}"]`);await expandFor(button);await button.click();}
export async function openCompanions(page){const details=page.locator('#home-companions');if(!(await details.evaluate(el=>el.open)))await details.locator(':scope > summary').click();}
