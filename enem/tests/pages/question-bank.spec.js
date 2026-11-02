import {test,expect} from '@playwright/test';
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import catalog from '../../src/question-catalog.json' with {type:'json'};
let server,base;
test.beforeAll(async()=>{
 server=createServer((req,res)=>{
  const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(!name.startsWith('/estudos/')){res.writeHead(404);res.end();return}
  const file=resolve('dist',name.slice('/estudos/'.length)||'index.html');
  if(!file.startsWith(resolve('dist')+'/')){res.writeHead(404);res.end();return}
  try{const data=readFileSync(file);res.setHeader('Content-Type',({'.html':'text/html','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'})[extname(file)]||'application/octet-stream');res.end(data)}catch{res.writeHead(404);res.end()}
 });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base=`http://127.0.0.1:${server.address().port}/estudos/`;
});
test.afterAll(()=>new Promise(resolve=>server.close(resolve)));
test('Pages em subdiretório carrega apenas o arquivo da questão e preserva a resposta ao recarregar',async({page})=>{
 const files=[],errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('/questions/'))files.push(r.url())});
 await page.goto(base);expect(files).toEqual([]);
 await page.locator('[data-tab="Questões"]').click();await page.locator('#practice-year').selectOption('2022');await page.locator('#practice-discipline').selectOption('Inglês');
 await expect(page.locator('.question-source')).toContainText('ENEM 2022');
 expect(new Set(files.filter(f=>!f.endsWith('/manifest.json'))).size).toBeLessThanOrEqual(2);expect(files.filter(f=>f.endsWith('/manifest.json'))).toHaveLength(1);expect(files.every(f=>f.startsWith(base+'questions/'))).toBe(true);
 await page.locator('[data-answer="0"]').click();await page.locator('#confirm-answer').click();
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('enem-reta-final')).answers);expect(Object.keys(before).some(k=>+k>=92)).toBe(true);
 await page.reload();await page.locator('[data-tab="Questões"]').click();await page.locator('#practice-year').selectOption('2022');await page.locator('#practice-discipline').selectOption('Inglês');await expect(page.locator('.feedback')).toBeVisible();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('enem-reta-final')).answers)).toEqual(before);expect(errors).toEqual([]);
});
test('simulado novo retoma rascunho, corrige pelo gabarito e alimenta caderno de erros sem backend',async({page})=>{
 const q=catalog.chunks.find(c=>c.questions.some(q=>q.year===2022&&q.area==='Natureza')).questions[0],wrong=(q.answer+1)%5;
 await page.addInitScript(({q,wrong})=>{if(!localStorage.getItem('enem-reta-final'))localStorage.setItem('enem-reta-final',JSON.stringify({answers:{20:2},activeExam:{ids:[q.index],answers:{},draftAnswers:{[q.index]:wrong},startedAt:Date.now(),deadline:Date.now()+600000,index:0}}))},{q,wrong});
 await page.goto(base);await page.locator('[data-tab="Simulados"]').click();await expect(page.locator(`[data-exam-answer="${wrong}"]`)).toHaveAttribute('aria-pressed','true');
 await page.locator('#exam-confirm-answer').click();await page.locator('#finish-exam').click();await page.locator('#confirm-exam').click();await expect(page.locator('.result-hero')).toContainText('0 de 1 acertos');
 await page.reload();await page.locator('[data-tab="Simulados"]').click();await expect(page.locator('.result-hero')).toContainText('0 de 1 acertos');await page.locator('[data-tab="Desafios"]').click();await expect(page.locator('.error-practice')).toContainText('ENEM 2022');await page.locator('#reveal-card').click();await page.locator('#error-practice').click();await expect(page.locator('.question-source')).toContainText('ENEM 2022');
});
test('falha no JSON oferece nova tentativa sem perder progresso',async({page})=>{
 let fail=true;await page.route('**/questions/*.json',route=>fail?route.fulfill({status:503,body:'Unavailable'}):route.continue());
 await page.goto(base);await page.locator('[data-tab="Questões"]').click();await page.locator('#practice-year').selectOption('2022');await expect(page.getByRole('button',{name:'Tentar novamente',exact:true})).toBeVisible();
 fail=false;await page.getByRole('button',{name:'Tentar novamente',exact:true}).click();await expect(page.locator('.question-source')).toContainText('ENEM 2022');
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('originais oficiais locais mantêm enunciado, cinco alternativas e correção no simulado',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base);
 await page.locator('[data-tab="Questões"]').click();await page.locator('#practice-year').selectOption('2017');
 await page.locator('#practice-discipline').selectOption('Inglês');
 await expect(page.locator('.official-original img')).toHaveCount(1);await expect(page.locator('.options img')).toHaveCount(5);
 await expect.poll(()=>page.locator('.official-original img,.options img').evaluateAll(images=>images.every(i=>i.complete&&i.naturalWidth>0))).toBe(true);
 await page.locator('[data-tab="Simulados"]').click();await page.locator('#exam-year').selectOption('2017');await page.locator('[data-start-exam="10"]').click();
 await expect(page.locator('[data-exam-answer]')).toHaveCount(5);
 for(let i=0;i<10;i++){
  const id=await page.evaluate(()=>{const e=JSON.parse(localStorage.getItem('enem-reta-final')).activeExam;return e.ids[e.index]});
  const meta=catalog.chunks.flatMap(c=>c.questions).find(q=>q.index===id);expect(meta.validationStatus).toBe('validated');
  await page.locator(`[data-exam-answer="${meta.answer}"]`).click();await page.locator('#exam-confirm-answer').click();if(i<9)await page.locator('#exam-next').click();
 }
 await page.locator('#finish-exam').click();await page.locator('#confirm-exam').click();await expect(page.locator('.result-hero')).toContainText('10 de 10 acertos');
 await page.reload();await page.locator('[data-tab="Simulados"]').click();await expect(page.locator('.result-hero')).toContainText('10 de 10 acertos');expect(errors).toEqual([]);
});

test('todas as áreas e anos publicados apresentam originais e cinco alternativas completas',async({page})=>{
 test.setTimeout(120000);await page.goto(base);await page.locator('[data-tab="Questões"]').click();
 for(const year of [2017,2018,2019,2020,2021,2022,2023,2024]){
  await page.locator('#practice-year').selectOption(String(year));
  for(const area of ['Linguagens','Humanas','Natureza','Matemática']){
   await page.locator(`[data-area="${area}"]`).click();await expect(page.locator('.question-source')).toContainText('ENEM '+year);
   await expect(page.locator('.official-original img')).toHaveCount(1);await expect(page.locator('.options img')).toHaveCount(5);
   await expect.poll(()=>page.locator('.official-original img,.options img').evaluateAll(images=>images.every(i=>i.complete&&i.naturalWidth>0))).toBe(true);
  }
 }
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
