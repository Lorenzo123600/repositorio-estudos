import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export function parseOfficialTable(text,day){
 const keys={};
 for(const line of text.split('\n')){
  const a=line.trim().split(/\s+/).filter(v=>v!=='*');if(!/^\d+$/.test(a[0]))continue;
  if(day===1&&+a[0]<=5&&a.length===5&&/^\d+$/.test(a[3])){keys[a[0]+'-ingles']=a[1];keys[a[0]+'-espanhol']=a[2];keys[a[3]]=a[4];}
  else if(a.length===4&&/^\d+$/.test(a[2])){keys[a[0]]=a[1];keys[a[2]]=a[3];}
  else if(a.length===3&&/^\d+$/.test(a[2])){keys[a[0]]=a[1];keys[a[2]]='unresolved';}
  else if(a.length===3&&/^\d+$/.test(a[1])){keys[a[0]]='unresolved';keys[a[1]]=a[2];}
  else if(a.length===2&&/^[ABCDE]$/.test(a[1]))keys[a[0]]=a[1];
  else if(a.length===1)keys[a[0]]='unresolved';
 }
 for(const [,number] of text.matchAll(/Questão\s+(\d+)\s+Anulad[ao]/gi))keys[number]='Anulada';
 return keys;
}
export function officialEvidence(root){
 const path=resolve(root,'references/enem-1000/sources.json');if(!existsSync(path))return null;
 const sources=JSON.parse(readFileSync(path)),keys={},errors=[];
 for(const source of sources){
  const bytes=readFileSync(resolve(root,source.path));if(hash(bytes)!==source.sha256)errors.push('PDF alterado: '+source.path);
  if(source.kind==='gabarito'){
   const text=readFileSync(resolve(root,source.textPath));if(hash(text)!==source.textSha256)errors.push('Extração de gabarito alterada: '+source.textPath);
   const parsed=parseOfficialTable(text.toString(),source.day);
   if(Object.keys(parsed).length!==(source.day===1?95:90))errors.push('Tabela oficial incompleta: '+source.path);
   for(const [id,answer] of Object.entries(parsed))keys[`${source.year}-${id}`]=answer;
  }
 }
 const saved=JSON.parse(readFileSync(resolve(root,'references/enem-1000/answers.json')));
 if(Object.keys(saved).length!==Object.keys(keys).length||Object.entries(keys).some(([id,answer])=>saved[id]!==answer))errors.push('answers.json não corresponde às tabelas oficiais');
 return {sources,keys,errors};
}
export function validateOfficialQuestion(q,evidence,root){
 if(q.validation?.status!=='validated')return [];
 const errors=[];const check=(condition,message)=>{if(!condition)errors.push(`${q.id}: ${message}`)};
 const cid=`enem:${q.year}:regular:blue:${q.number}:${q.language||'pt'}`;
 check(q.canonicalId===cid,'ID canônico inválido');
 check(q.validation.method==='official-pdf-regions-v1','método de validação desconhecido');
 check(q.validation.application==='regular'&&q.validation.booklet==='blue','aplicação/caderno divergentes');
 check(q.officialAnswer==='ABCDE'[q.answer],'resposta oficial divergente');
 const key=`${q.year}-${q.number}`+(q.language?'-'+q.language:'');
 check(evidence?.keys[key]===q.officialAnswer,'gabarito não corresponde à tabela oficial/anulada');
 const source=evidence?.sources.find(s=>s.path===q.validation.statementEvidence);
 const answerSource=evidence?.sources.find(s=>s.path===q.validation.answerEvidence);
 if(q.validation.statementSha256)check(source?.sha256===q.validation.statementSha256,'hash do caderno divergente');
 if(q.validation.answerSha256)check(answerSource?.sha256===q.validation.answerSha256,'hash do gabarito divergente');
 check(source?.year===q.year&&source?.day===q.day&&source?.kind==='prova','prova de origem incorreta');
 check(answerSource?.year===q.year&&answerSource?.day===q.day&&answerSource?.kind==='gabarito','gabarito de origem incorreto');
 check(q.validation.header?.number===q.number,'cabeçalho de questão incorreto');
 check(q.originalStatement?.format==='image'&&q.originalStatement.source===source?.path,'enunciado original ausente');
 check(q.alternatives?.length===5&&q.alternatives.map(a=>a.letter).join('')==='ABCDE','alternativas oficiais fora de ordem');
 for(const alternative of q.alternatives||[]){
  check(!/\b(?:1|2)[º°]?\s*dia\s*[|•-]\s*Caderno\s+\d/i.test(alternative.text||''),'rodapé do caderno na alternativa '+alternative.letter);
 }
 const assets=q.validation.assets||[];check(assets.length===6,'enunciado/cinco alternativas incompletos');
 check(JSON.stringify(assets.map(a=>a.file))===JSON.stringify(q.images),'lista de imagens diverge da evidência');
 check(assets[0]?.file===q.originalStatement?.file,'enunciado original divergente');
 check(q.validation.labels?.map(l=>l.letter).join('')==='ABCDE','marcadores oficiais A–E ausentes');
 let previousBottom=null;
 for(const [i,asset] of assets.entries()){
  check(/^enem-assets\/official\/[a-zA-Z0-9/_.-]+\.webp$/.test(asset.file)&&!asset.file.includes('..'),'caminho de imagem inválido');
  const path=resolve(root,'public',asset.file);if(!existsSync(path)){errors.push(`${q.id}: imagem oficial inexistente`);continue}
  const bytes=readFileSync(path);check(hash(bytes)===asset.sha256,'imagem alterada: '+asset.file);
  check(bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP','imagem sem formato WebP válido');
  check(asset.page===q.validation.header?.page,'recorte fora da página da questão');
  check(Array.isArray(asset.rect)&&asset.rect.length===4&&asset.rect.every(Number.isFinite)&&asset.rect[2]>asset.rect[0]&&asset.rect[3]>asset.rect[1],'coordenadas inválidas');
  check(asset.width>=160&&asset.height>=14,'imagem pequena/incompleta');
  if(previousBottom!==null)check(Math.abs(asset.rect[1]-previousBottom)<.01,'lacuna entre enunciado e alternativas');
  previousBottom=asset.rect[3];
  if(i>0)check(q.alternatives?.[i-1]?.file===asset.file,'imagem de alternativa divergente');
 }
 return errors;
}
