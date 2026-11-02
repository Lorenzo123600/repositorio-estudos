import {officialEvidence,validateOfficialQuestion} from './validate-official.mjs';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>JSON.parse(readFileSync(resolve(root,path),'utf8'));
export function validateQuestion(q,seen=new Set()){
 if(!q||typeof q!=='object')return ['Registro de questão inválido'];
 const options=Array.isArray(q.options)?q.options:[];
 const errors=[];const check=(condition,message)=>{if(!condition)errors.push(`${q.id||'(sem ID)'}: ${message}`)};
 check(typeof q.id==='string'&&q.id.length>0&&!seen.has(q.id),'ID ausente/duplicado');seen.add(q.id);
 check(Number.isInteger(q.year)&&q.year>=1998,'ano inválido');
 check(['Linguagens','Humanas','Natureza','Matemática'].includes(q.area),'área inválida');
 check(typeof q.discipline==='string'&&q.discipline.length>0,'disciplina ausente');
 check(typeof q.text==='string'&&q.text.trim().length>0,'enunciado ausente');
 check(Array.isArray(q.options)&&q.options.length===5&&q.options.every(v=>typeof v==='string'&&v.trim()),'cinco alternativas obrigatórias');
 check(new Set(options).size===5,'alternativas repetidas');
 check(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<5,'resposta inválida');
 check(typeof q.source==='string'&&q.source.startsWith('https://'),'fonte ausente');
 const referenced=[];
 for(const value of [q.context,q.text,...options].filter(v=>typeof v==='string')){
  check(!/https?:\/\/enem\.dev|broken-image|data:image|<img\b/.test(value),'conteúdo visual externo/não suportado');
  for(const [,path] of value.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)){
   referenced.push(path);check(/^enem-assets\/[a-zA-Z0-9/_.-]+$/.test(path)&&!path.includes('..')&&existsSync(resolve(root,'public',path)),'imagem inexistente/insegura: '+path);
  }
 }
 check(JSON.stringify([...new Set(referenced)].sort())===JSON.stringify([...(q.images||[])].sort()),'lista de imagens difere do conteúdo');
 return errors;
}
const normalized=value=>value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function validateBank(){
 const catalog=read('src/question-catalog.json'),keys=read('references/official-keys/answers.json'),legacy=read('src/official-questions.json');
 const legacyEvidence=[...read('references/official-keys/provenance.json'),...read('references/official-booklets/provenance.json')];
 const evidenceErrors=[];const officialTexts=new Map();
 for(const record of legacyEvidence){
  for(const field of ['pdf','text'])if(record[field]){const bytes=readFileSync(resolve(root,record[field]));if(createHash('sha256').update(bytes).digest('hex')!==record[field+'Sha256'])evidenceErrors.push(record[field]+': evidência alterada');}
  if(record.text.includes('official-booklets'))officialTexts.set(`${record.year}-${record.day}`,normalized(readFileSync(resolve(root,record.text),'utf8')));
 }
 const extracted={};
 for(const record of read('references/official-keys/provenance.json'))for(const line of readFileSync(resolve(root,record.text),'utf8').split('\n')){
  const a=line.trim().split(/\s+/);if(!/^\d+$/.test(a[0]))continue;const prefix=record.year+'-';
  if(record.day===1&&+a[0]<=5&&a.length===5){extracted[prefix+a[0]+'-ingles']=a[1];extracted[prefix+a[0]+'-espanhol']=a[2];extracted[prefix+a[3]]=a[4];}
  else if(a.length===4&&/^\d+$/.test(a[2])){extracted[prefix+a[0]]=a[1];extracted[prefix+a[2]]=a[3];}
 }
 const expectedAnswers=read('references/official-keys/provenance.json').reduce((n,r)=>n+(r.day===1?95:90),0);
 if(Object.keys(extracted).length!==expectedAnswers||Object.keys(keys).length!==expectedAnswers||Object.entries(extracted).some(([k,v])=>keys[k]!==v))evidenceErrors.push('answers.json difere dos gabaritos extraídos');
 const evidence=officialEvidence(root);
 const baselineIds=new Set(evidence?read('references/enem-1000/baseline.json').questions.map(q=>q.id):[]);
 const seen=new Set(legacy.map(q=>q.id));const canonicals=new Set(),fingerprints=new Set();
 const errors=[...evidenceErrors,...(evidence?.errors||[])];let next=92,total=0;
 for(const chunk of catalog.chunks){
  const bytes=readFileSync(resolve(root,'public',chunk.file));
  if(createHash('sha256').update(bytes).digest('hex')!==chunk.sha256)errors.push(chunk.file+': hash divergente');
  const questions=JSON.parse(bytes);
  if(questions.length!==chunk.questions.length)errors.push(chunk.file+': contagem divergente');
  for(let i=0;i<questions.length;i++){
   const q=questions[i],meta=chunk.questions[i];const structural=validateQuestion(q,seen);errors.push(...structural);total++;
   if(structural.length)continue;
   if(evidence&&!baselineIds.has(q.id)&&q.validation?.status!=='validated')errors.push(q.id+': novo registro não validado não pode ser publicado');
   if(meta?.index!==next++)errors.push(q.id+': índice persistido alterado');
   for(const key of ['id','year','number','area','discipline','language','difficulty','answer','origin','topic'])if(q[key]!==meta?.[key])errors.push(q.id+': catálogo divergente em '+key);
   if(q.validation?.status==='validated'){
    errors.push(...validateOfficialQuestion(q,evidence,root));
    if(canonicals.has(q.canonicalId))errors.push(q.id+': ID canônico duplicado');canonicals.add(q.canonicalId);
    if(fingerprints.has(q.contentFingerprint))errors.push(q.id+': conteúdo duplicado');fingerprints.add(q.contentFingerprint);
   }
   if(meta?.validationStatus!==(q.validation?.status||'legacy'))errors.push(q.id+': status divergente do catálogo');
   if(meta?.canonicalId!==q.canonicalId)errors.push(q.id+': ID canônico divergente do catálogo');
   const official=officialTexts.get(`${q.year}-${q.day}`);
   for(const [i,option] of (q.options||[]).entries())if(!option.includes('![')&&normalized(option).length>1&&!official?.includes(normalized(option)))errors.push(q.id+': alternativa '+i+' diverge do texto oficial');
   const key=`${q.year}-${q.number}`+(q.language?'-'+q.language:'');
   if(q.validation?.status!=='validated'&&keys[key]!=='ABCDE'[q.answer])errors.push(q.id+': divergência com gabarito oficial/anulada');
   if(!existsSync(resolve(root,q.answerVerification)))errors.push(q.id+': PDF de conferência ausente');
   const expected=q.number<=45?'Linguagens':q.number<=90?'Humanas':q.number<=135?'Natureza':'Matemática';if(q.area!==expected)errors.push(q.id+': área incompatível com caderno azul');
  }
 }
 for(const q of legacy){if(q.validation?.status==='validated'){errors.push(...validateOfficialQuestion(q,evidence,root));if(canonicals.has(q.canonicalId))errors.push(q.id+': ID canônico duplicado');canonicals.add(q.canonicalId);if(fingerprints.has(q.contentFingerprint))errors.push(q.id+': conteúdo duplicado');fingerprints.add(q.contentFingerprint);}const key=keys[`${q.year}-${q.number}`];if(key!=='ABCDE'[q.answer]&&!(q.id==='enem-2023-164'&&key==='Anulado'))errors.push(q.id+': gabarito legado divergente');}
 const registered=new Set(catalog.chunks.map(c=>c.file));for(const file of readdirSync(resolve(root,'public/questions')))if(file.endsWith('.json')&&file!=='manifest.json'&&!registered.has('questions/'+file))errors.push(file+': JSON não registrado; não deve ser publicado');
 if(evidence){
  const report=read('references/enem-1000/report.json');if(report.validated!==canonicals.size)errors.push('Contagem de validadas difere dos dados reais');
  const accounted=new Set(canonicals);for(const q of [...report.pending,...report.rejected]){if(accounted.has(q.canonicalId))errors.push(q.id+': duplicação entre validadas e quarentena');accounted.add(q.canonicalId)}if(accounted.size!==report.found)errors.push('Questões encontradas não correspondem à soma de validadas/pendentes/rejeitadas');
  const baseline=read('references/enem-1000/baseline.json');const all=[...legacy.map((q,i)=>({...q,index:i+20})),...catalog.chunks.flatMap(c=>c.questions)];
  for(const old of baseline.questions){const current=all.find(q=>q.id===old.id);if(current?.index!==old.index||current?.answer!==old.answer)errors.push(old.id+': índice/gabarito histórico alterado');}
  const manifest=read('public/questions/manifest.json');if(manifest.validatedCount!==canonicals.size)errors.push('Manifesto com contagem divergente');
  for(const c of catalog.chunks){const m=manifest.files.find(f=>f.file===c.file);if(m?.sha256!==c.sha256||m?.count!==c.questions.length)errors.push(c.file+': manifesto divergente');}
 }
 return {total,errors};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const {total,errors}=validateBank();if(process.argv.includes('--require-target')){const report=read('references/enem-1000/report.json');if(report.validated<1000||!report.targetReached)errors.push('Meta de 1.000 questões validadas ainda não concluída; publicação bloqueada.');}if(errors.length){console.error(errors.join('\n'));process.exitCode=1}else console.log(`OK: ${total} questões nos arquivos locais. Validações e histórico conferidos.`);
}
