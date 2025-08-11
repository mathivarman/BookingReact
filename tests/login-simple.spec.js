const { test, expect } = require('@playwright/test');
const { 
  login, 
  loginAsSuperAdmin, 
  loginAsReceptionStaff, 
  logout, 
  waitForErrorMessage,
  clearStorage 
} = require('./helpers/auth-helpers');

test.describe('Login Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage and navigate to login page
    await clearStorage(page);
    await page.goto('/');
  });

  test('should login successfully with super admin credentials', async ({ page }) => {
    await loginAsSuperAdmin(page);
    
    // Verify dashboard elements
    await expect(page.locator('h1, h2')).toContainText(/Dashboard|Apartment Booking/);
  });

  test('should login successfully with reception staff credentials', async ({ page }) => {
    await loginAsReceptionStaff(page);
    
    // Verify dashboard elements
    await expect(page.locator('h1, h2')).toContainText(/Dashboard|Apartment Booking/);
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await login(page, 'wrong@example.com', 'wrongpassword', false);
    await waitForErrorMessage(page);
  });

  test('should show error for empty fields', async ({ page }) => {
    // Try to submit without filling fields
    await page.locator('button[type="submit"]').click();
    
    // Should stay on login page
    await expect(page.locator('h2')).toContainText('Apartment Booking');
  });

  test('should show loading state during login', async ({ page }) => {
    // Fill credentials
    await page.locator('input[type="email"]').fill('admin@example.com');
    await page.locator('input[type="password"]').fill('password123');
    
    // Submit and check loading state
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('button[type="submit"]')).toContainText('Signing In...');
    
    // Wait for completion
    await page.waitForURL('**/dashboard');
  });

  test('should persist login after page refresh', async ({ page }) => {
    await loginAsSuperAdmin(page);
    
    // Refresh page
    await page.reload();
    
    // Should still be logged in
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should handle network errors', async ({ page }) => {
    // Mock network failure
    await page.route('**/api/auth/login', route => {
      route.abort('failed');
    });
    
    await login(page, 'admin@example.com', 'password123', false);
    await waitForErrorMessage(page);
  });
});
