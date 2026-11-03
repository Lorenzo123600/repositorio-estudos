import {test,expect} from '@playwright/test';
import {planPractice} from '../../src/plan-practice.js';
import {bank} from '../../src/activities.js';

test('recomendação do painel abre a próxima etapa diretamente nas questões',async({page})=>{
 await page.addInitScript(()=>{if(!localStorage.getItem('enem-reta-final'))localStorage.setItem('enem-reta-final',JSON.stringify({done:[0]}))});
 await page.goto('/');await page.locator('#start-recommended').click();
 await expect(page.locator('.session-banner')).toContainText('Cidadania, democracia e Constituição');
 await expect(page.locator('.question-source')).toContainText('Questão 60');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('enem-reta-final')).done)).toEqual([0]);
});

test('atividade abre questões do assunto, preserva respostas e retoma após recarga sem concluir o dia',async({page})=>{
 await page.goto('/');await page.locator('[data-tab="Questões"]').click();await page.locator('[data-area="Matemática"]').click();await page.locator('#practice-year').selectOption('2017');
 await page.locator('[data-tab="Plano de 14 dias"]').click();await page.locator('[data-plan-practice="0"]').click();
 await expect(page.locator('.session-banner')).toContainText('Interpretação de texto');await expect(page.locator('.question-source')).toContainText('ENEM 2023');await expect(page.locator('#practice-year')).toHaveValue('all');
 await page.locator('[data-answer="0"]').click();await page.locator('#confirm-answer').click();
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('enem-reta-final')).answers);
 await page.locator('#next').click();const source=await page.locator('.question-source').textContent();await page.reload();await expect(page.locator('.question-source')).toHaveText(source);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('enem-reta-final')).answers)).toEqual(before);
 await page.locator('#back-to-plan').click();await expect(page.locator('[data-day="0"]')).toContainText('Marcar como concluído');
 await page.locator('[data-plan-practice="7"]').click();await expect(page.locator('.session-banner')).toContainText('Porcentagem, razão, escala');
 expect(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('bora-enem-plan-practice-v1')).questionIds)).toEqual(planPractice(7).questionIds);
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('dias agrupados e espaçados têm destinos próprios e redação abre o editor',async({page})=>{
 await page.goto('/');await page.locator('[data-tab="Plano de 14 dias"]').click();await page.locator('#plan-days').fill('1');await page.locator('#plan-settings button[type=submit]').click();
 await expect(page.locator('[data-plan-practice]')).toHaveCount(14);await page.locator('[data-plan-practice="8"]').click();await expect(page.locator('.session-banner')).toContainText('Ecologia');
 await page.locator('#back-to-plan').click();await page.locator('[data-plan-writing="2"]').click();await expect(page.locator('#essay')).toBeVisible();
 await page.locator('[data-tab="Plano de 14 dias"]').click();await page.locator('#plan-days').fill('30');await page.locator('#plan-settings button[type=submit]').click();await page.locator('[data-plan-practice="14"]').click();
 expect(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('bora-enem-plan-practice-v1')).questionIds)).toEqual(planPractice(0).questionIds);
 await page.locator('#back-to-plan').click();await page.locator('#plan-days').fill('7');await page.locator('#plan-settings button[type=submit]').click();
 expect(await page.evaluate(()=>sessionStorage.getItem('bora-enem-plan-practice-v1'))).toBeNull();
});

test('etapa de caderno de erros abre a questão errada e não inclui a correta',async({page})=>{
 const [wrong,right]=planPractice(7).ids;
 await page.addInitScript(({wrong,right,wrongValue,rightValue})=>{if(!localStorage.getItem('enem-reta-final'))localStorage.setItem('enem-reta-final',JSON.stringify({answers:{[wrong]:wrongValue,[right]:rightValue}}))},{wrong,right,wrongValue:(bank[wrong].answer+1)%5,rightValue:bank[right].answer});
 await page.goto('/');await page.locator('[data-tab="Plano de 14 dias"]').click();await page.locator('[data-plan-practice="12"]').click();
 await expect(page.locator('.session-banner')).toContainText('Revisão dos seus erros');await expect(page.locator('.session-banner')).toContainText('1 de 1');
 expect(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('bora-enem-plan-practice-v1')).questionIds)).toEqual([bank[wrong].id]);
});

test('conclui automaticamente uma etapa somente após responder todas as questões',async({page})=>{
 await page.goto('/');await page.locator('[data-tab="Plano de 14 dias"]').click();
 await page.locator('[data-plan-practice="0"]').click();
 for(let i=0;i<10;i++){
  await page.locator('[data-answer="0"]').click();
  await page.locator('#confirm-answer').click();
  if(i<9)await page.locator('#next').click();
 }
 await expect(page.getByRole('heading',{name:'Seu treino chegou ao fim.'})).toBeVisible();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('enem-reta-final')).planUnitsDone)).toContain(0);
 await page.locator('#finish-training').click();
 await expect(page.locator('.plan-unit.unit-complete').first()).toContainText('Interpretação de texto');
});

test('não avança sem resposta confirmada e não conclui etapa interrompida',async({page})=>{
 await page.goto('/');await page.locator('[data-tab="Plano de 14 dias"]').click();
 await page.locator('[data-plan-practice="0"]').click();
 await expect(page.locator('#next')).toBeDisabled();
 await page.locator('[data-answer="0"]').click();
 await expect(page.locator('#next')).toBeDisabled();
 await page.locator('#confirm-answer').click();
 await expect(page.locator('#next')).toBeEnabled();
 await page.locator('#next').click();
 await expect(page.locator('.question-position')).toContainText('Questão 2 de 10');
 await expect(page.locator('#next')).toBeDisabled();
 await page.reload();
 await expect(page.locator('#next')).toBeDisabled();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('enem-reta-final')).planUnitsDone||[])).not.toContain(0);
 await page.locator('#back-to-plan').click();
 await expect(page.locator('[data-day="0"]')).toContainText('Marcar como concluído');
});

test('retoma treino e não duplica conclusão ao repetir atividade',async({page})=>{
 await page.goto('/');await page.locator('[data-tab="Plano de 14 dias"]').click();
 await page.locator('[data-plan-practice="0"]').click();
 await page.locator('[data-answer="0"]').click();await page.locator('#confirm-answer').click();
 await page.reload();
 await expect(page.locator('#next')).toBeEnabled();
 for(let i=0;i<10;i++){
  if(i>0){await page.locator('[data-answer="0"]').click();await page.locator('#confirm-answer').click();}
  if(i<9)await page.locator('#next').click();
 }
 const done=await page.evaluate(()=>JSON.parse(localStorage.getItem('enem-reta-final')).planUnitsDone);
 expect(done.filter(x=>x===0)).toHaveLength(1);
 await page.locator('#finish-training').click();
 await page.locator('[data-plan-practice="0"]').click();
 for(let i=0;i<10;i++)await page.locator('#next').click();
 const repeated=await page.evaluate(()=>JSON.parse(localStorage.getItem('enem-reta-final')).planUnitsDone);
 expect(repeated.filter(x=>x===0)).toHaveLength(1);
});

test('resultado correto ou errado conclui na ultima confirmação',async({page})=>{
 for(const correctCount of [0,4,7,10]){
  await page.goto('/');
  await page.evaluate(()=>{localStorage.removeItem('enem-reta-final');sessionStorage.removeItem('bora-enem-plan-practice-v1')});
  await page.reload();
  await page.locator('[data-tab="Plano de 14 dias"]').click();
  await page.locator('[data-plan-practice="0"]').click();
  const ids=planPractice(0).ids;
  for(let i=0;i<ids.length;i++){
   const answer=i<correctCount?bank[ids[i]].answer:(bank[ids[i]].answer+1)%5;
   await page.locator('[data-answer="'+answer+'"]').click();
   await page.locator('#confirm-answer').click();
   if(i<ids.length-1)await page.locator('#next').click();
  }
  await expect(page.getByRole('heading',{name:'Seu treino chegou ao fim.'})).toBeVisible();
  await expect(page.locator('#content')).toContainText(correctCount+' acertos registrados');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('enem-reta-final')).planUnitsDone)).toContain(0);
 }
});

test('configurar duração e data em uma única aplicação sem perder os campos',async({page})=>{
 await page.goto('/');
 await page.locator('[data-tab="Plano de 14 dias"]').click();
 for(const days of [1,7,14,30]){
  await page.locator('#plan-days').fill(String(days));
  await page.locator('#start').fill('2026-11-04');
  await expect(page.locator('#plan-days')).toHaveValue(String(days));
  await expect(page.locator('#start')).toHaveValue('2026-11-04');
  await page.locator('#plan-settings button[type=submit]').click();
  await expect(page.locator('.plan-card')).toHaveCount(days);
  await expect(page.locator('#start')).toHaveValue('2026-11-04');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('enem-reta-final')).planDays)).toBe(days);
 }
 await page.reload();
 await page.locator('[data-tab="Plano de 14 dias"]').click();
 await expect(page.locator('#plan-days')).toHaveValue('30');
 await expect(page.locator('#start')).toHaveValue('2026-11-04');
});
