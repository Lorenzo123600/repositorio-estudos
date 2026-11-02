import test from 'node:test';
import assert from 'node:assert/strict';
import {bank,matchesQuestion} from '../src/activities.js';
import {planPractice,basePlanUnit} from '../src/plan-practice.js';
import {createStudyPlan} from '../src/study-plan.js';

test('cada etapa abre dez questões válidas do assunto, sem substituição por toda a área',()=>{
 const expected={0:['Linguagens'],1:['Humanas'],3:['Linguagens'],4:['Humanas'],6:['Linguagens','Humanas'],7:['Matemática'],8:['Natureza'],9:['Matemática'],10:['Natureza'],11:['Matemática','Natureza'],13:['Matemática','Natureza']};
 for(let unit=0;unit<14;unit++){
  const p=planPractice(unit);assert.equal(p.ids.length,10);assert.equal(new Set(p.ids).size,10);
  assert.ok(p.ids.every(id=>matchesQuestion(bank[id])&&bank[id].origin==='enem'));
  if(expected[unit])assert.deepEqual([...new Set(p.ids.map(id=>bank[id].area))].sort(),expected[unit].sort());
 }
 assert.ok(planPractice(7).questionIds.includes('enem-2022-161')); // escala
 assert.ok(planPractice(9).questionIds.includes('enem-2022-149')); // mediana
 assert.ok(planPractice(8).questionIds.includes('enem-2024-108')); // sucessão ecológica
 assert.ok(planPractice(10).questionIds.includes('enem-2023-120')); // circuitos
 assert.ok(planPractice(2).writing&&planPractice(5).writing);
});
test('agrupar dias e revisões espaçadas mantém os destinos de cada atividade',()=>{
 for(const days of [1,7,14,30,180])for(const {units} of createStudyPlan(days))for(const unit of units){
  const p=planPractice(unit.id);assert.ok(p.ids.length);assert.deepEqual(p.questionIds,planPractice(basePlanUnit(unit.id)).questionIds);
 }
 assert.equal(planPractice(-1),null);assert.equal(planPractice(180),null);
});
test('revisão prioriza erros reais sem apagar respostas nem usar questões pendentes',()=>{
 const ids=planPractice(7).ids,answers={[ids[0]]:(bank[ids[0]].answer+1)%5,[ids[1]]:bank[ids[1]].answer};const before={...answers};
 const p=planPractice(12,answers);assert.deepEqual(p.ids,[ids[0]]);assert.deepEqual(answers,before);
 assert.match(planPractice(12,{}).note,/ainda não tem erros/);
 const pending=bank.findIndex(q=>q.validationStatus==='pending');assert.ok(pending>=0);
 assert.ok(!planPractice(12,{[pending]:0}).ids.includes(pending));
});
