# 浏览器运动估计 Spike 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 执行本计划。每个任务使用复选框跟踪，并在独立测试通过后提交。

**目标：** 在独立的 PP-Tracking SDK 中实现 CPU/main 的相邻帧运动估计实验入口，比较纯平移、稀疏光流和特征匹配，并提供可复现的浏览器实验页与 dated evidence；不自动接入 BoT-SORT 默认流程。

**架构：** SDK 新增独立 `web-sdk-pp-tracking/motion` 子入口，公开无状态 `estimateMotion` 异步函数；包根和 BoT-SORT API 保持不变。输入统一转换为灰度图，三个算法共享尺寸/帧序/质量校验、矩阵约束和计时边界；算法失败返回不含矩阵的显式 `failed` 结果，结构性输入错误抛出独立 `MotionEstimateError`。Demo 以 `motion.html` 作为静态独立入口，读取本地图片或原创合成帧，显示单算法及三算法对比，不复制门户 runtime。门户只记录实验状态和证据链接。

**技术栈：** TypeScript、DOM `ImageData`/`VideoFrame`、React Demo、Vite、Vitest、Playwright；不新增生产依赖，不使用 Worker、WebGPU、NPU 或摄像头 API。

**规格：** [浏览器运动估计 Spike 设计](../specs/2026-09-23-tracking-motion-estimation-design.md)

## 全局约束

- SDK 工作树：`C:/Users/chenm/.codex/worktrees/tracking-motion`；门户工作树：`C:/Users/chenm/.codex/worktrees/tracking-motion-portal`；F 盘主工作树保持不变。
- 文档、注释、提交信息使用中文；约定的英文镜像文档继续保留英文。
- 只声明并验证 Windows 11 + Chromium 153 + CPU/main；不声明手机、Worker、GPU、NPU/WebNN、Safari、Firefox、视频或摄像头兼容。
- `estimateMotion` 只从 `web-sdk-pp-tracking/motion` 导入，只接受相邻帧并返回估计回执；不改包根或 `createTracker({ algorithm: 'botsort' })` 的输入契约，不把失败静默变成恒等矩阵。
- 纯平移、稀疏光流、特征匹配使用同一输入集、图像尺寸、计时口径和输出坐标系；所有失败必须带稳定原因。
- 不新增外部图像/光流包；不复制来源义务不明的 PaddleDetection 或其他跟踪实现。
- 使用 pnpm 时统一执行 `pnpm --config.verify-deps-before-run=false --config.manage-package-manager-versions=false ...`。
- 修改 SDK 前后运行门户 checker：`pnpm --config.verify-deps-before-run=false --config.manage-package-manager-versions=false sdk:check -- --repo C:/Users/chenm/.codex/worktrees/tracking-motion --format json --out <report>`。
- 本阶段只准备本地实验候选，不 push、不开 PR、不改 npm `latest`；通过后再单独确认是否制作 `0.2.0-rc.2` 发布。

## 文件与职责映射

**SDK：**

- Create `src/motion/types.ts`：运动输入、算法、状态、失败原因、矩阵和计时结果的公开类型；`AffineMatrix` 由此成为运动模块的公共类型来源，BoT-SORT 类型继续在既有根入口 re-export 以保持兼容。
- Create `src/motion/errors.ts`：`MotionEstimateErrorCode` 与 `MotionEstimateError`，区分结构性输入错误和算法质量失败。
- Create `src/motion/input.ts`：`ImageData`/`VideoFrame` 结构校验、灰度转换和 `VideoFrame.copyTo` 读取；不关闭调用方拥有的 `VideoFrame`。
- Create `src/motion/math.ts`：梯度、角点、 patch 误差、最小二乘、median/MAD、RANSAC 与矩阵约束等纯数学工具。
- Create `src/motion/translation.ts`：固定网格 patch 的局部搜索和稳健平移拟合。
- Create `src/motion/sparse-flow.ts`：角点选择、局部 Lucas–Kanade 迭代和鲁棒平移/仿射拟合。
- Create `src/motion/feature-match.ts`：归一化 patch 描述、比值匹配和仿射 RANSAC。
- Create `src/motion/index.ts`：`web-sdk-pp-tracking/motion` 的唯一公共入口，导出 `estimateMotion`、公开类型和错误；不从包根导出，不引入 React 或 ORT。
- Modify `src/botsort/types.ts`：从 `src/motion/types.ts` re-export `AffineMatrix`，保持既有 `CameraMotion` 类型的导入路径。
- Create `tests/motion.test.ts`：失败优先的结构校验、三个算法、矩阵误差、失败原子性和资源语义测试。
- Create `tests/motion-browser.mjs`：Motion Demo 的 Playwright 桌面/390px/语言/对比/导出 smoke test。
- Create `scripts/motion-benchmark.mjs`：运行合成矩阵并写 JSON 结果，不访问网络、不使用真实隐私图片。
- Create `reports/2026-09-23-motion-estimation/README.md` 与 `metrics.json`：记录输入生成器、版本、环境、指标、失败原因、内存/包体和限制。
- Modify `README.md`、`README.en.md`、`docs/zh-CN/api.md`、`docs/en/api.md`、`docs/zh-CN/compatibility.md`、`docs/en/compatibility.md`、`docs/zh-CN/performance.md`、`docs/en/performance.md`、`CHANGELOG.md`、`sdk-manifest.yaml`：登记实验入口、计时字段解释、`motion.html` 地址、限制和本地候选版本；不把实验写成稳定支持。
- Modify `package.json`、`scripts/build.mjs`、`scripts/check-package.mjs` 和 Vite 输入配置：增加 `./motion` 的 ESM/CJS/NodeNext 子入口、本地 `0.2.0-rc.2` 候选和静态 Motion Demo 构建；保持包根与 `./reid` 消费不变。
- Create `demo/motion.html`、`demo/src/motion-main.tsx`、`demo/src/MotionApp.tsx`、必要的 `demo/src/motion.css`；复用 `ui-tokens.json`，提供图片对/合成帧、算法选择、运行/重置、结果对比和 JSON 导出。
- Modify `demo/vite.config.ts`、`package.json` scripts：让 `index.html` 和 `motion.html` 作为 Vite 多页入口一起构建。

**门户：**

- Modify `docs/superpowers/plans/2026-08-17-web-model-sdk-portal-roadmap.md` 和 `docs/superpowers/plans/2026-09-13-pp-detection-multi-model-roadmap.md`：加入当前实验阶段、限制和后续决策，不改稳定 registry 文案。
- Create `reports/tracking/2026-09-23-motion-estimation/README.md` 与 `report.json`：引用 SDK 证据、checker 前后结果和未验证平台。
- 不复制 SDK runtime，不把门户条目改成自动运动估计已兼容。

---

### 任务 1：标准检查、失败优先的公共契约

**文件：**

- Test: SDK `tests/motion.test.ts`
- Create: SDK `src/motion/types.ts`, `src/motion/errors.ts`, `src/motion/index.ts`
- Modify: SDK `src/index.ts`, `src/botsort/types.ts`
- Evidence: 门户工作树 `reports/sdk-standard/2026-09-23-motion-before.json`

**接口：**

```ts
export type MotionAlgorithm = 'translation' | 'sparse-flow' | 'feature-match'
export type MotionEstimateStatus = 'estimated' | 'identity' | 'failed'
export type MotionEstimateFailureReason =
  | 'invalid-input' | 'frame-order' | 'size-mismatch' | 'unsupported-input'
  | 'insufficient-texture' | 'insufficient-matches' | 'numerical-instability'
  | 'quality-threshold' | 'runtime-error'

export interface MotionFrame {
  image: ImageData | VideoFrame
  frameId: number
  timestampMs: number
}

export interface MotionEstimateInput {
  previous: MotionFrame
  current: MotionFrame
  imageSize: { width: number; height: number }
}

export interface MotionEstimateOptions {
  algorithm?: MotionAlgorithm
  identityWhenStatic?: boolean
  maxSearchRadius?: number
  minInliers?: number
}

export type MotionEstimateResult = {
  status: 'estimated' | 'identity'
  matrix: AffineMatrix
  confidence: number
  inlierCount: number
  residual?: number
  timings: { preprocessMs: number; estimateMs: number; totalMs: number }
  algorithm: MotionAlgorithm
  reason?: MotionEstimateFailureReason
} | {
  status: 'failed'
  confidence: 0
  inlierCount: 0
  timings: { preprocessMs: number; estimateMs: number; totalMs: number }
  algorithm: MotionAlgorithm
  reason: MotionEstimateFailureReason
}

export async function estimateMotion(
  input: MotionEstimateInput,
  options?: MotionEstimateOptions,
): Promise<MotionEstimateResult>
```

- [x] **步骤 1：先运行 checker 并保留缺口证据。**

运行：

```powershell
pnpm --config.verify-deps-before-run=false --config.manage-package-manager-versions=false sdk:check -- --repo C:/Users/chenm/.codex/worktrees/tracking-motion --format json --out reports/sdk-standard/2026-09-23-motion-before.json
```

预期：检查器输出带日期报告；历史所需项通过，任何已有提示原样保留，不覆盖 `reports/sdk-standard/picodet-series-after.json`。

- [x] **步骤 2：写失败测试。** 断言空输入、非有限帧号、`current.frameId !== previous.frameId + 1`、时间不递增、尺寸不一致、非正尺寸、未知算法和非 `ImageData`/`VideoFrame` 输入抛出 `MotionEstimateError`；断言 API 类型只能从 `web-sdk-pp-tracking/motion` 导入，包根导入保持原有导出集合。

```ts
const makeInput = (overrides: { currentFrameId?: number; lowTexture?: boolean } = {}) => ({
  previous: { image: makeImageData(overrides.lowTexture === true), frameId: 0, timestampMs: 0 },
  current: { image: makeImageData(overrides.lowTexture === true), frameId: overrides.currentFrameId ?? 1, timestampMs: 33 },
  imageSize: { width: 64, height: 48 },
})
await expect(estimateMotion({} as MotionEstimateInput, { algorithm: 'translation' })).rejects.toThrow(MotionEstimateError)
await expect(estimateMotion(makeInput({ currentFrameId: 0 }))).rejects.toMatchObject({ code: 'FRAME_ORDER' })
const failed = await estimateMotion(makeInput({ lowTexture: true }))
expect(failed).toMatchObject({ status: 'failed', reason: 'insufficient-texture' })
expect('matrix' in failed).toBe(false)
```

- [x] **步骤 3：运行单测确认失败。**

运行：`pnpm --config.verify-deps-before-run=false --config.manage-package-manager-versions=false exec vitest run tests/motion.test.ts`。

预期：测试因模块和类型尚未实现而失败；将完整输出保存到 SDK `.tmp/motion/contract-red.log`。

- [x] **步骤 4：实现最小公共类型和错误类。** `MotionEstimateError` 的 code 至少包含 `INVALID_INPUT`、`FRAME_ORDER`、`SIZE_MISMATCH`、`UNSUPPORTED_INPUT`、`INVALID_OPTIONS`；质量失败只由不含 `matrix` 的 `status: 'failed'` 结果表达，不抛异常。`estimateMotion` 初步只做校验后返回 `failed`，不得把失败伪造成 `identity`。

- [x] **步骤 5：实现根导出并保持兼容。** `src/botsort/types.ts` re-export `AffineMatrix`；现有 BoT-SORT 导入路径和既有测试必须继续通过。

- [x] **步骤 6：运行契约测试并提交。**

运行：`pnpm --config.verify-deps-before-run=false --config.manage-package-manager-versions=false exec vitest run tests/motion.test.ts tests/botsort-motion.test.ts`。

预期：公共契约测试通过，算法质量测试仍保持待实现；提交：`定义运动估计公共契约`。

### 任务 2：图像输入和纯数学工具

**文件：**

- Create: `src/motion/input.ts`, `src/motion/math.ts`
- Modify: `tests/motion.test.ts`

**接口：**

- `readMotionImage(image, expectedSize): Promise<GrayImage>` 将 `ImageData` 的 RGBA 转为 `[0,1]` 灰度；`VideoFrame` 使用 `copyTo` 读取可用的 `RGBA` 平面，调用方所有权不变。
- `validateAndReadInput` 先验证两帧尺寸、帧序和时间，再返回两个独立灰度缓冲区；任何失败均不缓存输入。
- `median`, `mad`, `solveLeastSquares`, `fitAffineRansac`, `clampAffine` 为无 DOM 依赖的纯函数。

- [x] **步骤 1：写输入和数学失败测试。** 使用结构化 `ImageData` 测试帧生成器，覆盖灰度值范围、尺寸 mismatch、RGBA alpha 不影响灰度、角点边界和奇异矩阵拒绝。
- [x] **步骤 2：运行测试确认失败并保存 `.tmp/motion/input-red.log`。**
- [x] **步骤 3：实现输入读取和数学函数。** 灰度公式固定为 `0.299*r + 0.587*g + 0.114*b`；所有中间值有限，RANSAC 使用固定 seed 或确定性采样，避免同输入结果漂移。
- [x] **步骤 4：运行 `vitest run tests/motion.test.ts`，确认输入/数学测试通过。**
- [x] **步骤 5：提交 `实现运动估计输入与数学工具`。**

### 任务 3：纯平移基线

**文件：**

- Create: `src/motion/translation.ts`
- Modify: `src/motion/index.ts`, `tests/motion.test.ts`

**算法契约：** 在 8×5 的内部网格中跳过边界 patch，对每个 patch 在 `maxSearchRadius` 内以归一化 SSD 搜索位移，使用中位数和 MAD 去除前景/遮挡异常。至少 8 个有效 patch 且 MAD 不超过 2.5 像素时返回平移矩阵 `[1,0,dx,0,1,dy]`；静止且 `identityWhenStatic` 为真时返回 `identity`，否则返回 `estimated` 的零平移。纹理不足、匹配不足或残差超门限返回 `failed` 并写原因。

- [x] **步骤 1：添加失败优先测试。** 合成水平/垂直/大位移、静止、低纹理、局部遮挡和亮度变化；断言矩阵误差、状态、置信度范围、内点数、残差和失败原因。
- [x] **步骤 2：运行 `vitest run tests/motion.test.ts -t translation`，确认新增测试失败并保存 `.tmp/motion/translation-red.log`。**
- [x] **步骤 3：实现 `estimateTranslation(previous, current, options)`，只返回候选，不修改全局状态。**
- [x] **步骤 4：接入 `estimateMotion` 分派和独立三段计时；质量失败统一构造不含 `matrix` 的 `status:'failed'`、`reason`、`confidence:0`、`inlierCount:0` 结果，Demo 和调用方只能在 `estimated`/`identity` 分支读取矩阵。**
- [x] **步骤 5：运行翻译测试和既有跟踪测试，提交 `加入纯平移运动估计基线`。**

### 任务 4：稀疏光流

**文件：**

- Create: `src/motion/sparse-flow.ts`
- Modify: `src/motion/math.ts`, `src/motion/index.ts`, `tests/motion.test.ts`

**算法契约：** 使用 Shi–Tomasi 风格角点评分，最多 120 个角点；每个角点用 5×5 窗口做最多 6 次 Lucas–Kanade 迭代，拒绝病态梯度和越界点；用 MAD/RANSAC 拟合平移或局部仿射，至少 6 个有效点、至少 `minInliers`（默认 6）才可 `estimated`。输出矩阵必须通过与 BoT-SORT 相同的正行列式、尺度、旋转和位移约束；不通过则 `failed`。

- [x] **步骤 1：写平移、旋转、缩放、仿射、遮挡和低纹理的失败优先测试；测试重复调用结果完全一致。**
- [x] **步骤 2：运行 `vitest run tests/motion.test.ts -t sparse-flow`，确认失败并保存 `.tmp/motion/sparse-flow-red.log`。**
- [x] **步骤 3：实现角点、迭代和鲁棒拟合；不引入图像库，不读取其他仓库的光流代码。**
- [x] **步骤 4：接入算法分派，确认输入校验失败不推进任何可复用状态。**
- [x] **步骤 5：运行 `vitest run tests/motion.test.ts tests/botsort-motion.test.ts`，提交 `加入稀疏光流运动估计`。**

### 任务 5：特征匹配可行性对照

**文件：**

- Create: `src/motion/feature-match.ts`
- Modify: `src/motion/math.ts`, `src/motion/index.ts`, `tests/motion.test.ts`

**算法契约：** 从角点周围提取 9×9 归一化灰度 patch 描述，按 SSD 最近邻/次近邻比值匹配；至少 4 个互相一致匹配，通过确定性 RANSAC 拟合仿射矩阵。比值、内点数、残差和矩阵范围均纳入质量门限。大位移成功率是对照指标，不因此改变默认算法或 BoT-SORT。

- [x] **步骤 1：写大位移、旋转、重复纹理、局部遮挡、无纹理和亮度变化测试；断言不足匹配返回 `insufficient-matches`，数值异常返回 `numerical-instability`。**
- [x] **步骤 2：运行 `vitest run tests/motion.test.ts -t feature-match`，确认失败并保存 `.tmp/motion/feature-match-red.log`。**
- [x] **步骤 3：实现描述子、匹配和 RANSAC；固定采样顺序，拒绝镜像/奇异/过大仿射。**
- [x] **步骤 4：运行全量运动单测，提交 `加入特征匹配运动估计对照`。**

### 任务 6：对比脚本和 dated evidence

**文件：**

- Create: `scripts/motion-benchmark.mjs`, `reports/2026-09-23-motion-estimation/metrics.json`, `reports/2026-09-23-motion-estimation/README.md`
- Modify: `package.json` scripts

**固定输入和门槛：** 生成 320×180 与 640×360 两种尺寸，覆盖纯平移 5 档、缩放/旋转/仿射各 3 档、静止、低纹理、重复纹理、遮挡、亮度变化和超范围运动；每种固定 seed。报告矩阵参数误差、成功/失败率、失败原因、p50/p95 三段耗时、峰值 JS 堆（可测时）和构建包体。比较门槛记录为：纯平移在支持范围内 95% 成功且平移中位误差 ≤2px；稀疏光流在局部仿射集 80% 成功且中心误差 ≤3px；特征匹配在大位移集 70% 成功；三个算法 640×360 `totalMs` p95 均 ≤100ms。门槛只用于 Spike 是否值得继续，不构成跨设备性能承诺。

- [x] **步骤 1：写 benchmark 失败测试，确保输出包含版本、seed、输入集、环境和三算法字段，不允许缺少失败原因。**
- [x] **步骤 2：实现脚本和 `npm run benchmark:motion`，先运行生成报告。**
- [x] **步骤 3：核对报告只使用合成数据、无网络和无个人图片；记录未达门槛项，不调整参数隐藏失败。**
- [x] **步骤 4：提交 `记录运动估计对比证据`。**

### 任务 7：独立 Motion Demo

**文件：**

- Create: `demo/motion.html`, `demo/src/MotionApp.tsx`, `demo/src/motion.css`, `tests/motion-browser.mjs`
- Modify: `demo/src/main.tsx`, `demo/vite.config.ts`, `package.json`

**页面行为：** `motion.html` 显示中文默认和 English 切换；提供原创合成场景、上一帧/当前帧图片上传、算法下拉、运行全部、重置、JSON 导出；中央显示前后帧缩略图和矩阵/置信度/内点/残差/三段耗时；详情明确“实验能力，不自动接入默认跟踪”。不提供摄像头、视频播放器、手机专属控件或 NPU 选项。页面使用共享 token 和当前 PP-Tracking 顶栏风格，390px 不横向溢出。

- [x] **步骤 1：先写 `tests/motion-browser.mjs` 失败流程。** 打开 `motion.html`，断言标题、三算法选项、CPU/JavaScript/Main、状态复位标记、单算法运行、全部对比、失败原因、中文/英文切换、JSON 导出和 390px 宽度。
- [x] **步骤 2：运行 `npm run build:demo` 后执行浏览器脚本，确认页面尚未存在并保存 `.tmp/motion/motion-browser-red.log`。**
- [x] **步骤 3：实现 MotionApp 和静态入口，合成图片使用与 benchmark 相同 seed；上传图片通过 `createImageBitmap` + canvas 转 `ImageData`，释放 bitmap，不上传网络。**
- [x] **步骤 4：复用 `data-sdk-runtime-info`、`data-sdk-timing`、`data-sdk-algorithm-info`、`data-sdk-state-reset`；实验页显示 `CPU / JavaScript / Main`，不伪造模型缓存或推理耗时。**
- [x] **步骤 5：运行 `npm run build:demo`、`node tests/motion-browser.mjs`，保存截图和报告，提交 `增加运动估计实验 Demo`。**

### 任务 8：文档、manifest、版本和门户登记

**文件：** 见“文件与职责映射”中的双语文档、`sdk-manifest.yaml`、`CHANGELOG.md` 和门户路线/报告。

- [x] **步骤 1：更新中英文 API。** 写出 `MotionFrame` 嵌套帧身份、输入尺寸、`estimateMotion` async 调用、错误码、`failed` sentinel 不可应用、VideoFrame 所有权和 reset/无状态语义；示例必须使用 `status === 'estimated'` 才读取矩阵。

```ts
const result = await estimateMotion({ previous, current, imageSize }, { algorithm: 'sparse-flow' })
if (result.status === 'estimated') tracker.update({ ...frame, motion: { status: 'estimated', matrix: result.matrix, source: 'motion-spike', confidence: result.confidence, from, to } })
```

- [x] **步骤 2：更新兼容性、性能和变更记录。** 明确只验证 Windows 11 + Chromium 153 + CPU/main；`preprocessMs`/`estimateMs`/`totalMs` 属于实验结果，跟踪标准的五项 timing 不变；记录三算法 Spike 不改变默认 ByteTrack/BoT-SORT。
- [x] **步骤 3：将 SDK 本地版本统一到 `0.2.0-rc.2` 候选；顶层 hybrid manifest 继续保留算法模块 `cpu/main` 与 ReID 模块 `wasm/webgpu/main` 的既有实际声明，另在文档中明确 motion 子入口仅验证 `cpu/main`；不添加 WebGPU/NPU/Worker 证据，不把 motion 写成新模型或 Workflow。**
- [x] **步骤 4：门户新增 dated report 和路线当前段，稳定 `src/content/models/pp-tracking.yaml` 继续写 rc.1/稳定 0.1.0 事实，只添加实验链接与“未默认接入”限制。**
- [x] **步骤 5：运行双语链接、YAML/schema 和 checker 测试，提交 SDK `记录运动估计实验文档与候选版本`、门户 `登记运动估计实验阶段`。**

### 任务 9：整体验收与本地收口

**文件：** SDK `.tmp/motion/`、门户 `reports/sdk-standard/2026-09-23-motion-after.json` 和最终检查日志。

- [x] **步骤 1：运行 SDK 完整验证。**

```powershell
pnpm --config.verify-deps-before-run=false --config.manage-package-manager-versions=false install --frozen-lockfile
pnpm --config.verify-deps-before-run=false --config.manage-package-manager-versions=false run verify
pnpm --config.verify-deps-before-run=false --config.manage-package-manager-versions=false run benchmark:motion
```

预期：构建、类型、既有跟踪单测、运动单测、包消费、Demo 构建、Vanilla/React 构建、既有浏览器流程和 Motion 浏览器流程通过；若环境缺少 Chromium，只记录安装/环境失败，不声称浏览器通过。

- [x] **步骤 2：运行门户检查和相关测试。**

```powershell
pnpm --config.verify-deps-before-run=false --config.manage-package-manager-versions=false sdk:check -- --repo C:/Users/chenm/.codex/worktrees/tracking-motion --format json --out reports/sdk-standard/2026-09-23-motion-after.json
pnpm --config.verify-deps-before-run=false --config.manage-package-manager-versions=false test
pnpm --config.verify-deps-before-run=false --config.manage-package-manager-versions=false build
```

- [x] **步骤 3：运行 `git diff --check`、扫描常见占位词和未分类英文占位符，核对历史报告和主工作树未被覆盖；报告列出通过项、失败项、未验证平台和下一步是否值得设计 BoT-SORT 自动接入。**
- [x] **步骤 4：执行最终独立审查清单。** 检查根包 ESM/CJS/NodeNext 可导入，`VideoFrame` 所有权文档准确，失败结果不会被 Demo 或 BoT-SORT 当成矩阵，网页无网络请求和 390px 无溢出，门户没有把实验写成稳定兼容。
- [x] **步骤 5：两仓分别提交本地变更，不 push、不开 PR；记录提交 SHA 和本地报告路径，等待用户决定是否发布 rc.2 或继续改进。**

## 交付后的决策点

当任务 9 完成后，根据报告逐项决定：

1. 三算法达到记录门槛且失败原因可解释：另写“自动运动接入 BoT-SORT”设计，仍需用户批准后实现。
2. 仅部分算法达到门槛：保留独立实验，文档标出适用场景，不接入默认跟踪。
3. 质量或耗时均未达门槛：停止自动接入，保留证据和失败原因，优先改进输入/采样或转向其他跟踪路线。
