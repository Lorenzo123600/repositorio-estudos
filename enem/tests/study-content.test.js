import test from 'node:test';
import assert from 'node:assert/strict';
import {studyContentHandler} from '../supabase/functions/_shared/study-content.js';
import {protectContent} from '../scripts/commercial-build.mjs';
import {readFileSync} from 'node:fs';

const origin='https://bora-pro-enem.pages.dev',content={private:'study-fixture'};
const request=(headers={},method='POST')=>new Request('https://example.test/content',{method,headers:{Origin:origin,Authorization:'Bearer student',...headers}});
test('private content denies anonymous, unconfirmed, unpaid and unavailable access',async()=>{
 for(const user of [null,{id:'student',email_confirmed_at:null}]){
  const handler=studyContentHandler({origin,content,authenticate:async()=>user,hasAccess:async()=>true});
  assert.equal((await handler(request())).status,401);
 }
 for(const access of [false,'true',null]){
  const handler=studyContentHandler({origin,content,authenticate:async()=>({id:'student',email_confirmed_at:'yes'}),hasAccess:async()=>access});
  const response=await handler(request());assert.equal(response.status,403);assert.ok(!(await response.text()).includes(content.private));
 }
 const offline=studyContentHandler({origin,content,authenticate:async()=>{throw Error('offline');},hasAccess:async()=>true});
 assert.equal((await offline(request())).status,503);
});
test('private content requires allowed origin and verified access, with no cache',async()=>{
 let checks=0;
 const handler=studyContentHandler({origin,content,authenticate:async()=>({id:'student',email_confirmed_at:'yes'}),hasAccess:async()=>{checks++;return true;}});
 assert.equal((await handler(request({Origin:'https://other.test'}))).status,403);
 assert.equal((await handler(request({Authorization:''}))).status,401);
 assert.equal((await handler(request({},'GET'))).status,405);
 assert.equal((await handler(request({},'OPTIONS'))).status,204);
 assert.equal(checks,0);
 const response=await handler(request());assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.deepEqual(await response.json(),content);assert.equal(checks,1);
});
test('commercial transform removes all premium data initializers and official JSON import',()=>{
 for(const kind of ['data','activities','essays']){
  const code=readFileSync(new URL(`../src/${kind}.js`,import.meta.url),'utf8');
  const transformed=protectContent(code,kind);
  assert.ok(transformed.includes(`globalThis.__ENEM_CONTENT__.${kind}.`));
  if(kind==='activities')assert.ok(!transformed.includes("from './official-questions.json'"));
 }
});


test('explicit study previews pass preflight but still require verified account and access',async()=>{
 const preview='https://17a4e897.bora-pro-enem.pages.dev';let checks=0;
 const options={origin,allowedOrigins:[preview],content,authenticate:async token=>token==='student'?{id:'student',email_confirmed_at:'yes'}:null,hasAccess:async()=>{checks++;return true;}};
 const handler=studyContentHandler(options);
 const preflight=await handler(request({Origin:preview},'OPTIONS'));
 assert.equal(preflight.status,204);assert.equal(preflight.headers.get('access-control-allow-origin'),preview);assert.equal(checks,0);
 assert.equal((await handler(request({Origin:preview,Authorization:''}))).status,401);
 assert.equal((await handler(request({Origin:preview,Authorization:'Bearer invalid'}))).status,401);
 const unpaid=studyContentHandler({...options,hasAccess:async()=>false});assert.equal((await unpaid(request({Origin:preview}))).status,403);
 const response=await handler(request({Origin:preview}));assert.equal(response.status,200);assert.equal(response.headers.get('vary'),'Origin');assert.equal(response.headers.get('cache-control'),'no-store');assert.deepEqual(await response.json(),content);
 for(const other of ['https://evil.test','https://17a4e897.bora-pro-enem.pages.dev.evil.test','null']){
  const denied=await handler(request({Origin:other},'OPTIONS'));assert.equal(denied.status,403);assert.equal(denied.headers.get('access-control-allow-origin'),null);
 }
 assert.equal((await handler(request())).headers.get('access-control-allow-origin'),origin);
});

test('preview origins are never trusted by suffix, wildcard or malformed configuration',async()=>{
 const handler=studyContentHandler({origin:undefined,allowedOrigins:['*','https://*.bora-pro-enem.pages.dev','http://unsafe.test','https://safe.test/path'],content,authenticate:async()=>({id:'student',email_confirmed_at:'yes'}),hasAccess:async()=>true});
 for(const other of ['https://unlisted.bora-pro-enem.pages.dev','http://unsafe.test','https://safe.test','https://*.bora-pro-enem.pages.dev'])assert.equal((await handler(request({Origin:other}))).status,403);
});
