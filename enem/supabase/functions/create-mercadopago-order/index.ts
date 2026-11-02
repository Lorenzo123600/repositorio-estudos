import {createClient} from 'npm:@supabase/supabase-js@2.118.0';
import {createOrderHandler} from '../_shared/create-order.js';
const environment=Deno.env.get('MERCADOPAGO_ENVIRONMENT')||'test';
const suffix=environment==='production'?'PROD':'TEST';
const client=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
const data=(result:any)=>{if(result.error)throw Error('database_operation_failed');return result.data;};
Deno.serve(createOrderHandler({
 environment,
 origin:Deno.env.get('PAYMENTS_APP_ORIGIN'),
 returnUrl:Deno.env.get('PAYMENTS_RETURN_URL'),
 sellerId:Deno.env.get(`MERCADOPAGO_SELLER_ID_${suffix}`),
 otherSellerId:Deno.env.get(`MERCADOPAGO_SELLER_ID_${suffix==='TEST'?'PROD':'TEST'}`),
 applicationId:Deno.env.get(`MERCADOPAGO_APPLICATION_ID_${suffix}`)||Deno.env.get('MERCADOPAGO_APPLICATION_ID'),
 productionEnabled:Deno.env.get('MERCADOPAGO_PRODUCTION_ENABLED')==='true',
 accessToken:Deno.env.get(environment==='production'?'MERCADOPAGO_ACCESS_TOKEN_PROD':'MERCADOPAGO_ACCESS_TOKEN_TEST'),
 authenticate:async(token:string)=>{const result=await client.auth.getUser(token);return result.error?null:result.data.user;},
 store:{
  bindContext:async(id:string,env:string,seller:string,app:string)=>data(await client.rpc('enem_bind_payment_context',{p_payment_id:id,p_environment:env,p_seller_id:seller,p_application_id:app})),
  begin:async(userId:string,planId:string,env:string,key:string)=>data(await client.rpc('enem_begin_payment',{p_user_id:userId,p_plan_id:planId,p_environment:env,p_idempotency_key:key})),
  plan:async(id:string)=>data(await client.from('enem_payment_plans').select('name').eq('id',id).single()),
  freezePayload:async(id:string,payload:unknown)=>data(await client.rpc('enem_freeze_order_payload',{p_payment_id:id,p_payload:payload})),
  saveCheckout:async(id:string,orderId:string,url:string)=>data(await client.rpc('enem_save_checkout',{p_payment_id:id,p_order_id:orderId,p_checkout_url:url}))
 },
 logger:entry=>console.error(JSON.stringify(entry))
}));
