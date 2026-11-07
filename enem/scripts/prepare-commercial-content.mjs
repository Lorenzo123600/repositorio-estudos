import {readFile,writeFile} from 'node:fs/promises';
import catalog from '../src/question-catalog.json' with {type:'json'};
import {commercialQuestion} from './commercial-question.mjs';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {questions,plan} from '../src/data.js';
import {extraQuestions,bank,challenges,guapaHints,matchesQuestion} from '../src/activities.js';
import {essayTopics} from '../src/essays.js';

for(const chunk of catalog.chunks){
 const data=JSON.parse(await readFile(new URL('../public/'+chunk.file,import.meta.url),'utf8'));
 const byId=new Map(data.map(q=>[q.id,q]));
 for(const meta of chunk.questions){
  const q=byId.get(meta.id);
  if(!q||q.answer!==meta.answer||q.options?.length!==5||q.year!==meta.year)throw Error('Questão incompatível com catálogo: '+meta.id);
  Object.assign(bank[meta.index],q,{loaded:true});
 }
}
await writeFile(new URL('../src/demo-summary.json',import.meta.url),JSON.stringify({officialQuestions:bank.filter(q=>matchesQuestion(q)).length,authorQuestions:bank.filter(q=>q.origin==='autoral').length}));

// Generated server-only material. Never copy this file into public/ or dist/.
const content={data:{questions,plan},activities:{extraQuestions,bank:bank.map(commercialQuestion),challenges,guapaHints},essays:{essayTopics}};
const json=JSON.stringify(content);
await writeFile(new URL('../supabase/functions/_shared/study-content.json',import.meta.url),json);
await writeFile(new URL('../supabase/functions/_shared/study-content.payload.json',import.meta.url),JSON.stringify({encoding:'gzip-base64',sha256:createHash('sha256').update(json).digest('hex'),data:gzipSync(json).toString('base64')}));
await writeFile(new URL('../src/demo-questions.json',import.meta.url),JSON.stringify(bank.filter(q=>q.origin==='enem').slice(0,10)));
console.log('Conteúdo privado e amostra pública preparados.');
