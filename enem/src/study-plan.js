import {plan} from './data.js';
export const MAX_PLAN_DAYS=180;
export function validPlanDays(value){return Number.isInteger(value)&&value>=1&&value<=MAX_PLAN_DAYS}
export function createStudyPlan(days=14){
 if(!validPlanDays(days))throw new RangeError('Escolha de 1 a 180 dias inteiros.');
 const units=plan.map((content,id)=>({id,content}));
 if(days>14){const final=units.pop();for(let id=14;id<days;id++){const original=plan[(id-14)%13];units.push({id,content:[`Revisão espaçada: ${original[0]}`,original[1],original[2],`Retome as anotações, tente novas questões e compare com sua tentativa anterior. ${original[3]}`]})}units.push(final)}
 return Array.from({length:days},(_,i)=>({units:units.slice(Math.floor(i*units.length/days),Math.floor((i+1)*units.length/days))}));
}
export function refreshPlanProgress(state){const completed=new Set(state.planUnitsDone||[]);state.done=createStudyPlan(state.planDays).flatMap((d,i)=>d.units.every(u=>completed.has(u.id))?[i]:[])}
export function setPlanDuration(state,days){if(!validPlanDays(days))return false;state.planDays=days;refreshPlanProgress(state);return true}
export function setPlanDayComplete(state,index,complete){const schedule=createStudyPlan(state.planDays);if(!Number.isInteger(index)||!schedule[index]||(complete&&!canCompletePlanDay(state,index)))return false;const units=new Set(state.planUnitsDone||[]);for(const unit of schedule[index].units){if(complete)units.add(unit.id);else units.delete(unit.id)}state.planUnitsDone=[...units].sort((a,b)=>a-b);refreshPlanProgress(state);return true}
export function canCompletePlanDay(state,index){const schedule=createStudyPlan(state.planDays);return Number.isInteger(index)&&!!schedule[index]&&Array.from({length:index},(_,i)=>i).every(i=>state.done.includes(i))}
export function planSummary(state){const schedule=createStudyPlan(state.planDays),activeIds=new Set(schedule.flatMap(d=>d.units.map(u=>u.id)));return {totalDays:state.planDays,completedDays:state.done.length,remainingDays:state.planDays-state.done.length,completedActivities:(state.planUnitsDone||[]).filter(id=>activeIds.has(id)).length,totalActivities:activeIds.size,finished:state.done.length===state.planDays,finishedPlans:(state.planHistory?.length||0)+(state.done.length===state.planDays?1:0)}}
export function startNextStudyPlan(state,days,now=new Date()){if(!validPlanDays(days)||!planSummary(state).finished)return false;state.planHistory=[...(state.planHistory||[]),{days:state.planDays,start:state.start,completedActivities:planSummary(state).completedActivities,finishedAt:now.getTime()}].slice(-20);state.planDays=days;state.planUnitsDone=[];state.done=[];state.planActivity=null;state.planQuestion=null;state.start=now.toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'});return true}

// Stable unit IDs survive duration changes, reloads and cloud synchronization.
export function activityForUnit(id){
 if(!Number.isInteger(id)||id<0||id>=MAX_PLAN_DAYS)return null;
 const base=id<14?id:(id-14)%13;
 const subject=plan[base][1];
 if(subject==='Redação')return {type:'essay',tab:'Redação',topic:'inclusao-digital'};
 if(subject==='Simulado')return {type:'exam',tab:'Simulados'};
 if(base===13)return {type:'checklist',tab:'Plano de 14 dias'};
 if(subject==='Revisão')return {type:'review',tab:'Questões'};
 return {type:'questions',tab:'Questões',area:subject};
}
export function completePlanUnit(state,id){
 const schedule=createStudyPlan(state.planDays),day=schedule.findIndex(d=>d.units.some(u=>u.id===id));
 if(day<0||!canCompletePlanDay(state,day))return false;
 state.planUnitsDone=[...new Set([...state.planUnitsDone,id])];refreshPlanProgress(state);return true;
}
