import catalog from './question-catalog.json' with {type:'json'};
import {bank} from './activities.js';
const chunks=new Map(catalog.chunks.flatMap(c=>c.questions.map(q=>[q.index,c])));
const pending=new Map(),manifests=new Map();
async function loadManifest(fetcher,base){
 const url=base?new URL('questions/manifest.json',base).href:'questions/manifest.json';
 if(manifests.has(url))return manifests.get(url);
 const task=(async()=>{const response=await fetcher(url);if(!response.ok)throw new Error('Não foi possível carregar o manifesto local. Tente novamente.');const data=await response.json();if(data.version!==2||!Array.isArray(data.files))throw new Error('Manifesto de questões inválido.');return data})().catch(error=>{manifests.delete(url);throw error});
 manifests.set(url,task);return task;
}
export const questionYears=[...new Set(bank.filter(q=>q.year).map(q=>q.year))].sort((a,b)=>b-a);
export const questionDisciplines=[...new Set(bank.map(q=>q.discipline))];
export async function loadQuestions(ids,{fetcher=globalThis.fetch,base=globalThis.document?.baseURI}={}){
 const needed=[...new Set(ids.filter(id=>bank[id]?.loaded===false).map(id=>chunks.get(id)))];
 if(!needed.length)return;
 const manifest=await loadManifest(fetcher,base);
 await Promise.all(needed.map(chunk=>{
  if(pending.has(chunk.file))return pending.get(chunk.file);
  const task=(async()=>{
   const entry=manifest.files.find(f=>f.file===chunk.file);
   if(entry?.sha256!==chunk.sha256||entry?.count!==chunk.questions.length)throw new Error('O banco foi atualizado. Recarregue esta página; seu progresso está salvo.');
   const url=base?new URL(chunk.file,base).href:chunk.file;
   const response=await fetcher(url);if(!response.ok)throw new Error('Não foi possível carregar as questões. Tente novamente.');
   const data=await response.json();
   if(!Array.isArray(data)||data.length!==chunk.questions.length)throw new Error('Arquivo de questões incompatível.');
   const byId=new Map(data.map(q=>[q.id,q]));if(byId.size!==data.length)throw new Error('IDs duplicados no arquivo de questões.');
   for(const meta of chunk.questions){const q=byId.get(meta.id);if(!q||q.answer!==meta.answer||q.options?.length!==5||q.area!==meta.area||q.year!==meta.year||q.canonicalId!==meta.canonicalId||(q.validation?.status||'legacy')!==meta.validationStatus)throw new Error('Questão incompatível com o catálogo.');}
   // Validate the whole file before replacing any metadata.
   for(const meta of chunk.questions)Object.assign(bank[meta.index],byId.get(meta.id),{loaded:true});
  })().catch(error=>{pending.delete(chunk.file);throw error});
  pending.set(chunk.file,task);return task;
 }));
}
export function waitForQuestions(el,ids,render){
 if(!ids.some(id=>bank[id]?.loaded===false))return false;
 const notice=document.createElement('p');notice.className='note';notice.setAttribute('role','status');notice.textContent='Carregando questões locais…';el.append(notice);
 loadQuestions(ids).then(()=>{if(notice.isConnected)render()}).catch(error=>{
  if(!notice.isConnected)return;notice.textContent=error.message+' ';
  const retry=document.createElement('button');retry.className='text-btn';retry.textContent='Tentar novamente';retry.onclick=render;notice.append(retry);
 });return true;
}
export function catalogFilters(prefix,values={}){
 const options=(items,current,label)=>`<option value="all">${label}</option>`+items.map(v=>`<option value="${v}" ${String(current)===String(v)?'selected':''}>${v}</option>`).join('');
 return `<label>Ano<select id="${prefix}-year">${options(questionYears,values.year,'Todos os anos')}</select></label><label>Disciplina<select id="${prefix}-discipline">${options(questionDisciplines,values.discipline,'Todas as disciplinas')}</select></label>`;
}
