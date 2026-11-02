import {escapeHTML as esc} from './account.js';
const labels={pending:'Pagamento pendente',approved:'Pagamento aprovado',rejected:'Pagamento recusado',cancelled:'Pagamento cancelado',refunded:'Pagamento reembolsado',charged_back:'Pagamento contestado'};
export function planValidity(plan){
 if(plan.access_expires_at)return 'Acesso até '+new Date(Date.parse(plan.access_expires_at)-1).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'});
 return `${plan.duration_days} dias`;
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
 dialog.innerHTML='<div class="section-heading"><h2 id="payments-title">Planos e pagamentos</h2><button class="text-btn" id="payments-close" aria-label="Fechar pagamentos">✕</button></div><div id="payments-body" aria-live="polite"></div>';
 document.body.append(dialog);dialog.querySelector('#payments-close').onclick=()=>dialog.close();
 let busy=false,closed=false,loading=false;
 const root=dialog.querySelector('#payments-body');
 async function refresh(){
  if(closed||loading||busy)return;loading=true;
  try{
   if(!account.paymentsAvailable()){root.innerHTML='<p>Os pagamentos ainda não estão disponíveis nesta versão do site.</p>';return;}
   if(!account.isSignedIn()){root.innerHTML='<p>Entre na sua conta para consultar os planos e comprar acesso.</p><button class="primary" id="payment-login">Entrar / Criar conta</button>';root.querySelector('button').onclick=()=>{dialog.close();account.open();};return;}
   const userId=account.paymentUser();
   if(!root.children.length)root.textContent='Consultando planos e pagamentos…';
   const [plans,payments,access]=await Promise.all([account.paymentRequest('/payment-plans'),account.paymentRequest('/payments'),account.paymentRequest('/payment-access')]);
   if(closed)return;
   if(userId!==account.paymentUser())throw Error('A conta mudou. Abra os pagamentos novamente.');
   for(const payment of payments){if(payment.status!=='pending'){try{const k=`enem-payment-attempt:${userId}:${payment.plan_id}`;if(localStorage.getItem(k)===payment.idempotency_key)localStorage.removeItem(k);}catch{}}}
   const active=access.some(a=>accessIsCurrent(a));
   root.innerHTML=`<p>${active?'Seu acesso está ativo.':'Nenhum acesso pago de produção vigente.'}</p><p class="muted">A confirmação é feita pelo servidor. Pagamentos de teste não liberam acesso de produção.</p><section class="payment-plans">${plans.length?plans.map(plan=>`<article class="card"><h3>${esc(plan.name)}</h3><p>${esc(new Intl.NumberFormat('pt-BR',{style:'currency',currency:plan.currency}).format(Number(plan.price)))} · ${esc(planValidity(plan))}</p><button class="primary" data-buy-plan="${esc(plan.id)}">Comprar acesso</button></article>`).join(''):'<p>Os planos ainda não estão disponíveis para compra.</p>'}</section><h3>Suas compras</h3>${payments.length?payments.map(p=>`<article class="card"><strong>${esc(labels[p.status]||'Aguardando confirmação')}</strong><p>${esc(new Intl.NumberFormat('pt-BR',{style:'currency',currency:p.currency}).format(Number(p.amount)))}${p.environment==='test'?' · TESTE':''}</p>${access.filter(a=>a.payment_id===p.id).map(a=>`<p>${a.status==='revoked'?'Acesso revogado':Date.parse(a.expires_at)<=Date.now()?'Acesso expirado':'Válido até '+esc(new Date(a.expires_at).toLocaleString('pt-BR'))}</p>`).join('')}</article>`).join(''):'<p>Nenhuma compra registrada.</p>'}<p id="payment-message" role="status"></p><button class="text-btn" id="payment-refresh">Atualizar situação</button>`;
   root.querySelector('#payment-refresh').onclick=refresh;
   root.querySelectorAll('[data-buy-plan]').forEach(button=>button.onclick=async()=>{
    if(busy)return;busy=true;root.querySelectorAll('button').forEach(b=>b.disabled=true);
    const message=root.querySelector('#payment-message');message.textContent='Preparando pagamento…';
    try{
     if(account.paymentUser()!==userId)throw Error('A conta mudou. Abra os pagamentos novamente.');
     const key=attemptKey(localStorage,userId,button.dataset.buyPlan);
     const result=await account.paymentRequest('/create-payment',{method:'POST',body:JSON.stringify({plan_id:button.dataset.buyPlan,idempotency_key:key})});
     if(account.paymentUser()!==userId||closed)return;
     window.location.assign(validCheckout(result.checkout_url));
    }catch(e){message.textContent=e.message||'Não foi possível abrir o pagamento. Tente novamente.';}
    finally{busy=false;root.querySelectorAll('button').forEach(b=>b.disabled=false);}
   });
  }catch{if(!closed)root.innerHTML='<p>Não foi possível consultar seus pagamentos. Tente novamente em alguns instantes.</p>';}
  finally{loading=false;}
 }
 const timer=setInterval(refresh,10000),focus=()=>refresh();window.addEventListener('focus',focus);
 dialog.addEventListener('close',()=>{closed=true;clearInterval(timer);window.removeEventListener('focus',focus);dialog.remove();},{once:true});
 dialog.showModal();refresh();
}
