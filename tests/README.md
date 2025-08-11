# Playwright Tests for Apartment Booking System

This directory contains end-to-end tests for the apartment booking admin system using Playwright.

## Test Files

- `login.spec.js` - Comprehensive login functionality tests
- `login-simple.spec.js` - Simplified login tests using helper functions
- `helpers/auth-helpers.js` - Reusable authentication helper functions

## Prerequisites

Before running tests, ensure:

1. **Backend server is running** on port 3001
   ```bash
   cd backend
   npm run dev
   ```

2. **Frontend server is running** on port 3000
   ```bash
   npm start
   ```

3. **Database is set up** with test users
   ```bash
   cd backend
   npm run setup-db
   ```

## Running Tests

### Run all tests
```bash
npm run test:e2e
```

### Run tests with UI mode (interactive)
```bash
npm run test:e2e:ui
```

### Run tests in headed mode (see browser)
```bash
npm run test:e2e:headed
```

### Run tests in debug mode
```bash
npm run test:e2e:debug
```

### Run specific test file
```bash
npx playwright test login.spec.js
```

### Run tests for specific browser
```bash
npx playwright test --project=chromium
```

## Test Credentials

The tests use these default credentials:

- **Super Admin**: `admin@example.com` / `password123`
- **Reception Staff**: `reception@example.com` / `password123`

## Test Coverage

### Login Tests
- ✅ Valid credentials login
- ✅ Invalid credentials error handling
- ✅ Empty form validation
- ✅ Loading states
- ✅ Network error handling
- ✅ Session persistence
- ✅ Logout functionality
- ✅ Keyboard navigation
- ✅ Form field interactions

## Test Reports

After running tests, you can view the HTML report:
```bash
npx playwright show-report
```

## Debugging Tests

### View test traces
```bash
npx playwright show-trace trace.zip
```

### Take screenshots on failure
Screenshots are automatically saved in `test-results/` directory on test failures.

### Record new test
```bash
npx playwright codegen http://localhost:3000
```

## Configuration

The Playwright configuration is in `playwright.config.js`:

- **Base URL**: `http://localhost:3000`
- **Test Directory**: `./tests`
- **Browsers**: Chromium, Firefox, WebKit
- **Screenshots**: On failure only
- **Videos**: Retain on failure
- **Traces**: On first retry

## Helper Functions

The `auth-helpers.js` file provides reusable functions:

- `login(page, email, password, expectSuccess)` - Login with credentials
- `loginAsSuperAdmin(page)` - Login as super admin
- `loginAsReceptionStaff(page)` - Login as reception staff
- `logout(page)` - Logout from application
- `isLoggedIn(page)` - Check if user is logged in
- `waitForErrorMessage(page, expectedMessage)` - Wait for error message
- `clearStorage(page)` - Clear browser storage

## Best Practices

1. **Use helper functions** for common operations
2. **Clear storage** before each test to ensure clean state
3. **Wait for elements** instead of using fixed delays
4. **Use descriptive test names** that explain what is being tested
5. **Group related tests** using `test.describe()`
6. **Handle async operations** properly with `await`

## Troubleshooting

### Tests failing due to server not running
Ensure both backend (port 3001) and frontend (port 3000) servers are running.

### Database connection issues
Run the database setup script to ensure test users exist:
```bash
cd backend && npm run setup-db
```

### Browser not found
Install Playwright browsers:
```bash
npx playwright install
```

### Port already in use
If port 3000 is in use, the React app will automatically use another port. Update the `baseURL` in `playwright.config.js` accordingly.
