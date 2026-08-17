import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://127.0.0.1:4321',
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: 'pnpm dev --host 127.0.0.1',
    port: 4321,
    reuseExistingServer: !process.env.CI,
  },
});
