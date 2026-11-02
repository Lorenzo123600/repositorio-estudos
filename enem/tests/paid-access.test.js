import test from 'node:test';
import assert from 'node:assert/strict';
import {createPaidAccess} from '../src/paid-access.js';

function fixture(){
 let user='alice',time=Date.parse('2026-11-02T12:00:00Z'),response=[];
 const grant={environment:'production',status:'active',activated_at:new Date(time-1000).toISOString(),expires_at:new Date(time+60000).toISOString()};
 const account={paymentUser:()=>user,paymentsAvailable:()=>true,paymentRequest:async()=>response};
 const gate=createPaidAccess({account,onChange:()=>{},now:()=>time});
 return {gate,grant,account,setUser:v=>user=v,setTime:v=>time=v,setResponse:v=>response=v,time};
}
test('paid access requires a fresh, active production grant for the current account',async()=>{
 const f=fixture();assert.equal(f.gate.snapshot().active,false);
 for(const patch of [{environment:'test'},{status:'revoked'},{expires_at:new Date(f.time-1).toISOString()},{activated_at:new Date(f.time+1).toISOString()}]){
  f.setResponse([{...f.grant,...patch}]);await f.gate.refresh();assert.equal(f.gate.snapshot().active,false);
 }
 f.setResponse([f.grant]);await f.gate.refresh();assert.equal(f.gate.snapshot().active,true);
 f.setTime(f.time+30000);assert.equal(f.gate.snapshot().active,false);
});
test('switching accounts or signing out immediately removes the previous entitlement',async()=>{
 const f=fixture();f.setResponse([f.grant]);await f.gate.refresh();assert.equal(f.gate.snapshot().active,true);
 f.setUser('bob');assert.equal(f.gate.snapshot().active,false);
 f.setUser(null);assert.equal(f.gate.snapshot().active,false);
});
test('a late response for the old account cannot unlock the new account',async()=>{
 const f=fixture();let finish;f.account.paymentRequest=()=>new Promise(resolve=>finish=resolve);
 const pending=f.gate.refresh();f.setUser('bob');f.gate.snapshot();finish([f.grant]);await pending;
 assert.equal(f.gate.snapshot().active,false);
});
test('refresh failure, revocation and expiry remove access without deleting study state',async()=>{
 const f=fixture();f.setResponse([f.grant]);await f.gate.refresh();
 f.account.paymentRequest=async()=>{throw Error('offline');};await f.gate.refresh();assert.equal(f.gate.snapshot().active,false);assert.equal(f.gate.snapshot().failed,true);
 f.account.paymentRequest=async()=>[f.grant];await f.gate.refresh();assert.equal(f.gate.snapshot().active,true);
 f.setTime(f.time+60000);assert.equal(f.gate.snapshot().active,false);
});
