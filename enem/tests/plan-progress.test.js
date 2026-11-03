import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeState} from '../src/state.js';
import {bank} from '../src/activities.js';
import {planPractice} from '../src/plan-practice.js';
import {createStudyPlan,firstPendingPlanDay,finishPlanPractice,recordPlanSelection,planDayMetrics,setPlanDayComplete} from '../src/study-plan.js';

test('primeiro dia pendente considera lacunas, agrupamento e plano concluído sem alterar o estado',()=>{
 const state=normalizeState({planUnitsDone:[0,2]});const before=JSON.stringify(state);
 assert.equal(firstPendingPlanDay(state),1);assert.equal(JSON.stringify(state),before);
 const grouped=normalizeState({planDays:7,planUnitsDone:[0]});assert.equal(firstPendingPlanDay(grouped),0);
 grouped.planUnitsDone=Array.from({length:14},(_,i)=>i);assert.equal(firstPendingPlanDay(grouped),6);
});
test('questões globais, respostas da seleção e atividades são métricas independentes',()=>{
 const [first,second]=planPractice(0).ids,other=planPractice(7).ids[0];
 const state=normalizeState({answers:{[first]:bank[first].answer,[other]:bank[other].answer},planMetricSelections:{0:[bank[first].id,bank[second].id]}});
 const metrics=planDayMetrics(state,createStudyPlan(14)[0]);
 assert.equal(Object.keys(state.answers).length,2);assert.equal(metrics.answered,1);assert.equal(metrics.selected,2);
 assert.equal(metrics.accuracy,100);assert.equal(metrics.completed,0);assert.equal(metrics.progress,0);
});
test('treino concluído em dia bloqueado preserva respostas e aproveitamento sem liberar a etapa',()=>{
 const ids=planPractice(7).ids;const answers=Object.fromEntries(ids.map(id=>[id,(bank[id].answer+1)%5]));const state=normalizeState({answers});
 assert.equal(finishPlanPractice(state,7,ids).status,'blocked');assert.deepEqual(state.planUnitsDone,[]);assert.deepEqual(state.done,[]);assert.deepEqual(state.answers,answers);
 const metrics=planDayMetrics(state,createStudyPlan(14)[7]);assert.equal(metrics.answered,10);assert.equal(metrics.accuracy,0);assert.equal(metrics.progress,0);
 for(let i=0;i<7;i++)assert.equal(setPlanDayComplete(state,i,true),true);
 assert.equal(finishPlanPractice(state,7,ids).status,'complete');assert.ok(state.done.includes(7));
 assert.deepEqual(finishPlanPractice(state,7,ids),{status:'already-complete',changed:false});
});
test('retomada de treino antigo registra a seleção e completa só após todas as confirmações',()=>{
 const ids=planPractice(0).ids,state=normalizeState({});
 state.answers[ids[0]]=bank[ids[0]].answer;
 assert.equal(finishPlanPractice(state,0,ids).status,'incomplete');assert.deepEqual(state.planUnitsDone,[]);
 assert.equal(recordPlanSelection(state,0,ids.map(id=>bank[id].id)),true);
 assert.equal(planDayMetrics(state,createStudyPlan(14)[0]).answered,1);
 for(const id of ids)state.answers[id]=bank[id].answer;
 state.planMetricSelections={}; // Session saved before selections were persisted.
 assert.equal(finishPlanPractice(state,0,ids).status,'complete');
 assert.equal(planDayMetrics(state,createStudyPlan(14)[0]).answered,10);
});
test('conclusão manual e histórico permanecem sem inventar respostas; unidade agrupada não conclui o dia inteiro',()=>{
 const state=normalizeState({});setPlanDayComplete(state,0,true);
 const metrics=planDayMetrics(state,createStudyPlan(14)[0]);assert.equal(metrics.completed,1);assert.equal(metrics.answered,0);assert.equal(metrics.accuracy,null);
 const grouped=normalizeState({planDays:1});const ids=planPractice(0).ids;
 for(const id of ids)grouped.answers[id]=0;
 assert.equal(finishPlanPractice(grouped,0,ids).status,'complete');assert.deepEqual(grouped.done,[]);
 assert.equal(planDayMetrics(grouped,createStudyPlan(1)[0]).completed,1);
});
