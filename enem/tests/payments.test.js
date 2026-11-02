import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {createOrderHandler,checkoutURL,money} from '../supabase/functions/_shared/create-order.js';
import {validateSignature,webhookHandler,verifiedOrder} from '../supabase/functions/_shared/webhook.js';
import {attemptKey,accessIsCurrent,accessExpiryLabel,validCheckout} from '../src/payments.js';
const planId='33333333-3333-4333-8333-333333333333',key='44444444-4444-4444-8444-444444444444',reference='55555555-5555-4555-8555-555555555555',origin='https://bora-pro-enem.pages.dev';
const id='ORDTST01KS5AJ6HTK2HRQ3XJ3C2JCKP9';
const order=()=>({id,type:'online',processing_mode:'manual',status:'created',status_detail:'created',external_reference:reference,total_amount:'10.00',total_paid_amount:'0.00',currency:'BRL',country_code:'BRA',user_id:'seller',integration_data:{application_id:'app'},last_updated_date:'2026-11-02T12:00:00Z',checkout_url:`https://www.mercadopago.com.br/checkout/v1/redirect?order_id=${id}`});
const request=(body={plan_id:planId,idempotency_key:key},headers={})=>new Request('https://functions.test/create',{method:'POST',headers:{origin,authorization:'Bearer user-jwt','content-type':'application/json',...headers},body:JSON.stringify(body)});
function setup(overrides={}){
 const calls=[],payment={id:'internal',user_id:'student',plan_id:planId,idempotency_key:key,amount:10,currency:'BRL',environment:'test',external_reference:reference,status:'pending'};
 const store={bindContext:async(...args)=>{calls.push(['context',...args]);},begin:async(...args)=>{calls.push(['begin',...args]);return payment;},plan:async()=>({name:'Fixture'}),freezePayload:async(_,payload)=>payment.order_payload||=payload,saveCheckout:async(...args)=>{calls.push(['save',...args]);payment.checkout_url=args[2];}};
 const options={origin,sellerId:'seller',applicationId:'app',environment:'test',accessToken:'private-fixture',authenticate:async()=>({id:'student',email:'student@example.test',email_confirmed_at:'yes'}),store,fetcher:async(url,options)=>{calls.push(['provider',url,options]);return Response.json(order());},...overrides};
 return {handler:createOrderHandler(options),calls,payment,options};
}
test('Orders: contrato oficial, preço do catálogo e somente checkout_url público',async()=>{
 const {handler,calls}=setup();const response=await handler(request());assert.equal(response.status,200);
 const output=await response.json();assert.deepEqual(Object.keys(output).sort(),['checkout_url','environment','payment_id']);
 const call=calls.find(c=>c[0]==='provider');assert.equal(call[1],'https://api.mercadopago.com/v1/orders');assert.equal(call[2].headers['X-Idempotency-Key'],key);
 const body=JSON.parse(call[2].body);assert.equal(body.total_amount,'10.00');assert.equal(body.items[0].unit_price,'10.00');assert.equal(body.processing_mode,'manual');assert.equal(body.external_reference,reference);
});
test('Orders: rejeita preço, usuário e ambiente enviados pelo navegador',async()=>{
 for(const extra of [{amount:1},{user_id:'another'},{environment:'production'}]){const {handler,calls}=setup();assert.equal((await handler(request({plan_id:planId,idempotency_key:key,...extra}))).status,400);assert.equal(calls.length,0);}
});
test('Orders: exige usuário confirmado e origem autorizada',async()=>{
 for(const user of [null,{id:'student',email:'x',email_confirmed_at:null}]){const {handler,calls}=setup({authenticate:async()=>user});assert.equal((await handler(request())).status,401);assert.equal(calls.length,0);}
 const {handler}=setup();assert.equal((await handler(request(undefined,{origin:'https://evil.test'}))).status,403);assert.equal((await handler(request(undefined,{authorization:''}))).status,401);
});
test('Orders: preflight e credenciais ausentes falham sem criação',async()=>{
 const {handler}=setup();assert.equal((await handler(new Request('https://functions.test',{method:'OPTIONS',headers:{origin}}))).status,204);
 assert.equal((await setup({accessToken:''}).handler(request())).status,503);assert.equal((await setup({environment:'arbitrary'}).handler(request())).status,503);
});
test('Orders: timeout/retry reutiliza chave e payload congelados; resposta não é logada',async()=>{
 let attempts=0;const received=[],logs=[];
 const env=setup({logger:entry=>logs.push(entry),fetcher:async(_,options)=>{received.push(options);if(!attempts++)throw Error('private-fixture');return Response.json(order());}});
 assert.equal((await env.handler(request())).status,503);env.options.store.plan=async()=>({name:'Nome alterado'});
 assert.equal((await env.handler(request())).status,200);assert.equal(received[0].body,received[1].body);assert.equal(received[0].headers['X-Idempotency-Key'],received[1].headers['X-Idempotency-Key']);assert.ok(!JSON.stringify(logs).includes('private-fixture'));
 assert.equal((await env.handler(request())).status,200);assert.equal(received.length,2);
});
test('Orders: rejeita divergência do provedor e redirecionamento malicioso',async()=>{
 for(const patch of [{currency:'USD'},{total_amount:'1.00'},{external_reference:'another'},{checkout_url:'https://evil.test/checkout'},{checkout_url:'https://www.mercadopago.com.br/checkout/v1/redirect?order_id=other'}]){
  const {handler,calls}=setup({fetcher:async()=>Response.json({...order(),...patch})});const response=await handler(request());assert.ok(response.status>=500);assert.equal(calls.filter(c=>c[0]==='save').length,0);
 }
 for(const url of ['javascript:alert(1)','https://www.mercadopago.com.br.evil.test/checkout/v1/redirect?order_id=x','https://u:p@www.mercadopago.com.br/checkout/v1/redirect?order_id=x']){assert.throws(()=>checkoutURL(url));assert.throws(()=>validCheckout(url));}
 assert.equal(money('10.1'),'10.10');assert.throws(()=>money('10.001'));
});
const secret='signature-fixture',ts='1793620800000',reqId='fixture-request';
const signature=(data=id,rid=reqId)=>`ts=${ts},v1=${createHmac('sha256',secret).update(`id:${data.toLowerCase()};${rid?`request-id:${rid};`:''}ts:${ts};`).digest('hex')}`;
const notify=(sig=signature(),body={})=>new Request(`https://functions.test/webhook?data.id=${id}&type=order`,{method:'POST',headers:{'x-signature':sig,'x-request-id':reqId,'content-type':'application/json'},body:JSON.stringify(body)});
test('Webhook: HMAC oficial com ID minúsculo e request-id opcional',async()=>{
 assert.equal(await validateSignature({signature:signature(),requestId:reqId,dataId:id,secret}),true);
 assert.equal(await validateSignature({signature:signature(id,''),dataId:id,secret}),true);
 for(const sig of ['',signature().replace('v1=','v1=0'),signature()+',ts=1'])assert.equal(await validateSignature({signature:sig,requestId:reqId,dataId:id,secret}),false);
 assert.equal(await validateSignature({signature:signature(),requestId:'changed',dataId:id,secret}),false);
});
const provenance={external_reference:reference,mercadopago_order_id:id,environment:'test',seller_id:'seller',application_id:'app'};
const verification={id,environment:'test',sellerId:'seller',applicationId:'app',payment:provenance,lookup:async()=>provenance};
test('Webhook: somente API consultada e pagamento integral acreditado podem aprovar',async()=>{
 const approved={...order(),status:'processed',status_detail:'accredited',total_paid_amount:'10.00',transactions:{payments:[{status:'processed',status_detail:'accredited'}]}};
 assert.equal(verifiedOrder(approved,verification).p_status,'approved');
 for(const patch of [{total_paid_amount:'1.00'},{user_id:'other'},{integration_data:{application_id:'other'}},{transactions:{payments:[]}},{currency:'USD'}])assert.throws(()=>verifiedOrder({...approved,...patch},verification));
});
test('Webhook: pendente/recusado/cancelado/reembolso/chargeback não aprovam',()=>{
 for(const [provider,internal] of [['created','pending'],['expired','cancelled'],['processing','pending'],['failed','rejected'],['cancelled','cancelled'],['refunded','refunded'],['charged_back','charged_back']])assert.equal(verifiedOrder({...order(),status:provider},verification).p_status,internal);
});
test('Webhook: assinatura inválida não consulta API nem concede acesso',async()=>{
 let calls=0;const handler=webhookHandler({secret,accessToken:'private',...verification,apply:async()=>calls++,fetcher:async()=>{calls++;return Response.json(order());}});
 assert.equal((await handler(notify('invalid'))).status,401);assert.equal(calls,0);
});
test('Webhook: ignora status do corpo, confirma só após commit e permite retry',async()=>{
 let commits=0,apiCalls=0;const handler=webhookHandler({secret,accessToken:'private',...verification,apply:async args=>{assert.equal(args.p_status,'pending');commits++;},fetcher:async url=>{assert.equal(url,`https://api.mercadopago.com/v1/orders/${id}`);apiCalls++;return Response.json(order());}});
 for(let i=0;i<2;i++)assert.equal((await handler(notify(signature(),{data:{status:'processed'},live_mode:true}))).status,200);
 assert.equal(apiCalls,2);assert.equal(commits,2); // DB RPC enforces purchase-level exactly-once grant (SQL suite).
 const failed=webhookHandler({secret,accessToken:'private',...verification,apply:async()=>{throw Error('db');},fetcher:async()=>Response.json(order())});assert.equal((await failed(notify())).status,503);
 const offline=webhookHandler({secret,accessToken:'private',...verification,apply:async()=>{},fetcher:async()=>{throw Error('network');}});assert.equal((await offline(notify())).status,503);
});
test('Frontend: tentativa persiste na recarga e é isolada por conta/plano',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};let sequence=0;
 const generate=()=>`uuid-${++sequence}`;
 assert.equal(attemptKey(storage,'alice','plan',generate),attemptKey(storage,'alice','plan',generate));assert.notEqual(attemptKey(storage,'alice','plan',generate),attemptKey(storage,'bob','plan',generate));
});
test('Frontend: somente acesso persistido, real e vigente pode ser apresentado como ativo',()=>{
 const now=Date.parse('2026-11-02T12:00:00Z'),access={status:'active',environment:'production',activated_at:'2026-11-01T00:00:00Z',expires_at:'2026-12-01T00:00:00Z'};
 assert.equal(accessIsCurrent(access,now),true);
 for(const patch of [{environment:'test'},{status:'revoked'},{expires_at:'2026-11-01T00:00:00Z'},{activated_at:'2026-12-01T00:00:00Z'}])assert.equal(accessIsCurrent({...access,...patch},now),false);
});

test('Orders: retorno configurado no servidor e conta correta; produção exige ativação explícita',async()=>{
 const {handler,calls}=setup();assert.equal((await handler(request())).status,200);
 const payload=JSON.parse(calls.find(c=>c[0]==='provider')[2].body);
 assert.equal(payload.config.online.auto_return,'all');
 for(const key of ['success_url','failure_url','pending_url','callback_url'])assert.equal(payload.config.online[key],origin+'/?payment_return=1');
 for(const options of [{returnUrl:'https://evil.test/'},{sellerId:'seller',otherSellerId:'seller'},{environment:'production'},{environment:'production',productionEnabled:true}])assert.equal((await setup(options).handler(request())).status,503);
 const wrong=setup({fetcher:async()=>Response.json({...order(),user_id:'another-seller'})});assert.equal((await wrong.handler(request())).status,502);
});
test('Webhook: ambiente validado pela compra vinculada, sem live_mode ou prefixos inferidos',()=>{
 assert.equal('live_mode' in order(),false);
 for(const patch of [{environment:'production'},{seller_id:'other'},{application_id:'other'},{mercadopago_order_id:'other'}, {external_reference:'other'}])assert.throws(()=>verifiedOrder(order(),{...verification,payment:{...provenance,...patch}}));
 assert.throws(()=>verifiedOrder(order(),{...verification,payment:null}));
 // Event received before saveCheckout is retried; an unbound order cannot grant access.
 assert.throws(()=>verifiedOrder(order(),{...verification,payment:{...provenance,mercadopago_order_id:null}}));
});
test('Webhook: reembolso parcial e chargeback em transações seguem política de reversão',()=>{
 assert.equal(verifiedOrder({...order(),status:'processed',status_detail:'partially_refunded'},verification).p_status,'refunded');
 assert.equal(verifiedOrder({...order(),transactions:{payments:[{status:'processed',status_detail:'partially_refunded'}]}},verification).p_status,'refunded');
 assert.equal(verifiedOrder({...order(),transactions:{refunds:[{status:'processed',amount:'1.00'}]}},verification).p_status,'refunded');
 assert.equal(verifiedOrder({...order(),transactions:{chargebacks:[{id:'case',status:'in_process'}]}},verification).p_status,'charged_back');
});
test('Frontend: validade fixa mostra o último dia inclusive no horário de Brasília',async()=>{
 const {planValidity}=await import('../src/payments.js');
 assert.equal(planValidity({access_expires_at:'2027-01-01T03:00:00Z'}),'Acesso até 31/12/2026');
 assert.equal(planValidity({duration_days:30}),'30 dias');
 const access={environment:'production',status:'active',activated_at:'2026-11-02T00:00:00Z',expires_at:'2027-01-01T03:00:00Z'};
 assert.equal(accessIsCurrent(access,Date.parse(access.expires_at)-1),true);
 assert.equal(accessIsCurrent(access,Date.parse(access.expires_at)),false);
});
test('Orders: checkout termina antes da validade fixa e planos vencidos não criam orders',async()=>{
 const now=Date.parse('2027-01-01T02:30:00Z'),env=setup({now:()=>now});
 env.payment.access_expires_at='2027-01-01T03:00:00Z';
 assert.equal((await env.handler(request())).status,200);
 assert.equal(JSON.parse(env.calls.find(c=>c[0]==='provider')[2].body).expiration_time,'PT1800S');
 const expired=setup({now:()=>now});expired.payment.access_expires_at='2027-01-01T02:00:00Z';
 assert.equal((await expired.handler(request())).status,409);
 assert.equal(expired.calls.filter(c=>c[0]==='provider').length,0);
});

test('Frontend: validade do acesso usa o último minuto inclusive no horário de Brasília',()=>{
 assert.equal(accessExpiryLabel('2027-01-01T03:00:00Z'),'31/12/2026 às 23:59 (Brasília)');
});
