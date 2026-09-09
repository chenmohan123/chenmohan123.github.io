import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium, expect } from '@playwright/test';

const [sdk, source] = process.argv.slice(2);
const names = { lcnet: 'PP-LCNet_x1_0_doc_ori', detection: 'PP-Detection', ocr: 'PP-OCRv6', doclayout: 'PP-DocLayoutV3' };
assert.ok(names[sdk] && ['modelscope', 'huggingface'].includes(source));
// 重跑输出写入临时目录，保留已归档的验收证据。
const root = path.resolve(process.env.SDK_E2E_REPORT_DIR ?? `.tmp/real-network-${new Date().toISOString().replace(/[:.]/g, '-')}`);
await fs.mkdir(root, { recursive: true });
const prefix = `${sdk}-${source}`;
const safeUrl = raw => { try { const u = new URL(raw); return u.origin + u.pathname; } catch { return raw; } };
const safeText = raw => String(raw).replace(/https?:\/\/[^\s"<>]+/g, safeUrl);
const report = {
  verifiedAt: new Date().toISOString(), sdk, source,
  url: `https://chenmohan123.github.io/web-sdk-${names[sdk]}/`,
  transport: '公开 Pages 和真实模型服务；无请求响应替换。冷启动取消阶段使用 CDP 限速，重试前恢复正常网络。各来源使用独立临时浏览器环境，HTTP 缓存禁用，SDK 持久缓存（IndexedDB 或 Cache Storage）保留。',
  stages: [], requests: [], pageErrors: [], consoleErrors: [], otherNetworkFailures: [],
};
const browser = await chromium.launch({ channel: 'chromium', headless: true });
report.browser = browser.version();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'zh-CN' });
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
await cdp.send('Network.enable');
await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
let phase = '页面';
const modelRequests = new Map();
const jobs = [];
page.on('request', request => {
  const previous = request.redirectedFrom();
  if (/\.onnx(?:[?#]|$)/i.test(request.url()) || (previous && modelRequests.has(previous))) {
    const row = { phase, url: safeUrl(request.url()), method: request.method(), startedAt: new Date().toISOString() };
    modelRequests.set(request, row); report.requests.push(row);
  }
});
page.on('response', response => {
  const row = modelRequests.get(response.request());
  if (row) {
    row.status = response.status(); row.fromServiceWorker = response.fromServiceWorker();
    const h = response.headers(); row.contentLength = h['content-length']; row.contentType = h['content-type'];
  }
});
page.on('requestfinished', request => {
  const row = modelRequests.get(request);
  if (row) { row.finishedAt = new Date().toISOString(); jobs.push(request.sizes().then(sizes => { row.sizes = sizes; }).catch(() => {})); }
});
page.on('requestfailed', request => {
  const failure = { phase, url: safeUrl(request.url()), error: safeText(request.failure()?.errorText) };
  const row = modelRequests.get(request);
  if (row) Object.assign(row, { error: failure.error, failedAt: new Date().toISOString() });
  else report.otherNetworkFailures.push(failure);
});
page.on('pageerror', error => report.pageErrors.push({ phase, message: safeText(error.message) }));
page.on('console', message => { if (message.type() === 'error') report.consoleErrors.push({ phase, message: safeText(message.text()) }); });
const status = () => sdk === 'lcnet' ? page.locator('#status') : page.getByTestId('status');
const runButton = () => sdk === 'lcnet' ? page.locator('#run') : page.getByRole('button', { name: sdk === 'ocr' ? '开始识别' : '开始检测', exact: true });
const chooseSample = async () => {
  if (sdk === 'lcnet') await page.locator('[data-sample-id="orientation-180"]').click();
  else if (sdk === 'ocr') await page.getByRole('button', { name: '使用示例', exact: true }).click();
  else await page.getByTestId('sample-gallery').getByRole('button').first().click();
  await expect(runButton()).toBeEnabled({ timeout: 30000 });
};
const configure = async () => {
  await page.getByLabel('模型来源', { exact: true }).selectOption(source);
  if (sdk === 'lcnet') await page.locator('#backend').selectOption('webgpu');
  else {
    await page.getByRole('button', { name: 'GPU', exact: true }).click();
    if (sdk === 'ocr') await page.getByLabel('允许自动回退').uncheck();
    else await page.getByRole('button', { name: 'FP32', exact: true }).click();
  }
  await chooseSample();
};
const snapshot = async () => ({
  status: await status().innerText(),
  statusClass: await status().getAttribute('class'),
  runtime: sdk === 'doclayout' ? await page.getByTestId('model-section').allTextContents() : await page.locator('[data-sdk-runtime-info]').allTextContents(),
  timing: sdk === 'doclayout' ? await page.getByTestId('detection-timings').allTextContents() : await page.locator('[data-sdk-timing]').allTextContents(),
  cache: await page.locator('[data-sdk-cache-usage]').allTextContents(),
  loadWall: await page.locator('[data-sdk-load-wall]').allTextContents(),
  runState: await page.locator('[data-sdk-run-state]').allTextContents(),
  initialization: await page.getByTestId('initialization-timings').allTextContents(),
  results: sdk === 'lcnet' ? await page.locator('#result').innerText() : sdk === 'ocr'
    ? { rows: await page.getByTestId('ocr-results').locator('[data-testid^="ocr-row-"]').count(), text: (await page.getByTestId('ocr-results').innerText()).slice(0, 3000) }
    : (await page.getByTestId('detection-section').innerText()).slice(0, 4000),
  cacheStorage: await page.evaluate(async () => Promise.all((await caches.keys()).map(async name => ({ name, entries: (await (await caches.open(name)).keys()).length })))),
  databases: await page.evaluate(async () => {
    const databases = await indexedDB.databases();
    return Promise.all(databases.map(async ({ name, version }) => {
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open(name); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
      });
      try {
        const stores = {};
        for (const name of db.objectStoreNames) stores[name] = await new Promise((resolve, reject) => {
          const request = db.transaction(name).objectStore(name).count(); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
        });
        return { name, version, stores };
      } finally { db.close(); }
    }));
  }),
});
const inference = async (label, expectNetwork) => {
  phase = label;
  const before = report.requests.length;
  const start = Date.now();
  await runButton().click();
  if (sdk === 'lcnet') {
    await expect(runButton()).toBeEnabled({ timeout: 360000 });
    await expect(status()).toContainText('检测完成');
  } else {
    await expect(status()).toHaveClass(/success|error|unsupported/, { timeout: 360000 });
    assert.match(await status().getAttribute('class'), /success/, await status().innerText());
  }
  const data = await snapshot();
  report.stages.push({ phase, elapsedMs: Date.now() - start, modelRequestCount: report.requests.length - before, ...data });
  assert.match(data.runtime.join(' '), /webgpu/i, '实际运行后端应为 WebGPU');
  if (sdk === 'lcnet') assert.match(data.results, /180/);
  else if (sdk === 'ocr') assert.ok(data.results.rows > 0, 'OCR 结果非空');
  else if (sdk === 'detection') assert.match(data.results, /person/);
  else assert.match(data.results, /text|文本|paragraph_title|标题/);
  if (expectNetwork) assert.ok(report.requests.slice(before).some(row => row.status === 200 && row.finishedAt && !row.error), '冷启动必须完成真实模型下载');
  else assert.equal(report.requests.length, before, '缓存复用不应请求模型');
  await page.screenshot({ path: path.join(root, `${prefix}-${label}.png`), fullPage: true });
  console.log(JSON.stringify({ sdk, source, phase, elapsedMs: Date.now() - start, status: data.status, modelRequestCount: report.requests.length - before }));
};
try {
  const response = await page.goto(report.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  report.pageStatus = response.status(); assert.equal(report.pageStatus, 200);
  report.adapter = await page.evaluate(async () => {
    const adapter = await navigator.gpu.requestAdapter();
    return adapter ? { vendor: adapter.info.vendor, architecture: adapter.info.architecture, fallback: adapter.info.isFallbackAdapter } : null;
  });
  assert.ok(report.adapter && !report.adapter.fallback, '需要真实 GPU');
  await configure();
  phase = '下载取消';
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 50, downloadThroughput: 128 * 1024, uploadThroughput: -1 });
  const pending = page.waitForRequest(request => /\.onnx(?:[?#]|$)/i.test(request.url()), { timeout: 60000 });
  await runButton().click();
  await pending;
  if (sdk === 'lcnet') await chooseSample();
  else if (sdk === 'ocr') await page.getByTitle('停止', { exact: true }).click();
  else await page.getByRole('button', { name: '取消', exact: true }).click();
  await expect(runButton()).toBeEnabled({ timeout: 30000 });
  report.stages.push({ phase, ...(await snapshot()) });
  assert.doesNotMatch(await status().innerText(), /下载失败|DOWNLOAD_FAILED|NETWORK_ERROR/, '主动取消不应显示为下载错误');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  console.log(JSON.stringify({ sdk, source, phase, status: await status().innerText() }));
  await inference('首次下载重试', true);
  await inference('同页复用', false);
  phase = '刷新页面';
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await configure();
  await inference('刷新后缓存', false);
  assert.equal(report.pageErrors.length, 0, '页面不应发生未处理异常');
  report.status = 'passed';
} catch (error) {
  report.status = 'failed'; report.failedPhase = phase; report.error = safeText(error.stack ?? error);
  report.failureSnapshot = await snapshot().catch(error => ({ error: safeText(error) }));
  await page.screenshot({ path: path.join(root, `${prefix}-失败.png`), fullPage: true }).catch(() => {});
  process.exitCode = 1;
} finally {
  await Promise.allSettled(jobs);
  report.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(root, `${prefix}.json`), JSON.stringify(report, null, 2));
  await browser.close();
  console.log(JSON.stringify({ sdk, source, status: report.status, failedPhase: report.failedPhase, error: report.error }));
}
