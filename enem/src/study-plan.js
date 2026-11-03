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
export function firstPendingPlanDay(state,schedule=createStudyPlan(state.planDays)){
 const completed=new Set(state.planUnitsDone||[]),index=schedule.findIndex(day=>day.units.some(unit=>!completed.has(unit.id)));
 return index<0?Math.max(0,schedule.length-1):index;
}
export function recordPlanSelection(state,unitId,questionIds,questions=bank){
 if(!Array.isArray(questionIds))return false;
 if(!createStudyPlan(state.planDays).some(day=>day.units.some(unit=>unit.id===unitId)))return false;
 const known=new Set(questions.map(q=>q.id)),previous=state.planMetricSelections?.[unitId]||[];
 const selected=[...new Set([...previous,...questionIds.filter(id=>known.has(id))])].slice(0,200);
 if(selected.length===previous.length&&selected.every((id,i)=>id===previous[i]))return false;
 state.planMetricSelections={...(state.planMetricSelections||{}),[unitId]:selected};return true;
}
export function finishPlanPractice(state,unitId,indices,questions=bank){
 const dayIndex=createStudyPlan(state.planDays).findIndex(day=>day.units.some(unit=>unit.id===unitId));
 if(dayIndex<0||!Array.isArray(indices)||!indices.length||new Set(indices).size!==indices.length||indices.some(id=>!Number.isInteger(id)||id<0||!questions[id]||!Number.isInteger(state.answers?.[id])||state.answers[id]<0||state.answers[id]>4))return {status:'incomplete',changed:false};
 const tracked=recordPlanSelection(state,unitId,indices.map(id=>questions[id].id),questions);
 if(state.planUnitsDone.includes(unitId))return {status:'already-complete',changed:tracked};
 if(!canCompletePlanDay(state,dayIndex))return {status:'blocked',changed:tracked};
 state.planUnitsDone=[...new Set([...state.planUnitsDone,unitId])].sort((a,b)=>a-b);refreshPlanProgress(state);
 return {status:'complete',changed:true};
}
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
 let answered=0,correct=0,selectedCount=0;
 for(const id of selected){
  const entry=byId.get(id);
  if(!entry)continue;
  selectedCount++;
  if(!Number.isInteger(state.answers?.[entry.index])||state.answers[entry.index]<0||state.answers[entry.index]>4)continue;
  answered++;
  if(state.answers[entry.index]===entry.q.answer)correct++;
 }
 const total=day.units.length;
 return {completed,total,progress:total?Math.round(completed*100/total):0,selected:selectedCount,answered,correct,accuracy:answered?Math.round(correct*100/answered):null};
}
