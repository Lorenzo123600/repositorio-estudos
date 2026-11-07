import {questionBody,optionBody,optionTranscript,questionSource} from './question-view.js';

// A fixed sample: progress from a paid account is never changed by the demo.
export function renderDemo(el,{questions,buy}){
 const sample=questions.filter(q=>q.origin==='enem').slice(0,10);
 let index=0,selected=null,confirmed=false;
 function draw(){
  const q=sample[index];
  el.innerHTML=`<span class="eyebrow">DEMONSTRAÇÃO GRATUITA</span><h1>Experimente antes de comprar.</h1><p class="subtitle">Dez questões reais com resolução. A demonstração não altera seu progresso de estudo.</p><section class="card question"><p>Questão ${index+1} de ${sample.length}</p>${questionSource(q)}${questionBody(q)}<div class="options">${q.options.map((option,i)=>`<button class="option ${confirmed&&i===q.answer?'correct':''} ${!confirmed&&selected===i?'chosen':''}" data-demo-answer="${i}" aria-pressed="${selected===i}" ${confirmed?'disabled':''}><span>${'ABCDE'[i]}</span>${optionBody(option,optionTranscript(q,i))}</button>`).join('')}</div>${confirmed?`<div class="feedback" role="status"><b>${selected===q.answer?'Muito bem!':'Vamos aprender com essa?'} Resposta: ${'ABCDE'[q.answer]}.</b><p>${q.explanation}</p></div>`:`<button class="primary" id="demo-confirm" ${selected===null?'disabled':''}>Confirmar resposta</button>`}<div class="quiz-bottom"><button class="text-btn" id="demo-previous" ${index===0?'disabled':''}>Anterior</button>${index<sample.length-1?'<button class="primary" id="demo-next">Próxima questão</button>':'<button class="primary" id="demo-buy">Ver acesso completo</button>'}</div></section>`;
  el.querySelectorAll('[data-demo-answer]').forEach(b=>b.onclick=()=>{selected=Number(b.dataset.demoAnswer);draw();});
  el.querySelector('#demo-confirm')?.addEventListener('click',()=>{if(selected===null)return;confirmed=true;draw();});
  el.querySelector('#demo-previous').onclick=()=>{index--;selected=null;confirmed=false;draw();};
  el.querySelector('#demo-next')?.addEventListener('click',()=>{index++;selected=null;confirmed=false;draw();});
  el.querySelector('#demo-buy')?.addEventListener('click',buy);
 }
 draw();
}
