import { test, expect } from '@playwright/test';

test('homepage exposes the model SDK directory and Models navigation', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('浏览器端模型 SDK 目录');
  await expect(page.getByRole('navigation')).toContainText('Models');
});

test('PP-DocLayoutV3 detail exposes package, assets, and live demo', async ({ page }) => {
  await page.goto('/models/pp-doclayoutv3/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('PP-DocLayoutV3');
  await expect(page.getByText('web-sdk-pp-doclayoutv3@1.1.0')).toBeVisible();
  await expect(page.getByRole('link', { name: '打开在线 Demo' })).toHaveAttribute('href', 'https://chenmohan123.github.io/web-sdk-PP-DocLayoutV3/');
  await expect(page.getByText('70.84 MiB')).toBeVisible();
});

test('brand and task routes are statically generated', async ({ page }) => {
  await page.goto('/brands/baidu/');
  await expect(page.getByText('PP-DocLayoutV3')).toBeVisible();
  await page.goto('/tasks/document-layout/');
  await expect(page.getByText('PP-DocLayoutV3')).toBeVisible();
});

test('docs distinguish stable backends from Labs', async ({ page }) => {
  await page.goto('/docs/');
  await expect(page.getByRole('heading', { name: 'SDK 生命周期' })).toBeVisible();
  await expect(page.getByText('WebNN 仅属于 Labs')).toBeVisible();
  await expect(page.getByText('COOP/COEP')).toBeVisible();
});
