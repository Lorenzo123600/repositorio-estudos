import {createClient} from 'npm:@supabase/supabase-js@2.118.0';
import {webhookHandler} from '../_shared/webhook.js';
const environment=Deno.env.get('MERCADOPAGO_ENVIRONMENT')||'test';
const suffix=environment==='production'?'PROD':'TEST';
const client=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
Deno.serve(webhookHandler({
 environment,
 secret:Deno.env.get(`MERCADOPAGO_WEBHOOK_SECRET_${suffix}`),
 accessToken:Deno.env.get(`MERCADOPAGO_ACCESS_TOKEN_${suffix}`),
 sellerId:Deno.env.get(`MERCADOPAGO_SELLER_ID_${suffix}`),
 otherSellerId:Deno.env.get(`MERCADOPAGO_SELLER_ID_${suffix==='TEST'?'PROD':'TEST'}`),
 applicationId:Deno.env.get(`MERCADOPAGO_APPLICATION_ID_${suffix}`)||Deno.env.get('MERCADOPAGO_APPLICATION_ID'),
 productionEnabled:Deno.env.get('MERCADOPAGO_PRODUCTION_ENABLED')==='true',
 lookup:async(reference:string)=>{const {data,error}=await client.from('enem_payments').select('external_reference,mercadopago_order_id,environment,seller_id,application_id').eq('external_reference',reference).maybeSingle();if(error)throw Error('database_operation_failed');return data;},
 apply:async(args:unknown)=>{const {error}=await client.rpc('enem_apply_mercadopago_order',args);if(error)throw Error('database_operation_failed');},
 logger:entry=>console.error(JSON.stringify(entry))
}));
