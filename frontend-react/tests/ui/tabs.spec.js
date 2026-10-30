import { test, expect } from '@playwright/test';

test.describe('UI Navigation & Role Tabs Smoke Tests', () => {
  test('Trang chủ và các trang công khai tải thành công không có lỗi console', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/');
    await expect(page).toHaveTitle(/Nexus Telecom/i);

    // Kiểm tra chuyển sang trang Đăng ký
    await page.goto('/register');
    await expect(page.locator('body')).toBeVisible();

    // Kiểm tra chuyển sang trang Đăng nhập
    await page.goto('/login');
    await expect(page.locator('#login-panel-staff')).toBeHidden();

    // Đổi tab sang Đăng nhập nhân viên
    const staffTabButton = page.locator('button', { hasText: /Nhân Viên|Staff/i });
    if (await staffTabButton.isVisible()) {
      await staffTabButton.click();
      await expect(page.locator('#login-panel-staff')).toBeVisible();
    }

    // Không có lỗi console nghiêm trọng
    const fatalErrors = consoleErrors.filter(
      (err) => !err.includes('favicon') && !err.includes('Failed to load resource'),
    );
    expect(fatalErrors).toEqual([]);
  });

  test('Đăng nhập nhân viên bán lẻ mở được Retail Dashboard', async ({ page }) => {
    await page.goto('/login');
    const staffTab = page.locator('button', { hasText: /Nhân Viên|Staff/i });
    if (await staffTab.isVisible()) {
      await staffTab.click();
    }

    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    await emailInput.fill('david.chen@nexus.telecom');
    await passwordInput.fill('1234567890');

    await page.locator('button[type="submit"]', { hasText: /Đăng Nhập|Sign In/i }).click();

    // Chuyển hướng tới /retail
    await expect(page).toHaveURL(/.*\/retail/);
  });

  test('Đăng nhập kỹ thuật mở được Technical Dashboard', async ({ page }) => {
    await page.goto('/login');
    const staffTab = page.locator('button', { hasText: /Nhân Viên|Staff/i });
    if (await staffTab.isVisible()) {
      await staffTab.click();
    }

    await page.locator('input[type="email"]').fill('marcus.ramirez@nexus.telecom');
    await page.locator('input[type="password"]').fill('1234567890');
    await page.locator('button[type="submit"]', { hasText: /Đăng Nhập|Sign In/i }).click();

    await expect(page).toHaveURL(/.*\/technical/);
  });

  test('Đăng nhập kế toán mở được Accounts Dashboard', async ({ page }) => {
    await page.goto('/login');
    const staffTab = page.locator('button', { hasText: /Nhân Viên|Staff/i });
    if (await staffTab.isVisible()) {
      await staffTab.click();
    }

    await page.locator('input[type="email"]').fill('elena.rostova@nexus.telecom');
    await page.locator('input[type="password"]').fill('1234567890');
    await page.locator('button[type="submit"]', { hasText: /Đăng Nhập|Sign In/i }).click();

    await expect(page).toHaveURL(/.*\/accounts/);
  });

  test('Đăng nhập quản trị mở được Admin Dashboard', async ({ page }) => {
    await page.goto('/login');
    const staffTab = page.locator('button', { hasText: /Nhân Viên|Staff/i });
    if (await staffTab.isVisible()) {
      await staffTab.click();
    }

    await page.locator('input[type="email"]').fill('sarah.jenkins@nexus.telecom');
    await page.locator('input[type="password"]').fill('1234567890');
    await page.locator('button[type="submit"]', { hasText: /Đăng Nhập|Sign In/i }).click();

    await expect(page).toHaveURL(/.*\/admin/);
  });
});
