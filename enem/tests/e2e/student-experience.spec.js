import {test,expect} from '@playwright/test';

test('refresh preserves writing and a customized exam including pending answers',async({page})=>{
 await page.goto('/');await page.locator('[data-tab="Redação"]').click();await page.locator('#essay').fill('Rascunho preservado na mesma área.');
 await page.reload();await expect(page.locator('#essay')).toHaveValue('Rascunho preservado na mesma área.');
 await page.locator('[data-tab="Simulados"]').click();await page.locator('#exam-area').selectOption('Natureza');await page.locator('#custom-exam-count').fill('7');await page.locator('#custom-exam-minutes').fill('13');await page.reload();await expect(page.locator('#custom-exam-count')).toHaveValue('7');await expect(page.locator('#custom-exam-minutes')).toHaveValue('13');await expect(page.locator('#exam-area')).toHaveValue('Natureza');await page.locator('#custom-exam-form button[type=submit]').click();
 await expect(page.locator('[data-exam-index]')).toHaveCount(7);await page.locator('[data-exam-answer="2"]').click();
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('enem-reta-final')).activeExam);
 expect(new Set(before.ids).size).toBe(7);await expect(page.locator('.question-source')).toContainText('ENEM');await expect(page.locator('.question .badge')).toContainText('Natureza');expect(before.deadline-before.startedAt).toBe(13*60000);
 await page.reload();await expect(page.locator('[data-exam-answer="2"]')).toHaveAttribute('aria-pressed','true');await expect(page.locator('.feedback')).toHaveCount(0);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('enem-reta-final')).activeExam)).toEqual(before);
});

test('focus clock accepts custom time, runs while hidden and restores after refresh',async({page})=>{
 await page.goto('/');await page.clock.install();await page.locator('#focus-open').click();
 await page.locator('#focus-custom-minutes').fill('7');await page.locator('#focus-custom-form button[type=submit]').click();
 await expect(page.locator('#focus-global-time')).toHaveText('07:00');await page.locator('#focus-global-control').click();
 await page.clock.fastForward(5000);await expect(page.locator('#focus-global-time')).toHaveText('06:55');
 await page.locator('#focus-hide').click();await expect(page.locator('#focus-global-root')).toBeHidden();await page.clock.fastForward(10000);
 await page.locator('#focus-open').click();await expect(page.locator('#focus-global-time')).toHaveText('06:45');
 await page.locator('#focus-hide').click();await page.reload();await expect(page.locator('#focus-global-root')).toBeHidden();await page.locator('#focus-open').click();
 await expect(page.locator('#focus-custom-minutes')).toHaveValue('7');await expect(page.locator('#focus-global-time')).not.toHaveText('07:00');
});

test('shuffle preserves recorded answers and question identity, and author revision is absent',async({page})=>{
 await page.addInitScript(()=>{Math.random=()=>0.1234;});
 await page.goto('/');await page.locator('[data-tab="Questões"]').click();await expect(page.locator('#question-origin')).toHaveCount(0);
 await expect(page.getByText('Revisão autoral',{exact:true})).toHaveCount(0);
 await page.locator('[data-answer="0"]').click();await page.locator('#confirm-answer').click();
 const answers=await page.evaluate(()=>JSON.parse(localStorage.getItem('enem-reta-final')).answers);
 const before=await page.locator('.question-source').textContent();await page.locator('#shuffle-questions').click();
 await expect(page.locator('.question-source')).not.toHaveText(before);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('enem-reta-final')).answers)).toEqual(answers);
 const order=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('bora-enem-view-v1:guest')).order);
 expect(order.length).toBeGreaterThanOrEqual(1000);expect(new Set(order).size).toBe(order.length);
 const source=await page.locator('.question-source').textContent();await page.reload();await expect(page.locator('.question-source')).toHaveText(source);
});

test('daily missions and achievements reflect real actions and work on mobile',async({page})=>{
 await page.goto('/');await page.locator('[data-tab="Desafios"]').click();await expect(page.locator('.challenge-overview').first()).toContainText('0/3');
 await page.locator('.daily-mission-card[data-feature-tab="Desafios"]').click();await expect(page.locator('#challenge-concepts')).toBeFocused();
 await page.locator('[data-tab="Redação"]').click();await page.locator('#essay').fill(Array(42).fill('estudo').join(' '));
 await page.locator('[data-tab="Desafios"]').click();await expect(page.locator('.challenge-overview')).toContainText('1/3');
 await expect(page.locator('.daily-mission-card[data-feature-tab="Redação"]')).toHaveClass(/mission-done/);
 await page.reload();await expect(page.locator('.challenge-overview')).toContainText('1/3');
 await page.setViewportSize({width:320,height:700});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'/tmp/enem-missions-mobile.png',fullPage:true});
 await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'/tmp/enem-missions-desktop.png',fullPage:true});
});
