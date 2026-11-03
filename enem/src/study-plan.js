import {plan} from './data.js';
import {planPractice} from './plan-practice.js';
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
export function startNextStudyPlan(state,days,now=new Date()){if(!validPlanDays(days)||!planSummary(state).finished)return false;state.planHistory=[...(state.planHistory||[]),{days:state.planDays,start:state.start,completedActivities:planSummary(state).completedActivities,finishedAt:now.getTime()}].slice(-20);state.planDays=days;state.planUnitsDone=[];state.done=[];state.start=now.toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'});return true}

// Um conjunto por dia: questões repetidas não inflam o aproveitamento.
export function planDayMetrics(state,day){
 const units=day.units;
 const completed=units.filter(u=>(state.planUnitsDone||[]).includes(u.id)).length;
 const ids=new Set();
 for(const unit of units){
  const practice=planPractice(unit.id,state.answers||{});
  for(const id of practice?.ids||[])ids.add(id);
 }
 const answered=[...ids].filter(id=>Number.isInteger(state.answers?.[id]));
 const correct=answered.filter(id=>bank[id]&&state.answers[id]===bank[id].answer).length;
 return {completed,total:units.length,progress:units.length?Math.round(completed*100/units.length):0,answered:answered.length,correct,accuracy:answered.length?Math.round(correct*100/answered.length):null};
}
