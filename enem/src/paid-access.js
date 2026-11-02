import {accessIsCurrent} from './payments.js';

// Access is never restored from browser storage or payment-return parameters.
export function createPaidAccess({account,onChange,now=()=>Date.now()}){
 let owner=null,access=[],verifiedAt=0,failed=false,loading=false,generation=0;
 function snapshot(){
  const user=account.paymentUser()||null;
  if(user!==owner){owner=user;access=[];verifiedAt=0;failed=false;loading=false;generation++;}
  const active=!!user&&now()-verifiedAt<30000&&access.some(a=>accessIsCurrent(a,now()));
  return {required:account.paymentsAvailable(),active,loading,failed,user};
 }
 async function refresh(){
  const state=snapshot();
  if(!state.required||!state.user||loading)return;
  const request=++generation,user=state.user;
  loading=true;
  try{
   const result=await account.paymentRequest('/payment-access');
   if(request!==generation||user!==account.paymentUser())return;
   access=Array.isArray(result)?result:[];verifiedAt=now();failed=false;
  }catch{
   if(request!==generation||user!==account.paymentUser())return;
   access=[];verifiedAt=0;failed=true;
  }finally{
   if(request===generation){loading=false;onChange();}
  }
 }
 return {snapshot,refresh};
}
