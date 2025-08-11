const { test, expect } = require('@playwright/test');

test.describe('Login Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the login page before each test
    await page.goto('/');
  });

  test('should display login form with correct elements', async ({ page }) => {
    // Check if the login form is visible
    await expect(page.locator('h2')).toContainText('Apartment Booking');
    await expect(page.locator('p')).toContainText('Admin System Login');
    
    // Check if email and password fields are present
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    
    // Check if sign in button is present
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText('Sign In');
    
    // Check if demo credentials are displayed
    await expect(page.locator('small')).toContainText('Demo Credentials');
    await expect(page.locator('small')).toContainText('admin@example.com');
    await expect(page.locator('small')).toContainText('password123');
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    // Try to submit empty form
    await page.locator('button[type="submit"]').click();
    
    // Check if browser validation prevents submission
    // The form should not submit and stay on the same page
    await expect(page.locator('h2')).toContainText('Apartment Booking');
  });

  test('should show validation error for invalid email format', async ({ page }) => {
    // Fill in invalid email
    await page.locator('input[type="email"]').fill('invalid-email');
    await page.locator('input[type="password"]').fill('password123');
    
    // Try to submit
    await page.locator('button[type="submit"]').click();
    
    // Should stay on login page due to email validation
    await expect(page.locator('h2')).toContainText('Apartment Booking');
  });

  test('should successfully login with valid super admin credentials', async ({ page }) => {
    // Fill in valid credentials
    await page.locator('input[type="email"]').fill('admin@example.com');
    await page.locator('input[type="password"]').fill('password123');
    
    // Submit the form
    await page.locator('button[type="submit"]').click();
    
    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard');
    
    // Verify we're on the dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Check if dashboard elements are visible
    await expect(page.locator('h1, h2')).toContainText(/Dashboard|Apartment Booking/);
  });

  test('should show error message for invalid credentials', async ({ page }) => {
    // Fill in invalid credentials
    await page.locator('input[type="email"]').fill('wrong@example.com');
    await page.locator('input[type="password"]').fill('wrongpassword');
    
    // Submit the form
    await page.locator('button[type="submit"]').click();
    
    // Wait for error message to appear
    await expect(page.locator('.alert-danger')).toBeVisible();
    await expect(page.locator('.alert-danger')).toContainText(/Invalid credentials|Login failed/);
    
    // Should still be on login page
    await expect(page.locator('h2')).toContainText('Apartment Booking');
  });

  test('should show loading state during login', async ({ page }) => {
    // Fill in valid credentials
    await page.locator('input[type="email"]').fill('admin@example.com');
    await page.locator('input[type="password"]').fill('password123');
    
    // Submit the form
    await page.locator('button[type="submit"]').click();
    
    // Check if button shows loading state
    await expect(page.locator('button[type="submit"]')).toContainText('Signing In...');
    
    // Wait for navigation to complete
    await page.waitForURL('**/dashboard');
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Mock network error by intercepting the API call
    await page.route('**/api/auth/login', route => {
      route.abort('failed');
    });
    
    // Fill in valid credentials
    await page.locator('input[type="email"]').fill('admin@example.com');
    await page.locator('input[type="password"]').fill('password123');
    
    // Submit the form
    await page.locator('button[type="submit"]').click();
    
    // Wait for error message
    await expect(page.locator('.alert-danger')).toBeVisible();
    
    // Should still be on login page
    await expect(page.locator('h2')).toContainText('Apartment Booking');
  });

  test('should login with reception staff credentials', async ({ page }) => {
    // Fill in reception staff credentials
    await page.locator('input[type="email"]').fill('reception@example.com');
    await page.locator('input[type="password"]').fill('password123');
    
    // Submit the form
    await page.locator('button[type="submit"]').click();
    
    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard');
    
    // Verify we're on the dashboard
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should persist login state after page refresh', async ({ page }) => {
    // Login first
    await page.locator('input[type="email"]').fill('admin@example.com');
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button[type="submit"]').click();
    
    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard');
    
    // Refresh the page
    await page.reload();
    
    // Should still be on dashboard (not redirected to login)
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('h1, h2')).toContainText(/Dashboard|Apartment Booking/);
  });

  test('should logout and redirect to login page', async ({ page }) => {
    // Login first
    await page.locator('input[type="email"]').fill('admin@example.com');
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button[type="submit"]').click();
    
    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard');
    
    // Find and click logout button (assuming it exists in the layout)
    const logoutButton = page.locator('button, a').filter({ hasText: /logout|sign out/i });
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      
      // Should redirect to login page
      await expect(page).toHaveURL(/.*\/$|.*\/login/);
      await expect(page.locator('h2')).toContainText('Apartment Booking');
    }
  });

  test('should handle form field interactions correctly', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    
    // Test email field
    await emailInput.click();
    await emailInput.fill('test@example.com');
    await expect(emailInput).toHaveValue('test@example.com');
    
    // Test password field
    await passwordInput.click();
    await passwordInput.fill('testpassword');
    await expect(passwordInput).toHaveValue('testpassword');
    
    // Test tab navigation
    await emailInput.focus();
    await page.keyboard.press('Tab');
    await expect(passwordInput).toBeFocused();
  });

  test('should be accessible with keyboard navigation', async ({ page }) => {
    // Navigate through form elements with Tab
    await page.keyboard.press('Tab');
    await expect(page.locator('input[type="email"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('input[type="password"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('button[type="submit"]')).toBeFocused();
    
    // Test Enter key on submit button
    await page.keyboard.press('Enter');
    
    // Should show validation error or attempt login
    await expect(page.locator('h2')).toContainText('Apartment Booking');
  });
});
