import {escapeHTML} from './account.js';
export const difficultyLabels={facil:'Fácil',medio:'Médio',dificil:'Difícil',unclassified:'Não classificada'};
export function richText(value){
 return escapeHTML(value).replace(/!\[([^\]]*)\]\((enem-assets\/[a-zA-Z0-9/_.-]+)\)/g,(_,alt,path)=>`<img src="${path}" alt="${alt||'Figura da questão; consulte as informações visuais para responder'}" loading="lazy">`).replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>');
}
export const questionBody=q=>`${q.context?`<div class="question-context">${richText(q.context)}</div>`:''}<h2>${richText(q.text)}</h2>`;
export const optionBody=value=>`<span class="answer-content">${richText(value)}</span>`;
export function questionSource(q){
 if(q.origin!=='enem')return '<p class="question-source">Questão autoral de revisão</p>';
 const reference=[`ENEM ${q.year}`,q.application,({ingles:'Inglês',espanhol:'Espanhol'})[q.language],q.day?`${q.day}º dia`:null,q.booklet?`Caderno ${q.booklet}`:null,`Questão ${q.number}`].filter(Boolean).map(escapeHTML).join(' · ');
 return `<div class="question-source">${reference}${q.cancelled?' · Questão anulada pelo INEP':''} · ${difficultyLabels[q.difficulty]}<p class="difficulty-note">Dificuldade editorial: ${escapeHTML(q.difficultyReason)} Não é classificação oficial do INEP.</p></div>`;
}
