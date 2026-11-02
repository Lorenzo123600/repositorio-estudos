import test from 'node:test';
import assert from 'node:assert/strict';
import {plan,questions,score,subjects} from '../src/data.js';
test('plano cobre os 14 dias e todas as áreas de revisão',()=>{assert.equal(plan.length,14);for(const s of ['Linguagens','Humanas','Redação','Matemática','Natureza']) assert.ok(plan.some(p=>p[1]===s));});
test('questões têm cinco alternativas, gabarito válido e explicação',()=>{assert.equal(questions.length,8);for(const q of questions){assert.equal(q.options.length,5);assert.ok(q.answer>=0&&q.answer<5);assert.ok(q.explanation.length>40);assert.ok(subjects.includes(q.area));}});
test('pontuação diferencia respostas certas, erradas e ausentes',()=>{assert.equal(score({}),0);assert.equal(score({0:1,1:0}),1);assert.equal(score(Object.fromEntries(questions.map((q,i)=>[i,q.answer]))),8);});

const {bank,challenges,makeExam,examResult,todayKey}=await import('../src/activities.js');
const {loadQuestions}=await import('../src/question-loader.js');
const {readFileSync}=await import('node:fs');
await loadQuestions(bank.map((_,i)=>i),{fetcher:async path=>({ok:true,json:async()=>JSON.parse(readFileSync('public/'+path,'utf8'))})});
const expectedSize=92+JSON.parse(readFileSync('src/question-catalog.json','utf8')).chunks.reduce((n,c)=>n+c.questions.length,0);
const {recordActivity,missionStatus,achievementList,finishExam,examTime}=await import('../src/features.js');
test('banco preserva índices publicados e mantém alternativas e gabaritos válidos',()=>{assert.equal(bank.length,expectedSize);assert.equal(new Set(bank.map(q=>q.id)).size,expectedSize);for(const q of bank){assert.equal(q.options.length,5);assert.ok(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<5);assert.ok(q.explanation.length>35);}for(const area of subjects.slice(1))assert.ok(bank.filter(q=>q.area===area).length>70);});
test('minissimulados não repetem questões e abrangem quatro áreas',()=>{for(const count of [10,20]){const ids=makeExam(count,()=>0.4);assert.equal(ids.length,count);assert.equal(new Set(ids).size,count);assert.equal(new Set(ids.map(i=>bank[i].area)).size,4);}});
test('resultado preserva denominador de questões não respondidas',()=>{const ids=makeExam(10,()=>0.2);const answers={[ids[0]]:bank[ids[0]].answer,[ids[1]]:(bank[ids[1]].answer+1)%5};const r=examResult({ids,answers});assert.equal(r.correct,1);assert.equal(r.total,10);assert.equal(Object.values(r.areas).reduce((n,a)=>n+a.total,0),10);});
test('finalização é idempotente e incorpora apenas respostas existentes',()=>{const ids=makeExam(10,()=>0.3),state={done:[],answers:{},essay:'',activeExam:{ids,answers:{[ids[0]]:bank[ids[0]].answer},startedAt:123,deadline:Date.now()-1000}};let saves=0;assert.equal(examTime(state.activeExam),0);finishExam(state,()=>saves++,'timeout');finishExam(state,()=>saves++);assert.equal(saves,1);assert.equal(state.examHistory.length,1);assert.equal(state.examHistory[0].correct,1);assert.equal(state.activeExam.reason,'timeout');assert.equal(Object.keys(state.answers).length,1);assert.ok(achievementList(state).find(a=>a[0]==='Ritmo de prova')[2]);});
test('missões não duplicam atividade e pausas preservam conquistas',()=>{const state={done:[0],answers:{},essay:'',activities:{'2000-01-01':{questions:[1,2,3],challenges:['erro'],exams:[],writing:true}}};assert.equal(missionStatus(state).filter(m=>m.done).length,0);for(const i of [0,0,1,2])recordActivity(state,'questions',i);recordActivity(state,'challenges','erro');recordActivity(state,'writing');assert.equal(state.activities[todayKey()].questions.length,3);assert.equal(missionStatus(state).filter(m=>m.done).length,3);assert.equal(state.activities['2000-01-01'].writing,true);assert.equal(achievementList(state)[0][2],true);});
test('dia das missões segue o horário de São Paulo',()=>{assert.equal(todayKey(new Date('2026-11-02T01:00:00Z')),'2026-11-01');});
test('desafios têm alternativas e explicação compatíveis',()=>{assert.equal(new Set(challenges.map(c=>c.id)).size,challenges.length);for(const c of challenges){assert.ok(c.answer>=0&&c.answer<c.options.length);assert.ok(c.explanation.length>40);}});

test('Guapa tem identidade acessível, pistas para todos os desafios e falas sem forçar aproximação',async()=>{const {guapa,guapaHints,guapaMessage}=await import('../src/activities.js');assert.match(guapa(),/role="img"/);assert.match(guapa(),/shih-tzu/);for(const c of challenges)assert.ok(guapaHints[c.id]?.length>40);assert.match(guapaMessage(0),/medo de capivara/);assert.match(guapaMessage(1),/no meu tempo/);assert.match(guapaMessage(3),/respeita meu espaço/);});

test('temas de redação preservam rascunho antigo, textos e checklists independentes',async()=>{const {essayTopics,initializeEssays,selectEssayTopic}=await import('../src/essays.js');assert.equal(essayTopics.length,12);assert.equal(new Set(essayTopics.map(t=>t.id)).size,12);const state={essay:'Meu rascunho antigo',checks:[0,3]};initializeEssays(state);assert.equal(state.essayTopic,'inclusao-digital');assert.equal(state.essay,'Meu rascunho antigo');selectEssayTopic(state,'saude-mental');assert.equal(state.essay,'');assert.deepEqual(state.checks,[]);state.essayDrafts['saude-mental']='Texto sobre saúde';state.essayChecks['saude-mental']=[2];selectEssayTopic(state,'inclusao-digital');assert.equal(state.essay,'Meu rascunho antigo');assert.deepEqual(state.checks,[0,3]);const restored=JSON.parse(JSON.stringify(state));initializeEssays(restored);selectEssayTopic(restored,'saude-mental');assert.equal(restored.essay,'Texto sobre saúde');assert.deepEqual(restored.checks,[2]);assert.equal(selectEssayTopic(restored,'invalido'),false);});


test('questões reais têm fonte, ano, níveis equilibrados e imagens locais existentes',async()=>{
 const {existsSync}=await import('node:fs');const real=bank.slice(20,92);assert.equal(real.length,72);assert.equal(new Set(bank.map(q=>q.id)).size,expectedSize);
 for(const area of subjects.slice(1))for(const difficulty of ['facil','medio','dificil'])assert.equal(real.filter(q=>q.area===area&&q.difficulty===difficulty).length,6);
 for(const q of real){assert.equal(q.year,2023);assert.match(q.source,/github.com\/yunger7\/enem-api/);assert.ok(q.context.length>20);assert.ok(q.difficultyReason.length>20);for(const match of q.context.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g))assert.ok(existsSync('public/'+match[1]),match[1]);}
});
test('simulados filtram nível e rejeitam pedidos maiores que o banco',()=>{
 for(const difficulty of ['facil','medio','dificil']){const available=bank.filter(q=>q.origin==='enem'&&!q.cancelled&&q.validationStatus!=='pending'&&q.difficulty===difficulty).length;const ids=makeExam(10,()=>0.3,{difficulty});assert.equal(ids.length,10);assert.equal(new Set(ids).size,10);assert.ok(ids.every(id=>bank[id].origin==='enem'&&bank[id].difficulty===difficulty));assert.equal(makeExam(Math.min(20,available),Math.random,{difficulty}).length,Math.min(20,available));assert.throws(()=>makeExam(25,Math.random,{difficulty}),RangeError);}
 assert.throws(()=>makeExam(0),RangeError);assert.throws(()=>makeExam(bank.filter(q=>q.origin==='enem'&&!q.cancelled).length+1),RangeError);
});
test('normalização preserva estudo e rejeita dados inválidos antes de renderizar',async()=>{
 const {normalizeState}=await import('../src/state.js');const state=normalizeState({done:[0,0,99],answers:{20:2,[bank.length+10]:0,x:1},start:'<img src=x>',examHistory:[{finishedAt:2,total:'<script>',correct:0}],activeExam:{ids:[20,20],deadline:5,startedAt:1},activities:{'2026-11-01':null}});
 assert.deepEqual(state.done,[0]);assert.deepEqual(state.answers,{'20':2});assert.equal(state.examHistory.length,0);assert.equal(state.activeExam,null);assert.match(state.start,/^\d{4}-\d{2}-\d{2}$/);assert.deepEqual(state.activities,{});
});
test('renderização de questões escapa HTML e não aceita imagens externas',async()=>{const {richText}=await import('../src/question-view.js');assert.match(richText('<script>alert(1)</script>'),/&lt;script&gt;/);assert.doesNotMatch(richText('![](https://evil.test/a.png)'),/<img/);assert.match(richText('![](enem-assets/2023/questions/1/test.png)'),/<img src="enem-assets/);});

test('referências conferidas trazem aplicação, dia e caderno, sem links na interface',async()=>{
 const {readFileSync}=await import('node:fs');const review=JSON.parse(readFileSync('references/enem-2023-review.json','utf8'));const {questionSource}=await import('../src/question-view.js');
 assert.equal(review.questions.length,72);
 for(const q of bank.slice(20,92)){const r=review.questions.find(r=>r.number===q.number);assert.ok(r?.promptMatches);assert.equal(r.answer,'ABCDE'[q.answer]);assert.equal(q.day,r.day);assert.equal(q.booklet,r.booklet);assert.equal(q.application,r.application);assert.ok(q.referenceSource===r.referenceUrl);const html=questionSource(q);assert.match(html,/Caderno Azul/);assert.match(html,/1ª aplicação/);assert.doesNotMatch(html,/<a\b|href=|github\.com/);}
});
test('ampliação preserva os índices das 36 questões reais anteriores',()=>{
 const original=[8,10,35,9,15,39,7,13,18,53,60,64,58,61,78,59,73,79,100,105,106,104,107,127,118,119,135,137,139,151,138,143,155,136,160,158];
 assert.deepEqual(bank.slice(20,56).map(q=>q.id),original.map(n=>`enem-2023-${n}`));
 const saved={20:bank[20].answer,55:bank[55].answer};assert.equal(Object.entries(saved).filter(([id,a])=>bank[id].answer===a).length,2);
});
