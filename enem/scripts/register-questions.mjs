// Register a complete, officially verified file; all state updates roll back together.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validateQuestion,validateBank} from './validate-questions.mjs';
import {officialEvidence,validateOfficialQuestion} from './validate-official.mjs';
const file=process.argv[2],root=process.cwd();
if(!/^questions\/[a-zA-Z0-9_.-]+\.json$/.test(file||''))throw new Error('Uso: node scripts/register-questions.mjs questions/ANO.json');
const paths=['src/question-catalog.json','public/questions/manifest.json','references/enem-1000/report.json','references/enem-1000/pending.json'];
const snapshots=new Map(paths.map(p=>[p,readFileSync(p,'utf8')]));
const catalog=JSON.parse(snapshots.get(paths[0])),report=JSON.parse(snapshots.get(paths[2]));
if(catalog.chunks.some(c=>c.file===file))throw new Error('Arquivo já registrado; preserve IDs e ordem.');
const bytes=readFileSync('public/'+file),questions=JSON.parse(bytes);
if(!Array.isArray(questions)||!questions.length)throw new Error('Array não vazio obrigatório.');
const legacy=JSON.parse(readFileSync('src/official-questions.json'));
const existing=[...legacy,...catalog.chunks.flatMap(c=>JSON.parse(readFileSync('public/'+c.file)))];
const seen=new Set(existing.map(q=>q.id)),canonical=new Set(existing.map(q=>q.canonicalId));
const evidence=officialEvidence(root),errors=[...(evidence?.errors||[])];
for(const q of questions){
 errors.push(...validateQuestion(q,seen));
 if(q.validation?.status!=='validated')errors.push(q.id+': pendente; mantenha fora de public/');
 errors.push(...validateOfficialQuestion(q,evidence,root));
 if(canonical.has(q.canonicalId))errors.push(q.id+': ID canônico duplicado');canonical.add(q.canonicalId);
}
if(errors.length)throw new Error(errors.join('\n'));
let index=catalog.legacyCount+catalog.chunks.reduce((n,c)=>n+c.questions.length,0);
catalog.chunks.push({file,sha256:createHash('sha256').update(bytes).digest('hex'),questions:questions.map(q=>({...Object.fromEntries(['id','year','number','area','discipline','language','difficulty','answer','origin','topic','canonicalId','contentFingerprint'].map(k=>[k,q[k]??null])),validationStatus:q.validation.status,index:index++}))});
const all=[...existing,...questions],validated=all.filter(q=>q.validation?.status==='validated'),ids=new Set(questions.map(q=>q.id));
const eligible=all.filter(q=>!['pending','cancelled'].includes(q.validation?.status)&&q.id!=='enem-2023-164');
const manifest={version:2,validatedCount:validated.length,totalEligible:eligible.length,years:[...new Set(all.map(q=>q.year))].sort(),files:catalog.chunks.map(c=>({file:c.file,sha256:c.sha256,count:c.questions.length,years:[...new Set(c.questions.map(q=>q.year))].sort()}))};
report.validated=validated.length;report.targetReached=validated.length>=1000;report.found=Object.keys(evidence.keys).length;
report.pending=report.pending.filter(q=>!ids.has(q.id));report.rejected=report.rejected.filter(q=>!ids.has(q.id));
report.totalStored=all.length;report.totalEligible=eligible.length;report.legacyNotCounted=eligible.length-validated.length;
const baseline=new Set(JSON.parse(readFileSync('references/enem-1000/baseline.json')).questions.map(q=>q.id));report.newImported=validated.filter(q=>!baseline.has(q.id)).length;
const counts=new Map();for(const q of validated){const key=q.year+'|'+q.area;counts.set(key,(counts.get(key)||0)+1)}
report.counts=[...counts].sort().map(([k,count])=>{const [year,area]=k.split('|');return {year:+year,area,count}});
try{
 for(const [path,value] of [[paths[0],catalog],[paths[1],manifest],[paths[2],report],[paths[3],[...report.pending,...report.rejected]]])writeFileSync(path,JSON.stringify(value,null,2)+'\n');
 const result=validateBank();if(result.errors.length)throw new Error(result.errors.join('\n'));
 console.log(`${questions.length} questões verificadas registradas; índices anteriores preservados.`);
}catch(error){for(const [path,original] of snapshots)writeFileSync(path,original);throw error}
