# PP-Detection 后续标准审计

- 日期：2026-09-07，Asia/Shanghai。
- 层级：单 SDK；只读生产源码，生成临时审计证据。
- SDK：`F:/git/00_chenmohan/github/web-sdk-PP-Detection`。
- 审计提交：`6474f5e204ebb0b451a19fa180254e55d26c7510`，开始与结束的 `git status --short` 均无跟踪文件变更。
- 标准：门户 `standards/v1`，版本 `1.1.0`。
- 已阅读：门户 AGENTS.md、标准 README、SDK/Demo/Performance/Examples 契约、rules.yaml、manifest schema、UI tokens、标准 Skill 与 audit reference。

## 自动检查与人工结论

`pnpm sdk:check -- --repo F:/git/00_chenmohan/github/web-sdk-PP-Detection --format json --out .tmp/detection-followup-audit.json`

自动结果：required 18 通过、0 失败、4 跳过；recommended 3 通过；labs 1 条信息；检查器状态为 `locally-compliant`。原始报告见同目录 JSON。

人工审计发现缓存 Demo、接入示例与耗时实现存在下述实质缺口，不能仅据该自动状态确认契约已落实。部分自动通过证据路径是 `.github/workflows/ci.yml`，不是对应实际界面；本报告已直接检查真实源码。

首次保存 JSON 遇到沙箱 EPERM；不带 `--out` 的同等扫描成功。宿主机正常权限下按原命令重跑并成功保存报告。

## Required：需要修复

### 1. EXAMPLE-001 / EXAMPLE-002：主要示例无法直接执行检测（P1）

- React `examples/react/src/App.tsx:30`、Vanilla Vite `examples/vanilla-vite/src/main.ts:18`、CDN `examples/cdn/index.html:84`、微信 `examples/wechat-webview/src/main.ts:21` 以及 Vue 均调用 `createPPDetection`，没有传 `model` 或 `manifest`。
- 工厂 `packages/sdk/src/index.ts:231` 在能力探测前明确拒绝这两项同时缺失，返回 `INVALID_MANIFEST`。
- 使用当前构建产物直接运行与示例相同的初始化参数，实际返回：`{"code":"INVALID_MANIFEST","message":"创建 PPDetection 实例需要 manifest 或 model"}`；没有模型下载或 GPU 执行。
- 另一个 Vanilla DOM 入口 `examples/vanilla/main.js:6` 使用 `https://models.example.com/pp-detection/manifest.json` 占位地址，README 要求读者自行替换，也不构成开箱可运行的已验证示例。
- 修复：给各入口提供当前模型的明确清单，并通过公开 SDK 工厂调用；将示例运行测试覆盖到初始化和一次假模型检测，不能只验证字符串与打包构建。

### 2. DEMO-004 / CACHE-001：缓存控件与 manifest 声明不符（P2）

- `sdk-manifest.yaml` 声明 `clearCurrent: true`、`clearAll: true`、`estimate: true`。
- 实际界面 `apps/demo/src/App.tsx:1190` 只有一个“清理缓存”按钮；处理器 `:545` 只调用模块级 `clearModelCache()`，没有当前模型清理动作、`data-sdk-cache-clear` 标记或缓存占用数值。
- 模块级 API `packages/sdk/src/index.ts:514` 创建新的 ModelManager，再清空其默认缓存数据库；当前 detector 的独立内存层与会话不受影响。界面不能向使用者区分当前模型、全量缓存和当前会话。
- SDK 已提供实例 `clearCurrentModelCache`、`clearAllCache`、`getCacheEstimate`，但 Demo 未接入。
- 修复：接入当前模型/全部模型两个明确动作和缓存占用展示，清理后刷新估算，正确处理异常；全量动作需涵盖当前实例内存缓存，同时明确会话释放语义。

### 3. DEMO-004 / CACHE-001：清理可以被在途加载写回撤销（P2）

- Demo 清理按钮在下载/加载时仍可点击（`App.tsx:1190`），处理器未取消或等待在途操作（`:545`）。
- `ModelManager.clearAllCache()`（`packages/sdk/src/model/model-manager.ts:250`）直接 clear；`loadActive()` 下载完成仍会 `cache.put()`（`:208`）。二者没有共用操作锁或代际失效判断。
- 4 字节假模型实测：开始加载并阻塞 fetch → `clearAllCache` 返回时 `{bytes:0,entries:0}` → 放行下载后变为 `{bytes:4,entries:1}`。因此“缓存已清理”可能很快失真。
- 修复：由统一生命周期协调清理与加载；清理时取消并等待在途加载，或让清理前启动的加载不得再写入缓存。Demo 还需要同步互斥控制，不能仅依赖异步 React 状态更新。

### 4. PERF-001：初始化总耗时漏算 manifest 获取，且缓存来源不显示（P2）

- 工厂在 `packages/sdk/src/index.ts:233` 探测能力、`:239` 获取 manifest、`:249` 选择执行计划，直到 `:264` 才启动初始化计时。
- 这与 `docs/zh-CN/performance.md:5` 的“初始化 totalMs 包含能力探测、manifest 获取”不符。
- 使用 120ms 的假 manifest 响应与假 ORT Session，观测工厂调用约 161.36ms，而 `loadTimings.totalMs` 仅约 4.39ms；没有真实模型推理。
- 内存模型路径 `index.ts:282` 执行完整性验证，但 `:285` 固定记录 `integrityMs: 0`。
- Demo `App.tsx:1014` 依赖 `loadTimings.modelSource` 区分缓存/网络；SDK 类型 `packages/sdk/src/types.ts:287` 和工厂返回值均无此字段。因此该区域始终显示 `-`；上述假运行也确认 `hasAcquisitionSource: false`。
- 修复：在工厂入口计时，真实测量内存模型校验；在公开 load 结果里保留 ModelManager 的 `fromCache`/来源语义，并由 Demo 明确显示 cold/cache/warm 状态。

### 5. PERF-001 / RUNTIME-001：结果没有运行时版本与测试环境（P2）

- `packages/sdk/src/types.ts:260` 的 `PPDetectionRuntimeInfo` 以及 `packages/sdk/src/index.ts:422` 结果只包含 requestedBackend、backend、precision、mode、fallbacks、capabilities。
- 标准 Performance 契约要求结果带 runtime version 和 test environment。manifest 的静态 ORT 版本与历史 verification 列表不能替代一次结果的运行环境。
- 修复：增加稳定版本字段与明确的环境快照字段，或明确区分结果运行环境与单独附带的验证记录；不能把当前机器泛化成兼容承诺。

## 其他实质问题与建议

### 视频每帧都重新创建模型会话（P1，性能与资源问题）

- `apps/demo/src/App.tsx:503` 用视频帧调度器反复调用 `runDetection(video, timestampMs)`。
- `runDetection` 在 `:427` 对所有 `inputMode !== "camera"` 的输入都清空并释放上一 detector，随后 `:437` 重新创建。`video` 满足此条件，因此每帧都会重新读取/校验模型、创建 Session。
- 摄像头才复用 detector。视频无法进入预期 warm run，会产生持续 Session 创建开销；本轮源码确认，未执行长耗时真实视频推理。
- 修复：图片/视频/摄像头共享明确的模型配置身份，视频帧复用同一已加载 detector；仅配置变化或显式停止释放时销毁会话。

### 视频启动缺少迟到操作保护（P2）

- `App.tsx:486` 的 `startVideo` 在 await dispose、loadeddata、play 后直接创建 scheduler（`:503`）；没有 input generation/controller 校验。
- `stopVideo` 在 `:514` 更新 generation，但 startVideo 不读取它。等待 loadeddata 或 play 的过程中停止媒体/切换输入，旧启动仍可能迟到恢复播放、创建调度器或覆盖错误状态。
- 修复：与摄像头和样例读取现有 generation 机制保持一致，在每个 await 后验证操作仍有效，并清理迟到播放与监听器。
- 本项为明确源码路径，未跑浏览器延迟媒体复现。

### 示例并发/卸载的保护不完整（recommended）

- React 检测按钮 `examples/react/src/App.tsx:53` 没有忙状态或同步锁；`:30` 将异步创建结果直接写 ref，卸载回调 `:19` 只能释放已经存在的 detector，无法取消尚未完成的工厂调用。
- 连续点击可同时初始化多个实例；卸载后到达的实例没有释放路径。Vue、CDN 与 Vite 示例有相似模式。
- 当前缺少模型的前置错误会掩盖这些后续路径；修复模型配置时应同步加入 in-flight Promise、AbortController、generation/卸载检查与迟到实例 dispose。

## Recommended 分组

- 自动 `EXAMPLE-003` 通过，但源码运行缺陷同上。四个可构建示例的 `package.json` 用 `file:../../packages/sdk`（例如 React `:14`），复制出仓库后不能按原文件安装当前公开版本；现有消费者测试 `examples/tests/examples.test.ts:120` 会主动改写成 tarball，从而不验证原 package.json 的独立性。
- CDN `examples/cdn/index.html:57` 使用 `@latest`，不满足指向当前 SDK 固定版本的语义；React README 只有描述，没有安装与启动命令。
- 建议固定当前 SDK 版本、补齐每个示例的 install/run 命令，并测试原样复制后的消费路径。
- `UI-001`：已人工检查 `apps/demo/src/styles.css:1` 起的 shared token 值与标准一致；未做 390px 浏览器视觉验证。
- `RELEASE-003`：检查器通过，本轮未扩展发布内容审计。

## Labs 分组

- 自动 `LABS-001` 为 informational/skip；本轮未验证 NPU、WebNN 或 GPU 能力。
- `docs/zh-CN/performance.md:7` 宣称 FP16 真实 WebGPU 验证，`:11` 建议使用 FP16；但 `docs/zh-CN/compatibility.md:25` 将 FP16 标为 blocked，当前 sdk-manifest precision 仅有 FP32。
- 应把历史 FP16 记录与当前 Detection 模型矩阵分清，并链接带日期、具体模型版本/资产摘要的证据；不能据模糊历史记录承诺当前 FP16 可用。

## 已执行验证

| 命令/验证 | 结果 |
| --- | --- |
| `pnpm sdk:check -- --repo F:/git/00_chenmohan/github/web-sdk-PP-Detection --format json --out .tmp/detection-followup-audit.json` | 退出 0；18 required pass、4 skip、3 recommended pass |
| `pnpm test` | 17 文件、116 项通过 |
| `pnpm docs:test` | 6 项通过 |
| `pnpm benchmark:test` | 6 项通过；只验证契约，未真实基准推理 |
| `pnpm typecheck` | 通过 |
| `pnpm --filter @ppdetection/demo typecheck` | 通过 |
| `pnpm --filter @ppdetection/examples-tests test` | 首次 9 pass/4 安装失败；诊断确认 `ERR_PNPM_EPERM` 写临时 pnpm store；宿主机正常权限重跑 13 项全通过，其中 4 个消费者构建通过 |
| 当前 dist 无模型初始化最小复现 | 返回 `INVALID_MANIFEST` |
| ModelManager 在途加载与 clearAllCache 最小复现 | 清理后 0 条，放行假下载后 1 条 |
| 假 manifest 延时 + 假 ORT Session 耗时复现 | 工厂约 161.36ms，记录 total 约 4.39ms，modelSource 缺失 |
| SDK `git status --short` | 无跟踪文件变更 |

## 未验证限制

- 没有运行真实模型浏览器推理、GPU、NPU、长视频、390px 布局或跨浏览器烟测。
- 没有调用 gh、改变宿主机登录状态、创建分支/提交或进行 GitHub 远程写入。
- GOV-001、GOV-002、DEPLOY-001、PAGES-001 仍是未核验的远程 required 规则，不能把本地扫描结果升级为 full compliant。
- 轻量动态复现使用 mock fetch、4 字节假模型和 fake ORT；只证明控制流/缓存/计时问题，不证明模型兼容性或性能。
