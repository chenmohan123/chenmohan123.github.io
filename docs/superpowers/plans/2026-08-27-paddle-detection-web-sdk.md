# PaddleDetection Web SDK 实施计划

> 给智能体执行者：必须使用 superpowers:subagent-driven-development 或
> superpowers:executing-plans 执行本计划。所有步骤使用复选框跟踪。

目标：创建并发布 web-sdk-pp-detection，使用 ONNX Runtime Web 在浏览器本地
完成 PaddleDetection 轴对齐目标检测，并通过同一单帧 API 支持图片、摄像头
帧和视频帧。

架构：新建 F:\git\00_chenmohan\github\web-sdk-PP-Detection 作为单 SDK 仓库。
runtime 负责模型生命周期、单帧预处理/推理/后处理、Worker、缓存、取消和
资源释放；宿主页面负责摄像头权限、视频播放和队列长度为 1 的帧调度。默认
模型是 PP-PicoDet-L-320（COCO、LCNet），同一任务契约维护 FP32、FP16 和
验证后加入的 INT8 变体；Git LFS 是默认溯源，Hugging Face、ModelScope 和
Custom 是可选来源。

技术栈：TypeScript、pnpm、ONNX Runtime Web、Vite、React、Vitest、Playwright、
tsup、IndexedDB、Git LFS、Paddle2ONNX、Python、GitHub Actions、Apache-2.0。

规范：docs/superpowers/specs/2026-08-27-paddle-detection-web-sdk-design.md

## 全局约束

- 所有文档、注释、提交信息和用户可见 Demo 文案使用中文，并提供等价英文文档。
- runtime 不依赖 React、Vue 或其他 UI 框架；Vanilla DOM 是 H5/web-view 基线。
- 图片、摄像头帧和视频帧全部在浏览器本地处理；SDK 不申请摄像头权限、不上传
  用户媒体、不承诺微信原生小程序 JavaScript/WASM runtime。
- wasm 表示 CPU，webgpu 表示 GPU；显式后端或精度不可用时返回
  CAPABILITY_UNSUPPORTED，不能静默替换。
- 只有 backend 为 auto 且 allowFallback 为 true 时，才允许尝试清单中已验证
  的候选，并报告请求后端、实际后端和失败原因。
- Git LFS、Hugging Face、ModelScope 资产使用固定 revision、字节数和 SHA-256；
  LFS pointer 不是浏览器可下载的模型本体。
- FP32/FP16 是首发稳定变体；INT8 需通过量化误差、算子覆盖和真实浏览器验证
  后才能进入稳定清单；INT4/FP8 只能作为 labs。
- npm 包不包含 .onnx；模型二进制由 Git LFS/Release/CDN 按需下载并缓存。
- 每次 SDK 改动前后运行 pnpm sdk:check -- --repo
  F:\git\00_chenmohan\github\web-sdk-PP-Detection。
- 兼容性和性能结论必须记录浏览器、版本、操作系统、设备、后端、执行模式、
  runtime 版本、模型变体和测试日期。
- 不修改现有三个 SDK 的 runtime；Portal 只登记、分类、比较和链接 SDK。

## 文件结构

标准与门户：

- Modify: standards/v1/README.md
- Modify: standards/v1/sdk-contract.md
- Modify: standards/v1/sdk-manifest.schema.json
- Modify: standards/v1/templates/sdk-manifest.yaml
- Modify: tools/sdk-standard-check/src/manifest.mjs
- Create: tools/sdk-standard-check/fixtures/multi-source-sdk/sdk-manifest.yaml
- Modify: tools/sdk-standard-check/standard-files.test.ts
- Create: src/content/models/pp-detection.yaml
- Modify: src/content/models/registry.test.ts

新 SDK：

- Create: F:\git\00_chenmohan\github\web-sdk-PP-Detection\package.json
- Create: F:\git\00_chenmohan\github\web-sdk-PP-Detection\pnpm-workspace.yaml
- Create: F:\git\00_chenmohan\github\web-sdk-PP-Detection\tsconfig.base.json
- Create: F:\git\00_chenmohan\github\web-sdk-PP-Detection\LICENSE
- Create: F:\git\00_chenmohan\github\web-sdk-PP-Detection\THIRD_PARTY_NOTICES.md
- Create: F:\git\00_chenmohan\github\web-sdk-PP-Detection\sdk-manifest.yaml
- Create: F:\git\00_chenmohan\github\web-sdk-PP-Detection\.gitattributes
- Create: F:\git\00_chenmohan\github\web-sdk-PP-Detection\README.md
- Create: F:\git\00_chenmohan\github\web-sdk-PP-Detection\README.en.md
- Create: F:\git\00_chenmohan\github\web-sdk-PP-Detection\packages\sdk
- Create: F:\git\00_chenmohan\github\web-sdk-PP-Detection\tools\model-pipeline
- Create: F:\git\00_chenmohan\github\web-sdk-PP-Detection\models\pp-detection
- Create: F:\git\00_chenmohan\github\web-sdk-PP-Detection\apps\demo
- Create: F:\git\00_chenmohan\github\web-sdk-PP-Detection\examples
- Create: F:\git\00_chenmohan\github\web-sdk-PP-Detection\docs
- Create: F:\git\00_chenmohan\github\web-sdk-PP-Detection\.github\workflows

---

## 任务 1：扩展 v1 manifest 的变体和多来源契约

文件：

- Modify: standards/v1/sdk-manifest.schema.json
- Modify: standards/v1/README.md
- Modify: standards/v1/sdk-contract.md
- Modify: standards/v1/templates/sdk-manifest.yaml
- Modify: tools/sdk-standard-check/src/manifest.mjs
- Create: tools/sdk-standard-check/fixtures/multi-source-sdk/sdk-manifest.yaml
- Modify: tools/sdk-standard-check/standard-files.test.ts

接口：

- 旧 v1.0.0/v1.1.0 manifest 继续通过。
- 新 manifest 的 model 支持 defaultVariant、defaultSource 和 variants[]。
- 每个 variant 支持 id、precision、quantization、opset、bytes、
  parameterCount、backends、sources；每个 source 支持 kind、repository、
  revision、path、downloadUrl、bytes、sha256。

- [ ] 步骤 1：写失败测试

在 standard-files.test.ts 增加断言：旧 complete fixture 通过；multi-source
fixture 校验来源枚举、非空 revision、HTTP(S) downloadUrl、正整数 bytes、
64 位十六进制 SHA-256、变体后端枚举和 defaultVariant 引用。执行：

    pnpm vitest run tools/sdk-standard-check/standard-files.test.ts

预期：新 fixture 因 schema 和校验器未认识 variants 而失败。

- [ ] 步骤 2：扩展 schema 且保持向后兼容

在 sdk-manifest.schema.json 的 model.properties 增加 defaultVariant、
defaultSource、variants；新增 modelVariant 和 modelSource 定义。保留
model.assets 为必填，让旧检查器和已有 SDK 继续兼容；新 SDK 的 assets 保存
稳定默认来源摘要，variants 保存完整多来源数据。

- [ ] 步骤 3：同步规范和手写校验器

manifest.mjs 使用与 schema 相同的来源、后端、精度和哈希校验，并拒绝浮动
revision。README 和 sdk-contract 说明 Git LFS pointer 不能作为浏览器资产，
以及显式来源失败不自动换源、auto 才允许按清单尝试。

- [ ] 步骤 4：运行并提交

    pnpm vitest run tools/sdk-standard-check/standard-files.test.ts
    pnpm test -- sdk-standard-check
    git diff --check
    git add standards tools/sdk-standard-check
    git commit -m "扩展模型清单的变体与多来源契约"

预期：旧 fixture 和新 fixture 均通过，现有标准测试无回归。

## 任务 2：创建 SDK 骨架和仓库治理文件

文件：

- Create: F:\git\00_chenmohan\github\web-sdk-PP-Detection\package.json
- Create: F:\git\00_chenmohan\github\web-sdk-PP-Detection\pnpm-workspace.yaml
- Create: F:\git\00_chenmohan\github\web-sdk-PP-Detection\tsconfig.base.json
- Create: F:\git\00_chenmohan\github\web-sdk-PP-Detection\LICENSE
- Create: F:\git\00_chenmohan\github\web-sdk-PP-Detection\THIRD_PARTY_NOTICES.md
- Create: F:\git\00_chenmohan\github\web-sdk-PP-Detection\sdk-manifest.yaml
- Create: F:\git\00_chenmohan\github\web-sdk-PP-Detection\.gitattributes
- Create: F:\git\00_chenmohan\github\web-sdk-PP-Detection\README.md
- Create: F:\git\00_chenmohan\github\web-sdk-PP-Detection\README.en.md
- Create: F:\git\00_chenmohan\github\web-sdk-PP-Detection\packages\sdk\src\index.ts
- Create: F:\git\00_chenmohan\github\web-sdk-PP-Detection\packages\sdk\src\types.ts
- Create: F:\git\00_chenmohan\github\web-sdk-PP-Detection\packages\sdk\src\errors.ts
- Create: F:\git\00_chenmohan\github\web-sdk-PP-Detection\scripts\repository-contract.test.mjs

接口：

- npm 包名 web-sdk-pp-detection，版本 0.1.0，license Apache-2.0，
  files 只允许 dist，导出 ESM、types 和 inference.worker.js。
- 根 manifest 声明 pp-detection、React Demo、wasm/webgpu、main/worker、
  IndexedDB、标准 timings 和五类示例状态。

- [ ] 步骤 1：写仓库契约测试

断言 package 非 private、版本是 semver、README 双语文件存在、SDK index、
Demo index、manifest 的 defaultVariant/defaultSource 存在，且 package files
不包含 models/**/*.onnx。初次运行应因源码和 Demo 尚不存在而失败。

- [ ] 步骤 2：创建工作区和最小导出

使用 Node >=22、pnpm、TypeScript、tsup、Vitest、Playwright 和
onnxruntime-web 1.27.0。index.ts 导出 createPPDetection、类型、稳定错误码；
无 manifest 时工厂只抛 INVALID_MANIFEST，不实现假推理。

- [ ] 步骤 3：写许可证与 README

中文 README 先说明本地处理、输入/后端、三类模型源、微信原生小程序不支持、
INT4/FP8 限制，并链接英文 README、GitHub、npm 和 Demo。第三方声明分别记录
PaddleDetection、Paddle2ONNX、ONNX Runtime Web 和每个实际模型资产的许可。

- [ ] 步骤 4：安装、检查并提交

    Set-Location F:\git\00_chenmohan\github\web-sdk-PP-Detection
    pnpm install
    node --test scripts/repository-contract.test.mjs
    pnpm typecheck
    pnpm --dir F:\git\00_chenmohan\github\chenmohan123.github.io sdk:check -- --repo .
    git diff --check
    git add .
    git commit -m "创建 PaddleDetection Web SDK 仓库骨架"

预期：契约测试和类型检查通过，标准检查只报告尚未实现的 Demo、模型和 runtime。

## 任务 3：转换并固定 PicoDet FP32/FP16 模型

文件：

- Create: tools/model-pipeline/pyproject.toml
- Create: tools/model-pipeline/picodet/fetch_official.py
- Create: tools/model-pipeline/picodet/export_onnx.py
- Create: tools/model-pipeline/picodet/inspect_onnx.py
- Create: tools/model-pipeline/picodet/build_manifest.py
- Create: tools/model-pipeline/tests/test_manifest.py
- Create: tools/model-pipeline/tests/test_onnx_contract.py
- Create: models/pp-detection/1.0.0/manifest.json
- Create: models/pp-detection/1.0.0/source.yaml
- Create: models/pp-detection/1.0.0/labels/coco.txt
- Create: models/pp-detection/1.0.0/pipeline.json
- Create: models/pp-detection/1.0.0/picodet-l-320-fp32.onnx（Git LFS）
- Create: models/pp-detection/1.0.0/picodet-l-320-fp16.onnx（Git LFS）
- Modify: .gitattributes
- Create: scripts/model-contract.test.mjs

接口：

- 输入：官方 PaddleDetection release/2.9 PicoDet-L-320 COCO LCNet 权重和配置，
  来源 revision 必须由命令行传入。
- 输出：输入固定为 [1,3,320,320]、opset 11 的 FP32/FP16 ONNX，带真实 bytes、
  SHA-256、参数量、预处理、后处理、标签和来源数据。

- [ ] 步骤 1：写模型契约测试

model-contract.test.mjs 断言 manifest 包含输入/输出 tensor、COCO 标签、
fp32/fp16 变体、git-lfs/huggingface/modelscope source、正整数 bytes 和
64 位 SHA-256；断言 npm files 不包含 models/**/*.onnx。模型未生成时确认失败。

- [ ] 步骤 2：实现固定 revision 下载和导出

fetch_official.py 缺少 --revision 时退出非零，将官方权重、配置、许可证写入
不进入 npm 的工作目录。export_onnx.py 调用 PaddleDetection 导出工具和
Paddle2ONNX，明确 image_shape=[3,320,320]、batch=1、opset 11，并记录工具版本。

- [ ] 步骤 3：实现图检查和 FP16 派生

inspect_onnx.py 读取输入/输出名称、shape、dtype、opset 和 initializer 参数量，
验证输出可以被检测后处理消费。FP16 由图转换脚本生成，含不支持节点时列出
节点并失败，不能静默删除节点。

- [ ] 步骤 4：生成真实 manifest

build_manifest.py 从文件逐字节生成 bytes/SHA-256、参数量和图签名；每个变体
生成 precision、quantization、opset、backends 和 sources。Git LFS 溯源、固定
Hugging Face/ModelScope revision 和实际下载地址必须由脚本写入；未发布的平台
来源禁止写虚假 URL。

- [ ] 步骤 5：运行模型测试并提交

    python -m pytest tools/model-pipeline/tests -q
    python tools/model-pipeline/picodet/inspect_onnx.py --manifest models/pp-detection/1.0.0/manifest.json
    node --test scripts/model-contract.test.mjs
    git lfs track "models/**/*.onnx"
    git lfs ls-files
    git add .gitattributes models tools scripts/model-contract.test.mjs
    git commit -m "固定 PicoDet FP32 与 FP16 模型契约"

预期：所有元数据由文件生成且哈希一致；转换失败时保留日志并保持变体为 labs。

## 任务 4：验证 INT8 并实现能力、错误和选择计划

文件：

- Create: tools/model-pipeline/picodet/quantize_int8.py
- Create: tools/model-pipeline/tests/test_quantization.py
- Modify: models/pp-detection/1.0.0/manifest.json
- Create: packages/sdk/src/runtime/capabilities.ts
- Create: packages/sdk/src/runtime/select-plan.ts
- Modify: packages/sdk/src/types.ts
- Modify: packages/sdk/src/errors.ts
- Create: packages/sdk/tests/runtime-selector.test.ts
- Create: packages/sdk/tests/errors.test.ts

接口：

- Backend 为 wasm、webgpu、auto；ExecutionMode 为 main、worker。
- selectExecutionPlan(options, capabilities, manifest) 在严格选择时只返回
  一个候选，在 auto + allowFallback 时返回清单中已验证候选。
- RuntimeInfo、TimingBreakdown、ModelInfo、DetectionManifest、
  DetectionCapabilities 和稳定错误码在此任务定义，后续任务只使用这些名称。

- [ ] 步骤 1：写失败测试

覆盖 WebGPU 不可用、auto 回退顺序 webgpu -> wasm、显式 fp16 不替代 fp32、
Worker 不可用时拒绝 worker、无浏览器证据的 INT8 不能标为 stable。错误必须
含 code 和可序列化 details。

- [ ] 步骤 2：实现能力探测和选择器

只通过实际对象探测 navigator.gpu、Worker、OffscreenCanvas、WASM SIMD/threads；
不依据 User-Agent。选择器校验 manifest 的 backends、precision 和验证矩阵，
保留 requestedBackend、actualBackend、requestedPrecision、actualPrecision。

- [ ] 步骤 3：实现 INT8 实验脚本

quantize_int8.py 使用固定校准图片和 ONNX Runtime quantization API，记录实际
方案（static-qdq、qlinear 或其他）、校准集、误差阈值和算子列表。只有 Python
ORT 对齐、浏览器 WASM 实测、内存/耗时证据全部通过时才把 INT8 改为 stable，
否则保持 labs 并写限制。

- [ ] 步骤 4：运行测试并提交

    pnpm test -- runtime-selector errors
    pnpm typecheck
    python -m pytest tools/model-pipeline/tests/test_quantization.py -q
    git add packages tools models/pp-detection/1.0.0/manifest.json
    git commit -m "实现后端精度选择与 INT8 验证门槛"

## 任务 5：实现 ONNX Runtime Web Session、Worker、取消和释放

文件：

- Create: packages/sdk/src/runtime/ort-session.ts
- Create: packages/sdk/src/runtime/worker-bridge.ts
- Create: packages/sdk/src/runtime/inference.worker.ts
- Create: packages/sdk/src/runtime/protocol.ts
- Create: packages/sdk/tests/ort-session.test.ts
- Create: packages/sdk/tests/worker-bridge.test.ts

接口：

- createOrtSession(modelBytes, plan): Promise<OrtSessionHandle>
- Worker 请求类型为 load、run、dispose，响应类型为 progress、result、error。
- 输入、输出和模型 bytes 通过 Transferable 传递；Worker 不接收 DOM 对象。

- [ ] 步骤 1：写失败测试

mock onnxruntime-web，断言 wasm/webgpu provider、WASM 路径、线程配置、
Session 创建耗时、ArrayBuffer transfer、AbortSignal、Worker 错误传播和
exactly-once dispose。

- [ ] 步骤 2：实现 Session 工厂

ort-session.ts 配置 executionProviders、env.wasm.wasmPaths、线程和内存选项；
把 ORT 异常映射为 SESSION_CREATE_FAILED、OUT_OF_MEMORY、INFERENCE_FAILED 或
ABORTED，绝不改写 requested provider。

- [ ] 步骤 3：实现 Worker 协议

Worker 失败时拒绝所有 pending request；dispose 后再次请求返回 DISPOSED；
load/run 阶段向主线程发送标准 progress，包含 phase、status、loadedBytes 和
totalBytes（可缺省）。

- [ ] 步骤 4：运行构建并提交

    pnpm test -- ort-session worker-bridge
    pnpm typecheck
    pnpm build
    git add packages/sdk
    git commit -m "实现 ONNX Runtime Web Worker 会话"

## 任务 6：实现模型来源、完整性校验和缓存

文件：

- Create: packages/sdk/src/model/manifest.ts
- Create: packages/sdk/src/model/source-resolver.ts
- Create: packages/sdk/src/model/download.ts
- Create: packages/sdk/src/model/integrity.ts
- Create: packages/sdk/src/model/model-manager.ts
- Create: packages/sdk/src/cache/indexeddb-cache.ts
- Create: packages/sdk/src/cache/memory-cache.ts
- Create: packages/sdk/src/cache/model-cache.ts
- Create: packages/sdk/tests/manifest.test.ts
- Create: packages/sdk/tests/model-manager.test.ts
- Create: packages/sdk/tests/cache.test.ts

接口：

- resolveModelAsset(selection, manifest): ResolvedModelAsset
- loadModelAsset(asset, options): Promise<ModelBytes>
- getCacheEstimate(): Promise<{ bytes: number; entries: number }>
- clearCurrentModelCache(): Promise<void>
- clearAllCache(): Promise<void>

- [ ] 步骤 1：写失败测试

断言缺 tensor、预处理、后处理、bytes、URL 或 SHA-256 的 manifest 被拒绝；
显式来源失败不换源；auto 按清单顺序尝试；版本、变体、revision 或 SHA 变化
产生不同缓存键；bytes/SHA 不匹配不写 IndexedDB；current 清理不影响其他变体，
global 清理清除 SDK 全部键。

- [ ] 步骤 2：实现清单和来源解析

解析 models/pp-detection/1.0.0/manifest.json，校验变体、来源、输入输出、
标签、预处理和 NMS。custom 只接受完整用户清单；显式来源返回
MODEL_SOURCE_UNAVAILABLE；auto 记录失败链并尝试下一源。

- [ ] 步骤 3：实现流式下载和完整性

使用 fetch 流式读取，报告 modelDownloadMs、可选 loaded/total bytes 和
integrityMs，存在 Content-Length 时校验长度，再校验 SHA-256。网络、CORS、
Range、Abort 映射到稳定错误；失败 bytes 不进持久缓存。

- [ ] 步骤 4：实现版本化缓存

IndexedDB object store 的 key 包含 SDK id、模型 id、版本、变体、来源 revision
和 SHA-256；memory cache 保存当前实例。暴露当前模型估算、当前清理、全局清理、
cache false 内存模式，关闭数据库和 dispose 释放句柄。

- [ ] 步骤 5：运行测试并提交

    pnpm test -- manifest model-manager cache
    pnpm typecheck
    git add packages/sdk
    git commit -m "实现模型来源校验与版本化缓存"

## 任务 7：实现图片输入、PicoDet 后处理和单帧 API

文件：

- Create: packages/sdk/src/input/decode-image.ts
- Create: packages/sdk/src/input/image-source.ts
- Create: packages/sdk/src/detection/preprocess.ts
- Create: packages/sdk/src/detection/decode-output.ts
- Create: packages/sdk/src/detection/nms.ts
- Create: packages/sdk/src/detection/detector.ts
- Modify: packages/sdk/src/index.ts
- Create: packages/sdk/tests/preprocess.test.ts
- Create: packages/sdk/tests/postprocess.test.ts
- Create: packages/sdk/tests/detector.test.ts

接口：

    type ImageSource =
      | Blob | File | ImageBitmap | HTMLImageElement
      | HTMLCanvasElement | OffscreenCanvas | ImageData | VideoFrame;

    interface PPDetection {
      readonly manifest: DetectionManifest;
      readonly capabilities: DetectionCapabilities;
      load(options?: { signal?: AbortSignal }): Promise<void>;
      detect(input: ImageSource, options?: DetectOptions): Promise<DetectionResult>;
      getCacheEstimate(): Promise<{ bytes: number; entries: number }>;
      clearCurrentModelCache(): Promise<void>;
      clearAllCache(): Promise<void>;
      dispose(): Promise<void>;
    }

- [ ] 步骤 1：写失败测试

覆盖 Blob/File/ImageBitmap/ImageData 解码、透明通道、RGB 排列、归一化、
letterbox 比例和 padding；覆盖空检测、阈值边界、NMS、越界框和原始像素坐标；
覆盖未加载、dispose、Abort 和非法输入错误。

- [ ] 步骤 2：实现输入归一化

decode-image.ts 将浏览器输入转为 Worker 可传输的 RGBA/ImageData，记录 decodeMs；
VideoFrame 只读取一次并明确帧所有权；跨域媒体无法读像素时返回 INVALID_INPUT
并说明 CORS/Canvas 限制。

- [ ] 步骤 3：实现 PicoDet 预处理和后处理

按 runtime manifest 的 320x320、RGB、归一化和 letterbox 生成 Float32 tensor；
按输出签名执行类别/分数/框解码、NMS 和原始像素坐标映射，保留稳定 index、
classId、label、score 和 box。

- [ ] 步骤 4：实现工厂和生命周期

createPPDetection 创建模型管理器、能力计划和 main/worker 执行器；load 完成
来源、下载/缓存、完整性和 Session；detect 串联 decode/preprocess/inference/
postprocess；结果含 model、runtime 和标准 timings；dispose 释放所有资源。

- [ ] 步骤 5：运行测试和提交

    pnpm test -- preprocess postprocess detector
    pnpm typecheck
    pnpm build
    git add packages/sdk
    git commit -m "实现 PicoDet 单帧检测 API"

## 任务 8：实现 Demo 层摄像头/视频调度和三场景工作台

文件：

- Create: apps/demo/package.json
- Create: apps/demo/index.html
- Create: apps/demo/src/main.tsx
- Create: apps/demo/src/App.tsx
- Create: apps/demo/src/media/frame-loop.ts
- Create: apps/demo/src/media/camera-source.ts
- Create: apps/demo/src/media/video-source.ts
- Create: apps/demo/src/components/Controls.tsx
- Create: apps/demo/src/components/CanvasWorkspace.tsx
- Create: apps/demo/src/components/RuntimeInfo.tsx
- Create: apps/demo/src/styles/tokens.css
- Create: apps/demo/tests/demo.spec.ts
- Create: apps/demo/tests/frame-loop.test.ts

接口：

- FrameLoop 接受 HTMLVideoElement 和 detect(VideoFrame) 回调，队列长度固定为 1，
  暴露 start、stop、pause 和 stats。
- Demo 使用一个 PPDetection 实例和同一个结果绘制器。

- [ ] 步骤 1：写失败测试

frame-loop.test.ts 断言推理未完成时只保留最新帧、旧帧计入 dropped、停止会
Abort 并关闭 VideoFrame、统计 input FPS/processed FPS/droppedFrames。Playwright
断言图片/摄像头/视频标签、CPU/GPU 控件、模型/runtime/timing、两个 cache
清理按钮和语言切换标记存在。

- [ ] 步骤 2：实现帧循环

优先 requestVideoFrameCallback，缺失时使用节流后的 requestAnimationFrame；
单个 pending detect，新帧覆盖旧帧；页面隐藏时暂停；停止时取消
AbortController、停止媒体轨道、释放帧。SDK 不调用 getUserMedia。

- [ ] 步骤 3：实现工作台

三个标签为图片、摄像头、视频。控制区提供变体、来源、精度、后端、执行模式、
阈值、最大 FPS、加载、运行、停止、重置和两个缓存清理按钮。画布叠加原始像素
框，信息区显示模型名、大小、参数、opset、许可证、请求/实际后端、执行模式、
冷热耗时、FPS、丢帧数、兼容性和限制。

- [ ] 步骤 4：实现视觉令牌和响应式

引用 standards/v1/ui-tokens.json 的颜色、间距、圆角、focus 和状态；中文为
初始语言，英文切换只改变文案；按钮有图标和可访问名称；390px 纵向排列且
无横向溢出；空输入不渲染破损图片。

- [ ] 步骤 5：运行 Demo 测试并提交

    pnpm --dir apps/demo test
    pnpm --dir apps/demo typecheck
    pnpm --dir apps/demo build
    pnpm exec playwright test apps/demo/tests/demo.spec.ts
    git add apps/demo
    git commit -m "实现图片摄像头视频检测 Demo"

## 任务 9：补齐示例和双语文档

文件：

- Create: examples/vanilla/index.html
- Create: examples/vanilla/src/main.ts
- Create: examples/vanilla/README.md
- Create: examples/react/src/App.tsx
- Create: examples/react/README.md
- Create: examples/vite/
- Create: examples/cdn/index.html
- Create: examples/cdn/README.md
- Create: examples/wechat-web-view/README.md
- Create: docs/zh-CN/quick-start.md
- Create: docs/zh-CN/api.md
- Create: docs/zh-CN/models.md
- Create: docs/zh-CN/compatibility.md
- Create: docs/zh-CN/performance.md
- Create: docs/zh-CN/troubleshooting.md
- Create: docs/zh-CN/privacy.md
- Create: docs/zh-CN/deployment.md
- Create: docs/en/ 下对应英文文件
- Create: scripts/check-doc-parity.test.mjs
- Create: examples/tests/examples.test.mjs

接口：

- 每个可运行示例使用当前 package version，提供安装/启动命令并调用
  createPPDetection().load().detect().dispose()。
- 微信示例只说明公众号 H5 和小程序 web-view，明确原生小程序 runtime 不支持。

- [ ] 步骤 1：写示例和文档对照测试

断言 Vanilla/React 包含启动说明和单帧 API；Vite/CDN/微信目录包含限制说明；
中英文文档标题集合一致；文档不把 webnn、NPU、INT4、FP8 或未验证浏览器写成
稳定支持。

- [ ] 步骤 2：实现 Vanilla、React、Vite 和 CDN

Vanilla 使用原生 file input、canvas 和显式后端；React 使用相同 SDK API，不
复制 Demo 推理实现；Vite 使用 npm ESM；CDN 使用 browser-global 入口。全部
示例展示请求/实际后端、来源、timings 和 dispose。

- [ ] 步骤 3：完成微信 web-view 说明

提供 HTTPS、业务域名、CORS、WebView 内核、摄像头权限和本地隐私要求；不提供
不可运行的原生小程序脚本。

- [ ] 步骤 4：完成双语指南并提交

中文指南先写，英文逐节对应。模型指南列出三类来源、revision、SHA-256、各精度；
性能指南区分冷热启动；故障排查覆盖 CORS、WebGPU、Worker、COOP/COEP、内存和
完整性。

    node --test scripts/check-doc-parity.test.mjs examples/tests/examples.test.mjs
    pnpm typecheck
    git add examples docs README.md README.en.md
    git commit -m "补齐示例与双语使用文档"

## 任务 10：添加 CI、Pages、Release 和 npm 包验证

文件：

- Create: .github/workflows/ci.yml
- Create: .github/workflows/pages.yml
- Create: .github/workflows/release.yml
- Create: CHANGELOG.md
- Create: scripts/verify-release.mjs
- Create: scripts/verify-package-assets.mjs
- Create: scripts/verify-release.test.mjs

接口：

- CI 在受保护默认分支合并前运行标准检查、模型契约、格式、文档、lint、
  typecheck、单元、浏览器、构建和 npm 内容检查。
- Release 只接受不可变 v* tag；npm tarball 不包含 .onnx。

- [ ] 步骤 1：写失败发布测试

测试 pnpm pack --dry-run 的文件清单包含 dist、types、Worker、manifest 和入口，
不包含 .onnx；CHANGELOG 列出模型来源、许可证、默认资产、后端和限制；workflow
包含 tag 触发、最小权限和 concurrency。

- [ ] 步骤 2：实现 CI

权限默认关闭，job 显式使用 contents: read；先安装 frozen lockfile，再执行
全部检查。模型测试检查 Git LFS pointer 和 SHA-256，不把模型上传为 CI artifact。

- [ ] 步骤 3：实现 Pages

使用版本库源码和可复现命令构建，部署 job 绑定 github-pages 环境，权限仅
contents: read、pages: write、id-token: write，使用官方 Pages actions、HTTPS
和 concurrency，环境 URL 来自部署结果。

- [ ] 步骤 4：实现 tag release

对 v* tag 重新运行 CI，构建 npm 包、生成说明、上传版本化 manifest 和模型
Release 资产、启用 npm provenance/trusted publishing。不得移动已有 tag。

- [ ] 步骤 5：运行并提交

    pnpm verify
    node scripts/verify-release.mjs
    node scripts/verify-package-assets.mjs
    pnpm --dir packages/sdk pack --dry-run
    git add .github CHANGELOG.md scripts
    git commit -m "添加 SDK CI Pages 与发布验证"

## 任务 11：创建公开 GitHub 项目和首次 npm/Release 发布

外部状态：

- Create: https://github.com/chenmohan123/web-sdk-PP-Detection
- Configure: public、Apache-2.0、About、Homepage、Demo URL 和 topics
- Publish: https://www.npmjs.com/package/web-sdk-pp-detection
- Release: immutable v0.1.0

- [ ] 步骤 1：列出外发内容并在操作时确认

列出公开文件、Git LFS 模型、三类来源 URL、SHA-256、许可证、Demo、npm 内容
和不包含的用户数据；确认无 token、cookie、个人媒体、调试日志和未核实许可。
创建仓库、改变可见性、推送或发布 npm 前必须取得操作时确认。

- [ ] 步骤 2：初始化远程仓库

本地提交完成后使用 GitHub CLI 创建 public 仓库，设置 About/Homepage/topics，
推送受保护默认分支。本计划不自动执行远程创建。

- [ ] 步骤 3：配置并读取远程治理

只读核对默认分支 Ruleset、v* tag Ruleset、Pages source、github-pages 环境、
HTTPS 和 concurrency。权限不足记为 unknown，不写成 pass。

- [ ] 步骤 4：发布 npm 和 Release

先运行 tarball 检查，再使用 provenance 发布 web-sdk-pp-detection@0.1.0；
创建不可变 v0.1.0 Release，附 runtime manifest、模型来源和校验摘要。模型大
文件留在 Git LFS/Release/CDN，npm 不含 .onnx。

- [ ] 步骤 5：记录远程证据

Create: reports/release/pp-detection-0.1.0.md。记录仓库、包、Demo、tag、部署
commit、Ruleset/Pages 观察时间、模型 revision、bytes、SHA-256、浏览器验证和
限制；不记录凭据。

## 任务 12：登记门户并完成全量验收

文件：

- Create: src/content/models/pp-detection.yaml
- Modify: src/content/models/registry.test.ts
- Create: reports/sdk-standard/pp-detection.json
- Create: reports/compatibility/pp-detection-2026-08-27.json
- Create: reports/performance/pp-detection-2026-08-27.json
- Create: reports/release/pp-detection-readiness.md

接口：

- 门户只记录已发布 SDK 的 repository、npm、Demo、任务、后端、输入输出、稳定
  资产、许可证和限制，不复制检测 runtime。

- [ ] 步骤 1：写门户 registry 失败测试

断言 task 为 detection、package/repository/demo URL 一致、runtime 至少有 wasm
和 webgpu、输入含 Blob/Canvas/ImageBitmap/VideoFrame、输出含 bounding boxes、
assets bytes/SHA-256 合法、limitations 含微信原生小程序和未验证精度限制。

- [ ] 步骤 2：添加真实门户记录

使用 SDK 发布后的版本和固定资产数据，不手写估算大小。FP32/FP16 作为稳定资产；
INT8 只有 manifest 与验证报告同时为 stable 时才登记 available，否则登记 labs。

- [ ] 步骤 3：运行 SDK 和门户检查

    Set-Location F:\git\00_chenmohan\github\chenmohan123.github.io
    pnpm sdk:check -- --repo F:\git\00_chenmohan\github\web-sdk-PP-Detection --format json --out reports\sdk-standard\pp-detection.json
    pnpm test
    pnpm build
    Set-Location F:\git\00_chenmohan\github\web-sdk-PP-Detection
    pnpm verify

预期：新 SDK 无本地 required 失败；GOV/DEPLOY/PAGES 在缺远程证据时为 skip/unknown；
现有 SDK 的既有 partial 项不被误报为本次回归。

- [ ] 步骤 4：执行日期化浏览器验证

至少验证 Chromium/WASM/Worker、真实 WebGPU/Worker、390px 响应式、PC、移动浏览器、
公众号 H5 和微信小程序 web-view。每个环境执行图片单帧和摄像头/视频停止取消；
记录冷热 timings、输入 FPS、处理 FPS 和 droppedFrames。WebGPU 或 INT8 未通过
时保持 unsupported/labs。

- [ ] 步骤 5：审查交付物并提交报告

检查 npm tarball、GitHub Release、模型 manifest、Demo 构建、双语文档、示例、
许可证和第三方声明；执行 git diff --check、git status --short，只提交报告：

    git add src/content/models reports
    git commit -m "登记 PaddleDetection SDK 并记录验收证据"

## 计划自审

- 标准扩展由任务 1 覆盖，并用旧/新 fixture 验证向后兼容。
- 仓库、许可证、npm 元数据和默认清单由任务 2 覆盖。
- PicoDet 转换、FP32/FP16、Git LFS、参数量、opset、SHA-256 由任务 3 覆盖。
- INT8、后端/精度严格选择和实验披露由任务 4 覆盖。
- ORT Web、Worker、取消、错误和 dispose 由任务 5 覆盖。
- 三类模型源、Custom、完整性和缓存清理由任务 6 覆盖。
- 图片输入、预处理、解码、NMS、坐标和 timings 由任务 7 覆盖。
- 摄像头/视频队列长度 1、丢帧、停止和 Demo 三场景由任务 8 覆盖。
- 五类示例和双语文档由任务 9 覆盖。
- CI、Pages、Release、npm 排除 ONNX 和远程证据由任务 10、11 覆盖。
- Portal 只登记链接，全量验收由任务 12 覆盖。
- 公共类型、错误码、缓存方法和来源枚举在任务 4、5、6、7、8 中保持一致。
- 计划不承诺 PaddleDetection 全部模型、WebNN/NPU、FP8/INT4 或微信原生
  小程序 runtime；旋转框、分割、姿态和跟踪留在后续独立 SDK。
