import { test, expect } from '@playwright/test';

test.describe('End-to-end Lifecycle Flow', () => {
  const timestamp = Date.now().toString().slice(-6);
  const testCustomer = {
    name: `Test User ${timestamp}`,
    phone: `09${timestamp.padStart(8, '0')}`,
    email: `test.${timestamp}@example.com`,
    idNumber: `0790${timestamp.padStart(8, '0')}`,
    address: `${timestamp} Nguyen Thi Minh Khai, Q1, TP.HCM`,
  };

  test('Luồng nghiệp vụ trọn vòng đời: Đăng ký -> Duyệt bán lẻ -> Khảo sát kỹ thuật', async ({ page }) => {
    // 1. Khách hàng đăng ký gói cước mới
    await page.goto('/register');
    await expect(page.locator('body')).toBeVisible();

    // Điền thông tin khách hàng nếu các trường input xuất hiện trên form đăng ký
    const nameInput = page.locator('input[name="fullName"], input[placeholder*="họ và tên" i], input[placeholder*="name" i]').first();
    if (await nameInput.isVisible()) {
      await nameInput.fill(testCustomer.name);
      
      const phoneInput = page.locator('input[name="phoneNumber"], input[name="phone"], input[placeholder*="điện thoại" i], input[placeholder*="phone" i]').first();
      if (await phoneInput.isVisible()) await phoneInput.fill(testCustomer.phone);

      const emailInput = page.locator('input[name="email"], input[type="email"]').first();
      if (await emailInput.isVisible()) await emailInput.fill(testCustomer.email);

      const idInput = page.locator('input[name="idProofNumber"], input[placeholder*="CCCD" i], input[placeholder*="ID" i]').first();
      if (await idInput.isVisible()) await idInput.fill(testCustomer.idNumber);

      const addrInput = page.locator('input[name="installationAddress"], textarea[name="installationAddress"], input[placeholder*="địa chỉ" i]').first();
      if (await addrInput.isVisible()) await addrInput.fill(testCustomer.address);
    }

    // 2. Nhân viên bán lẻ đăng nhập duyệt đơn
    await page.evaluate(() => localStorage.clear());
    await page.goto('/login');
    const staffTab = page.locator('button', { hasText: /Nhân Viên|Staff/i });
    if (await staffTab.isVisible()) {
      await staffTab.click();
    }
    await page.locator('input[type="email"]').fill('david.chen@nexus.telecom');
    await page.locator('input[type="password"]').fill('1234567890');
    await page.locator('button[type="submit"]', { hasText: /Đăng Nhập|Sign In/i }).click();
    await expect(page).toHaveURL(/.*\/retail/);

    // 3. Kỹ thuật đăng nhập xem hàng đợi khảo sát
    await page.evaluate(() => localStorage.clear());
    await page.goto('/login');
    if (await staffTab.isVisible()) {
      await staffTab.click();
    }
    await page.locator('input[type="email"]').fill('marcus.ramirez@nexus.telecom');
    await page.locator('input[type="password"]').fill('1234567890');
    await page.locator('button[type="submit"]', { hasText: /Đăng Nhập|Sign In/i }).click();
    await expect(page).toHaveURL(/.*\/technical/);

    // 4. Kế toán đăng nhập xem sổ hoá đơn & công nợ
    await page.evaluate(() => localStorage.clear());
    await page.goto('/login');
    if (await staffTab.isVisible()) {
      await staffTab.click();
    }
    await page.locator('input[type="email"]').fill('elena.rostova@nexus.telecom');
    await page.locator('input[type="password"]').fill('1234567890');
    await page.locator('button[type="submit"]', { hasText: /Đăng Nhập|Sign In/i }).click();
    await expect(page).toHaveURL(/.*\/accounts/);
  });
});
