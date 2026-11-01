import {escapeHTML} from './account.js';
export const difficultyLabels={facil:'Fácil',medio:'Médio',dificil:'Difícil'};
export function richText(value){
 return escapeHTML(value).replace(/!\[([^\]]*)\]\((enem-assets\/[a-zA-Z0-9/_.-]+)\)/g,(_,alt,path)=>`<img src="${path}" alt="${alt||'Figura da questão; consulte as informações visuais para responder'}" loading="lazy">`).replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>');
}
export const questionBody=q=>`${q.context?`<div class="question-context">${richText(q.context)}</div>`:''}<h2>${escapeHTML(q.text)}</h2>`;
export const optionBody=value=>`<span class="answer-content">${richText(value)}</span>`;
export const questionSource=q=>q.origin==='enem'?`<div class="question-source">ENEM ${q.year} · Questão ${q.number} · ${difficultyLabels[q.difficulty]} <a href="${q.source}" target="_blank" rel="noopener noreferrer">Ver transcrição e fonte ↗</a><p class="difficulty-note">Dificuldade editorial: ${escapeHTML(q.difficultyReason)} Não é classificação oficial do INEP.</p></div>`:'<p class="question-source">Questão autoral de revisão</p>';
