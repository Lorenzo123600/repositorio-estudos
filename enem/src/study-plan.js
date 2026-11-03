import {plan} from './data.js';
import {bank} from './activities.js';
export const MAX_PLAN_DAYS=180;
export function validPlanDays(value){return Number.isInteger(value)&&value>=1&&value<=MAX_PLAN_DAYS}
export function createStudyPlan(days=14){
 if(!validPlanDays(days))throw new RangeError('Escolha de 1 a 180 dias inteiros.');
 const units=plan.map((content,id)=>({id,content}));
 if(days>14){const final=units.pop();for(let id=14;id<days;id++){const original=plan[(id-14)%13];units.push({id,content:[`Revisão espaçada: ${original[0]}`,original[1],original[2],`Retome as anotações, pratique as questões deste assunto e compare com sua tentativa anterior. ${original[3]}`]})}units.push(final)}
 return Array.from({length:days},(_,i)=>({units:units.slice(Math.floor(i*units.length/days),Math.floor((i+1)*units.length/days))}));
}
export function refreshPlanProgress(state){const completed=new Set(state.planUnitsDone||[]);state.done=createStudyPlan(state.planDays).flatMap((d,i)=>d.units.every(u=>completed.has(u.id))?[i]:[])}
export function setPlanDuration(state,days){if(!validPlanDays(days))return false;state.planDays=days;refreshPlanProgress(state);return true}
export function setPlanDayComplete(state,index,complete){const schedule=createStudyPlan(state.planDays);if(!Number.isInteger(index)||!schedule[index]||(complete&&!canCompletePlanDay(state,index)))return false;const units=new Set(state.planUnitsDone||[]);for(const unit of schedule[index].units){if(complete)units.add(unit.id);else units.delete(unit.id)}state.planUnitsDone=[...units].sort((a,b)=>a-b);refreshPlanProgress(state);return true}
export function canCompletePlanDay(state,index){const schedule=createStudyPlan(state.planDays);return Number.isInteger(index)&&!!schedule[index]&&Array.from({length:index},(_,i)=>i).every(i=>state.done.includes(i))}
export function planSummary(state){const schedule=createStudyPlan(state.planDays),activeIds=new Set(schedule.flatMap(d=>d.units.map(u=>u.id)));return {totalDays:state.planDays,completedDays:state.done.length,remainingDays:state.planDays-state.done.length,completedActivities:(state.planUnitsDone||[]).filter(id=>activeIds.has(id)).length,totalActivities:activeIds.size,finished:state.done.length===state.planDays,finishedPlans:(state.planHistory?.length||0)+(state.done.length===state.planDays?1:0)}}
export function startNextStudyPlan(state,days,now=new Date()){if(!validPlanDays(days)||!planSummary(state).finished)return false;state.planHistory=[...(state.planHistory||[]),{days:state.planDays,start:state.start,completedActivities:planSummary(state).completedActivities,finishedAt:now.getTime()}].slice(-20);state.planDays=days;state.planUnitsDone=[];state.planMetricSelections={};state.done=[];state.start=now.toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'});return true}

/**
 * Resultado observado nas questões que o aluno efetivamente abriu pelo plano.
 * Os IDs são persistidos na primeira seleção e acumulados em novas tentativas;
 * revisões dinâmicas não removem respostas anteriores do denominador.
 */
export function planDayMetrics(state,day,questions=bank){
 const completed=day.units.filter(unit=>(state.planUnitsDone||[]).includes(unit.id)).length;
 const byId=new Map(questions.map((q,index)=>[q.id,{q,index}]));
 const selected=new Set(day.units.flatMap(unit=>state.planMetricSelections?.[unit.id]||[]));
 let answered=0,correct=0;
 for(const id of selected){
  const entry=byId.get(id);
  if(!entry||!Number.isInteger(state.answers?.[entry.index]))continue;
  answered++;
  if(state.answers[entry.index]===entry.q.answer)correct++;
 }
 const total=day.units.length;
 return {completed,total,progress:total?Math.round(completed*100/total):0,answered,correct,accuracy:answered?Math.round(correct*100/answered):null};
}
