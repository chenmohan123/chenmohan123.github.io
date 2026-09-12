// 对本地六变体示例进行公开模型接入验收；保留真实网络和公开 npm 包。
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const sdkRoot = resolve(here, '../../../../web-sdk-PP-Detection');
const require = createRequire(resolve(sdkRoot, 'package.json'));
const { chromium } = require('playwright');
const sourceKind = process.env.DETECTION_EXAMPLE_SOURCE ?? 'modelscope';
const cases = process.env.DETECTION_EXAMPLE_CASES
  ? JSON.parse(process.env.DETECTION_EXAMPLE_CASES)
  : ['picodet', 'ppyoloe'].flatMap((model) => ['fp32', 'fp16', 'w8a32'].map((precision) => [model, precision]));
const evidenceName = process.env.DETECTION_EXAMPLE_EVIDENCE ?? 'example-browser';
const manifests = {
  picodet: JSON.parse(readFileSync(resolve(sdkRoot, 'models/pp-detection/1.0.2/manifest.json'))),
  ppyoloe: JSON.parse(readFileSync(resolve(sdkRoot, 'models/ppyoloe-plus-s-640/0.1.1/manifest.json'))),
};
const browser = await chromium.launch({ channel: 'chromium', headless: true });
const report = { date: new Date().toISOString(), browser: browser.version(), sdk: '0.3.1（公开 npm 包）', status: 'running', runs: [], errors: [] };
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('pageerror', (error) => report.errors.push(error.message));
  page.setDefaultTimeout(300_000);
  await page.goto('http://127.0.0.1:4187/');
  assert.equal(await page.locator('#model').inputValue(), 'picodet');
  assert.equal(await page.locator('#source').inputValue(), 'modelscope');
  assert.equal(await page.locator('#precision').inputValue(), 'fp32');
  assert.equal(await page.locator('#preview').isVisible(), false);
  await page.locator('#image').setInputFiles(resolve(sdkRoot, 'apps/demo/public/samples/people.jpg'));
  const firstRequest = page.waitForRequest((request) => request.url().includes('.onnx'));
  await page.locator('#detect').evaluate((button) => {
    button.click();
    button.click();
  });
  await firstRequest;
  await page.locator('#cancel').click();
  await page.waitForFunction(() => document.querySelector('#status').textContent === '已取消并释放模型');
  assert.equal(await page.locator('#output').innerText(), '');
  assert.equal(await page.locator('#detect').isEnabled(), true);
  assert.equal(await page.locator('#preview').isVisible(), false);
  report.cancelAndResume = true;

  await page.locator('#source').selectOption(sourceKind);
  for (const [model, precision] of cases) {
    await page.locator('#model').selectOption(model);
    assert.equal(await page.locator('#source').inputValue(), sourceKind);
      await page.locator('#precision').selectOption(precision);
      await page.locator('#detect').click();
      await page.waitForFunction(() => {
        const status = document.querySelector('#status').textContent;
        return !document.querySelector('#detect').disabled && (status.includes('检测完成') || status === '检测失败');
      });
      const result = JSON.parse(await page.locator('#output').innerText());
      assert.ok(result.detections?.length > 0, JSON.stringify(result));
      const variant = manifests[model].variants.find((item) => item.id === precision);
      assert.equal(result.model.version, manifests[model].model.version);
      assert.equal(result.model.variantId, variant.id);
      assert.equal(result.model.source.kind, sourceKind);
      assert.equal(result.model.source.sha256, variant.sha256);
      assert.equal(result.runtime.precision, variant.precision);
      report.runs.push({ model: result.model, runtime: result.runtime, detections: result.detections.length });
      writeFileSync(resolve(here, `${evidenceName}.json`), JSON.stringify(report, null, 2) + '\n');
      console.log(`${model} ${precision}：${result.detections.length} 个目标，${result.runtime.backend}`);
  }
  await page.screenshot({ path: resolve(here, 'example-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: resolve(here, 'example-mobile.png'), fullPage: true });
  assert.deepEqual(report.errors, []);
  report.status = 'passed';
} catch (error) {
  report.status = 'failed';
  report.error = String(error);
  throw error;
} finally {
  writeFileSync(resolve(here, `${evidenceName}.json`), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
}
