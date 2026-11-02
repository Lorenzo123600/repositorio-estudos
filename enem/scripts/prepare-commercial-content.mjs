import {writeFile} from 'node:fs/promises';
import {questions,plan} from '../src/data.js';
import {extraQuestions,bank,challenges,guapaHints} from '../src/activities.js';
import {essayTopics} from '../src/essays.js';

// Generated server-only material. Never copy this file into public/ or dist/.
const content={data:{questions,plan},activities:{extraQuestions,bank,challenges,guapaHints},essays:{essayTopics}};
await writeFile(new URL('../supabase/functions/_shared/study-content.json',import.meta.url),JSON.stringify(content));
await writeFile(new URL('../src/demo-questions.json',import.meta.url),JSON.stringify(bank.filter(q=>q.origin==='enem').slice(0,3)));
console.log('Conteúdo privado e amostra pública preparados.');
