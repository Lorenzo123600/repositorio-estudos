import {escapeHTML as esc} from './account.js';
import {paymentBenefits,paymentPlanCarousel,bindPaymentPlanCarousel} from './payment-plans-view.js';
const labels={pending:'Pagamento pendente',approved:'Pagamento aprovado',rejected:'Pagamento recusado',cancelled:'Pagamento cancelado',refunded:'Pagamento reembolsado',charged_back:'Pagamento contestado'};
export function planValidity(plan){
 if(plan.access_expires_at)return 'Acesso até '+new Date(Date.parse(plan.access_expires_at)-1).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'});
 return `${plan.duration_days} dias`;
}
export function accessExpiryLabel(expiresAt){
 const date=new Date(Date.parse(expiresAt)-1);
 return date.toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).replace(', ',' às ')+' (Brasília)';
}
export function accessIsCurrent(access,now=Date.now()){
 return access.environment==='production'&&access.status==='active'&&Date.parse(access.activated_at)<=now&&Date.parse(access.expires_at)>now;
}
export function validCheckout(value){
 const url=new URL(value);
 if(url.protocol!=='https:'||url.hostname!=='www.mercadopago.com.br'||url.port||url.username||url.password||url.pathname!=='/checkout/v1/redirect'||!url.searchParams.get('order_id'))throw Error('O endereço de pagamento recebido é inválido.');
 return url.href;
}
export function attemptKey(storage,userId,planId,generate=()=>crypto.randomUUID()){
 const key=`enem-payment-attempt:${userId}:${planId}`;
 let value=storage.getItem(key);
 if(!value){value=generate();storage.setItem(key,value);}
 return value;
}
export function openPayments(account){
 document.querySelector('#payments-dialog')?.close();
 const dialog=document.createElement('dialog');dialog.id='payments-dialog';dialog.className='account-dialog payments-dialog';
 dialog.setAttribute('aria-labelledby','payments-title');
 dialog.innerHTML='<div class="payment-modal-heading"><div><span class="eyebrow">SUA PREPARAÇÃO COMEÇA AQUI</span><h2 id="payments-title">Planos e pagamentos</h2></div><button type="button" class="text-btn" id="payments-close" aria-label="Fechar pagamentos" autofocus>✕</button></div><div id="payments-body"></div>';
 document.body.append(dialog);dialog.querySelector('#payments-close').onclick=()=>dialog.close();
 // Keep keyboard navigation inside the modal, including after async catalog updates.
 dialog.addEventListener('keydown',event=>{
  if(event.key!=='Tab')return;
  const items=[...dialog.querySelectorAll('button:not(:disabled),a[href],select,input,textarea,[tabindex]:not([tabindex="-1"])')].filter(el=>!el.closest('[inert]')&&el.getClientRects().length);
  const first=items[0],last=items.at(-1);
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
 });
 let busy=false,closed=false,loading=false,disposeCarousel=()=>{};
 const root=dialog.querySelector('#payments-body');
 async function refresh(){
  if(closed||loading||busy)return;loading=true;
  try{
   if(!account.paymentsAvailable()){root.innerHTML='<p role="status">Os pagamentos ainda não estão disponíveis nesta versão do site.</p>';return;}
   if(!account.isSignedIn()){root.innerHTML='<article class="card public-plan payment-plan-card"><span class="badge">EDIÇÃO ENEM 2026</span><h3>Acesso completo</h3><p class="public-plan-price payment-plan-price">R$ 14,90</p><p class="payment-once">Pagamento único · sem mensalidade ou renovação automática</p>'+paymentBenefits+'<p class="payment-validity"><span aria-hidden="true">◷</span> Acesso até <strong>31/12/2026, às 23h59 de Brasília</strong><small>Edições futuras não incluídas.</small></p></article><p class="payment-login-note">Entre na sua conta para consultar planos e compras. Preço e disponibilidade confirmados no checkout.</p><button class="primary" id="payment-login">Entrar / Criar conta</button>';root.querySelector('button').onclick=()=>{dialog.close();account.open();};return;}
   const userId=account.paymentUser();
   if(!root.children.length)root.innerHTML='<p role="status">Consultando planos e pagamentos…</p>';
   const [plans,payments,access]=await Promise.all([account.paymentRequest('/payment-plans'),account.paymentRequest('/payments'),account.paymentRequest('/payment-access')]);
   if(closed)return;
   if(userId!==account.paymentUser())throw Error('A conta mudou. Abra os pagamentos novamente.');
   for(const payment of payments){if(payment.status!=='pending'){try{const k=`enem-payment-attempt:${userId}:${payment.plan_id}`;if(localStorage.getItem(k)===payment.idempotency_key)localStorage.removeItem(k);}catch{}}}
   const active=access.some(a=>accessIsCurrent(a));
   const complimentary=access.some(a=>a.kind==='complimentary'&&accessIsCurrent(a));
   window.dispatchEvent(new Event('payments-updated'));
   const carouselIndex=Number(root.querySelector('.payment-plans')?.dataset.index||0),scrollTop=root.scrollTop;
   const focused=document.activeElement,focusBuy=root.contains(focused)?focused.dataset.buyPlan:null,focusRefresh=focused?.id==='payment-refresh',focusNavigation=root.contains(focused)?focused.matches('.payment-plans')?'.payment-plans':focused.matches('[data-payment-prev]')?'[data-payment-prev]':focused.matches('[data-payment-next]')?'[data-payment-next]':null:null;
   disposeCarousel();
   root.innerHTML=`<p class="payment-access-status" role="status">${complimentary?'Seu acesso de cortesia está ativo.':active?'Seu acesso está ativo.':'Seu acesso completo ainda não está ativo.'}</p><p class="payment-caption">A confirmação é feita pelo servidor. Pagamentos de teste não liberam acesso de produção.</p>${plans.length?paymentPlanCarousel(plans.map(plan=>`<article class="card payment-plan-card"><h3>${esc(plan.name)}</h3><p class="payment-plan-price">${esc(new Intl.NumberFormat('pt-BR',{style:'currency',currency:plan.currency}).format(Number(plan.price)))}</p><p class="payment-once">Pagamento único</p>${paymentBenefits}<p class="payment-validity">${esc(planValidity(plan))}</p><button class="primary" data-buy-plan="${esc(plan.id)}">Comprar acesso</button></article>`)):'<p>Os planos ainda não estão disponíveis para compra.</p>'}<h3 class="payment-purchases-title">Suas compras</h3>${payments.length?payments.map(p=>`<article class="card payment-purchase"><strong>${esc(labels[p.status]||'Aguardando confirmação')}</strong><p>${esc(new Intl.NumberFormat('pt-BR',{style:'currency',currency:p.currency}).format(Number(p.amount)))}${p.environment==='test'?' · TESTE':''}</p>${access.filter(a=>a.payment_id===p.id).map(a=>`<p>${a.status==='revoked'?'Acesso revogado':Date.parse(a.expires_at)<=Date.now()?'Acesso expirado':'Válido até '+esc(accessExpiryLabel(a.expires_at))}</p>`).join('')}</article>`).join(''):'<p>Nenhuma compra registrada.</p>'}<p id="payment-message" role="status"></p><button class="text-btn" id="payment-refresh">Atualizar situação</button>`;
   disposeCarousel=bindPaymentPlanCarousel(root,carouselIndex);root.scrollTop=scrollTop;
   if(focusBuy)root.querySelector(`[data-buy-plan="${CSS.escape(focusBuy)}"]`)?.focus({preventScroll:true});
   else if(focusRefresh)root.querySelector('#payment-refresh').focus({preventScroll:true});
   else if(focusNavigation)root.querySelector(focusNavigation)?.focus({preventScroll:true});
   root.querySelector('#payment-refresh').onclick=refresh;
   root.querySelectorAll('[data-buy-plan]').forEach(button=>button.onclick=async()=>{
    if(busy)return;busy=true;root.querySelectorAll('[data-buy-plan],#payment-refresh').forEach(b=>b.disabled=true);
    const message=root.querySelector('#payment-message');message.textContent='Preparando pagamento…';
    try{
     if(account.paymentUser()!==userId)throw Error('A conta mudou. Abra os pagamentos novamente.');
     const key=attemptKey(localStorage,userId,button.dataset.buyPlan);
     const result=await account.paymentRequest('/create-payment',{method:'POST',body:JSON.stringify({plan_id:button.dataset.buyPlan,idempotency_key:key})});
     if(account.paymentUser()!==userId||closed)return;
     window.location.assign(validCheckout(result.checkout_url));
    }catch(e){message.textContent=e.message||'Não foi possível abrir o pagamento. Tente novamente.';}
    finally{busy=false;root.querySelectorAll('[data-buy-plan],#payment-refresh').forEach(b=>b.disabled=false);}
   });
  }catch{if(!closed)root.innerHTML='<p role="status">Não foi possível consultar seus pagamentos. Tente novamente em alguns instantes.</p>';}
  finally{loading=false;}
 }
 const timer=setInterval(refresh,10000),focus=()=>refresh();window.addEventListener('focus',focus);
 dialog.addEventListener('close',()=>{closed=true;disposeCarousel();clearInterval(timer);window.removeEventListener('focus',focus);dialog.remove();},{once:true});
 dialog.showModal();refresh();
}
