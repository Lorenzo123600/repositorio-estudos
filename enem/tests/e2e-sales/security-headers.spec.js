import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {securityHeaders} from '../../scripts/security-headers.mjs';

const headers=securityHeaders('https://enem-test.supabase.co');
// Vite preview does not apply Cloudflare's _headers, so reproduce those response headers.
test.beforeEach(async({page})=>{
 await page.route(/^http:\/\/127\.0\.0\.1:3300\//,async route=>{
  const response=await route.fetch();
  await route.fulfill({response,headers:{...response.headers(),...headers}});
 });
});

test('Cloudflare artifact restricts scripts, framing, connections and browser permissions',()=>{
 const file=readFileSync(new URL('../../dist/_headers',import.meta.url),'utf8');
 for(const [name,value] of Object.entries(headers))expect(file).toContain(`  ${name}: ${value}`);
 expect(headers['Content-Security-Policy']).not.toContain("script-src 'self' 'unsafe-inline'");
 expect(headers['Content-Security-Policy']).not.toContain('unsafe-eval');
 expect(headers['Content-Security-Policy']).not.toContain('*.supabase.co');
});

test('enforced policy preserves home, demo, registration and startup fallback',async({page})=>{
 const violations=[];
 await page.addInitScript(()=>document.addEventListener('securitypolicyviolation',event=>{
  (window.policyViolations??=[]).push({directive:event.effectiveDirective,blocked:event.blockedURI});
 }));
 await page.route('https://enem-test.supabase.co/**',async route=>{
  const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'*'};
  if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:cors});
  return route.fulfill({json:{user:{id:'fixture',email:'student@example.test'},session:null},headers:cors});
 });
 await page.goto('/');await expect(page.locator('#store-demo')).toBeVisible();
 await page.locator('#store-demo').click();await page.locator('[data-demo-answer="0"]').click();await page.locator('#demo-confirm').click();await expect(page.locator('.feedback')).toBeVisible();
 await page.locator('#store-login').click();await page.locator('[data-auth="register"]').click();
 await page.locator('[name=email]').fill('student@example.test');await page.locator('[name=password]').fill('Senha fixture123');await page.locator('#store-auth-form [type=submit]').click();
 await expect(page.locator('#store-auth-step')).toBeVisible();
 violations.push(...await page.evaluate(()=>window.policyViolations||[]));expect(violations).toEqual([]);
 // An injected inline script and inline event handler must both be blocked.
 await page.evaluate(()=>{const script=document.createElement('script');script.textContent='window.injectedInlineExecuted=true';document.body.append(script);const button=document.createElement('button');button.setAttribute('onclick','window.injectedHandlerExecuted=true');document.body.append(button);button.click();});
 expect(await page.evaluate(()=>!!window.injectedInlineExecuted||!!window.injectedHandlerExecuted)).toBe(false);
 await page.route('**/assets/*.js',route=>route.abort());await page.reload();
 await expect(page.locator('#startup-status')).toContainText('Não foi possível iniciar');
 const navigated=page.waitForEvent('load');await page.locator('#startup-retry').click();await navigated;
});

test('a third-party page cannot embed the app in a frame',async({page})=>{
 await page.route('**/security-frame-test',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><iframe title="embedded app" src="/"></iframe>'}));
 const blocked=page.waitForEvent('console',{predicate:message=>/frame-ancestors|X-Frame-Options/.test(message.text())});
 await page.goto('/security-frame-test');
 expect((await blocked).text()).toMatch(/frame-ancestors|X-Frame-Options/);
});
