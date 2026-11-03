// Presentation only; the catalog and checkout remain owned by payments.js.
export const paymentBenefits='<ul class="payment-benefits"><li><span aria-hidden="true">✓</span> Plano de estudos e questões oficiais</li><li><span aria-hidden="true">✓</span> Simulados e propostas de redação</li><li><span aria-hidden="true">✓</span> Progresso sincronizado na sua conta</li></ul>';
export function paymentPlanCarousel(cards){
 return `<section class="payment-catalog" aria-label="Planos disponíveis">${cards.length>1?'<div class="payment-carousel-controls"><button type="button" data-payment-prev aria-label="Plano anterior" aria-controls="payment-plan-track">←</button><span data-payment-position role="status" aria-live="polite" aria-atomic="true"></span><button type="button" data-payment-next aria-label="Próximo plano" aria-controls="payment-plan-track">→</button></div>':''}<div id="payment-plan-track" class="payment-plans" ${cards.length>1?'tabindex="0" role="group" aria-roledescription="carrossel" aria-label="Planos: deslize ou use as setas, Home e End"':''}>${cards.join('')}</div></section>`;
}
export function bindPaymentPlanCarousel(root,initialIndex=0){
 const track=root.querySelector('.payment-plans'),cards=[...track.children];
 if(cards.length<2)return ()=>{};
 const previous=root.querySelector('[data-payment-prev]'),next=root.querySelector('[data-payment-next]'),position=root.querySelector('[data-payment-position]');
 const controller=new AbortController(),{signal}=controller;let index=0,timer;
 const step=()=>cards[1].offsetLeft-cards[0].offsetLeft;
 function update(){
  previous.disabled=index===0;next.disabled=index===cards.length-1;
  position.textContent=`Plano ${index+1} de ${cards.length}`;track.dataset.index=index;
  cards.forEach((card,i)=>{if(i!==index&&card.contains(document.activeElement))track.focus({preventScroll:true});card.inert=i!==index;card.setAttribute('aria-hidden',String(i!==index));});
 }
 function show(value,instant=false){index=Math.max(0,Math.min(cards.length-1,value));update();track.scrollTo({left:index*step(),behavior:instant||matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
 previous.addEventListener('click',()=>show(index-1),{signal});next.addEventListener('click',()=>show(index+1),{signal});
 track.addEventListener('keydown',event=>{if(event.target!==track)return;const target={ArrowLeft:index-1,ArrowRight:index+1,Home:0,End:cards.length-1}[event.key];if(target!==undefined){event.preventDefault();show(target)}},{signal});
 track.addEventListener('scroll',()=>{clearTimeout(timer);timer=setTimeout(()=>{index=Math.max(0,Math.min(cards.length-1,Math.round(track.scrollLeft/step())));update()},120)},{signal,passive:true});
 window.addEventListener('resize',()=>show(index,true),{signal});show(initialIndex,true);
 return ()=>{clearTimeout(timer);controller.abort()};
}
