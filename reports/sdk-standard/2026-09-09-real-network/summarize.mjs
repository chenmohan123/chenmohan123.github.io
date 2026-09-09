import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const names = { detection: 'Detection', doclayout: 'DocLayoutV3', ocr: 'OCRv6', lcnet: 'LCNet 文档方向' };
const results = [];
for (const sdk of Object.keys(names)) {
  for (const source of ['modelscope', 'huggingface']) {
    const file = `${sdk}-${source}.json`;
    const report = JSON.parse(await fs.readFile(path.join(root, file), 'utf8'));
    assert.equal(report.status, 'passed', `${file} 尚未通过`);
    assert.equal(report.pageErrors.length, 0, `${file} 存在页面异常`);
    assert.equal(report.stages.length, 4, `${file} 阶段不完整`);
    assert.ok(report.requests.some(row => row.phase === '下载取消' && row.error === 'net::ERR_ABORTED'), `${file} 缺少真实取消请求`);
    const cold = report.stages.find(row => row.phase === '首次下载重试');
    const repeated = report.stages.find(row => row.phase === '同页复用');
    const refreshed = report.stages.find(row => row.phase === '刷新后缓存');
    assert.equal(repeated.modelRequestCount, 0);
    assert.equal(refreshed.modelRequestCount, 0);
    const bodies = report.requests.filter(row => row.phase === '首次下载重试' && row.status === 200 && row.finishedAt && !row.error);
    assert.equal(bodies.length, sdk === 'ocr' ? 2 : 1, `${file} 模型下载数量`);
    const inferenceResult = sdk === 'ocr' ? `${cold.results.rows} 行文字` : sdk === 'lcnet' ? cold.results.replaceAll('\n', ' / ') : cold.results.split('\n')[1];
    results.push({ sdk, name: names[sdk], source, file, url: report.url, browser: report.browser, adapter: report.adapter, verifiedAt: report.verifiedAt, finishedAt: report.finishedAt, modelBytes: bodies.reduce((sum, row) => sum + Number(row.contentLength), 0), coldMs: cold.elapsedMs, repeatedMs: repeated.elapsedMs, refreshedMs: refreshed.elapsedMs, inferenceResult });
  }
}
const release = JSON.parse((await fs.readFile(path.join(root, 'doclayout-pr47.json'), 'utf8')).replace(/^\uFEFF/, ''));
assert.equal(release.pr.state, 'MERGED');
assert.equal(release.ci.conclusion, 'success');
assert.equal(release.pages.conclusion, 'success');
assert.equal(release.ci.headSha, release.pr.mergeCommit.oid);
assert.equal(release.pages.headSha, release.pr.mergeCommit.oid);
const lines = [
  '# 四个线上 Demo 真实网络验收',
  '',
  '验收日期：2026-09-09（北京时间）。本轮工作属于四个独立 SDK Demo 的线上验收，以及 DocLayoutV3 开发依赖 PR #47 的合并与 Pages 发布核验。没有修改 SDK 或 Demo 产品代码。',
  '',
  '## 结论',
  '',
  '四个 Demo × 两个来源，共 8 组完整通过。每组均完成真实模型请求取消、原来源重试下载、物理 GPU 推理、同页再次运行、刷新后持久缓存复用。24 次成功推理均返回有效结果；所有同页复用和刷新后复用均为 0 次模型网络请求，未出现未处理的页面异常。',
  '',
  '| Demo | 来源 | 模型本体字节数 | 推理结果 | 取消重试 | 同页复用 | 刷新后缓存 | 证据 |',
  '| --- | --- | ---: | --- | --- | --- | --- | --- |',
  ...results.map(row => `| [${row.name}](${row.url}) | ${row.source === 'modelscope' ? 'ModelScope' : 'Hugging Face'} | ${row.modelBytes.toLocaleString('en-US')} | ${row.inferenceResult} | 通过 | 通过 | 通过 | [JSON](${row.file}) |`),
  '',
  '## 环境与验收方法',
  '',
  `- Chromium ${results[0].browser}，Windows，NVIDIA Blackwell 物理适配器，isFallbackAdapter=false。页面记录的实际后端均为 webgpu。`,
  '- Detection 与 DocLayoutV3 固定 FP32；OCR 固定 Small 检测与识别模型并关闭自动回退；LCNet 使用官方 FP32。测试日期和硬件范围之外的兼容性不作推断。',
  '- 每组使用独立临时浏览器环境。直接打开公开 Pages、下载来源清单与模型；没有 page.route、route.fulfill 或本地模型响应替换。',
  '- 取消阶段使用 CDP 网络限速，模型请求发出后操作取消。LCNet 通过重新选择官方倒置样图取消旧任务。JSON 均记录到 net::ERR_ABORTED；重试前取消限速。此处覆盖的是下载请求期间取消，不代表 GPU 算子执行期间中止已提交任务。',
  '- 浏览器 HTTP 缓存禁用，SDK 持久缓存保留。Detection、OCR、LCNet 使用 IndexedDB；DocLayoutV3 使用 Cache Storage。缓存检查仅读取记录数量或页面统计，没有复制模型字节。',
  '- 同页运行语义以各 SDK 为准：LCNet 和 DocLayoutV3 本次第二次运行仍重新创建会话并从持久缓存读取模型，不能将它们的第二次运行称为复用同一会话。',
  '- 请求记录包含重定向后的最终响应及状态、模型长度、结束时间；URL 查询串已移除，不保存 CDN 下载签名。模型字节数按成功下载的最终响应 Content-Length 汇总，重定向不重复计入。',
  '- 样图结果：Detection 为人物图 12 个目标；DocLayoutV3 为 13 个版面区域；OCR 为 146 行文字；LCNet 官方倒置图为 180°，置信度 43.57%。不将单张样图结果当作模型精度评测。',
  '',
  '## PR #47 与部署',
  '',
  `- [PR #47](${release.pr.url}) 已合并；提交为 \`${release.pr.mergeCommit.oid}\`。变更仅涉及 Playwright 依赖和锁文件。`,
  `- 合并前准确 head 的 CI 与独立审查已通过；[main CI](${release.ci.url}) 成功，包括完整 verify、Browser WASM 和包消费测试。物理 GPU CI 条件跳过，本报告提供本机物理 GPU 线上测试证据。`,
  `- [Pages 发布](${release.pages.url}) 成功，关联同一合并提交。生产页面已在本轮完成真实推理。`,
  '- [合并前标准检查](doclayout-standard-before.json)与[合并后标准检查](doclayout-standard-after.json)均为 required 18 项通过、0 项失败、4 项远程检查跳过；未将本地静态检查称为完整远程合规证明。',
  '- 本地 DocLayoutV3 main 已快进。未启动 runner，未发布 npm、tag 或 Release。',
  '',
  '## 调试记录与限制',
  '',
  '- 初次 LCNet 脚本按首张选图，实际选中正向图，却断言为 180°；Demo 返回 0° 正确。已改为明确选择 orientation-180，并从独立冷环境完成两个来源的完整复测。初次 JSON 以“初次脚本选图误差”保留。',
  '- 初次 DocLayoutV3 脚本读取通用运行信息标记，实际页面使用 model-section；真实推理已成功。已按现有 DOM 标记读取运行信息，并补充 Cache Storage 记录，完整复测通过。初次 JSON 以“初次脚本选择器误差”保留。',
  '- 日志含 ORT 清理无用初始化常量、部分形状算子分配 CPU 的运行时警告；这些没有导致会话失败。WebGPU 后端不意味着模型每个算子都在 GPU 上执行。',
  '- DocLayoutV3 的 Hugging Face FP32 首次模型下载耗时 297725 ms，首次下载重试整个流程约 305 秒；同页和刷新后运行约 6 秒且不下载模型。这是本次网络传输耗时观察，不能扩展为来源服务始终如此。',
  '- [页面资源核查](page-assets.json)确认四页示例图片完整。验收时浏览器默认请求的站点根目录 favicon.ico 返回 404，属于标签页图标资源缺失，不影响模型下载或推理；图标在后续归档改动中补齐，此处保留修复前的观测。',
  '- 本次仅覆盖上述模型、精度、样图与浏览器，不扩展为所有模型变体、操作系统或设备均无 bug 的结论。',
  '',
  '## 复现',
  '',
  '在门户仓库根目录使用已安装的 Playwright 和 Chromium 执行以下命令；每次执行会真实下载模型。归档后的脚本默认输出到新的 .tmp 目录，也可显式指定输出目录，不再覆盖本次证据：',
  '',
  '```powershell',
  '$env:SDK_E2E_REPORT_DIR = ".tmp/real-network-recheck"',
  'node reports/sdk-standard/2026-09-09-real-network/real-network-e2e.mjs detection modelscope',
  '```',
  '',
  '第一个参数可选 detection、doclayout、ocr、lcnet；第二个参数可选 modelscope、huggingface。截图按“SDK-来源-阶段.png”保存。summarize.mjs 专用于这份有日期的验收快照，使用 --check 只读核查归档，不将历史结论套用到新的验收结果。',
  '',
];
if (!process.argv.includes('--check')) {
  await fs.writeFile(path.join(root, 'summary.json'), JSON.stringify({ generatedAt: new Date().toISOString(), results, release }, null, 2));
  await fs.writeFile(path.join(root, 'README.md'), lines.join('\n'));
}
console.log(JSON.stringify({ combinations: results.length, successfulInferences: results.length * 3, release: release.pr.mergeCommit.oid }));
