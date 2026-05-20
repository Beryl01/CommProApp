import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,           // run sequentially — tests hit a live API
  forbidOnly: !!process.env['CI'],
  retries:     process.env['CI'] ? 2 : 1,
  workers:     1,                  // one test at a time — avoids API rate limits
  reporter:    [['html', { open: 'never' }], ['list']],
  timeout:     600_000,            // 10 minutes per test
  expect: {
    timeout:   60_000,             // 1 minute default for assertions
  },
  use: {
    baseURL:    'https://commproapp.netlify.app',
    headless:   true,
    trace:      'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
