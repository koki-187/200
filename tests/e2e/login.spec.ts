import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login page', async ({ page }) => {
    await expect(page.locator('h2')).toContainText('ログイン');
    await expect(page.locator('#login-email')).toBeVisible();
    await expect(page.locator('#login-password')).toBeVisible();
  });

  test('should login successfully with admin credentials', async ({ page }) => {
    await page.fill('#login-email', 'admin@example.com');
    await page.fill('#login-password', 'Admin!2025');
    await page.click('button[type="submit"]');

    // Wait for dashboard to appear
    await page.waitForSelector('#dashboard-page', { state: 'visible', timeout: 5000 });
    await expect(page.locator('#dashboard-page')).toBeVisible();
    await expect(page.locator('h2')).toContainText('案件ダッシュボード');
  });

  test('should login successfully with agent credentials', async ({ page }) => {
    await page.fill('#login-email', 'seller1@example.com');
    await page.fill('#login-password', 'agent123');
    await page.click('button[type="submit"]');

    await page.waitForSelector('#dashboard-page', { state: 'visible', timeout: 5000 });
    await expect(page.locator('#dashboard-page')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.fill('#login-email', 'invalid@example.com');
    await page.fill('#login-password', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Wait for error message (toast or alert)
    await page.waitForTimeout(1000);
    
    // Should still be on login page
    await expect(page.locator('#login-page')).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    await page.fill('#login-email', 'invalid-email');
    await page.fill('#login-password', 'password123');
    
    // HTML5 validation should prevent submission
    const emailInput = page.locator('#login-email');
    const validationMessage = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage);
    
    expect(validationMessage).toBeTruthy();
  });

  test('should require password', async ({ page }) => {
    await page.fill('#login-email', 'admin@example.com');
    // Leave password empty
    
    const passwordInput = page.locator('#login-password');
    const validationMessage = await passwordInput.evaluate((el: HTMLInputElement) => el.validationMessage);
    
    expect(validationMessage).toBeTruthy();
  });
});

test.describe('Logout Flow', () => {
  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/');
    await page.fill('#login-email', 'admin@example.com');
    await page.fill('#login-password', 'Admin!2025');
    await page.click('button[type="submit"]');
    await page.waitForSelector('#dashboard-page', { state: 'visible', timeout: 5000 });

    // Logout
    await page.click('#btn-logout');
    await page.waitForTimeout(500);

    // Should be back on login page
    await expect(page.locator('#login-page')).toBeVisible();
  });
});
