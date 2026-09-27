# YOLOX 模型辅助检测候选实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development 或 superpowers:executing-plans，按任务逐项执行并在每个检查点复核。

**Goal:** 在 `web-sdk-PP-Tracking` 中实现候选 `./yolox` 检测子模块，使用 YOLOX-Tiny COCO 权重输出 person `Detection[]`，供调用方交给既有 ByteTrack。

**Architecture:** 根入口和 ByteTrack 默认行为保持不变。YOLOX 模块只负责单帧 RGBA8 图像到 person 检测，不维护跨帧状态，也不新增检测加跟踪组合 API；ORT 仅在显式加载候选模块时动态导入。

**Tech Stack:** TypeScript、ONNX Runtime Web 1.27.0、WASM/WebGPU、Vitest、esbuild、Python 3.12、PyTorch、ONNX、ONNX Runtime、pnpm。

**Spec:** `docs/superpowers/specs/2026-09-24-tracking-modeltracking-yolox-design.md`

## 全局约束

- 上游固定为 `Megvii-BaseDetection/YOLOX`，提交 `e1052df71842031413f6030723c3607b839c80ce`。
- 权重固定为官方 YOLOX Release `0.1.1rc0` 的 `yolox_tiny.pth`。
- 模型固定为 YOLOX-Tiny、`416×416`、depth `0.33`、width `0.375`。
- 只保留 COCO class index `0` 的 person，并映射为 SDK `classId: 1`。
- 根入口、ByteTrack 阈值、公开 Demo、版本号、manifest、`package.exports` 和门户标准不变。
- 候选阶段不发布 npm、GitHub Release、ModelScope 或 Hugging Face，不执行远程写入。
- 权重、原始张量和截图只放在 `.tmp/` 等忽略目录。
- 所有 pnpm 命令追加 `--config.verify-deps-before-run=false --config.manage-package-manager-versions=false`。
- 文档、回复、注释使用中文；代码默认不添加解释性注释。
- 资产下载、导出、算子审计和 ORT 对齐任一失败时停止后续门槛，不使用估计值替代实测值。
- 不提交、不推送；保留既有 CenterTrack 证据目录及用户修改。

---

### Task 1: 锁定 YOLOX 权重与来源

**Files:**
- Create: `.tmp/yolox-reference/download.py`
- Create: `reports/2026-09-24-yolox-assets/asset.json`
- Create on failure only: `reports/2026-09-24-yolox-assets/failure.md`

**Interfaces:**
- Produces the exact weight byte length, SHA-256, release identity, upstream revision and download timestamp.
- The weight file remains in `.tmp/yolox-reference/yolox_tiny.pth`.

- [ ] 建立 `.tmp/yolox-reference/venv` 隔离 Python 环境。
- [ ] 只从官方 `0.1.1rc0` Release 下载 YOLOX-Tiny COCO 权重。
- [ ] 以固定分块读取完整文件，计算 SHA-256 与字节数。
- [ ] 使用第二套本地哈希命令独立复核。
- [ ] 两次核验一致后才写 `asset.json`。
- [ ] 若下载结果为 HTML、不完整、不可用或摘要不一致，写 `failure.md` 并停止。

**Verification:**
- 文件字节数为正且等于来源锁中的 40,755,013。
- 摘要为 64 位小写十六进制。
- Release 与上游 revision 与 spec 一致。

### Task 2: 生成官方 PyTorch golden 并导出 ONNX

**Files:**
- Create: `.tmp/yolox-reference/export_common.py`
- Create: `.tmp/yolox-reference/golden.py`
- Create: `.tmp/yolox-reference/export_onnx.py`
- Create: `.tmp/yolox-reference/audit_ops.py`
- Create: `reports/2026-09-24-yolox-assets/golden-manifest.json`
- Create: `reports/2026-09-24-yolox-assets/onnx-manifest.json`

**Interfaces:**
- Input tensor: `[1, 3, 416, 416]`, `float32`.
- Raw output tensor: `[1, 3549, 85]`, `float32`.
- Channel layout: `dx, dy, dw, dh, objectness, class[0..79]`.
- Export configuration: `decode_in_inference=False`.
- Objectness and class sigmoid remain inside the ONNX graph; decode, thresholding and NMS remain outside.

- [ ] 从固定上游源码构建官方 YOLOX-Tiny experiment。
- [ ] 使用 CPU PyTorch 加载已核验 COCO checkpoint。
- [ ] 用固定种子生成输入，保存到忽略目录。
- [ ] 运行官方 PyTorch 前向并保存原始输出及元数据。
- [ ] 记录 PyTorch 版本、模型配置、输入/输出形状到 `golden-manifest.json`。
- [ ] 以固定 opset 和显式输入输出名导出 ONNX。
- [ ] 执行 `onnx.checker.check_model`。
- [ ] 统计完整图算子并写入 `onnx-manifest.json`。
- [ ] 对照已安装 ORT Web WASM/WebGPU 算子表审计。
- [ ] 若图含 `NonMaxSuppression`、`TopK` 或其他后处理算子，判失败。
- [ ] 若存在 WASM 必需算子缺失，判失败；WebGPU 缺口只记录，不提前声明支持。

### Task 3: 验证 PyTorch/ORT 对齐并生成 JS 夹具

**Files:**
- Create: `.tmp/yolox-reference/parity_ort.py`
- Create: `.tmp/yolox-reference/make_fixture.py`
- Create: `reports/2026-09-24-yolox-assets/parity.json`
- Create: `reports/2026-09-24-yolox-assets/fixture-manifest.json`
- Create: `tests/fixtures/yolox-forward.json`

**Interfaces:**
- Python ORT CPU 使用与 PyTorch golden 完全相同的输入字节。
- 最大绝对误差固定为 `1e-4`。
- 夹具以小端 `float32` Base64 保存输出，并保存独立 Python 解码/NMS 后的 person detections。

- [ ] 以 Python ORT CPU 运行导出的 ONNX。
- [ ] 与 PyTorch golden 逐元素比较并记录各输出最大绝对误差。
- [ ] 任一输出超过 `1e-4` 时停止。
- [ ] Python 独立实现 strides `8/16/32`、行主序网格解码。
- [ ] 仅保留 COCO person index `0`，执行默认阈值与确定性单类 NMS。
- [ ] 将原始输出和期望检测写入 `tests/fixtures/yolox-forward.json`。
- [ ] 校验 Base64 长度、元素数、文件大小与确定性 SHA-256。

### Task 4: 注册已验证模型身份

**Files:**
- Create: `models/yolox-tiny/0.1.0/model.json`
- Create: `models/yolox-tiny/0.1.0/sources.json`

**Interfaces:**
- `model.json` 的 opset、输入输出形状、字节数、SHA-256 只取自已通过的资产报告。
- preprocessing identity 为 `yolox-letterbox-416-imagenet-meanstd-f32-v1`。
- `sources.json` 保留官方上游来源，未发布分发来源为空并标记 `pending-authorization`。

- [ ] 校验模型 hash/bytes 与 `onnx-manifest.json` 一致。
- [ ] 校验输出形状为 `[1, 3549, 85]`。
- [ ] 记录 COCO 通用权重、非 MOT17 专用权重。
- [ ] 记录 person-only 映射与无跟踪状态契约。
- [ ] 不写可用的 ModelScope/Hugging Face URL。
- [ ] 添加本地身份一致性检查。

### Task 5: 实现 JS 预处理、解码与 NMS 纯函数

**Files:**
- Create: `src/yolox/types.ts`
- Create: `src/yolox/preprocess.ts`
- Create: `src/yolox/decode.ts`
- Create: `src/yolox/nms.ts`
- Create: `tests/yolox-preprocess.test.ts`
- Create: `tests/yolox-decode.test.ts`
- Create: `tests/yolox-nms.test.ts`

**Interfaces:**

```ts
export interface YoloxInput {
  image: RgbaImage
}

export interface PreprocessedYoloxInput {
  tensor: Float32Array
  scale: number
  resizedWidth: number
  resizedHeight: number
}

export function preprocessYolox(input: YoloxInput): PreprocessedYoloxInput

export function decodeYolox(
  output: Float32Array,
  metadata: PreprocessedYoloxInput,
  options: { scoreThreshold: number; nmsThreshold: number; maxDetections: number }
): { detections: Detection[]; droppedDetections: number }
```

- [ ] 先写 RGBA 校验、透明像素合成、非方图和精确 CHW 归一化失败测试。
- [ ] 先写 OpenCV 半像素双线性 resize 失败测试。
- [ ] 先写 letterbox scale、左上放置和逆坐标映射失败测试。
- [ ] 先写三层 stride 已知合成 anchor 解码失败测试。
- [ ] 先写 obj/cls 不得二次 sigmoid 的失败测试。
- [ ] 先写 person-only 与 `classId: 1` 测试。
- [ ] 先写严格 `IoU > threshold`、分数排序和 anchor index 打平测试。
- [ ] 实现通过测试所需的最小纯函数。
- [ ] 最终框裁剪到原图边界。
- [ ] `droppedDetections` 只统计 NMS 后容量截断。
- [ ] 不使用 canvas 平滑或浏览器依赖插值。

### Task 6: 实现候选 detector 生命周期

**Files:**
- Create: `src/yolox/errors.ts`
- Create: `src/yolox/model.ts`
- Create: `src/yolox/ort.ts`
- Create: `src/yolox/detector.ts`
- Create: `src/yolox/index.ts`
- Create: `tests/yolox-lifecycle.test.ts`
- Create: `tests/yolox-sources.test.ts`

**Interfaces:**

```ts
export interface YoloxDetector {
  load(options?: {
    signal?: AbortSignal
    onProgress?: (progress: LoadProgress) => void
  }): Promise<YoloxLoadResult>

  detect(
    input: YoloxInput,
    options?: { signal?: AbortSignal }
  ): Promise<YoloxDetectorResult>

  dispose(): Promise<void>
}

export function createYoloxDetector(options: YoloxOptions): YoloxDetector
```

- [ ] 先写选项、后端和模型身份校验失败测试。
- [ ] 先写根模块创建期间不得导入 ORT 的测试。
- [ ] 先写 `BUSY`、`DISPOSED`、`NOT_LOADED` 和取消测试。
- [ ] 先写 load 幂等与 session 创建失败清理测试。
- [ ] 先写 generation 从 0 开始且只在成功 detect 后递增的测试。
- [ ] 先写输入失败、取消、推理、GPU 回读失败不推进 generation 的测试。
- [ ] 先写输入复制与返回 detection 所有权测试。
- [ ] 仅在 session load 内动态导入 `onnxruntime-web/all`。
- [ ] WASM 配置单线程、无 proxy、basic graph optimization。
- [ ] WebGPU 禁止 CPU fallback。
- [ ] GPU 输出回读后再后处理和释放资源。
- [ ] `dispose()` 标记后等待在途操作并释放全部 tensor/session。
- [ ] 候选入口不加入正式 package exports。

### Task 7: 构建并运行 Node/Chromium 候选验证

**Files:**
- Create: `scripts/build-yolox-candidate.mjs`
- Create: `tests/yolox-node.mjs`
- Create: `tests/yolox-browser.mjs`
- Create: `reports/2026-09-24-yolox-assets/runtime-evidence.json`
- Create: `reports/2026-09-24-yolox-assets/README.md`

**Interfaces:**
- 临时候选构建输出位于 `.tmp/yolox-module/`。
- Node 与 Chromium CPU/main WASM 消费相同夹具并产生相同 detection hash。
- 运行证据区分 cold load、warm detection、p50、p95。

- [ ] 将 `src/yolox/index.ts` 构建到临时候选 bundle，不修改 `package.json.exports`。
- [ ] 在 Node WASM CPU 上运行夹具。
- [ ] 在 Chromium main-thread WASM 上运行同一夹具。
- [ ] 比较序列化 detection 输出与 hash。
- [ ] 记录 requested/actual backend、execution mode 和 ORT 版本。
- [ ] 记录加载和逐帧各阶段耗时。
- [ ] 只有真实 Chromium 可用时才运行 WebGPU。
- [ ] WebGPU 失败或不可用时记录为 unsupported/unverified。
- [ ] 不推断移动端、worker、Safari、Firefox、NPU 或 WebNN。

### Task 8: 运行最终仓库检查与独立复审

**Files:**
- Modify only evidence files if required by actual command output.
- Do not modify `package.json`, `sdk-manifest.yaml`, portal standards, public Demo or root ByteTrack code.

- [ ] 运行 SDK typecheck。
- [ ] 运行完整 Vitest suite。
- [ ] 运行 SDK build。
- [ ] 运行 `check:package`。
- [ ] 确认 npm 包仍只暴露 `.`, `./reid`, `./motion`。
- [ ] 运行门户 `sdk:check` 前后检查。
- [ ] 保留原工作区既有 `reports/2026-09-23-centertrack-assets/` 不变。
- [ ] 核对无官方 YOLOX 源码或模型二进制进入 `src/`、`dist/` 或 npm 包。
- [ ] 核对从权重 hash 到 ONNX parity 和浏览器执行的证据链。
- [ ] 显式记录所有未验证后端或失败门槛。
- [ ] 不提交、推送、发布或创建 Release。
