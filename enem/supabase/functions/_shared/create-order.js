// Provider contract: Checkout Pro Orders documentation supplied on 2026-11-02.
export const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function checkoutURL(value){
 const url=new URL(value);
 if(url.protocol!=='https:'||url.hostname!=='www.mercadopago.com.br'||url.port||url.username||url.password||url.pathname!=='/checkout/v1/redirect'||!url.searchParams.get('order_id'))throw Error('invalid_checkout');
 return url.href;
}
export function money(value){
 const text=String(value);
 if(!/^\d{1,10}(\.\d{1,2})?$/.test(text))throw Error('invalid_amount');
 const [whole,fraction='']=text.split('.');
 const cents=BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'));
 if(cents<=0n)throw Error('invalid_amount');
 return `${cents/100n}.${String(cents%100n).padStart(2,'0')}`;
}
const failure=(code,status)=>Object.assign(Error(code),{status});
export function createOrderHandler({authenticate,store,accessToken,environment='test',origin,returnUrl,sellerId,otherSellerId,applicationId,productionEnabled=false,now=()=>Date.now(),fetcher=fetch,logger=(_entry)=>{}}){
 return async request=>{
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
  const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
  try{
   if(!origin||!sellerId||!applicationId||sellerId===otherSellerId||!['test','production'].includes(environment)||!accessToken||(environment==='production'&&(!productionEnabled||!otherSellerId)))throw failure('payments_not_configured',503);
   let redirect;
   try{
    const app=new URL(origin);redirect=new URL(returnUrl||origin+'/');
    if(app.protocol!=='https:'||app.origin!==origin||redirect.origin!==origin||redirect.username||redirect.password)throw Error();
    redirect.searchParams.set('payment_return','1');
   }catch{throw failure('payments_not_configured',503);}
   const incoming=request.headers.get('origin');
   if(incoming!==origin)throw failure('origin_not_allowed',403);
   headers['Access-Control-Allow-Origin']=origin;
   headers['Access-Control-Allow-Headers']='authorization, apikey, content-type, x-client-info';
   headers['Access-Control-Allow-Methods']='POST, OPTIONS';
   if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
   if(request.method!=='POST')throw failure('method_not_allowed',405);
   const authorization=request.headers.get('authorization')||'';
   if(!/^Bearer \S+$/i.test(authorization))throw failure('login_required',401);
   const user=await authenticate(authorization.slice(7));
   if(!user?.id||!user.email||!user.email_confirmed_at)throw failure('login_required',401);
   if(!request.headers.get('content-type')?.includes('application/json'))throw failure('invalid_request',400);
   // A bounded read prevents large request bodies from exhausting an Edge worker.
   let bytes=0,parts=[];const reader=request.body?.getReader();
   if(!reader)throw failure('invalid_request',400);
   while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>2048){await reader.cancel();throw failure('invalid_request',413);}parts.push(value);}
   const buffer=new Uint8Array(bytes);let offset=0;for(const part of parts){buffer.set(part,offset);offset+=part.length;}
   let body;try{body=JSON.parse(new TextDecoder().decode(buffer));}catch{throw failure('invalid_request',400);}
   if(!body||Array.isArray(body)||Object.keys(body).some(k=>!['plan_id','idempotency_key'].includes(k))||!uuidPattern.test(body.plan_id)||!uuidPattern.test(body.idempotency_key))throw failure('invalid_request',400);
   // Database RPC supplies price, duration, reference and ownership, never the browser.
   const payment=await store.begin(user.id,body.plan_id,environment,body.idempotency_key);
   if(payment.user_id!==user.id||payment.environment!==environment||payment.plan_id!==body.plan_id||payment.currency!=='BRL')throw Error('invalid_payment');
   await store.bindContext(payment.id,environment,sellerId,applicationId);
   if(payment.status!=='pending')throw failure('purchase_already_finished',409);
   if(payment.access_expires_at&&(!Number.isFinite(Date.parse(payment.access_expires_at))||Date.parse(payment.access_expires_at)<=now()))throw failure('plan_expired',409);
   if(payment.checkout_url){return json({payment_id:payment.id,environment,checkout_url:checkoutURL(payment.checkout_url)});}
   let payload=payment.order_payload;
   if(!payload){
    const plan=await store.plan(body.plan_id);
    if(!plan)throw failure('plan_unavailable',409);
    payload=await store.freezePayload(payment.id,{
     type:'online',processing_mode:'manual',total_amount:money(payment.amount),
     external_reference:payment.external_reference,payer:{email:user.email},
     items:[{title:plan.name,unit_price:money(payment.amount),quantity:1}],
     ...(payment.access_expires_at?{expiration_time:`PT${Math.min(environment==='test'?3600:86400,Math.floor((Date.parse(payment.access_expires_at)-now())/1000))}S`}:{}),
     config:{online:{callback_url:redirect.href,success_url:redirect.href,failure_url:redirect.href,pending_url:redirect.href,auto_return:'all'}}
    });
   }
   let response;
   try{response=await fetcher('https://api.mercadopago.com/v1/orders',{
    method:'POST',redirect:'error',signal:AbortSignal.timeout(15000),
    headers:{'Content-Type':'application/json','Accept':'application/json','Authorization':`Bearer ${accessToken}`,'X-Idempotency-Key':payment.idempotency_key},body:JSON.stringify(payload)
   });}catch{throw failure('provider_unavailable_retry_same_purchase',503);}
   if(!response.ok)throw failure(response.status===429||response.status>=500?'provider_unavailable_retry_same_purchase':'provider_rejected_order',response.status===429||response.status>=500?503:502);
   let order;try{order=await response.json();}catch{throw failure('invalid_provider_response',502);}
   if(!/^[A-Za-z0-9_-]{1,100}$/.test(order.id)||order.external_reference!==payment.external_reference||order.type!=='online'||order.processing_mode!=='manual'||order.currency!=='BRL'||order.country_code!=='BRA'||String(order.user_id)!==sellerId||String(order.integration_data?.application_id)!==applicationId||money(order.total_amount)!==money(payment.amount))throw failure('invalid_provider_response',502);
   const url=checkoutURL(order.checkout_url);
   if(new URL(url).searchParams.get('order_id')!==order.id)throw failure('invalid_provider_response',502);
   await store.saveCheckout(payment.id,order.id,url);
   return json({payment_id:payment.id,environment,checkout_url:url});
  }catch(e){
   const status=e.status||500;
   // Never log provider response bodies, SDK errors, headers or credentials.
   logger({event:'create_order_failed',status});
   return json({error:e.status?e.message:'payment_service_unavailable'},status);
  }
 };
}
