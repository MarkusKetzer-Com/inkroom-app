const { test, expect } = require('@playwright/test');

test.describe('Inkroom Dashboard Smoke Test', () => {
  test('should load the dashboard and show the brand name', async ({ page }) => {
    // Navigiere zur App (BASE_URL ist http://127.0.0.1:8787 via config)
    await page.goto('/');

    // Prüfe, ob der Titel korrekt ist
    await expect(page).toHaveTitle(/Inkroom/);

    // Prüfe, ob der Markenname "Inkroom" im Header sichtbar ist
    const brandName = page.locator('.brand-name');
    await expect(brandName).toBeVisible();
    await expect(brandName).toHaveText('Inkroom');

    // Prüfe, ob das Dashboard-Element vorhanden ist
    const dashboard = page.locator('#dashboard');
    await expect(dashboard).toBeAttached();

    // Da die DB in der CI leer sein könnte, prüfen wir auf den Container oder die "No presses" Nachricht
    // Wir warten kurz, bis der Fetch-Request durch ist
    await page.waitForLoadState('networkidle');
    
    // Check if either cards exist or the "No presses found" message is shown
    const cards = page.locator('.card');
    const noPresses = page.getByText(/No presses found|Baskı makinesi bulunamadi/);
    
    await expect(cards.first().or(noPresses)).toBeVisible();
  });

  test('should switch languages', async ({ page }) => {
    await page.goto('/');
    
    // Wechsel zu Türkisch
    await page.click('#lang-tr-btn');
    
    // Prüfe, ob der Dashboard-Tab-Text zu TR gewechselt ist
    const dashboardTab = page.locator('#nav-dashboard');
    await expect(dashboardTab).toHaveText('Kontrol Paneli');
    
    // Zurück zu Englisch
    await page.click('#lang-en-btn');
    await expect(dashboardTab).toHaveText('Dashboard');
  });
});
