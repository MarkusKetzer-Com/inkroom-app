const { test, expect } = require('@playwright/test');

const PREVIEW_URL = 'https://preview-inkroom-app.mk-d93.workers.dev';

test.describe('Dashboard Smoke Test', () => {

  test('1 - page loads and dashboard renders', async ({ page }) => {
    await page.goto(PREVIEW_URL, { waitUntil: 'networkidle', timeout: 20000 });
    // Wait for SPA to remove the .hidden class and populate the dashboard
    await page.waitForFunction(() => {
      const view = document.getElementById('dashboard-view');
      const dash = document.getElementById('dashboard');
      return view && !view.classList.contains('hidden') && dash && dash.innerHTML.trim().length > 100;
    }, { timeout: 15000 });
  });

  test('2 - setup button visible and timer ticks after click', async ({ page }) => {
    await page.goto(PREVIEW_URL, { waitUntil: 'networkidle', timeout: 20000 });

    // Wait for dashboard to finish loading API data
    await page.waitForFunction(() => {
      const d = document.getElementById('dashboard');
      return d && d.innerHTML.trim().length > 100;
    }, { timeout: 10000 });

    // Check if a setup button exists already
    const setupBtn = page.locator('.btn-action-main').first();
    const hasSetupBtn = (await setupBtn.count()) > 0;
    
    if (!hasSetupBtn) {
      // Click the "add-card" div which calls openNewJobModal()
      const addCard = page.locator('.add-card').first();
      await addCard.click({ timeout: 8000 });

      // Fill in the modal
      await page.locator('#nj-number').fill('SMOKE-101');
      await page.locator('#nj-title').fill('Smoke Test Job');
      await page.locator('#nj-count').fill('4');
      await page.locator('#nj-target').fill('10000');
      
      // Submit by clicking the submit button
      await page.locator('#new-job-overlay .btn-primary').last().click();
      
      // Wait for dashboard to refresh
      await page.waitForFunction(() => {
        return document.querySelectorAll('.btn-action-main').length > 0;
      }, { timeout: 8000 });
    }

    // The setup or state button must be visible
    await expect(page.locator('.btn-action-main').first()).toBeVisible({ timeout: 8000 });
    
    // Only click "Start Setup" if the job is in 'ready' state
    const btnText = await page.locator('.btn-action-main').first().innerText();
    console.log(`Button visible: "${btnText}"`);

    if (/Setup Başlat|Start Setup/i.test(btnText)) {
      await page.locator('.btn-action-main').first().click();
      
      // After click, status changes — a new button appears
      await page.waitForFunction(() => {
        const btn = document.querySelector('.btn-action-main');
        return btn && !/Setup Başlat|Start Setup/i.test(btn.textContent);
      }, { timeout: 8000 });

      // Live timer must be ticking
      const timer = page.locator('.live-timer').first();
      await expect(timer).toBeVisible({ timeout: 5000 });
      const t1 = await timer.innerText();
      await page.waitForTimeout(1300);
      const t2 = await timer.innerText();
      
      console.log(`✅ Timer ticking: "${t1}" → "${t2}"`);
      expect(t1).not.toBe(t2);
    } else {
      // Job already in a later state — timer should already be visible
      console.log(`Job already in state beyond ready. Button: "${btnText}"`);
      const timer = page.locator('.live-timer').first();
      if (await timer.count() > 0) {
        const t1 = await timer.innerText();
        await page.waitForTimeout(1300);
        const t2 = await timer.innerText();
        console.log(`✅ Existing timer ticking: "${t1}" → "${t2}"`);
        expect(t1).not.toBe(t2);
      }
    }
  });
});
