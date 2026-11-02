import {money,uuidPattern} from './create-order.js';
const fail=(status)=>Object.assign(Error('webhook_rejected'),{status});
export async function validateSignature({signature,requestId,dataId,secret}){
 if(!secret||!signature||!dataId||!/^[-A-Za-z0-9_]{1,100}$/.test(dataId)||requestId&& !/^[-A-Za-z0-9_]{1,100}$/.test(requestId))return false;
 const entries=signature.split(',').map(part=>part.trim().split('='));
 if(entries.some(pair=>pair.length!==2))return false;
 const ts=entries.filter(([key])=>key==='ts'),v1=entries.filter(([key])=>key==='v1');
 if(ts.length!==1||v1.length!==1||!/^\d{10,16}$/.test(ts[0][1])||!(/^[a-f0-9]{64}$/i.test(v1[0][1])))return false;
 const manifest=`id:${dataId.toLowerCase()};${requestId?`request-id:${requestId};`:''}ts:${ts[0][1]};`;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 const bytes=Uint8Array.from(v1[0][1].match(/../g),s=>parseInt(s,16));
 // Cryptographic verify avoids string-comparison timing leaks.
 // No age rejection: Mercado Pago legitimately retries delayed deliveries.
 return crypto.subtle.verify('HMAC',key,bytes,new TextEncoder().encode(manifest));
}
export function verifiedOrder(order,{id,environment,sellerId,applicationId,payment}){
 if(order.id!==id||order.type!=='online'||order.processing_mode!=='manual'||order.currency!=='BRL'||order.country_code!=='BRA'||!uuidPattern.test(order.external_reference)||String(order.user_id)!==sellerId||String(order.integration_data?.application_id)!==applicationId)throw fail(422);
 // GET does not expose live_mode. Environment comes from trusted creation
 // provenance: configured credential/account + provider-verified seller/app +
 // a bound internal purchase. Never infer it from webhook JSON or ID prefixes.
 if(!payment||payment.external_reference!==order.external_reference||payment.mercadopago_order_id!==id||payment.environment!==environment||payment.seller_id!==sellerId||payment.application_id!==applicationId)throw fail(409);
 const amount=money(order.total_amount);
 if(!Number.isFinite(Date.parse(order.last_updated_date)))throw fail(422);
 let status='pending';
 const payments=order.transactions?.payments||[];
 if(order.status==='charged_back'||payments.some(p=>p.status==='charged_back')||order.transactions?.chargebacks?.length)status='charged_back';
 else if(order.status==='refunded'||['refunded','partially_refunded'].includes(order.status_detail)||payments.some(p=>p.status==='refunded'||p.status_detail==='partially_refunded')||order.transactions?.refunds?.some(r=>r.status==='processed'&&Number(r.amount)>0))status='refunded';
 else if(order.status==='processed'&&order.status_detail==='accredited'){
  if(money(order.total_paid_amount)!==amount||!order.transactions?.payments?.length||order.transactions.payments.some(p=>p.status!=='processed'||p.status_detail!=='accredited'))throw fail(422);
  status='approved';
 }else if(['cancelled','canceled','expired'].includes(order.status))status='cancelled';
 else if(['failed','rejected'].includes(order.status))status='rejected';
 else if(order.status==='refunded')status='refunded';
 else if(order.status==='charged_back')status='charged_back';
 else if(!['created','processing','action_required','pending'].includes(order.status))throw fail(422);
 return {p_external_reference:order.external_reference,p_order_id:order.id,p_amount:amount,p_currency:order.currency,p_environment:environment,p_status:status,p_provider_updated_at:order.last_updated_date};
}
export function webhookHandler({secret,accessToken,environment='test',sellerId,applicationId,otherSellerId,productionEnabled=false,lookup,apply,fetcher=fetch,logger=(_entry)=>{}}){
 return async request=>{
  const reply=status=>new Response(JSON.stringify({ok:status===200}),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
  try{
   if(request.method!=='POST')throw fail(405);
   if(!secret||!accessToken||!sellerId||!applicationId||!['test','production'].includes(environment)||sellerId===otherSellerId||(environment==='production'&&(!productionEnabled||!otherSellerId)))throw fail(503);
   const url=new URL(request.url),ids=url.searchParams.getAll('data.id'),types=url.searchParams.getAll('type');
   if(ids.length!==1||types.length>1||types.length&&types[0]!=='order')throw fail(400);
   const id=ids[0];
   if(!await validateSignature({signature:request.headers.get('x-signature'),requestId:request.headers.get('x-request-id'),dataId:id,secret}))throw fail(401);
   // Only the signed URL resource is used. Webhook body/status/live_mode cannot grant access.
   await request.body?.cancel();
   let response;try{response=await fetcher(`https://api.mercadopago.com/v1/orders/${encodeURIComponent(id)}`,{headers:{Authorization:`Bearer ${accessToken}`,Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(12000)});}catch{throw fail(503);}
   if(!response.ok)throw fail(503);
   const order=await response.json();
   if(!uuidPattern.test(order.external_reference))throw fail(422);
   const payment=await lookup(order.external_reference);
   const normalized=verifiedOrder(order,{id,environment,sellerId,applicationId,payment});
   await apply({...normalized,p_seller_id:sellerId,p_application_id:applicationId});
   return reply(200);
  }catch(error){const status=error.status||503;logger({event:'webhook_failed',status});return reply(status);}
 };
}
