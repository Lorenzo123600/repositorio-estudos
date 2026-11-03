import {openCompanions} from '../helpers/ui.js';
import {clickPlanDay} from '../helpers/ui.js';
import {test,expect} from '@playwright/test';

test('treino recomendado confirma a resposta antes de salvar e conclui dez questões',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await openCompanions(page);
 await expect(page).toHaveTitle('bora pro enem');await expect(page.locator('.companion-panel .capitu')).toBeVisible();await expect(page.locator('.companion-panel .guapa')).toBeVisible();
 await page.locator('#start-recommended').click();await expect(page.locator('.session-banner')).toContainText('1 de 10');await expect(page.locator('#confirm-answer')).toBeDisabled();
 await page.locator('[data-answer="0"]').click();await expect(page.locator('[data-answer="0"]')).toHaveAttribute('aria-pressed','true');await expect(page.locator('.feedback')).toHaveCount(0);
 await page.locator('[data-answer="1"]').click();await expect(page.locator('[data-answer="0"]')).toHaveAttribute('aria-pressed','false');await page.locator('#confirm-answer').click();await expect(page.locator('.feedback')).toBeVisible();
 for(let i=1;i<10;i++){await page.locator('#next').click();await expect(page.locator('.session-banner')).toContainText(`${i+1} de 10`);await page.locator('[data-answer="0"]').click();await page.locator('#confirm-answer').click()}
 await expect(page.locator('h1')).toHaveText('Seu treino chegou ao fim.');await page.locator('#finish-training').click();await page.locator('[data-tab="Painel"]').click();await expect(page.locator('.stats')).toContainText('10');
 await page.reload();await expect(page.locator('.stats')).toContainText('10');expect(errors).toEqual([]);
});

test('celular tem navegação acessível, menu, mascotes e revisão de quinze minutos',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await openCompanions(page);await expect(page.locator('.mobile-bottom')).toBeVisible();await expect(page.locator('.welcome-row h1')).toContainText('Bora estudar?');
 await page.locator('#quick-review').click();await expect(page.locator('#focus-global-time')).toHaveText('15:00');await page.locator('#focus-global-control').click();await expect(page.locator('#focus-global-control')).toContainText('Pausar');await page.locator('#focus-global-reset').click();await expect(page.locator('#focus-global-time')).toHaveText('15:00');
 const panel=await page.locator('.focus-global-panel').boundingBox(),navigation=await page.locator('.mobile-bottom').boundingBox();expect(panel.y+panel.height).toBeLessThanOrEqual(navigation.y);await page.locator('[data-mobile-tab="Plano de 14 dias"]').click();await clickPlanDay(page,0);await page.locator('[data-mobile-tab="Painel"]').click();await page.locator('#focus-toggle').click();await openCompanions(page);await expect(page.locator('.mobile-plan progress')).toHaveAttribute('value','1');
 await page.locator('#mobile-menu').click();await expect(page.locator('#mobile-menu')).toHaveAttribute('aria-expanded','true');await page.locator('[data-tab="Redação"]').click();await page.locator('#essay').fill('Meu rascunho no novo layout continua salvo.');
 await page.locator('#mobile-menu').click();await page.keyboard.press('Escape');await expect(page.locator('#mobile-menu')).toHaveAttribute('aria-expanded','false');
 await page.locator('[data-mobile-tab="Painel"]').click();await openCompanions(page);await expect(page.locator('.companion-panel .guapa')).toBeVisible();await page.locator('.guapa-hint summary').click();await expect(page.locator('.guapa-hint')).toContainText('Capitu');
 await page.locator('#mobile-profile').click();await expect(page.locator('#account-dialog')).toBeVisible();await page.getByRole('button',{name:'Fechar',exact:true}).click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
