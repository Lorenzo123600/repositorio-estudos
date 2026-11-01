import {initializeEssays} from './essays.js';
import {bank,challenges} from './activities.js';
const object=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
const integer=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
const ids=v=>Array.isArray(v)?[...new Set(v.filter(id=>integer(id,0,bank.length-1)))]:[];
const answers=v=>Object.fromEntries(Object.entries(object(v)).filter(([id,a])=>/^\d+$/.test(id)&&integer(+id,0,bank.length-1)&&integer(a,0,4)));
const checks=v=>Array.isArray(v)?[...new Set(v.filter(i=>integer(i,0,4)))]:[];
const validDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(new Date(v+'T12:00:00').getTime());
export function normalizeState(input){
 const source=object(input),state={};
 state.done=Array.isArray(source.done)?[...new Set(source.done.filter(i=>integer(i,0,13)))]:[];
 state.answers=answers(source.answers);state.essay=typeof source.essay==='string'?source.essay:'';state.checks=checks(source.checks);
 state.start=validDate(source.start)?source.start:new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'});
 state.activities=Object.fromEntries(Object.entries(object(source.activities)).filter(([day,v])=>validDate(day)&&v&&typeof v==='object').map(([day,v])=>[day,{questions:ids(v.questions),challenges:Array.isArray(v.challenges)?v.challenges.filter(id=>challenges.some(c=>c.id===id)):[],exams:Array.isArray(v.exams)?v.exams.filter(Number.isFinite):[],writing:v.writing===true}]));
 state.challengeAnswers=Object.fromEntries(Object.entries(object(source.challengeAnswers)).filter(([id,a])=>challenges.some(c=>c.id===id&&integer(a,0,c.options.length-1))));
 state.challengeDone=Object.fromEntries(Object.entries(object(source.challengeDone)).filter(([id,v])=>v===true&&challenges.some(c=>c.id===id)));
 state.examHistory=Array.isArray(source.examHistory)?source.examHistory.filter(h=>h&&Number.isFinite(h.finishedAt)&&integer(h.total,1,bank.length)&&integer(h.correct,0,h.total)).slice(0,20).map(h=>({id:Number.isFinite(h.id)?h.id:h.finishedAt,finishedAt:h.finishedAt,total:h.total,correct:h.correct})):[];
 const e=object(source.activeExam);
 state.activeExam=null;
 if(Array.isArray(e.ids)&&e.ids.length&&ids(e.ids).length===e.ids.length&&Number.isFinite(e.deadline)&&Number.isFinite(e.startedAt)&&integer(e.index??0,0,e.ids.length-1))state.activeExam={ids:ids(e.ids),answers:Object.fromEntries(Object.entries(answers(e.answers)).filter(([id])=>e.ids.includes(+id))),index:e.index??0,deadline:e.deadline,startedAt:e.startedAt,finished:e.finished===true,finishedAt:Number.isFinite(e.finishedAt)?e.finishedAt:undefined,reason:e.reason==='timeout'?'timeout':'manual'};
 state.essayDrafts=object(source.essayDrafts);state.essayChecks=object(source.essayChecks);state.essayTopic=source.essayTopic;initializeEssays(state);return state;
}
