import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://127.0.0.1:4321',
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: 'node ./node_modules/astro/bin/astro.mjs dev --host 127.0.0.1',
    env: {
      ASTRO_DEV_BACKGROUND: '0',
    },
    port: 4321,
    reuseExistingServer: !process.env.CI,
  },
});
