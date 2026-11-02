// Append a reviewed, local JSON file without renumbering any existing question.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validateQuestion,validateBank} from './validate-questions.mjs';
const file=process.argv[2];
if(!/^questions\/[a-zA-Z0-9_.-]+\.json$/.test(file||''))throw new Error('Uso (na pasta enem): node scripts/register-questions.mjs questions/ANO-AREA.json');
const path='src/question-catalog.json',original=readFileSync(path,'utf8'),catalog=JSON.parse(original);
if(catalog.chunks.some(c=>c.file===file))throw new Error('Arquivo já registrado. Não remova nem reordene os registros existentes.');
const bytes=readFileSync('public/'+file),questions=JSON.parse(bytes);
if(!Array.isArray(questions)||!questions.length)throw new Error('O arquivo deve conter um array não vazio.');
const seen=new Set([...JSON.parse(readFileSync('src/official-questions.json','utf8')).map(q=>q.id),...catalog.chunks.flatMap(c=>c.questions.map(q=>q.id))]);
const errors=questions.flatMap(q=>validateQuestion(q,seen));if(errors.length)throw new Error(errors.join('\n'));
let index=catalog.legacyCount+catalog.chunks.reduce((n,c)=>n+c.questions.length,0);
catalog.chunks.push({file,sha256:createHash('sha256').update(bytes).digest('hex'),questions:questions.map(q=>({...Object.fromEntries(['id','year','number','area','discipline','language','difficulty','answer','origin','topic'].map(k=>[k,q[k]??(k==='language'?null:undefined)])),index:index++}))});
try{
 writeFileSync(path,JSON.stringify(catalog,null,2)+'\n');const result=validateBank();if(result.errors.length)throw new Error(result.errors.join('\n'));
 console.log(`${questions.length} questões registradas; índices anteriores preservados.`);
}catch(error){writeFileSync(path,original);throw error}
