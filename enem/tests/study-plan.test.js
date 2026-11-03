import {test} from 'node:test';import assert from 'node:assert/strict';
import {plan} from '../src/data.js';import {normalizeState} from '../src/state.js';
import {createStudyPlan,setPlanDuration,setPlanDayComplete} from '../src/study-plan.js';

test('prazos de 1 a 180 dias cobrem todas as atividades-base sem duplicar identificadores',()=>{for(const days of [1,3,7,14,15,30,90,180]){const schedule=createStudyPlan(days),units=schedule.flatMap(d=>d.units);assert.equal(schedule.length,days);assert.ok(schedule.every(d=>d.units.length));assert.equal(new Set(units.map(u=>u.id)).size,units.length);for(let id=0;id<14;id++)assert.ok(units.some(u=>u.id===id));assert.equal(units.at(-1).id,13)}assert.deepEqual(createStudyPlan(14).map(d=>d.units[0].content),plan)});
test('migrar e alterar prazo conserva atividades concluídas e restaura progresso',()=>{const state=normalizeState({done:[0,1,13]});assert.equal(state.planDays,14);assert.deepEqual(state.done,[0,1,13]);setPlanDuration(state,7);assert.equal(state.done.includes(0),true);assert.equal(state.done.includes(6),false);assert.deepEqual(state.planUnitsDone,[0,1,13]);setPlanDuration(state,30);for(let i=0;i<=20;i++)setPlanDayComplete(state,i,true);const completed=[...state.planUnitsDone];const restored=normalizeState(JSON.parse(JSON.stringify(state)));assert.equal(restored.planDays,30);assert.deepEqual(restored.planUnitsDone,completed);assert.ok(restored.done.includes(20));setPlanDuration(restored,7);setPlanDuration(restored,30);assert.ok(restored.done.includes(20));setPlanDayComplete(restored,20,false);assert.equal(restored.done.includes(20),false)});
test('prazo inválido não altera plano e normalização mantém limites seguros',()=>{const state=normalizeState({done:[0]});for(const value of [0,-1,181,2.5,NaN,'30']){assert.equal(setPlanDuration(state,value),false);assert.equal(state.planDays,14)}assert.equal(normalizeState({planDays:999}).planDays,14);assert.deepEqual(normalizeState({planDays:30,planUnitsDone:[-1,0,0,179,180,'2']}).planUnitsDone,[0,179])});

test('dias só podem ser concluídos em sequência, inclusive após reabrir uma etapa',()=>{const state=normalizeState({});assert.equal(setPlanDayComplete(state,2,true),false);assert.deepEqual(state.done,[]);setPlanDayComplete(state,0,true);assert.equal(setPlanDayComplete(state,2,true),false);setPlanDayComplete(state,1,true);assert.equal(setPlanDayComplete(state,2,true),true);setPlanDayComplete(state,0,false);assert.deepEqual(state.done,[1,2]);assert.equal(setPlanDayComplete(state,3,true),false);setPlanDayComplete(state,0,true);assert.equal(setPlanDayComplete(state,3,true),true)});
test('nova jornada exige conclusão, arquiva histórico e preserva respostas e redações',async()=>{const {startNextStudyPlan,planSummary}=await import('../src/study-plan.js');const state=normalizeState({answers:{0:1},essay:'Meu rascunho',challengeDone:{erro:true}});assert.equal(startNextStudyPlan(state,7),false);for(let i=0;i<14;i++)assert.equal(setPlanDayComplete(state,i,true),true);assert.equal(planSummary(state).finished,true);assert.equal(planSummary(state).finishedPlans,1);assert.equal(startNextStudyPlan(state,7,new Date('2026-11-02T01:00:00Z')),true);assert.equal(state.start,'2026-11-01');assert.equal(state.planDays,7);assert.deepEqual(state.done,[]);assert.equal(state.planHistory.length,1);assert.equal(state.planHistory[0].days,14);assert.equal(state.answers[0],1);assert.equal(state.challengeDone.erro,true);assert.equal(state.essay,'Meu rascunho');assert.equal(startNextStudyPlan(state,30),false);const restored=normalizeState(JSON.parse(JSON.stringify(state)));assert.equal(restored.planHistory.length,1);assert.equal(planSummary(restored).finishedPlans,1)});

test('indicadores sem respostas nem atividades exibem aproveitamento indisponível',async()=>{
 const {planDayMetrics}=await import('../src/study-plan.js');
 const state=normalizeState({});
 assert.deepEqual(planDayMetrics(state,createStudyPlan(14)[0]),{completed:0,total:1,progress:0,selected:0,answered:0,correct:0,accuracy:null});
});
test('QA-06: corrigir erro no caderno não retira a questão do denominador',async()=>{
 const {planDayMetrics}=await import('../src/study-plan.js');
 const {planPractice}=await import('../src/plan-practice.js');
 const {bank}=await import('../src/activities.js');
 const [a,b]=planPractice(7).ids;
 const ids=[bank[a].id,bank[b].id];
 const answers={[a]:(bank[a].answer+1)%5,[b]:(bank[b].answer+1)%5};
 const state=normalizeState({answers,planMetricSelections:{12:ids}});
 const day=createStudyPlan(14)[12];
 let result=planDayMetrics(state,day);
 assert.equal(result.answered,2);assert.equal(result.correct,0);assert.equal(result.accuracy,0);
 state.answers[a]=bank[a].answer;
 assert.equal(planPractice(12,state.answers).questionIds.includes(bank[a].id),false);
 result=planDayMetrics(state,day);
 assert.equal(result.answered,2);assert.equal(result.correct,1);assert.equal(result.accuracy,50);
});
test('métricas não duplicam questões entre unidades e não se propagam ao novo plano',async()=>{
 const {planDayMetrics,startNextStudyPlan}=await import('../src/study-plan.js');
 const {planPractice}=await import('../src/plan-practice.js');
 const {bank}=await import('../src/activities.js');
 const index=planPractice(0).ids[0],id=bank[index].id;
 const state=normalizeState({planDays:1,answers:{[index]:bank[index].answer},planMetricSelections:{0:[id],3:[id],12:[id,'invalid-id']}});
 const result=planDayMetrics(state,createStudyPlan(1)[0]);
 assert.equal(result.answered,1);assert.equal(result.correct,1);assert.equal(result.accuracy,100);
 assert.deepEqual(state.planMetricSelections['12'],[id]);
 assert.equal(setPlanDayComplete(state,0,true),true);
 assert.equal(startNextStudyPlan(state,14),true);
 assert.deepEqual(state.planMetricSelections,{});
 assert.equal(planDayMetrics(state,createStudyPlan(14)[0]).answered,0);
});
