import './style.css';
import './welcome.css';
import {configuredSupabase} from './supabase-account.js';
import {escapeHTML as esc} from './account.js';
import {openPayments,accessIsCurrent} from './payments.js';
import {renderDemo} from './demo.js';
import questions from './demo-questions.json';
import summary from './demo-summary.json';

const cloud=configuredSupabase();
if(!cloud)throw Error('Commercial edition requires Supabase');
let user=null,loading=false,started=false,mode='login';
const account={paymentsAvailable:()=>true,isSignedIn:()=>!!user,paymentUser:()=>user?.id,paymentRequest:(...args)=>cloud.request(...args),open:()=>showAuth()};
const root=document.querySelector('#app');
root.innerHTML=`<main class="public-storefront welcome-page">
<a class="skip-link" href="#store-content">Pular para o conteúdo</a>
<header class="welcome-header"><a class="brand" href="#" aria-label="bora pro enem — início">bora pro enem<span class="brand-dot" aria-hidden="true">.</span></a><nav aria-label="Navegação de boas-vindas"><a href="#welcome-resources">O que você encontra</a><button class="welcome-login" id="store-login">Entrar / Criar conta</button></nav></header>
<div id="store-content" tabindex="-1">
<section class="welcome-hero" aria-labelledby="welcome-title">
<div class="welcome-copy"><span class="welcome-kicker"><span aria-hidden="true">✦</span> SEU ESPAÇO DE PREPARAÇÃO PARA O ENEM</span><h1 id="welcome-title">Um passo de cada vez.<br><em>Mais perto do seu futuro.</em></h1><p>Boas-vindas ao <strong>bora pro enem</strong>. Organize sua rotina, pratique questões e descubra o que revisar. Seu próximo passo pode começar aqui.</p><div class="welcome-actions"><button class="primary" id="store-demo">Experimentar demonstração gratuita <svg class="welcome-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12"/></svg></button><button class="welcome-secondary" id="store-access">Já tenho conta</button></div><p class="welcome-note">3 questões reais com resolução · Sem cadastro e sem cartão</p></div>
<div class="welcome-preview" aria-label="Como funciona: planejar, praticar e revisar">
<div class="welcome-preview-top"><span class="welcome-kicker">CADA PASSO CONTA</span><span class="welcome-spark" aria-hidden="true">✳</span></div><h2>Seu estudo,<br>com direção.</h2><ol class="welcome-path"><li><span class="welcome-step" aria-hidden="true">01</span><div><h3>Encontre seu ritmo</h3><p>Um plano que cabe na sua rotina.</p></div></li><li><span class="welcome-step" aria-hidden="true">02</span><div><h3>Aprenda praticando</h3><p>Questões reais, com explicações.</p></div></li><li><span class="welcome-step" aria-hidden="true">03</span><div><h3>Avance com clareza</h3><p>Revise e acompanhe sua evolução.</p></div></li></ol><div class="welcome-preview-bottom"><svg class="welcome-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12"/></svg> Seu futuro começa no que você faz hoje.</div></div>
</section>
<section class="welcome-resources" id="welcome-resources" aria-labelledby="resources-title"><div class="welcome-section-heading"><div><span class="welcome-kicker">MENOS IMPROVISO, MAIS DIREÇÃO</span><h2 id="resources-title">Tudo para construir seu ritmo.</h2></div><p>Conheça os recursos do acesso completo.</p></div><div class="welcome-cards">
<article><span class="welcome-icon" aria-hidden="true">▦</span><h3>Seu plano de estudos</h3><p>Organize sua preparação em um plano de 1 a 180 dias, de acordo com seu tempo.</p><span class="welcome-card-label">ROTINA POSSÍVEL</span></article>
<article><span class="welcome-icon" aria-hidden="true">◎</span><h3>Questões e simulados</h3><p>${summary.officialQuestions.toLocaleString('pt-BR')} questões reais do ENEM para praticar, com gabaritos oficiais e simulados para revisar.</p><span class="welcome-card-label">PRÁTICA COM PROPÓSITO</span></article>
<article><span class="welcome-icon" aria-hidden="true">✎</span><h3>Espaço para sua redação</h3><p>12 propostas com checklists para desenvolver suas ideias e praticar a escrita.</p><span class="welcome-card-label">IDEIAS NO PAPEL</span></article>
</div><p class="welcome-resource-note">Redações sem correção individual. Os simulados não estimam nota TRI.</p></section>
<section class="welcome-start" aria-labelledby="start-title"><div><span class="welcome-kicker">COMECE COM UMA PEQUENA CONQUISTA</span><h2 id="start-title">Que tal experimentar uma questão?</h2><p>Conheça a dinâmica da plataforma com 3 questões reais e confira a resolução de cada uma.</p></div><button class="welcome-secondary" id="welcome-demo-again">Conhecer a demonstração <span aria-hidden="true">→</span></button></section>
<section class="welcome-full" aria-labelledby="full-title"><div><h2 id="full-title">Quer continuar sua preparação?</h2><p>A demonstração é gratuita. O plano completo reúne os recursos de estudo e a sincronização do progresso.</p><details><summary>Condições do acesso completo</summary><p>R$ 14,90 em pagamento único, sem mensalidade ou renovação automática. Acesso até 31/12/2026, às 23h59 de Brasília. Edições futuras não estão incluídas.</p></details></div><button class="text-btn" id="store-buy">Conhecer acesso completo <span aria-hidden="true">→</span></button></section>
</div><div class="welcome-account-status"><p id="store-status" role="status"></p><button class="text-btn" id="store-refresh" hidden>Atualizar acesso</button></div>
<footer class="welcome-footer"><div><strong>bora pro enem</strong><p>Sua jornada, um passo por vez.</p></div><nav aria-label="Informações e suporte"><a href="./privacidade">Política de Privacidade</a><a href="./termos.html">Termos de Serviço</a><a href="mailto:manualdeumgamer25@gmail.com">Contato e suporte</a></nav></footer></main>`;
const status=message=>{root.querySelector('#store-status').textContent=message;};
const buy=()=>openPayments(account);
root.querySelector('#store-buy').onclick=buy;
root.querySelector('#store-access').onclick=()=>user?refresh():showAuth();
root.querySelector('#store-login').onclick=()=>showAuth();
root.querySelector('#store-refresh').onclick=()=>refresh();
root.querySelector('.brand').onclick=event=>{event.preventDefault();location.reload();};
const demo=()=>{renderDemo(root.querySelector('#store-content'),{questions,buy});root.querySelector('#store-content').focus();};
root.querySelector('#store-demo').onclick=demo;
root.querySelector('#welcome-demo-again').onclick=demo;

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
  root.querySelector('#store-refresh').hidden=!user;
  if(!user){status('');return;}
  const access=await cloud.request('/payment-access');
  if(!access.some(a=>accessIsCurrent(a))){status('Seu acesso completo ainda não está ativo. Consulte as opções em Conhecer acesso completo.');return;}
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
