const { test, expect } = require('@playwright/test');

test.describe('Basic Login Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the login page
    await page.goto('/');
  });

  test('should display login form', async ({ page }) => {
    // Check if the login form is visible
    await expect(page.locator('h2')).toContainText('Apartment Booking');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    // Fill in valid credentials
    await page.locator('input[type="email"]').fill('admin@example.com');
    await page.locator('input[type="password"]').fill('password123');
    
    // Submit the form
    await page.locator('button[type="submit"]').click();
    
    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard');
    
    // Verify we're on the dashboard
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should show error for invalid credentials', async ({ page }) => {
    // Fill in invalid credentials
    await page.locator('input[type="email"]').fill('wrong@example.com');
    await page.locator('input[type="password"]').fill('wrongpassword');
    
    // Submit the form
    await page.locator('button[type="submit"]').click();
    
    // Wait for error message to appear
    await expect(page.locator('.alert-danger')).toBeVisible();
  });

  test('should show loading state during login', async ({ page }) => {
    // Fill in valid credentials
    await page.locator('input[type="email"]').fill('admin@example.com');
    await page.locator('input[type="password"]').fill('password123');
    
    // Submit and check loading state
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('button[type="submit"]')).toContainText('Signing In...');
    
    // Wait for completion
    await page.waitForURL('**/dashboard');
  });
});
