import {parseAst} from 'rollup/parseAst';

const protectedFields={data:['questions','plan'],activities:['extraQuestions','bank','challenges','guapaHints'],essays:['essayTopics']};
export function protectContent(code,kind){
 const fields=protectedFields[kind];
 if(!fields)return null;
 const changes=[],found=new Set();
 for(const node of parseAst(code).body){
  if(kind==='activities'&&node.type==='ImportDeclaration'&&node.source.value==='./official-questions.json')changes.push([node.start,node.end,'']);
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
export function commercialBuild(){
 return {name:'private-study-content',enforce:'pre',transform(code,id){
  const match=id.replaceAll('\\','/').match(/\/src\/(data|activities|essays)\.js$/);
  if(!match)return null;
  return {code:protectContent(code,match[1]),map:null};
 }};
}
