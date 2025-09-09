// playwright.config.js
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'Chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Edge',
      use: {
        ...devices['Desktop Edge'], // 👈 use built-in Edge device
        channel: 'msedge',          // 👈 tells Playwright to launch Microsoft Edge
      },
    },
    {
      name: 'Firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    
  ],
});
