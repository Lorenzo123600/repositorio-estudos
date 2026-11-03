// Native scrolling keeps touch gestures and vertical page scrolling available.
// This module owns presentation only: it never writes study progress.
export function planCarouselMarkup(cards){
 return `<section class="plan-carousel" role="region" aria-roledescription="carrossel" aria-label="Dias do plano de estudos">
 <div class="plan-carousel-controls"><button type="button" class="text-btn" data-plan-prev aria-label="Dias anteriores" aria-controls="plan-days-track">← Anterior</button><p class="plan-carousel-position" role="status" aria-live="polite" aria-atomic="true"></p><button type="button" class="text-btn" data-plan-next aria-label="Próximos dias" aria-controls="plan-days-track">Próximo →</button></div>
 <p id="plan-carousel-help" class="plan-carousel-help">Deslize para ver outros dias. No teclado, foque os cards e use as setas, Home ou End. Navegar não altera suas conclusões.</p>
 <div id="plan-days-track" class="plan-grid plan-carousel-track" tabindex="0" role="group" aria-label="Cards dos dias" aria-describedby="plan-carousel-help" aria-keyshortcuts="ArrowLeft ArrowRight Home End">${cards}</div>
 <div class="plan-carousel-footer"><div class="plan-carousel-indicators" role="group" aria-label="Posições do carrossel"></div><label class="plan-carousel-jump">Ver outros dias<select aria-label="Escolher dias exibidos"></select></label></div></section>`;
}

export function bindPlanCarousel(root,{initialIndex=0,onChange=()=>{}}={}){
 const track=root.querySelector('.plan-carousel-track'),cards=[...track.querySelectorAll('[data-plan-card]')];
 const previous=root.querySelector('[data-plan-prev]'),next=root.querySelector('[data-plan-next]'),status=root.querySelector('.plan-carousel-position');
 const indicators=root.querySelector('.plan-carousel-indicators'),select=root.querySelector('select');
 const controller=new AbortController(),{signal}=controller;
 let index=0,perView=1,timer=null,disposed=false;
 const visibleCount=()=>Math.min(cards.length,Number(getComputedStyle(root).getPropertyValue('--plan-slides-per-view'))||1);
 const maximum=()=>Math.max(0,cards.length-perView);
 const label=i=>perView===1?`Dia ${i+1} de ${cards.length}`:`Dias ${i+1} a ${Math.min(cards.length,i+perView)} de ${cards.length}`;
 const step=()=>cards.length>1?cards[1].offsetLeft-cards[0].offsetLeft:track.clientWidth;
 function height(){
  const size=Math.max(...cards.slice(index,index+perView).map(card=>card.getBoundingClientRect().height),0)+40;
  if(Math.abs(parseFloat(track.style.height||'0')-size)>.5)track.style.height=size+'px';
 }
 function update(){
  root.dataset.activeIndex=String(index);root.dataset.visibleCount=String(perView);
  previous.disabled=index===0;next.disabled=index===maximum();
  status.textContent=label(index);select.value=String(index);
  cards.forEach((card,i)=>{
   const visible=i>=index&&i<index+perView;
   if(!visible&&card.contains(document.activeElement))track.focus({preventScroll:true});
   card.inert=!visible;card.setAttribute('aria-hidden',String(!visible));
  });
  const start=Math.max(0,Math.min(index-2,maximum()-4));
  const positions=new Set([0,...Array.from({length:Math.min(5,maximum()+1)},(_,n)=>start+n),maximum()]);
  const focused=indicators.contains(document.activeElement)?document.activeElement.dataset.planPosition:null;
  indicators.innerHTML=[...positions].sort((a,b)=>a-b).map(i=>`<button type="button" data-plan-position="${i}" aria-label="Mostrar ${label(i).toLowerCase()}" ${i===index?'aria-current="true"':''}>${i+1}</button>`).join('');
  if(focused!==null)indicators.querySelector(`[data-plan-position="${focused}"]`)?.focus({preventScroll:true});
  height();onChange(index);
 }
 function show(value,{instant=false}={}){
  index=Math.max(0,Math.min(maximum(),value));update();
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  track.scrollTo({left:index*step(),behavior:instant||reduce?'instant':'smooth'});
 }
 function resize(){
  if(disposed)return;
  perView=visibleCount();
  select.innerHTML=Array.from({length:maximum()+1},(_,i)=>`<option value="${i}">${label(i)}</option>`).join('');
  show(index,{instant:true});
 }
 previous.addEventListener('click',()=>show(index-1),{signal});next.addEventListener('click',()=>show(index+1),{signal});
 select.addEventListener('change',()=>show(Number(select.value)),{signal});
 indicators.addEventListener('click',event=>{const button=event.target.closest('[data-plan-position]');if(button)show(Number(button.dataset.planPosition))},{signal});
 track.addEventListener('keydown',event=>{
  if(event.target!==track)return;
  const target={ArrowLeft:index-1,ArrowRight:index+1,Home:0,End:maximum()}[event.key];
  if(target!==undefined){event.preventDefault();show(target);}
 },{signal});
 track.addEventListener('scroll',()=>{
  clearTimeout(timer);timer=setTimeout(()=>{if(disposed)return;const candidate=Math.max(0,Math.min(maximum(),Math.round(track.scrollLeft/step())));if(candidate!==index){index=candidate;update();}},120);
 },{signal,passive:true});
 window.addEventListener('resize',resize,{signal});
 const observer=new ResizeObserver(()=>{if(!disposed)height()});cards.forEach(card=>observer.observe(card));
 perView=visibleCount();index=Math.max(0,Math.min(maximum(),initialIndex));resize();
 return ()=>{disposed=true;clearTimeout(timer);observer.disconnect();controller.abort();};
}
