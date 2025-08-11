/**
 * Helper functions for authentication tests
 */

/**
 * Login with specified credentials
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {boolean} expectSuccess - Whether to expect successful login
 */
async function login(page, email, password, expectSuccess = true) {
  // Fill in credentials
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  
  // Submit the form
  await page.locator('button[type="submit"]').click();
  
  if (expectSuccess) {
    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard');
    // Verify we're on the dashboard
    await expect(page).toHaveURL(/.*dashboard/);
  }
}

/**
 * Login as super admin
 * @param {import('@playwright/test').Page} page - Playwright page object
 */
async function loginAsSuperAdmin(page) {
  await login(page, 'admin@example.com', 'password123');
}

/**
 * Login as reception staff
 * @param {import('@playwright/test').Page} page - Playwright page object
 */
async function loginAsReceptionStaff(page) {
  await login(page, 'reception@example.com', 'password123');
}

/**
 * Logout from the application
 * @param {import('@playwright/test').Page} page - Playwright page object
 */
async function logout(page) {
  // Find and click logout button
  const logoutButton = page.locator('button, a').filter({ hasText: /logout|sign out/i });
  if (await logoutButton.isVisible()) {
    await logoutButton.click();
    // Wait for redirect to login page
    await page.waitForURL(/.*\/$|.*\/login/);
  }
}

/**
 * Check if user is logged in by looking for dashboard elements
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {Promise<boolean>} - True if logged in, false otherwise
 */
async function isLoggedIn(page) {
  try {
    await page.waitForURL(/.*dashboard/, { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Wait for error message to appear
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} expectedMessage - Expected error message (regex pattern)
 */
async function waitForErrorMessage(page, expectedMessage = /Invalid credentials|Login failed/) {
  await expect(page.locator('.alert-danger')).toBeVisible();
  await expect(page.locator('.alert-danger')).toContainText(expectedMessage);
}

/**
 * Clear browser storage (localStorage, sessionStorage)
 * @param {import('@playwright/test').Page} page - Playwright page object
 */
async function clearStorage(page) {
  try {
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  } catch (error) {
    // Ignore localStorage errors if page is not ready
    console.log('Storage clear skipped:', error.message);
  }
}

module.exports = {
  login,
  loginAsSuperAdmin,
  loginAsReceptionStaff,
  logout,
  isLoggedIn,
  waitForErrorMessage,
  clearStorage
};
