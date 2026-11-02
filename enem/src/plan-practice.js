import {bank,matchesQuestion} from './activities.js';
import {plan} from './data.js';

// Reviewed selections, not an area-wide keyword fallback. IDs remain stable
// when lazy chunks load or a student changes the duration of their plan.
export const planQuestionSets={
 0:['enem-2023-11','enem-2022-26','enem-2023-28','enem-2018-12','enem-2020-6','enem-2023-13','enem-2023-18','enem-2023-31','enem-2019-6','enem-2023-15'],
 1:['enem-2023-60','enem-2023-69','enem-2023-75','enem-2018-78','enem-2019-66','enem-2019-72','enem-2019-79','enem-2019-84','enem-2020-76','enem-2018-58'],
 2:['enem-2023-11','enem-2019-6','enem-2023-8','enem-2023-60','enem-2023-69','enem-2023-75','enem-2023-64','enem-2020-76','enem-2019-84','enem-2023-15'],
 3:['enem-2023-8','enem-2023-15','enem-2023-18','enem-2023-31','enem-2023-28','enem-2018-25','enem-2019-43','enem-2020-27','enem-2019-6','enem-2022-26'],
 4:['enem-2022-49','enem-2022-55','enem-2022-87','enem-2023-64','enem-2023-68','enem-2018-67','enem-2019-46','enem-2019-75','enem-2020-50','enem-2020-80'],
 5:['enem-2023-11','enem-2019-6','enem-2023-8','enem-2023-60','enem-2023-69','enem-2023-75','enem-2023-64','enem-2020-76','enem-2019-84','enem-2023-15'],
 7:['enem-2023-143','enem-2023-167','enem-2022-161','enem-2022-163','enem-2022-167','enem-2023-149','enem-2017-158','enem-2018-157','enem-2019-158','enem-2020-167'],
 8:['enem-2022-99','enem-2018-98','enem-2019-123','enem-2020-95','enem-2024-108','enem-2020-103','enem-2024-134','enem-2020-127','enem-2023-130','enem-2019-115'],
 9:['enem-2023-137','enem-2023-138','enem-2023-140','enem-2023-160','enem-2022-138','enem-2022-149','enem-2018-166','enem-2018-167','enem-2019-167','enem-2020-180'],
 10:['enem-2023-120','enem-2023-122','enem-2022-93','enem-2018-115','enem-2019-92','enem-2019-102','enem-2020-98','enem-2020-105','enem-2024-92','enem-2024-103']
};
export function basePlanUnit(id){return Number.isInteger(id)&&id>=0&&id<180?(id<14?id:(id-14)%13):null}
const union=units=>{const sets=units.map(id=>planQuestionSets[id]||[]),ids=[];for(let i=0;i<Math.max(...sets.map(s=>s.length));i++)for(const set of sets)if(set[i])ids.push(set[i]);return [...new Set(ids)]};
export function planPractice(unitId,answers={},questions=bank){
 const base=basePlanUnit(unitId);if(base===null)return null;
 const title=plan[base]?.[2];
 let scope=planQuestionSets[base];
 if(base===6)scope=union([0,1,3,4]);
 if(base===11||base===13)scope=union([7,9,10]);
 if(base===12)scope=questions.filter(q=>matchesQuestion(q)).map(q=>q.id);
 if(!scope)return null;
 const byId=new Map(questions.map((q,index)=>[q.id,{q,index}]));
 let candidates=scope.flatMap(id=>{const item=byId.get(id);return item&&matchesQuestion(item.q)?[item]:[]});
 const isReview=[6,12,13].includes(base);
 const errors=candidates.filter(({q,index})=>answers[index]!==undefined&&answers[index]!==q.answer);
 if(base===12&&errors.length)candidates=errors;
 else candidates.sort((a,b)=>{
  const priority=({q,index})=>answers[index]===undefined?1:answers[index]!==q.answer?0:2;
  return isReview?priority(a)-priority(b):0;
 });
 if(base===12&&!errors.length){const groups=['Linguagens','Humanas','Natureza','Matemática'].map(area=>candidates.filter(x=>x.q.area===area));candidates=[];for(let i=0;i<Math.max(...groups.map(g=>g.length));i++)for(const group of groups)if(group[i])candidates.push(group[i]);}
 // Interleave Math/Natureza in the timed block instead of taking one area only.
 if(base===11||base===13){const math=candidates.filter(x=>x.q.area==='Matemática'),science=candidates.filter(x=>x.q.area==='Natureza');candidates=[];for(let i=0;i<Math.max(math.length,science.length);i++)for(const group of [math,science])if(group[i])candidates.push(group[i]);}
 const selected=candidates.slice(0,10);
 return {unitId,base,title,ids:selected.map(x=>x.index),questionIds:selected.map(x=>x.q.id),writing:base===2||base===5,
  label:base===2||base===5?'Argumentação e repertório para redação':base===12?(errors.length?'Revisão dos seus erros':'Revisão guiada — ainda não há erros registrados'):title,
  note:base===12&&!errors.length?'Você ainda não tem erros registrados. Esta seleção serve como revisão inicial.':base===2||base===5?'Questões de apoio à escrita. A produção do texto acontece no editor de redação.':'Seleção por assunto. Suas respostas anteriores são preservadas.'};
}
