export async function expandFor(locator){
 const details=locator.locator('xpath=ancestor::details[1]');
 if(await details.count()&&!(await details.evaluate(el=>el.open)))await details.locator(':scope > summary').click();
}
export async function clickPlanDay(page,index){const button=page.locator(`[data-day="${index}"]`);await expandFor(button);await button.click();}
export async function openCompanions(page){const details=page.locator('#home-companions');if(!(await details.evaluate(el=>el.open)))await details.locator(':scope > summary').click();}
