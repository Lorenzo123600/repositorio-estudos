import {parseAst} from 'rollup/parseAst';
import {rm} from 'node:fs/promises';
import {resolve} from 'node:path';

const protectedFields={data:['questions','plan'],activities:['extraQuestions','bank','challenges','guapaHints'],essays:['essayTopics']};
export function protectContent(code,kind){
 const fields=protectedFields[kind];
 if(!fields)return null;
 const changes=[],found=new Set();
 for(const node of parseAst(code).body){
  if(kind==='activities'&&node.type==='ImportDeclaration'&&['./official-questions.json','./question-catalog.json'].includes(node.source.value))changes.push([node.start,node.end,'']);
  if(kind==='activities'&&node.type==='ForOfStatement'&&node.right?.object?.name==='catalog')changes.push([node.start,node.end,'']);
  const declaration=node.type==='ExportNamedDeclaration'?node.declaration:node;
  if(declaration?.type!=='VariableDeclaration')continue;
  for(const variable of declaration.declarations){
   if(fields.includes(variable.id.name)){found.add(variable.id.name);changes.push([variable.init.start,variable.init.end,`globalThis.__ENEM_CONTENT__.${kind}.${variable.id.name}`]);}
  }
 }
 if(fields.some(field=>!found.has(field)))throw Error(`Não foi possível proteger todo o conteúdo de ${kind}.`);
 for(const [start,end,replacement] of changes.sort((a,b)=>b[0]-a[0]))code=code.slice(0,start)+replacement+code.slice(end);
 return code;
}
export function protectQuestionLoader(code){
 const changes=[];
 for(const node of parseAst(code).body){
  if(node.type==='ImportDeclaration'&&node.source.value==='./question-catalog.json')changes.push([node.start,node.end,'']);
  if(node.type==='VariableDeclaration'&&node.declarations.some(d=>['chunks','pending'].includes(d.id.name)))changes.push([node.start,node.end,'']);
  const declaration=node.type==='ExportNamedDeclaration'?node.declaration:node;
  if(declaration?.type==='FunctionDeclaration'&&declaration.id.name==='loadQuestions')changes.push([declaration.body.start,declaration.body.end,"{if(ids.some(id=>!bank[id]||bank[id].loaded===false))throw new Error('Conteúdo indisponível. Atualize seu acesso.');}"]);
 }
 for(const [start,end,replacement] of changes.sort((a,b)=>b[0]-a[0]))code=code.slice(0,start)+replacement+code.slice(end);
 return code;
}
export function commercialBuild(){
 let output;
 return {name:'private-study-content',enforce:'pre',configResolved(config){
  output=resolve(config.root,config.build.outDir);
  if(output!==resolve(config.root,'dist'))throw Error('O build comercial deve usar dist/ como saída.');
 },async closeBundle(){
  // Vite copies public/ verbatim; premium chunks belong only on the backend.
  if(output)await rm(resolve(output,'questions'),{recursive:true,force:true});
 },transform(code,id){
  if(id.replaceAll('\\','/').endsWith('/src/question-loader.js'))return {code:protectQuestionLoader(code),map:null};
  const match=id.replaceAll('\\','/').match(/\/src\/(data|activities|essays)\.js$/);
  if(!match)return null;
  return {code:protectContent(code,match[1]),map:null};
 }};
}
