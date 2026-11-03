import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const sample=JSON.parse(readFileSync(new URL('../../references/preventive-audit/visual-sample.json',import.meta.url),'utf8'));
test('plans of 1, 2, 7, 14, 30 and 180 days keep one expandable card per day',async({page})=>{
 await page.goto('/');await page.locator('[data-tab="Plano de 14 dias"]').click();
 for(const days of [1,2,7,14,30,180]){
  await page.locator('#plan-days').fill(String(days));await page.locator('#start').fill('2026-11-02');
  await page.locator('#plan-settings button[type=submit]').click();
  await expect(page.locator('.plan-card')).toHaveCount(days);
  await expect(page.locator('.plan-day-details')).toHaveCount(days);
  await expect(page.locator('.plan-unit:visible')).toHaveCount(0);
  await page.locator('.plan-day-details').first().locator('summary').click();
  await expect(page.locator('.plan-unit:visible').first()).toBeVisible();
  await page.locator('.plan-day-details').first().locator('summary').click();
  await expect(page.locator('.plan-unit:visible')).toHaveCount(0);
  expect(await page.locator('.plan-unit').count()).toBe(Math.max(days,14));
 }
 await page.reload();await page.locator('[data-tab="Plano de 14 dias"]').click();
 await expect(page.locator('#plan-days')).toHaveValue('180');
 await expect(page.locator('#start')).toHaveValue('2026-11-02');
});

test('40 stratified questions retain all five alternatives and load every image on mobile',async({page})=>{
 test.setTimeout(90000);await page.setViewportSize({width:390,height:844});
 for(let i=0;i<sample.length;i+=8){
  const questionIds=sample.slice(i,i+8).map(q=>q.id);
  await page.goto('/');await page.evaluate(questionIds=>sessionStorage.setItem('bora-enem-plan-practice-v1',JSON.stringify({unitId:0,dayIndex:0,questionIds,currentQuestionId:questionIds[0]})),questionIds);await page.reload();
  for(let j=0;j<questionIds.length;j++){
   await expect(page.locator('[data-answer]')).toHaveCount(5);
   const images=page.locator('.official-original img,.options img');await expect(images).toHaveCount(6);
   await expect.poll(()=>images.evaluateAll(items=>items.every(im=>im.complete&&im.naturalWidth>0))).toBe(true);
   await expect(page.locator('[data-answer="4"] img')).toBeVisible();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   if(j<questionIds.length-1){if(await page.locator('#confirm-answer').count()){await page.locator('[data-answer="0"]').click();await page.locator('#confirm-answer').click();}await page.locator('#next').click();}
  }
 }
});
