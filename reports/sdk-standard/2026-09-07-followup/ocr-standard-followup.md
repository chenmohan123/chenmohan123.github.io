# OCRv6 标准一致性只读审计

- 审计日期：2026-09-07（Asia/Shanghai）。
- SDK：`F:/git/00_chenmohan/github/web-sdk-PP-OCRv6`。
- 分支及提交：`main`，`5a0923d07658d721214134df11db0a5b7d5e5acf`，版本 `0.1.8`。
- 标准：门户 `standards/v1`，版本 `1.1.0`；分类为单 SDK 的 audit。
- 范围：缓存清理、容量统计、耗时、并发/取消、独立接入示例；没有修改 SDK 代码、提交、远程操作或浏览器/GPU 验证。

## 结论

离线检查器报告 required 18 通过、0 失败、4 跳过，recommended 3 通过，状态 `locally-compliant`。原始结果见同目录 `ocr-audit-2026-09-07.json`。代码与定向 CPU 验证确认了检查器未覆盖的实际问题，因此该结果不能作为这些使用场景已经合规或可用的证明。

以下路径除明确标注“门户”外，均相对于 SDK 根目录。问题均为 P2；建议在下一次 SDK/Demo 发布前修复。

## required：实际问题

### OCR-01：下载中清缓存会在显示成功后重新写回，且“当前模型”固定指向默认模型

- 关联规则：`DEMO-004`、`CACHE-001`。
- 证据：`apps/demo/src/App.tsx:181` 的 `clearCache` 直接调用清理 API，没有取消/等待 `activeRunRef`、释放 session manager 或设置清理互斥；两个按钮在 `App.tsx:209` 没有忙碌禁用。`packages/sdk/src/model/model-manager.ts:38` 下载完成后无条件 `cache.set`。
- CPU 复现：让模型响应处于等待状态，调用 `cache.clearAll()`，条目数为 0；释放响应并完成 `manager.load()` 后，条目数重新成为 1。
- 清理成功后已加载的会话仍会被 `App.tsx:159` 与 `apps/demo/src/ocr-session.ts:10` 复用。若按钮语义包含释放当前模型内存，当前实现也未实现该语义。
- 自定义 manifest 的 `modelId/version` 会进入加载缓存键（`packages/sdk/src/factory.ts:82`），但 Demo 始终无参调用 `clearModelCache()`，默认只清 `pp-ocrv6/1.0.0`（`factory.ts:206`）。因此自定义模型的“清当前缓存”不会命中其缓存。
- 最小修复：Demo 将清理做成互斥操作，取消并等待当前任务、释放当前会话后再删除；从实际选中/加载的 manifest 获取当前模型标识和版本，完成后重新统计。SDK 若承诺清理可与加载并发，应增加清理代次或加载写入协调，阻止清理前开始的下载迟到写回。

### OCR-02：IndexedDB 缓存不实现容量统计，Demo 没有当前模型用量

- 关联规则：`CACHE-001`、Demo 契约的 current-model cache usage。
- 证据：`sdk-manifest.yaml:46` 声明 `estimate: true`。`packages/sdk/src/cache/indexeddb-cache.ts:23` 返回对象只有 get/set/list/clearCurrent/clearAll；`packages/sdk/src/cache/model-cache.ts:11` 将 estimate 声明为可选，掩盖了缺项。仅 memory cache 实现 estimate。
- `apps/demo/src/App.tsx:209` 只有清理按钮及成功提示，没有实际缓存用量。模型静态文件大小不能代表缓存占用。
- 最小修复：公开当前模型范围的字节统计 API，IndexedDB 与 memory 均实现；Demo 在加载/清理后更新，并明确 SDK 缓存用量与整个 origin 的 quota/usage 的区别。

### OCR-03：热运行混入首次加载耗时，Demo 冷启动数值也不完整

- 关联规则：`PERF-001`、性能契约。
- 证据：`packages/sdk/src/detector/detector.ts:79` 与 `packages/sdk/src/recognizer/recognizer.ts:88` 每次结果都重用 `loadTimings`、`executor.sessionMs`。Demo 已通过 `ensure` 复用会话，却忽略 `reused` 返回值（`apps/demo/src/App.tsx:159`）。
- CPU 复现：同一 detector 实例只加载 1 次，第二次运行 `totalMs≈0.3`，但仍报告 `modelDownloadMs=100`、`sessionMs=50`。这个结果未注明这些数字来自首次加载。
- `apps/demo/src/App.tsx:208` 的 CPU/GPU“冷启动”只加 `modelDownloadMs + sessionMs`，漏掉缓存读取和完整性校验；`docs/zh-CN/performance.md:5` 明确冷启动包含这两项。完整 OCR 并行预加载 DET/REC 时，简单相加还不能代表用户等待的墙钟时间。
- 最小修复：明确首次初始化记录与本次运行耗时的边界；暴露或消费冷/热标记，热运行加载字段归零或单独显示“首次加载”。冷启动采用端到端墙钟计时并显示完整分项，不把并行阶段求和标为实际等待时间。

### OCR-04：没有文本的图片重复计算推理耗时，OCR decodeMs 漏掉实际解码

- 关联规则：`PERF-001`。
- 证据：`packages/sdk/src/pipeline/ocr.ts:42` 在无 crops 时复制 `detected.timings`，只清零加载字段与 totalMs；`ocr.ts:58` 再与 detection 耗时相加，使 decode/preprocess/inference/postprocess 重复。
- CPU 复现：recognizer 调用次数为 0，检测的 inferenceMs 为 7，OCR 最终却为 14。
- `ocr.ts:31` 的初次图片解码没有单独计时；随后 detector 收到已解码 raster，故 `sumTimings` 汇总的 decodeMs 也不能表示真实图片解码耗时。
- 最小修复：无识别时所有识别分项均使用零值，独立测量 pipeline 的实际解码并纳入结果；补充空检测图和有解码耗时的回归测试。

### OCR-05：自动后端回退成功后，OCR 总结果仍返回最初候选后端

- 关联规则：`RUNTIME-001`、SDK runtime 契约。
- 证据：`packages/sdk/src/factory.ts:86` 允许逐个尝试候选后端，组件的真实后端在 `factory.ts:99` 正确记录；但 OCR 工厂在 `factory.ts:201`、`factory.ts:202` 事先以第一个候选构建 runtime，`packages/sdk/src/pipeline/ocr.ts:57` 原样返回这个对象。
- CPU 复现：模拟 WebGPU 能力可用但会话创建失败，DET 和 REC 创建尝试均为 `webgpu → wasm`；实际成功 backend 为 wasm，公开 `createPublicOCR(...).ocr(...)` 结果仍是 `actualBackend: webgpu`。
- 最小修复：OCR 结果从组件已完成的实际 runtime 汇总。若两个组件不同，应明确分组件报告，或选择并保证统一实际后端；不能以计划候选代表执行事实。

### OCR-06：三个本地接入示例不能按文档启动或构建

- 关联规则：`EXAMPLE-001`、`EXAMPLE-002`；扩展示例关联 `EXAMPLE-003`（recommended）。
- 证据：`examples/vanilla/README.md:3`、`examples/react/README.md:3`、`examples/vite/README.md:3` 都要求从根目录执行 `pnpm exec vite examples/...`，但根 `package.json` 未声明 Vite、SDK 或 React 依赖，各 example 也没有独立 package.json。
- 原命令验证：根目录 `pnpm exec vite --version` 返回 `Command "vite" not found`。
- 为排除仅命令路径问题，额外借用 Demo 已安装的 Vite，以 `configFile:false`、`build.write:false` 做纯内存构建。vanilla 与 vite 因无法解析 `web-sdk-pp-ocrv6` 失败；react 因无法解析 `react-dom/client` 失败。
- 最小修复：为每个示例添加完整 package.json、依赖、dev/build 命令和入口配置，固定当前 SDK 版本；验证独立目录安装及构建，再验证 Worker/ORT 资源。此轮没有浏览器验证 CDN 或微信环境可用性。

## required：声明与检查器遗漏

### OCR-07：manifest 示例状态违反 schema，版本说明也已过期

- 关联规则：`META-001`、`EXAMPLE-001/002`；扩展面关联 `EXAMPLE-003`。
- `sdk-manifest.yaml:48` 至 52 的五个状态均为 `runnable`，而门户 `standards/v1/sdk-manifest.schema.json` 的 `$defs.example.properties.status.enum` 只接受 `available`、`unsupported`、`planned`。
- 直接比较 schema 枚举确认五处不匹配，但门户 `tools/sdk-standard-check/src/manifest.mjs` 的 `validateManifest()` 返回 `[]`，因为只检查 vanilla/react 对象存在，没有校验状态枚举。
- `examples/*/README.md` 均指向 0.1.6；`examples/cdn/index.html:1`、`examples/wechat-web-view/index.html:1` 的真实 import 也锁定 0.1.6，与 `packages/sdk/package.json` 的 0.1.8 不符。
- 最小修复：先修复示例实际可运行性，再将状态改为 schema 接受的值，同步版本。门户检查器应直接使用完整 schema 或补齐等价枚举校验；不能通过放宽标准到 runnable 来掩盖不可运行示例。

## 并发核对与验证边界

- 已确认存在保护：Detector/Recognizer/OCR pipeline 都有实例队列；主线程 `createOrtSession` 保留底层任务队列，取消调用方等待后，下一次运行和 dispose 仍等待计算完成；初始化 dispose 会等待并释放迟到执行器。已有定向测试通过。
- Demo 有换图/重置时的请求标识和取消检查；缓存操作没有接入这套协调机制，是本轮确证的并发缺口。
- 额外代码观察：公开 detector/recognizer 在 `factory.ts:136`、`factory.ts:183` 先 `await ready()` 再传递 RunOptions.signal；首次懒加载只连接构造参数的 signal。这意味着仅传入运行级 signal 无法及时取消首次下载。此项没有加入已运行的 CPU 复现，不以完整验证问题计数；若修复取消语义，应补充公开工厂首次加载时的用例。
- 本轮未检查远程 Rulesets、Pages、Release 状态，也未声明任何新增浏览器、设备或 GPU 兼容性。

## 已执行验证

1. `pnpm sdk:check -- --repo ../web-sdk-PP-OCRv6 --format json`：退出 0，required 18 通过、4 跳过；命令带 `--out` 首次受目录权限限制，随后使用等价 CLI 成功保存原始 JSON。
2. 从 `packages/sdk` 运行 `node ../../node_modules/vitest/vitest.mjs run tests/cache.test.ts tests/model-manager.test.ts tests/factory-lifecycle.test.ts tests/detector.test.ts tests/recognizer.test.ts tests/pipeline.test.ts tests/ort-session.test.ts tests/worker-bridge.test.ts`：8 文件、39 测试通过。
3. `node node_modules/vitest/vitest.mjs run apps/demo/src/ocr-session.test.ts`：3 测试通过。
4. `node examples/tests/examples.test.mjs`：2 静态测试通过；只匹配命令/API 关键词，没有安装、构建或当前版本校验，因此没有发现实际失败。
5. 一次性 Node stdin CPU 探针：在内存中转译并调用当前 TypeScript 源码，复现缓存迟到写回、热运行加载时间残留、空结果重复计时、公开工厂后端误报；没有创建 runner、测试文件或实际模型推理。
6. Demo Vite 的内存构建 API：vanilla/react/vite 3 个构建全部依赖解析失败；`write:false`，未写产物。
7. 结束时再次核对 SDK `git status --short` 无修改，HEAD 未变。
