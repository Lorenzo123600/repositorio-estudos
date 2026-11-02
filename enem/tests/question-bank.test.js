import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {bank,makeExam,matchesQuestion} from '../src/activities.js';
import {loadQuestions} from '../src/question-loader.js';
import {normalizeState} from '../src/state.js';
import {validateBank,validateQuestion} from '../scripts/validate-questions.mjs';
const read=path=>JSON.parse(readFileSync(path,'utf8'));
const catalog=read('src/question-catalog.json');
const localFetch=async url=>({ok:true,json:async()=>read('public/'+new URL(url).pathname.replace('/meu-site/',''))});
test('JSONs, imagens, catálogo e gabaritos oficiais são consistentes',()=>assert.deepEqual(validateBank(),{total:284,errors:[]}));
test('validador detecta ID duplicado, alternativa ausente, resposta inválida e imagem ausente',()=>{
 const q=read('public/'+catalog.chunks[0].file)[0];
 assert.ok(validateQuestion(q,new Set([q.id])).some(e=>e.includes('duplicado')));
 assert.ok(validateQuestion({...q,options:q.options.slice(1)}).some(e=>e.includes('alternativas')));
 assert.ok(validateQuestion({...q,answer:5}).some(e=>e.includes('resposta')));
 assert.ok(validateQuestion({...q,text:'![](enem-assets/missing.png)'}).some(e=>e.includes('imagem inexistente')));
});
test('metadados preservam respostas e simulado ainda sem carregar seus arquivos',()=>{
 const meta=catalog.chunks[0].questions[0],id=meta.index;
 assert.equal(bank[id].loaded,false);
 const state=normalizeState({answers:{20:2,[id]:meta.answer},activeExam:{ids:[20,id],answers:{[id]:meta.answer},deadline:Date.now()+10000,startedAt:Date.now()}});
 assert.equal(state.answers[id],meta.answer);assert.deepEqual(state.activeExam.ids,[20,id]);
});
test('filtros combinados não repetem itens e anulada não participa de sessões',()=>{
 const ids=makeExam(20,()=>.3,{year:2022,area:'Natureza',discipline:'Ciências da Natureza'});
 assert.equal(new Set(ids).size,20);assert.ok(ids.every(id=>matchesQuestion(bank[id],{year:2022,area:'Natureza'})));
 assert.ok(!makeExam(355).some(id=>bank[id].cancelled));
 assert.throws(()=>makeExam(11,Math.random,{year:2022,discipline:'Inglês'}),RangeError);
});
test('carregamento usa subdiretório relativo, recupera falha e compartilha requisições',async()=>{
 const chunk=catalog.chunks[0],ids=chunk.questions.slice(0,2).map(q=>q.index);let calls=0;
 await assert.rejects(loadQuestions(ids,{base:'https://example.org/meu-site/',fetcher:async()=>({ok:false})}));
 const fetcher=async url=>{calls++;assert.equal(url,'https://example.org/meu-site/'+chunk.file);return localFetch(url)};
 await Promise.all([loadQuestions(ids,{base:'https://example.org/meu-site/',fetcher}),loadQuestions(ids,{base:'https://example.org/meu-site/',fetcher})]);
 assert.equal(calls,1);assert.ok(ids.every(id=>bank[id].loaded));assert.equal(bank[catalog.chunks[1].questions[0].index].loaded,false);
 assert.equal(bank[ids[0]].options.length,5);
});
