import {bank} from '../../src/activities.js';
import {test,expect} from '@playwright/test';
const password='Senha de teste 123!';
async function enter(page,email,register=false){
 await page.goto('/');await page.getByRole('button',{name:'Entrar / Criar conta'}).click();
 if(register){await page.locator('[data-account-mode=register]').click();await page.locator('#register-form [name=name]').fill('Estudante');}
 const form=page.locator(register?'#register-form':'#account-form');
 await form.locator('[name=email]').fill(email);await form.locator('[name=password]').fill(password);
 await form.locator('button[type=submit], button[name=action]').click();
 await expect(page.locator('dialog h2')).toHaveText('Sua conta');await page.getByRole('button',{name:'Fechar',exact:true}).click();
}
async function synced(page){await expect(page.locator('#storage-note')).toHaveText('Sincronizado com sua conta');}
test('duas sessões independentes compartilham plano, redações e respostas; conflitos preservam cópia local',async({browser})=>{
 const a=await browser.newContext(),b=await browser.newContext(),one=await a.newPage(),two=await b.newPage();const errors=[];one.on('pageerror',e=>errors.push(e.message));two.on('pageerror',e=>errors.push(e.message));
 const email=`e2e-${Date.now()}@example.com`;
 await enter(one,email,true);
 await one.getByRole('button',{name:'Plano de 14 dias',exact:false}).first().click();await one.locator('[data-day="0"]').click();await synced(one);
 await one.locator('[data-tab="Redação"]').click();await one.locator('#essay').fill('Minha redação sincronizada entre computador e celular.');await synced(one);
 await one.locator('[data-tab="Questões"]').click();await one.locator('[data-answer="2"]').click();await synced(one);
 await enter(two,email);await two.locator('[data-tab="Plano de 14 dias"]').click();await expect(two.locator('[data-day="0"]')).toContainText('Concluído');
 await two.locator('[data-tab="Redação"]').click();await expect(two.locator('#essay')).toHaveValue('Minha redação sincronizada entre computador e celular.');
 await two.locator('[data-tab="Questões"]').click();await expect(two.locator('.feedback')).toBeVisible();
 // Device two edits offline while device one advances the server revision.
 await b.setOffline(true);await two.locator('[data-tab="Redação"]').click();await two.locator('#essay').fill('Texto offline do segundo dispositivo');
 await one.locator('[data-tab="Redação"]').click();await one.locator('#essay').fill('Texto mais recente no servidor');await synced(one);
 await b.setOffline(false);await expect(two.locator('#storage-note')).toContainText('Conflito',{timeout:20000});
 await two.locator('#account-open').click();await expect(two.locator('#use-local')).toBeVisible();two.once('dialog',d=>d.accept());await two.locator('#use-remote').click();await expect(two.locator('#essay')).toHaveValue('Texto mais recente no servidor');
 expect(errors).toEqual([]);await a.close();await b.close();
});
test('questões reais, imagens, filtros, simulado e tela móvel funcionam',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.locator('[data-tab="Questões"]').click();
 await expect(page.locator('.question-source')).toContainText('ENEM 2023');await page.locator('[data-area="Matemática"]').click();await page.locator('#difficulty').selectOption('dificil');await expect(page.locator('.question-source')).toContainText('Difícil');await expect(page.locator('.question-context img')).toBeVisible();
 expect(await page.locator('.question-context img').evaluate(i=>i.complete&&i.naturalWidth>0)).toBe(true);
 await page.locator('#question-origin').selectOption('autoral');await expect(page.locator('.empty-state')).toBeVisible();
 await page.locator('[data-tab="Simulados"]').click();await page.locator('#exam-difficulty').selectOption('facil');await expect(page.locator('[data-start-exam="20"]')).toBeEnabled();await page.locator('[data-start-exam="10"]').click();await expect(page.locator('.question-map button')).toHaveCount(10);await expect(page.locator('.question-source')).toContainText('Fácil');
 await page.locator('[data-exam-answer="0"]').click();await page.locator('#finish-exam').click();await page.locator('#confirm-exam').click();await expect(page.locator('.result-hero')).toContainText('10');await expect(page.locator('.review-list .card')).toHaveCount(10);
 await page.setViewportSize({width:390,height:844});await page.locator('[data-tab="Questões"]').click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
});

test('código de recuperação permite voltar à conta sem e-mail e rotaciona após uso',async({page})=>{
 const email=`recover-${Date.now()}@example.com`;
 await page.goto('/');await page.locator('#account-open').click();await page.locator('[data-account-mode=register]').click();await page.locator('#register-form [name=name]').fill('Recuperação');await page.locator('#register-form [name=email]').fill(email);await page.locator('#register-form [name=password]').fill(password);await page.locator('#register-form button[name=action]').click();
 const code=await page.locator('.recovery-code code').innerText();expect(code).toMatch(/^[a-f0-9]{48}$/);await page.locator('#account-logout').click();await page.locator('#account-open').click();await page.getByText('Esqueci minha senha',{exact:true}).click();
 await page.locator('#recover-form [name=email]').fill(email);await page.locator('#recover-form [name=code]').fill(code);await page.locator('#recover-form [name=password]').fill('Nova senha segura123!');await page.getByRole('button',{name:'Recuperar acesso',exact:true}).click();await expect(page.locator('dialog h2')).toHaveText('Sua conta');expect(await page.locator('.recovery-code code').innerText()).not.toBe(code);
});

test('simulado com alternativas em imagem mantém figuras na resolução',async({page})=>{
 const id=bank.findIndex(q=>q.id==='enem-2023-113');expect(id).toBeGreaterThan(55);
 await page.addInitScript(({id})=>localStorage.setItem('enem-reta-final',JSON.stringify({activeExam:{ids:[id],answers:{},index:0,startedAt:Date.now(),deadline:Date.now()+600000,finished:false}})),{id});
 await page.goto('/');await page.locator('[data-tab="Simulados"]').click();await expect(page.locator('.question-source')).toContainText('Caderno Azul');await expect(page.locator('.options img')).toHaveCount(5);
 await expect.poll(()=>page.locator('.options img').evaluateAll(images=>images.every(i=>i.complete&&i.naturalWidth>0))).toBe(true);
 await page.locator('[data-exam-answer="0"]').click();await page.locator('#finish-exam').click();await page.locator('#confirm-exam').click();await expect(page.locator('.review-list img')).toHaveCount(2);await expect(page.locator('.result-hero')).toContainText('1 de 1 acertos');
});
