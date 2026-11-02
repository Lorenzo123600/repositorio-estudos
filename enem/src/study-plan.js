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
export function setPlanDayComplete(state,index,complete){const schedule=createStudyPlan(state.planDays);if(!Number.isInteger(index)||!schedule[index])return false;const units=new Set(state.planUnitsDone||[]);for(const unit of schedule[index].units){if(complete)units.add(unit.id);else units.delete(unit.id)}state.planUnitsDone=[...units].sort((a,b)=>a-b);refreshPlanProgress(state);return true}
