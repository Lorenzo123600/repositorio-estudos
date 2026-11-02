import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {officialEvidence,validateOfficialQuestion,parseOfficialTable} from '../scripts/validate-official.mjs';
import {canonicalQuestionId} from '../src/question-identity.js';
import {bank,makeExam,matchesQuestion} from '../src/activities.js';
const root=process.cwd(),evidence=officialEvidence(root);
const catalog=JSON.parse(readFileSync('src/question-catalog.json'));
const chunk=catalog.chunks.find(c=>c.questions.some(q=>q.validationStatus==='validated'));
const q=JSON.parse(readFileSync('public/'+chunk.file)).find(q=>q.validation?.status==='validated');
test('piloto tem 50 IDs canônicos únicos e provas reproduzíveis',()=>{
 const pilot=JSON.parse(readFileSync('references/enem-1000/batches/50.json'));assert.equal(pilot.validated,50);assert.equal(new Set(pilot.canonicalIds).size,50);
 assert.deepEqual(validateOfficialQuestion(q,evidence,root),[]);
});
test('verificação recusa troca de gabarito, página, caderno e alternativa sem figura',()=>{
 for(const bad of [
  {...q,answer:(q.answer+1)%5},
  {...q,validation:{...q.validation,booklet:'yellow'}},
  {...q,validation:{...q.validation,header:{...q.validation.header,page:100}}},
  {...q,validation:{...q.validation,assets:q.validation.assets.slice(1)}}
 ])assert.ok(validateOfficialQuestion(bad,evidence,root).length>0);
});
test('extração de tabela distingue idiomas, questão anulada e marcação não resolvida',()=>{
 const keys=parseOfficialTable('1 B C 46 D\n112 D 157\n135\n* 180 C\n* Questão 135 Anulada * Questão 157 Anulada',1);
 assert.equal(keys['1-ingles'],'B');assert.equal(keys['1-espanhol'],'C');assert.equal(keys['46'],'D');assert.equal(keys['135'],'Anulada');assert.equal(keys['157'],'Anulada');assert.equal(keys['180'],'C');
});
test('simulado usa IDs canônicos para deduplicar, inclusive antes de carregar JSONs',()=>{
 const ids=makeExam(100);assert.equal(new Set(ids.map(id=>canonicalQuestionId(bank[id]))).size,100);
 const original=bank.length;bank.push({...bank.find(q=>matchesQuestion(q)),id:'copia-outro-caderno',booklet:'Amarelo'});
 try{const ids=makeExam(bank.filter(q=>matchesQuestion(q)).length-1);assert.ok(!ids.includes(original));}finally{bank.pop()}
});

test('meta publicada conta apenas originais validados, sem pendências ou anuladas',()=>{
 const report=JSON.parse(readFileSync('references/enem-1000/report.json'));
 const active=bank.filter(q=>matchesQuestion(q));assert.ok(report.validated>=1000);assert.equal(active.length,report.validated);
 assert.ok(active.every(q=>q.validationStatus==='validated'));assert.equal(new Set(active.map(canonicalQuestionId)).size,active.length);
 const baseline=JSON.parse(readFileSync('references/enem-1000/baseline.json'));
 for(const old of baseline.questions){assert.equal(bank[old.index].id,old.id);assert.equal(bank[old.index].answer,old.answer);}
});

test('histórico de questão pendente e questão autoral continuam renderizando sem original novo',async()=>{
 const {questionBody}=await import('../src/question-view.js');
 assert.match(questionBody({context:'Contexto antigo',text:'Enunciado preservado'}),/Enunciado preservado/);
 assert.match(questionBody({text:'Questão autoral'}),/Questão autoral/);
 const old=bank.find(q=>q.validationStatus==='pending'&&q.context);assert.ok(old);assert.doesNotThrow(()=>questionBody(old));
});
