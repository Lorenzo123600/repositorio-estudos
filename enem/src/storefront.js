import './style.css';
import {configuredSupabase} from './supabase-account.js';
import {escapeHTML as esc} from './account.js';
import {openPayments,accessIsCurrent} from './payments.js';
import {renderDemo} from './demo.js';
import questions from './demo-questions.json';

const cloud=configuredSupabase();
if(!cloud)throw Error('Commercial edition requires Supabase');
let user=null,loading=false,started=false,mode='login';
const account={paymentsAvailable:()=>true,isSignedIn:()=>!!user,paymentUser:()=>user?.id,paymentRequest:(...args)=>cloud.request(...args),open:()=>showAuth()};
const root=document.querySelector('#app');
root.innerHTML=`<main class="public-storefront"><header><a class="brand" href="#">bora PRO ENEM</a><button class="text-btn" id="store-login">Entrar / Criar conta</button></header><div id="store-content"><section class="sale-offer"><span class="eyebrow">EDIÇÃO ENEM 2026</span><h1>Seu próximo passo começa aqui.</h1><p class="subtitle">Organize a revisão, pratique questões reais e acompanhe sua evolução.</p><div class="sale-grid"><article class="card"><span class="badge">ACESSO COMPLETO</span><h2>R$ 14,90</h2><p>Pagamento único. Sem mensalidade nem renovação automática.</p><p><strong>Até 31/12/2026, às 23h59 de Brasília.</strong> Edições futuras não estão incluídas.</p><ul><li>Plano personalizável de 1 a 180 dias</li><li>72 questões reais e 20 autorais comentadas</li><li>Simulados, desafios e cronômetro</li><li>12 propostas de redação com checklists</li><li>Progresso sincronizado entre dispositivos</li></ul><button class="primary" id="store-buy">Ver plano e comprar acesso</button><p class="muted">Sem correção individual de redação ou previsão de nota TRI.</p></article><article class="card"><span class="badge">EXPERIMENTE GRÁTIS</span><h2>Conheça a prática.</h2><p>Três questões reais com resolução. Sem cartão e sem alterar seu progresso.</p><button class="text-btn" id="store-demo">Experimentar demonstração gratuita</button><h3>Já comprou?</h3><p>Entre na mesma conta usada na compra para acessar seu estudo.</p><button class="text-btn" id="store-access">Entrar e verificar meu acesso</button></article></div></section></div><p id="store-status" role="status"></p><button class="text-btn" id="store-refresh">Atualizar acesso</button><footer><a href="./termos.html">Termos de compra e reembolso</a> · <a href="./privacidade.html">Privacidade</a> · <a href="mailto:manualdeumgamer25@gmail.com">Suporte</a></footer></main>`;
const status=message=>{root.querySelector('#store-status').textContent=message;};
const buy=()=>openPayments(account);
root.querySelector('#store-buy').onclick=buy;
root.querySelector('#store-access').onclick=()=>user?refresh():showAuth();
root.querySelector('#store-login').onclick=()=>showAuth();
root.querySelector('#store-refresh').onclick=()=>refresh();
root.querySelector('.brand').onclick=event=>{event.preventDefault();location.reload();};
root.querySelector('#store-demo').onclick=()=>renderDemo(root.querySelector('#store-content'),{questions,buy});

function showAuth(){
 document.querySelector('#store-auth')?.close();
 const dialog=document.createElement('dialog');dialog.id='store-auth';dialog.className='account-dialog';
 dialog.setAttribute('aria-labelledby','store-auth-title');
 dialog.innerHTML=`<div class="section-heading"><h2 id="store-auth-title">Sua conta</h2><button class="text-btn" id="store-auth-close" aria-label="Fechar">✕</button></div><p id="store-auth-status" role="status"></p><div class="account-tabs"><button class="text-btn" data-auth="login">Entrar</button><button class="text-btn" data-auth="register">Criar conta</button><button class="text-btn" data-auth="recover">Recuperar senha</button></div><form id="store-auth-form"></form>`;
 document.body.append(dialog);dialog.querySelector('#store-auth-close').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>dialog.remove(),{once:true});
 const feedback=message=>dialog.querySelector('#store-auth-status').textContent=message;
 const draw=()=>{
  const form=dialog.querySelector('form');
  form.innerHTML=user&&mode!=='password'?`<p>Conta: ${esc(user.email)}</p><button type="button" id="store-logout" class="text-btn">Sair da conta</button>`:`${mode==='register'?'<label>Nome<input name="name" autocomplete="name" maxlength="80"></label>':''}${mode!=='password'?'<label>E-mail<input name="email" type="email" autocomplete="email" required></label>':''}${mode!=='recover'?`<label>${mode==='password'?'Nova senha':'Senha'}<input name="password" type="password" autocomplete="${mode==='login'?'current-password':'new-password'}" minlength="10" maxlength="128" required></label>`:''}<button class="primary" type="submit">${({login:'Entrar',register:'Criar conta',recover:'Enviar recuperação',password:'Salvar nova senha'})[mode]}</button>`;
  form.querySelector('#store-logout')?.addEventListener('click',async()=>{
   try{await cloud.request('/logout');user=null;dialog.close();status('Você saiu da conta.');}catch{feedback('Não foi possível sair. Tente novamente.');}
  });
  form.onsubmit=async event=>{
   event.preventDefault();const button=form.querySelector('[type=submit]');if(!button)return;button.disabled=true;
   try{
    const values=Object.fromEntries(new FormData(form));
    const result=await cloud.request('/'+mode,{method:'POST',body:JSON.stringify({...values,name:values.name||''})});
    if(result.requiresConfirmation){feedback('Confirme seu e-mail pelo link enviado. Depois entre na sua conta.');return;}
    if(result.confirmationUnavailable){feedback('A confirmação de e-mail não está configurada. Entre em contato com o suporte.');return;}
    if(mode==='recover'){feedback(result.message);return;}
    user=result.user||user;dialog.close();await refresh();
   }catch(error){feedback(error.message||'Não foi possível acessar sua conta. Tente novamente.');}
   finally{if(button.isConnected)button.disabled=false;}
  };
 };
 dialog.querySelectorAll('[data-auth]').forEach(button=>button.onclick=()=>{mode=button.dataset.auth;feedback('');draw();});
 draw();dialog.showModal();
}

async function refresh(){
 if(loading||started)return;loading=true;
 try{
  try{user=(await cloud.request('/me')).user;}catch{user=null;}
  root.querySelector('#store-login').textContent=user?'Minha conta':'Entrar / Criar conta';
  if(!user){status('A demonstração é gratuita. Entre para comprar ou acessar seu estudo.');return;}
  const access=await cloud.request('/payment-access');
  if(!access.some(a=>accessIsCurrent(a))){status('Nenhum acesso pago de produção vigente. Consulte suas compras em Ver plano e comprar acesso.');return;}
  status('Carregando seu conteúdo de estudo…');
  // The protected endpoint repeats the authorization server-side before returning data.
  const content=await cloud.request('/study-content');
  if(!content?.activities?.bank?.length||!content?.data?.plan?.length||!content?.essays?.essayTopics?.length)throw Error('Conteúdo indisponível. Tente novamente.');
  globalThis.__ENEM_CONTENT__=content;
  started=true;clearInterval(timer);window.removeEventListener('focus',refresh);window.removeEventListener('payments-updated',refresh);
  document.querySelector('#payments-dialog')?.close();document.querySelector('#store-auth')?.close();
  await import('./main.js');
 }catch(error){status(error.message||'Não foi possível carregar seu acesso. Tente novamente.');}
 finally{loading=false;}
}
window.addEventListener('focus',refresh);window.addEventListener('payments-updated',refresh);
const timer=setInterval(refresh,10000);
refresh().then(()=>{
if(!started&&cloud.isRecovering()){mode='password';showAuth();}
if(!started&&new URL(location.href).searchParams.get('payment_return')==='1'){
 const url=new URL(location.href);url.searchParams.delete('payment_return');history.replaceState(null,'',url);buy();
}

});
