if(import.meta.env.VITE_PAID_EDITION==='true'){
 import('./storefront.js').catch(showFailure);
}else{
 import('./main.js').catch(showFailure);
}
function showFailure(){
 const status=document.querySelector('#startup-status');
 if(status)status.textContent='Não foi possível iniciar o aplicativo. Tente novamente.';
}
