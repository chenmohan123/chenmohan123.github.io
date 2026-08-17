import { test, expect } from '@playwright/test';

test('homepage exposes the model SDK directory and Models navigation', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('浏览器端模型 SDK 目录');
  await expect(page.getByRole('navigation')).toContainText('Models');
});
