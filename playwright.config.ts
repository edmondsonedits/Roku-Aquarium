import {defineConfig} from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: {timeout: 15_000},
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', {open: 'never'}]],
  use: {
    baseURL: 'http://127.0.0.1:4391',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? {executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE} : {},
  },
  webServer: {
    command: 'node --import tsx e2e/server.ts',
    url: 'http://127.0.0.1:4391',
    reuseExistingServer: false,
    gracefulShutdown: {signal: 'SIGTERM', timeout: 5_000},
    timeout: 30_000,
  },
});
