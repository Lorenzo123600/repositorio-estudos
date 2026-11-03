import {test,expect} from '@playwright/test';
const password='Auditoria segura 123!';
async function register(page,email){
 await page.goto('/');await page.locator('#account-open').click();
 await page.locator('[data-account-mode=register]').click();
 await page.locator('#register-form [name=name]').fill('Auditoria');
 await page.locator('#register-form [name=email]').fill(email);
 await page.locator('#register-form [name=password]').fill(password);
 await page.locator('#register-form button[name=action]').click();
 await expect(page.locator('dialog h2')).toHaveText('Sua conta');
 await page.locator('#account-close').click();
}

test('late progress response after logout must never restore private draft',async({page})=>{
 await register(page,`late-${Date.now()}@example.test`);
 await page.locator('[data-tab="Redação"]').click();
 await page.locator('#essay').fill('PRIVATE DRAFT OF ACCOUNT A');
 await expect(page.locator('#storage-note')).toHaveText('Sincronizado com sua conta');
 const stored=await (await page.request.get('/api/progress')).json();
 await page.request.put('/api/progress',{headers:{Origin:'http://127.0.0.1:3100'},data:{revision:stored.revision,state:{essay:'PRIVATE DRAFT OF ACCOUNT A FROM DEVICE 2'}}});
 let release,received;const ready=new Promise(r=>received=r),hold=new Promise(r=>release=r);
 await page.route('**/api/progress',async route=>{
  if(route.request().method()!=='GET')return route.continue();
  const response=await route.fetch();received();await hold;await route.fulfill({response});
 });
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await ready;
 await page.locator('#account-open').click();await page.locator('#account-logout').click();
 await expect(page.locator('#essay')).toHaveValue('');const returned=page.waitForResponse(r=>r.url().endsWith('/api/progress'));release();
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('enem-reta-final')||'{}').essay||'')).toBe('');
 await (await returned).finished();await page.evaluate(()=>new Promise(requestAnimationFrame));
 await expect(page.locator('#essay')).toHaveValue('');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('enem-reta-final')||'{}').essay||'')).toBe('');
});

test('switching the shared session in another tab must clear the old private draft',async({context,page})=>{
 await register(page,`shared-a-${Date.now()}@example.test`);
 await page.locator('[data-tab="Redação"]').click();await page.locator('#essay').fill('PRIVATE DRAFT OF ACCOUNT A');
 await expect(page.locator('#storage-note')).toHaveText('Sincronizado com sua conta');
 const other=await context.newPage();await other.goto('/');await other.locator('#account-open').click();await other.locator('#account-logout').click();await register(other,`shared-b-${Date.now()}@example.test`);
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await expect(page.locator('#essay')).toHaveValue('');
 await expect(page.locator('#account-open')).toContainText('Entrar');
 await other.close();
});
