import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSupabaseTransport} from '../src/supabase-account.js';
const user={id:'a',email_confirmed_at:'2026-01-01'};
test('premium rejects no session, changed identity and unpaid access before reading or writing data',async()=>{
 for(const scenario of ['guest','changed','unpaid']){
  const calls=[];
  const client={auth:{getUser:async()=>({data:{user:scenario==='guest'?null:user}})},rpc:async name=>{calls.push(name);return {data:false};}};
  const transport=createSupabaseTransport(client);
  await assert.rejects(()=>transport.request('/premium-progress',{method:'PUT',headers:{'X-Study-User':scenario==='changed'?'b':'a'},body:JSON.stringify({state:{paid:true},revision:0})}));
  assert.deepEqual(calls,scenario==='unpaid'?['enem_has_premium']:[]);
 }
});
test('premium write uses the guarded backend RPC and propagates optimistic conflicts',async()=>{
 const calls=[];
 const client={auth:{getUser:async()=>({data:{user}})},rpc:async(name,args)=>{calls.push([name,args]);return name==='enem_has_premium'?{data:true}:{error:{code:'PT409'}};}};
 await assert.rejects(()=>createSupabaseTransport(client).request('/premium-progress',{method:'PUT',body:JSON.stringify({state:{activeExam:{}},revision:2})}),e=>e.status===409);
 assert.equal(calls[1][0],'save_enem_premium_progress');assert.equal(calls[1][1].p_revision,2);
});
