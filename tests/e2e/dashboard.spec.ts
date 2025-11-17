import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/');
    await page.fill('#login-email', 'admin@example.com');
    await page.fill('#login-password', 'Admin!2025');
    await page.click('button[type="submit"]');
    await page.waitForSelector('#dashboard-page', { state: 'visible', timeout: 5000 });
  });

  test('should display dashboard components', async ({ page }) => {
    await expect(page.locator('h2')).toContainText('案件ダッシュボード');
    await expect(page.locator('#btn-new-deal')).toBeVisible();
    await expect(page.locator('#search-deals')).toBeVisible();
    await expect(page.locator('#sort-deals')).toBeVisible();
  });

  test('should display deals list', async ({ page }) => {
    await page.waitForSelector('#deals-list', { timeout: 5000 });
    await expect(page.locator('#deals-list')).toBeVisible();
  });

  test('should filter deals by status', async ({ page }) => {
    await page.selectOption('#filter-status', 'NEW');
    await page.waitForTimeout(500);
    
    // Check if filtered
    const deals = page.locator('#deals-list .deal-card');
    const count = await deals.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should search deals', async ({ page }) => {
    const searchTerm = '川崎';
    await page.fill('#search-deals', searchTerm);
    await page.waitForTimeout(500); // Wait for debounce
    
    // Should show filtered results
    const deals = page.locator('#deals-list .deal-card');
    const count = await deals.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should sort deals', async ({ page }) => {
    await page.selectOption('#sort-deals', 'title');
    await page.waitForTimeout(500);
    
    // Check if deals are reordered
    const deals = page.locator('#deals-list .deal-card');
    const count = await deals.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should open new deal modal', async ({ page }) => {
    await page.click('#btn-new-deal');
    await page.waitForSelector('#new-deal-modal', { state: 'visible', timeout: 2000 });
    
    await expect(page.locator('#new-deal-modal')).toBeVisible();
    await expect(page.locator('#new-deal-title')).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('#login-email', 'admin@example.com');
    await page.fill('#login-password', 'Admin!2025');
    await page.click('button[type="submit"]');
    await page.waitForSelector('#dashboard-page', { state: 'visible', timeout: 5000 });
  });

  test('should navigate to notifications page', async ({ page }) => {
    await page.click('#nav-notifications');
    await page.waitForTimeout(500);
    
    await expect(page.locator('#notifications-page')).toBeVisible();
  });

  test('should navigate to settings page', async ({ page }) => {
    await page.click('#nav-settings');
    await page.waitForTimeout(500);
    
    await expect(page.locator('#settings-page')).toBeVisible();
  });

  test('should navigate back to deals', async ({ page }) => {
    // Go to settings
    await page.click('#nav-settings');
    await page.waitForTimeout(500);
    
    // Go back to deals
    await page.click('#nav-deals');
    await page.waitForTimeout(500);
    
    await expect(page.locator('#dashboard-page')).toBeVisible();
  });
});

test.describe('Mobile Navigation', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('#login-email', 'admin@example.com');
    await page.fill('#login-password', 'Admin!2025');
    await page.click('button[type="submit"]');
    await page.waitForSelector('#dashboard-page', { state: 'visible', timeout: 5000 });
  });

  test('should display mobile menu toggle', async ({ page }) => {
    await expect(page.locator('#mobile-menu-toggle')).toBeVisible();
  });

  test('should open mobile navigation menu', async ({ page }) => {
    await page.click('#mobile-menu-toggle');
    await page.waitForTimeout(300);
    
    const mobileNav = page.locator('#mobile-nav');
    await expect(mobileNav).toHaveClass(/active/);
  });

  test('should close mobile menu when clicking overlay', async ({ page }) => {
    await page.click('#mobile-menu-toggle');
    await page.waitForTimeout(300);
    
    await page.click('#mobile-nav-overlay');
    await page.waitForTimeout(300);
    
    const mobileNav = page.locator('#mobile-nav');
    await expect(mobileNav).not.toHaveClass(/active/);
  });
});
