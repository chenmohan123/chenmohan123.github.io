// 裸ORT实验，固定Python输入与独立JavaScript后处理；服务器只暴露明确列出的实验文件。
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [workArg, dependencyRoot, onlyBackend] = process.argv.slice(2);
assert(!onlyBackend || ['wasm', 'webgpu'].includes(onlyBackend), '可选后端仅支持wasm/webgpu');
assert(workArg && dependencyRoot, '参数：实验目录 Playwright/ORT依赖仓库');
const work = path.resolve(workArg), scripts = path.dirname(fileURLToPath(import.meta.url)), reportDir = path.dirname(scripts);
const require = createRequire(path.resolve(dependencyRoot, 'package.json'));
const { chromium } = require('playwright');
const ortDir = path.dirname(require.resolve('onnxruntime-web'));
const sha = data => createHash('sha256').update(data).digest('hex');
const cases = JSON.parse(await readFile(path.join(work, 'cases.json'), 'utf8'));
const lock = JSON.parse(await readFile(path.join(reportDir, 'sources.lock.json'), 'utf8'));
const geometryLock = JSON.parse(await readFile(path.join(reportDir, 'geometry-dependency.lock.json'), 'utf8'));
assert.equal(sha(await readFile(path.join(work, geometryLock.file))), geometryLock.sha256);
const fixtures = JSON.parse(await readFile(path.join(reportDir, 'geometry-fixtures.json'), 'utf8'));
const assets = new Map([['/postprocess.mjs', path.join(scripts, 'postprocess.mjs')], ['/geometry.js', path.join(work, geometryLock.file)]]);
for (const name of await readdir(ortDir)) if (/\.(mjs|wasm)$/.test(name)) assets.set(`/ort/${name}`, path.join(ortDir, name));
const models = [];
for (const candidate of lock.candidates) {
  const conversion = JSON.parse(await readFile(path.join(reportDir, `conversion-${candidate.id}.json`), 'utf8'));
  const location = path.join(work, conversion.model.file);
  assert.equal(sha(await readFile(location)), conversion.model.sha256);
  assets.set(`/models/${candidate.id}.onnx`, location);
  models.push({ id: candidate.id, ...conversion });
}
for (const item of cases) {
  const input = path.join(work, 'inputs', `${item.id}.f32`);
  assert.equal(sha(await readFile(input)), item.inputSha256);
  assets.set(`/inputs/${item.id}.f32`, input);
  assets.set(`/images/${item.id}.png`, path.join(work, 'images', `${item.id}.png`));
}
const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
    if (req.method === 'POST') {
      const match = /^\/result\/([a-z0-9_]+)\/(wasm|webgpu)\/([A-Za-z0-9-]+)\/(raw[01]\.f32|detections\.json)$/.exec(pathname);
      if (!match || !models.some(row => row.id === match[1]) || !cases.some(row => row.id === match[3])) { res.writeHead(404).end(); return; }
      const chunks = []; let size = 0;
      for await (const chunk of req) { size += chunk.length; assert(size <= 100_000_000); chunks.push(chunk); }
      const output = path.join(work, match[1], 'browser-output', match[2], match[3]);
      await mkdir(output, { recursive: true });
      await writeFile(path.join(output, match[4]), Buffer.concat(chunks));
      res.writeHead(200).end('ok'); return;
    }
    if (pathname === '/favicon.ico') { res.writeHead(204).end(); return; }
    if (pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end('<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>旋转框模型本地评估</title><style>body{margin:20px;font:16px sans-serif;background:#f2f5f7}canvas{display:block;max-width:100%;height:auto;background:#fff}h1{font-size:22px}</style><h1>旋转框模型本地评估</h1><p id="status">加载中</p><canvas></canvas><script src="/geometry.js"></script></html>'); return;
    }
    const file = assets.get(pathname);
    if (!file) { res.writeHead(404).end(); return; }
    const mime = /\.(mjs|js)$/.test(pathname) ? 'text/javascript' : pathname.endsWith('.wasm') ? 'application/wasm' : pathname.endsWith('.png') ? 'image/png' : 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime, 'Content-Length': (await stat(file)).size });
    createReadStream(file).pipe(res);
  } catch (error) { res.writeHead(500).end(String(error)); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel: 'chromium', headless: true });
const report = { status: 'failed', verifiedAt: new Date().toISOString(),
  environment: { browser: browser.version(), os: os.release(), cpu: os.cpus()[0].model, node: process.version,
    ort: JSON.parse(await readFile(path.resolve(ortDir, '../package.json'), 'utf8')).version },
  backends: [], scope: '桌面Chromium、main线程、固定FP32张量输入；未覆盖SDK接口、浏览器预处理、Worker、移动设备、模型远程分发。WebGPU profiling回调没有返回数据，另记录原生GPU命令提交/计算dispatch证明实际GPU执行；不声称每个图节点都在GPU。耗时仅供本轮观察。' };
if (onlyBackend) {
  const previous = JSON.parse(await readFile(path.join(reportDir, 'browser-execution.json'), 'utf8'));
  assert.deepEqual(previous.environment, report.environment);
  report.backends = previous.backends.filter(row => row.backend !== onlyBackend);
}
try {
  for (const model of models) for (const backend of (onlyBackend ? [onlyBackend] : ['wasm', 'webgpu'])) {
    const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
    const errors = [], messages = [];
    page.on('pageerror', error => errors.push(String(error)));
    page.on('console', message => { if (['error', 'warning'].includes(message.type())) messages.push(message.text()); });
    const entry = { model: model.id, backend, verifiedAt: new Date().toISOString(), status: 'failed', results: [] };
    try {
      await page.goto(origin);
      const setup = await page.evaluate(async ({ backend, model, fixtures }) => {
        const ort = await import('/ort/ort.webgpu.bundle.min.mjs');
        window.ort = ort;
        window.postprocess = await import('/postprocess.mjs');
        const geometry = fixtures.map(row => {
          const polygons = row.boxes.map(box => window.postprocess.corners(box));
          const cornerError = Math.max(...polygons.flat(2).map((v, i) => Math.abs(v - row.polygons.flat(2)[i])));
          const actualIoU = window.postprocess.polygonIoU(...polygons);
          if (cornerError > 1e-8 || Math.abs(actualIoU - row.iou) > 1e-8) throw new Error(`几何对照失败：${row.id}`);
          return { id: row.id, cornerError, expectedIoU: row.iou, actualIoU };
        });
        const boxes = new Float32Array([100,100,80,20,0,100,100,80,20,0,300,100,80,20,0]);
        const nms = window.postprocess.select(new Float32Array([.9,.8,.1,.7,0,0]), boxes, [1,1], { classCount: 2, scoreThreshold: .1 });
        if (nms.length !== 2 || nms[0].classId !== 0 || nms[1].classId !== 1) throw new Error('类别隔离、重叠抑制或FP32阈值边界失败');
        const boundary = window.postprocess.select(new Float32Array([.5,.49,.9]), boxes, [1,1], { classCount: 1, scoreThreshold: .5 });
        if (boundary.length !== 1 || boundary[0].index !== 2) throw new Error('分数严格大于阈值语义失败');
        const limited = window.postprocess.select(new Float32Array([.9,.8,.7]), boxes, [1,1], { classCount: 1, topK: 1 });
        if (limited.length !== 1 || limited[0].index !== 0) throw new Error('top_k语义失败');
        ort.env.wasm.wasmPaths = '/ort/'; ort.env.wasm.numThreads = 1; ort.env.wasm.proxy = false;
        let gpu = null;
        window.profile = [];
        window.gpuTrace = [];
        if (backend === 'webgpu') {
          for (const [prototype, method] of [[GPUQueue.prototype, 'submit'], [GPUComputePassEncoder.prototype, 'dispatchWorkgroups'], [GPUComputePassEncoder.prototype, 'dispatchWorkgroupsIndirect']]) {
            const original = prototype[method];
            prototype[method] = function(...args) {
              window.gpuTrace.push({ method, args: method === 'submit' ? [args[0].length] : args.map(value => typeof value === 'number' ? value : 'GPUBuffer') });
              return original.apply(this, args);
            };
          }
          const adapter = await navigator.gpu?.requestAdapter({ powerPreference: 'high-performance' });
          if (!adapter) throw new Error('WebGPU适配器不可用');
          const info = adapter.info;
          gpu = { vendor: info.vendor, architecture: info.architecture, device: info.device, description: info.description,
            fallback: adapter.isFallbackAdapter ?? info.isFallbackAdapter ?? false, timestampQuery: adapter.features.has('timestamp-query') };
          if (gpu.fallback || /swiftshader|software|warp|llvmpipe/i.test(JSON.stringify(gpu))) throw new Error('拒绝软件适配器');
          ort.env.webgpu.adapter = adapter;
          ort.env.webgpu.profiling = { mode: 'default', ondata: data => window.profile.push(data) };
        }
        const bytes = await (await fetch(`/models/${model.id}.onnx`)).arrayBuffer();
        const started = performance.now();
        window.session = await ort.InferenceSession.create(bytes, { executionProviders: [backend], graphOptimizationLevel: 'all' });
        return { requestedBackend: backend, gpu, sessionMs: performance.now() - started,
          inputs: window.session.inputNames, outputs: window.session.outputNames, geometry,
          nmsChecks: { classSeparation: true, overlapSuppression: true, scoreBoundary: true, topK: true } };
      }, { backend, model, fixtures });
      Object.assign(entry, setup);
      for (const item of cases) {
        const result = await page.evaluate(async ({ item, backend, model, outputs }) => {
          const tensor = new window.ort.Tensor('float32', new Float32Array(await (await fetch(`/inputs/${item.id}.f32`)).arrayBuffer()), [1,3,1024,1024]);
          const traceStart = window.gpuTrace.length;
          const started = performance.now(), output = await window.session.run({ image: tensor });
          const inferenceMs = performance.now() - started;
          const gpuCalls = window.gpuTrace.slice(traceStart);
          const gpuExecution = { commandSubmissions: gpuCalls.filter(row => row.method === 'submit').length,
            computeDispatches: gpuCalls.filter(row => row.method.startsWith('dispatchWorkgroups')).length };
          if (backend === 'webgpu' && (!gpuExecution.commandSubmissions || !gpuExecution.computeDispatches)) throw new Error('当前推理没有实际GPU命令或计算dispatch');
          const values = outputs.map(name => output[name].data);
          if (!values.every(value => value.every(Number.isFinite))) throw new Error('非有限输出');
          const postStarted = performance.now();
          const rows = window.postprocess.select(values[0], values[1], item.scaleFactor);
          const postprocessMs = performance.now() - postStarted;
          for (let i = 0; i < values.length; i++) {
            const response = await fetch(`/result/${model.id}/${backend}/${item.id}/raw${i}.f32`, { method: 'POST', body: values[i] });
            if (!response.ok) throw new Error('原始结果写入失败');
          }
          const saved = await fetch(`/result/${model.id}/${backend}/${item.id}/detections.json`, { method: 'POST', body: JSON.stringify(rows) });
          if (!saved.ok) throw new Error('检测结果写入失败');
          const canvas = document.querySelector('canvas'); canvas.width = item.width; canvas.height = item.height;
          const ctx = canvas.getContext('2d'), image = new Image(); image.src = `/images/${item.id}.png`; await image.decode(); ctx.drawImage(image, 0, 0);
          ctx.lineWidth = 2;
          for (const row of rows) {
            ctx.strokeStyle = ['#00e5c0','#fa465f','#ffd23f','#449cff'][row.classId % 4];
            ctx.beginPath(); ctx.moveTo(...row.polygon[0]); row.polygon.slice(1).forEach(point => ctx.lineTo(...point)); ctx.closePath(); ctx.stroke();
          }
          document.querySelector('#status').textContent = `${model.id} / ${backend} / ${item.id} / ${rows.length} 个旋转框`;
          const shapes = outputs.map(name => output[name].dims);
          Object.values(output).forEach(value => value.dispose()); tensor.dispose();
          return { id: item.id, inferenceMs, postprocessMs, detections: rows.length, shapes, gpuExecution };
        }, { item, backend, model, outputs: setup.outputs });
        entry.results.push(result);
        if (item.id === 'P0861') {
          const screenshot = path.join(work, model.id, `preview-${backend}.png`);
          await page.screenshot({ path: screenshot, fullPage: true });
          entry.screenshot = { file: path.relative(work, screenshot), sha256: sha(await readFile(screenshot)) };
          entry.canvas = await page.locator('canvas').evaluate(canvas => {
            const bytes = canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
            const values = new Set(); for (let i=0;i<bytes.length;i+=4) values.add(bytes[i]+256*bytes[i+1]+65536*bytes[i+2]);
            return { width: canvas.width, height: canvas.height, distinctColors: values.size };
          });
          assert(entry.canvas.distinctColors > 100);
        }
        console.log(JSON.stringify({ model: model.id, backend, ...result }));
      }
      const finished = await page.evaluate(async id => {
        const tensor = new window.ort.Tensor('float32', new Float32Array(await (await fetch(`/inputs/${id}.f32`)).arrayBuffer()), [1,3,1024,1024]);
        const runs = [];
        for (let i=0;i<3;i++) { const started = performance.now(), output = await window.session.run({ image: tensor }); runs.push(performance.now()-started); Object.values(output).forEach(value=>value.dispose()); }
        tensor.dispose(); await window.session.release();
        return { warm: { image: id, runsMs: runs, medianMs: [...runs].sort((a,b)=>a-b)[1] }, profile: window.profile, gpuTrace: window.gpuTrace };
      }, cases[0].id);
      entry.warm = finished.warm;
      const profilePath = path.join(work, model.id, `profile-${backend}.json`);
      await writeFile(profilePath, JSON.stringify(finished.profile));
      entry.profiling = { kernelEvents: finished.profile.length,
        kernelTypes: [...new Set(finished.profile.map(row=>row.kernelType))].sort(),
        file: path.relative(work, profilePath), sha256: sha(await readFile(profilePath)) };
      const tracePath = path.join(work, model.id, `gpu-trace-${backend}.json`);
      await writeFile(tracePath, JSON.stringify(finished.gpuTrace));
      entry.gpuExecution = { commandSubmissions: finished.gpuTrace.filter(row => row.method === 'submit').length,
        computeDispatches: finished.gpuTrace.filter(row => row.method.startsWith('dispatchWorkgroups')).length,
        file: path.relative(work, tracePath), sha256: sha(await readFile(tracePath)) };
      assert.deepEqual(errors, []);
      entry.sessionReleased = true; entry.status = 'executed';
    } catch (error) { entry.error = String(error.stack ?? error); }
    finally { entry.pageErrors = errors; entry.consoleWarnings = messages; report.backends.push(entry); await page.close(); }
  }
  report.status = report.backends.every(row => row.status === 'executed') ? 'executed' : 'partial';
} finally {
  await writeFile(path.join(reportDir, 'browser-execution.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close(); await new Promise(resolve => server.close(resolve));
}
assert.equal(report.status, 'executed');
