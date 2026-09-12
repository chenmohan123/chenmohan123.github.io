// 在真实 Chromium 与本地 HTTP 服务间验证下载恢复；不拦截 fetch 或替换流。
// 运行：node reports/sdk-standard/2026-09-12-detection-download/verify-browser.mjs
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const sdkRoot = resolve(here, '../../../../web-sdk-PP-Detection');
const sdkRequire = createRequire(resolve(sdkRoot, 'package.json'));
const { chromium } = sdkRequire('playwright');
const { build } = createRequire(sdkRequire.resolve('tsup'))('esbuild');
const source = await build({
  stdin: {
    contents: 'export { loadModelAsset } from "./model/download"; export { ModelManager } from "./model/model-manager";',
    resolveDir: resolve(sdkRoot, 'packages/sdk/src'), loader: 'ts',
  },
  bundle: true, write: false, format: 'iife', globalName: 'DownloadProbe', platform: 'browser',
});
const bytes = Buffer.alloc(4096, 31);
const sha256 = createHash('sha256').update(bytes).digest('hex');
const manifest = JSON.parse(readFileSync(resolve(sdkRoot, 'models/pp-detection/1.0.2/manifest.json')));
const counts = new Map();
const closed = new Map();
const sockets = new Set();
const server = createServer((request, response) => {
  const key = new URL(request.url, 'http://localhost').pathname.slice(1);
  if (!key) return response.writeHead(200, { 'content-type': 'text/html' }).end('<html lang="zh-CN"><title>下载恢复验证</title></html>');
  if (key === 'probe.js') return response.writeHead(200, { 'content-type': 'text/javascript' }).end(source.outputFiles[0].text);
  const count = (counts.get(key) ?? 0) + 1;
  counts.set(key, count);
  response.on('close', () => closed.set(key, (closed.get(key) ?? 0) + 1));
  const kind = key.split('/')[0];
  const succeed = () => response.writeHead(200, { 'content-length': bytes.length }).end(bytes);
  if ((kind === 'idle-recovery' || kind === 'disconnect') && count > 1) return succeed();
  if (kind === 'headers' || kind === 'cancel-request') return;
  if (kind === 'status' || kind === 'cancel-wait') return response.writeHead(503).end();
  if (kind === 'forbidden') return response.writeHead(403).end();
  if (kind === 'partial') return response.writeHead(206, { 'content-range': 'bytes 1-4095/4096' }).end(bytes);
  if (kind === 'corrupt') return response.writeHead(200, { 'content-length': bytes.length }).end(Buffer.alloc(bytes.length, 32));
  if (['idle', 'idle-recovery', 'trickle', 'disconnect'].includes(kind)) {
    response.writeHead(200, { 'content-length': bytes.length });
    response.write(bytes.subarray(0, 1));
    if (kind === 'disconnect') {
      const timer = setTimeout(() => response.destroy(), 40);
      response.on('close', () => clearTimeout(timer));
    }
    if (kind === 'trickle') {
      const timer = setInterval(() => response.write(bytes.subarray(0, 1)), 30);
      response.on('close', () => clearInterval(timer));
    }
    return;
  }
  succeed();
});
server.on('connection', (socket) => {
  sockets.add(socket);
  socket.on('close', () => sockets.delete(socket));
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
const results = [];
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(origin);
  await page.addScriptTag({ url: `${origin}/probe.js` });
  const scenarios = [
    { kind: 'headers', code: 'MODEL_DOWNLOAD_FAILED', requests: 1 },
    { kind: 'idle', code: 'MODEL_DOWNLOAD_FAILED', requests: 1 },
    { kind: 'trickle', code: 'MODEL_DOWNLOAD_FAILED', requests: 1 },
    { kind: 'status', code: 'MODEL_DOWNLOAD_FAILED', requests: 3, maxRetries: 2 },
    { kind: 'idle-recovery', requests: 2, maxRetries: 1 },
    { kind: 'disconnect', requests: 2, maxRetries: 1 },
    { kind: 'cancel-request', code: 'ABORTED', requests: 1, maxRetries: 2, cancel: 70 },
    { kind: 'cancel-wait', code: 'ABORTED', requests: 1, maxRetries: 2, cancel: 120 },
    { kind: 'corrupt', code: 'MODEL_INTEGRITY_FAILED', requests: 1, maxRetries: 2 },
    { kind: 'partial', code: 'MODEL_DOWNLOAD_FAILED', requests: 1, maxRetries: 2 },
    { kind: 'forbidden', code: 'MODEL_DOWNLOAD_FAILED', requests: 1, maxRetries: 2 },
  ];
  for (const scenario of scenarios) {
    const result = await page.evaluate(async ({ scenario, manifest, sha256, origin }) => {
      const controller = new AbortController();
      const variant = manifest.variants[0];
      const source = { ...variant.sources[0], bytes: 4096, sha256, downloadUrl: `${origin}/${scenario.kind}` };
      const progress = [];
      const start = performance.now();
      const timer = scenario.cancel ? setTimeout(() => controller.abort(), scenario.cancel) : undefined;
      try {
        const loaded = await DownloadProbe.loadModelAsset({ model: manifest.model, variant, source }, {
          signal: controller.signal,
          download: { timeoutMs: 360, idleTimeoutMs: 150, maxRetries: scenario.maxRetries ?? 0 },
          onProgress: (event) => progress.push(event),
        });
        return { bytes: loaded.bytes.byteLength, elapsedMs: performance.now() - start, timings: loaded.timings, progress };
      } catch (error) {
        return { code: error.code, message: error.message, details: error.details, elapsedMs: performance.now() - start, progress };
      } finally {
        clearTimeout(timer);
      }
    }, { scenario, manifest, sha256, origin });
    assert.equal(result.code, scenario.code, `${scenario.kind}: ${JSON.stringify(result)}`);
    assert.equal(counts.get(scenario.kind), scenario.requests, `${scenario.kind} 请求次数`);
    assert.ok(result.elapsedMs < 4000, `${scenario.kind} 应有界返回`);
    if (!scenario.code) {
      assert.equal(result.bytes, bytes.length);
      assert.ok(result.timings.modelDownloadMs >= 500, '下载耗时包含重试等待');
      assert.deepEqual(result.progress.filter((event) => event.loadedBytes === 0).map((event) => event.attempt), [1, 2]);
    }
    if (scenario.kind === 'trickle') assert.ok(result.elapsedMs >= 300, '持续进度由总时限终止');
    results.push({ scenario: scenario.kind, ...result, requests: counts.get(scenario.kind) });
  }
  const cached = await page.evaluate(async ({ manifest, sha256, origin }) => {
    const local = structuredClone(manifest);
    const variant = local.variants[0];
    local.variants = [variant];
    variant.bytes = 4096;
    variant.sha256 = sha256;
    variant.sources = [{ ...variant.sources[0], bytes: 4096, sha256, downloadUrl: `${origin}/idle-recovery/cache` }];
    const manager = new DownloadProbe.ModelManager({ cache: 'memory', download: { timeoutMs: 800, idleTimeoutMs: 150, maxRetries: 1 } });
    try {
      const first = await manager.load({ manifest: local, sourceKind: 'modelscope' });
      const second = await manager.load({ manifest: local, sourceKind: 'modelscope' });
      return { firstFromCache: first.fromCache, secondFromCache: second.fromCache, bytes: second.bytes.byteLength };
    } finally { await manager.dispose(); }
  }, { manifest, sha256, origin });
  assert.deepEqual(cached, { firstFromCache: false, secondFromCache: true, bytes: bytes.length });
  assert.equal(counts.get('idle-recovery/cache'), 2);
  results.push({ scenario: '完整重试后才可复用缓存', ...cached, requests: 2 });
  const output = { date: new Date().toISOString(), browser: browser.version(), transport: '真实本地 HTTP、fetch 与 ReadableStream，无路由拦截', results, closedResponses: Object.fromEntries(closed) };
  writeFileSync(resolve(here, 'browser-download.json'), JSON.stringify(output, null, 2) + '\n');
  console.log(JSON.stringify({ passed: results.length, evidence: resolve(here, 'browser-download.json') }));
} finally {
  await browser?.close();
  for (const socket of sockets) socket.destroy();
  await new Promise((done) => server.close(done));
}
