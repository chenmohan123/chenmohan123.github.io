// 两种后端顺序运行，复用Python捕获的固定输入，避免把图片解码差异误认为模型误差。
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [workArg, dependencyRoot] = process.argv.slice(2);
assert(workArg && dependencyRoot, '参数：本地实验目录 Playwright/ORT依赖仓库');
const work = path.resolve(workArg), scripts = path.dirname(fileURLToPath(import.meta.url)), reportDir = path.dirname(scripts);
const require = createRequire(path.resolve(dependencyRoot, 'package.json'));
const { chromium } = require('playwright');
const ortDir = path.dirname(require.resolve('onnxruntime-web'));
const conversion = JSON.parse(await readFile(path.join(reportDir, 'conversion.json'), 'utf8'));
const cases = JSON.parse(await readFile(path.join(work, 'cases.json'), 'utf8'));
const modelPath = path.join(work, conversion.model.file);
assert.equal(createHash('sha256').update(await readFile(modelPath)).digest('hex'), conversion.model.sha256);
const assets = new Map([['/model.onnx', modelPath], ['/postprocess.mjs', path.join(scripts, 'postprocess.mjs')]]);
for (const name of await readdir(ortDir)) if (/\.(mjs|wasm)$/.test(name)) assets.set(`/ort/${name}`, path.join(ortDir, name));
for (const item of cases) {
  const input = path.join(work, 'inputs', `${item.id}.f32`);
  assert.equal(createHash('sha256').update(await readFile(input)).digest('hex'), item.inputSha256);
  assets.set(`/inputs/${item.id}.f32`, input);
  if (item.imagePath) assets.set(`/images/${item.id}.jpg`, item.imagePath);
}
const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
    if (req.method === 'POST') {
      const match = /^\/result\/(wasm|webgpu)\/(\d{12}|blank)\/(raw[0-3]\.f32|masks\.u8|detections\.json)$/.exec(pathname);
      if (!match || !cases.some(row => row.id === match[2])) { res.writeHead(404).end(); return; }
      const chunks = []; let size = 0;
      for await (const chunk of req) { size += chunk.length; assert(size <= 100_000_000); chunks.push(chunk); }
      const out = path.join(work, 'browser-output', match[1], match[2]);
      await mkdir(out, { recursive: true });
      await writeFile(path.join(out, match[3]), Buffer.concat(chunks));
      res.writeHead(200).end('ok'); return;
    }
    if (pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end('<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>实例分割模型本地评估</title><style>body{font:16px sans-serif;background:#f2f5f7;padding:20px}canvas{max-width:100%;background:#fff}</style><h1>实例分割模型本地评估</h1><p id="status">加载中</p><canvas></canvas></html>'); return;
    }
    const file = assets.get(pathname);
    if (!file) { res.writeHead(404).end(); return; }
    const mime = pathname.endsWith('.mjs') ? 'text/javascript' : pathname.endsWith('.wasm') ? 'application/wasm' : pathname.endsWith('.jpg') ? 'image/jpeg' : 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime, 'Content-Length': (await stat(file)).size });
    createReadStream(file).pipe(res);
  } catch (error) { res.writeHead(500).end(String(error)); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel: 'chromium', headless: true });
const report = { status: 'failed', verifiedAt: new Date().toISOString(), model: conversion.model,
  environment: { browser: browser.version(), os: os.release(), cpu: os.cpus()[0].model, ort: JSON.parse(await readFile(path.resolve(ortDir, '../package.json'), 'utf8')).version },
  cases: cases.map(({ imagePath, ...rest }) => rest), backends: [],
  scope: '裸ORT可行性实验，main执行；同输入与独立JavaScript后处理。未验证SDK/Worker/生命周期/浏览器预处理/实机移动端。' };
try {
  for (const backend of ['wasm', 'webgpu']) {
    const page = await browser.newPage({ viewport: { width: 1000, height: 850 } });
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    await page.goto(origin);
    const setup = await page.evaluate(async backend => {
      const ort = await import('/ort/ort.webgpu.bundle.min.mjs');
      window.ort = ort;
      window.postprocess = await import('/postprocess.mjs');
      ort.env.wasm.wasmPaths = '/ort/';
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.proxy = false;
      let gpu = null;
      if (backend === 'webgpu') {
        const adapter = await navigator.gpu?.requestAdapter({ powerPreference: 'high-performance' });
        if (!adapter) throw new Error('WebGPU适配器不可用');
        const info = adapter.info;
        gpu = { vendor: info.vendor, architecture: info.architecture, device: info.device, description: info.description, fallback: adapter.isFallbackAdapter ?? info.isFallbackAdapter ?? false };
        if (gpu.fallback || /swiftshader|software|warp|llvmpipe/i.test(JSON.stringify(gpu))) throw new Error('拒绝软件适配器');
        ort.env.webgpu.adapter = adapter;
      }
      const bytes = await (await fetch('/model.onnx')).arrayBuffer();
      const started = performance.now();
      window.session = await ort.InferenceSession.create(bytes, { executionProviders: [backend], graphOptimizationLevel: 'all' });
      return { backend, gpu, sessionMs: performance.now() - started, inputs: window.session.inputNames, outputs: window.session.outputNames };
    }, backend);
    const results = [];
    for (const item of cases) {
      const result = await page.evaluate(async ({ item, backend, outputs }) => {
        const tensor = new window.ort.Tensor('float32', new Float32Array(await (await fetch(`/inputs/${item.id}.f32`)).arrayBuffer()), [1, 3, 640, 640]);
        const started = performance.now();
        const output = await window.session.run({ image: tensor });
        const inferenceMs = performance.now() - started;
        const values = outputs.map(name => output[name].data);
        if (!values.every(value => value.every(Number.isFinite))) throw new Error('非有限输出');
        const postStarted = performance.now();
        const rows = window.postprocess.selectInstances(values);
        const masks = window.postprocess.recoverMasks(values, rows, item.width, item.height);
        const postprocessMs = performance.now() - postStarted;
        async function save(file, body) { const response = await fetch(`/result/${backend}/${item.id}/${file}`, { method: 'POST', body }); if (!response.ok) throw new Error('结果写入失败'); }
        for (let i = 0; i < values.length; i++) await save(`raw${i}.f32`, values[i]);
        const packed = new Uint8Array(masks.length * item.width * item.height);
        masks.forEach((mask, i) => packed.set(mask, i * item.width * item.height));
        await save('masks.u8', packed);
        await save('detections.json', JSON.stringify(rows));
        const canvas = document.querySelector('canvas'); canvas.width = item.width; canvas.height = item.height;
        const ctx = canvas.getContext('2d');
        if (item.imagePath) { const img = new Image(); img.src = `/images/${item.id}.jpg`; await img.decode(); ctx.drawImage(img, 0, 0); }
        else { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, item.width, item.height); }
        const pixels = ctx.getImageData(0, 0, item.width, item.height);
        masks.forEach((mask, i) => {
          const color = [[0, 190, 180], [245, 80, 100], [250, 170, 20], [120, 100, 235]][i % 4];
          for (let p = 0; p < mask.length; p++) if (mask[p]) for (let c = 0; c < 3; c++) pixels.data[p * 4 + c] = pixels.data[p * 4 + c] * 0.55 + color[c] * 0.45;
        });
        ctx.putImageData(pixels, 0, 0); ctx.lineWidth = 2; ctx.strokeStyle = '#0f9b91';
        rows.forEach(row => { const [x1, y1, x2, y2] = row.box; ctx.strokeRect(x1, y1, x2 - x1, y2 - y1); });
        document.querySelector('#status').textContent = `${backend} · ${item.id} · ${rows.length} 个实例`;
        Object.values(output).forEach(value => value.dispose()); tensor.dispose();
        return { id: item.id, inferenceMs, postprocessMs, instances: rows.length, shapes: outputs.map(name => output[name].dims), maskAreas: rows.map(row => row.maskArea) };
      }, { item, backend, outputs: setup.outputs });
      results.push(result);
      if (item.id === cases[0].id) await page.screenshot({ path: path.join(reportDir, `preview-${backend}.png`), fullPage: true });
      console.log(JSON.stringify({ backend, ...result }));
    }
    const warm = await page.evaluate(async id => {
      const tensor = new window.ort.Tensor('float32', new Float32Array(await (await fetch(`/inputs/${id}.f32`)).arrayBuffer()), [1, 3, 640, 640]);
      const runs = [];
      for (let i = 0; i < 3; i++) { const t = performance.now(); const output = await window.session.run({ image: tensor }); runs.push(performance.now() - t); Object.values(output).forEach(value => value.dispose()); }
      tensor.dispose(); await window.session.release();
      return { image: id, runsMs: runs, medianMs: [...runs].sort((a, b) => a - b)[1] };
    }, cases[0].id);
    assert.deepEqual(errors, []);
    report.backends.push({ ...setup, results, warm, pageErrors: errors, sessionReleased: true });
    await page.close();
  }
  report.status = 'executed';
} catch (error) { report.error = String(error); throw error; }
finally {
  await writeFile(path.join(reportDir, 'browser-execution.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close(); await new Promise(resolve => server.close(resolve));
}
