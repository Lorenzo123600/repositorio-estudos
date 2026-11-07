// This fallback also works when the application bundle cannot load.
window.addEventListener('error',()=>{
 const app=document.getElementById('app');
 if(app&&!app.querySelector('main')){
  const status=document.getElementById('startup-status');
  if(status)status.textContent='Não foi possível iniciar o aplicativo. Toque em Tentar novamente.';
 }
},true);
const bindRetry=()=>document.getElementById('startup-retry')?.addEventListener('click',()=>location.reload());
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindRetry,{once:true});
else bindRetry();
