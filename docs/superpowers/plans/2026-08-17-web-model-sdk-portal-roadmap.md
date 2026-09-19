# Web Model SDK Portal Roadmap

**Date:** 2026-08-17  
**Status:** Accepted roadmap  
**Current release:** Portal MVP / `v0.1.0` candidate

This roadmap keeps the portal registry-first and preserves the boundary between
the portal and independent SDK repositories. It is ordered by dependency and
readiness, not by the number of models mentioned in the catalog.

## 当前优先级（2026-09-19 证据更新）

后续优先建设独立 SDK，门户负责登记、分类、比较及仓库、npm、Demo 跳转。Workflow / Playground 和 Detection → TinyPose 等组合执行暂缓；这一顺序延续最初的任务边界。

TinyPose 0.3.0、PP-Segmentation 0.1.0 与 PP-RotatedDetection 0.1.0 已正式发布。分割以 PP-YOLOE_seg_s 640 FP32 提供单帧图片、原图框与二值 ROI 掩码；旋转框以 PP-YOLOE-R-s 1024 FP32 提供 DOTA 15 类和原图四点框。两者均完成双源、npm、Release 和 HTTPS Demo 回读；旋转框固定发布证据见[独立 SDK 回执](https://github.com/chenmohan123/web-sdk-PP-RotatedDetection/tree/b54ae15ca124fd111cac6e683409fdbb88a14e13/reports/2026-09-18-release)。门户已登记第七个 SDK，并保留各自桌面验证边界。

旋转框首版已按可行性结论发布，当前不扩展切片、媒体、手机或 NPU 承诺。独立 `web-sdk-pp-tracking@0.1.0` 已完成 npm、GitHub Release、HTTPS Demo 和远程治理核验：采用纯算法标准 1.2.0、ByteTrack 高低分思想的数学独立实现、Apache-2.0、实例状态与 CPU/main API，双语 Demo 及 Vanilla/React 示例保持原边界。第一批多算法工作已完成仅本地的 `0.2.0-alpha.0` 候选、两策略 Demo 及同输入评测；线上 npm、HTTPS Demo 和门户第八条仍是 0.1.0，不将候选或未来五种路线登记为已实现。[前期参考评估](../../../reports/tracking/2026-09-18-feasibility/README.md)中的许可疑点保留为历史，本产品不复制或分发旧参考代码；[原本地验收和七 SDK 标准回归](../../../reports/tracking/2026-09-19-foundation/README.md)也不改写。固定 MOT17 七段 FRCNN 训练序列 5316 帧中，候选 ByteTrack 七份 MOT 与历史默认逐字节一致，IDF1/IDSW/MOTA/FP/FN 为 48.2922%/1101/44.4010%/4169/57166；OC-SORT 为 48.4107%/881/39.5434%/6751/60259。OC-SORT 减少 IDSW 且 IDF1 略高，但 MOTA 低 4.8577 个百分点、FP/FN 更高，Node 跟踪累计耗时也高 8.19%，因此继续以 ByteTrack 为默认，OC-SORT 保留为可选本地候选。两算法均重复确定性并各自在 Chromium 153 完整对齐 600 帧 Node 输出；这不是测试集、官方复现、视频端到端或跨设备结论。门户第八个算法条目、CPU 分类和无权重详情已上线，生产目录、筛选、详情和独立链接通过 1440px 与 390px 桌面 Chromium 验收，见[固定交付证据](../../../reports/tracking/2026-09-19-release/README.md)。手机与跨设备兼容仍未声明。分割精度变体与媒体扩展保留后续，Workflow 继续暂缓。

## Current Baseline

Completed:

- Public Astro portal at `https://chenmohan123.github.io/`.
- GitHub Pages deployment with CI, static build, unit tests, and Playwright
  checks.
- Validated YAML registry with model, brand, task, status, backend, asset, and
  verification metadata.
- First catalog record for `web-sdk-PP-DocLayoutV3`.
- Model detail page linking to the independent SDK repository, npm package, and
  standalone Demo.
- Accepted documentation defining portal versus SDK ownership.

The portal does not duplicate the PP-DocLayoutV3 runtime or its standalone Demo.

## Phase 1: Make SDK Onboarding Repeatable

**Goal:** Add more real SDKs without special-case portal code.

Deliverables:

- `CONTRIBUTING.md` with the SDK onboarding checklist.
- A copyable metadata template for new `web-sdk-*` repositories.
- Required fields for repository, npm package, standalone Demo, license, model
  assets, version, checksum, backend status, and verified environments.
- A documented release and deprecation policy.
- A second real SDK only after its independent repository and Demo are usable.

Exit criteria:

- A new SDK can be represented by one metadata record.
- No portal page requires model-specific inference code.
- Missing Demo or unverifiable backend claims are represented honestly.

## Phase 2: Strengthen Registry CI

**Goal:** Prevent incomplete or misleading catalog records from reaching `main`.

Deliverables:

- Duplicate ID and package detection.
- Enum and schema validation for lifecycle and backend states.
- Repository, npm, Demo, and asset URL checks.
- Versioned URL and checksum validation rules.
- A clear distinction between `stable`, `fallback`, and `experimental`.
- CI output that identifies the exact model record and field that failed.

Exit criteria:

- Pull requests fail before publishing invalid metadata.
- Every compatibility claim includes a browser, OS, device, and test date.
- Model weights are never treated as portal source files.

## Phase 3: Release and Maintenance Baseline

**Goal:** Make the portal predictable to maintain.

Deliverables:

- Tag the first portal release as `v0.1.0`.
- Pin the supported Node.js and pnpm versions in documentation and CI.
- Review the current Dependabot findings before upgrading major framework versions.
- Add a release checklist covering build, links, Pages deployment, and rollback.
- Define ownership for metadata review and dependency updates.

Exit criteria:

- A release can be reproduced from the lockfile.
- A failed Pages deployment does not silently publish an incomplete site.
- Security updates are evaluated separately from feature work.

## Phase 4: Labs Capability Evidence

**Goal:** Collect runtime evidence without turning experimental features into
MVP compatibility promises.

Priority order:

1. WebGPU capability details: adapter, `shader-f16`, buffer limits, device loss,
   and recovery.
2. WASM SIMD and single-thread fallback on GitHub Pages.
3. WebNN experiments using lightweight CNNs such as
   `PP-LCNet_x1_0_doc_ori`.
4. Comparisons of load time, warm/cold latency, memory, precision, operator
   coverage, browser, OS, device, and driver.
5. Cloudflare Pages or another headers-configurable host for
   cross-origin-isolated WASM experiments.

Labs results are dated evidence records. They do not change a backend to
`stable` without verified device coverage and a documented support policy.

## Phase 5: Shared SDK Runtime Capabilities

**Goal:** Standardize capabilities that belong in SDK repositories and can later
be composed safely.

Work items:

- Worker execution and cancellation protocol.
- `ImageBitmap` and transferable input handling.
- Cache Storage, IndexedDB, and optional OPFS layers.
- Quota estimation, persistence requests, cleanup, checksum validation,
  interrupted download resume, Range requests, CORS, and CORP checks.
- Streaming interfaces reserved for ASR, TTS, and video models using
  `AudioData`, `AudioWorklet`, `VideoFrame`, and WebCodecs.

This phase improves independent SDKs first. It does not create a portal-owned
single-model Demo.

## Phase 6: Workflow / Playground

**Goal:** Compose multiple independent SDKs only when composition is justified.

Entry gates:

- At least two independent SDKs expose compatible public lifecycle and data
  contracts.
- A real user workflow requires connecting them.
- Node ownership, cancellation, backpressure, error propagation, and disposal
  are documented.
- Efficient values such as `Tensor`, `ImageBitmap`, `VideoFrame`, or `AudioData`
  can be passed without unnecessary CPU/GPU copies.

Only after these gates should the project build a Workflow runtime, node editor,
or portal-owned Playground. PWA offline model packages and browser built-in AI
APIs remain separate Labs work and are not prerequisites for the MVP.

## Explicit Non-Goals Until Workflow Entry

- No portal-side reimplementation of any existing SDK Demo.
- No visual node editor.
- No generic inference service or server-side model execution.
- No universal browser compatibility promise based only on feature detection.
- No addition of roadmap-only models as `available` without a usable SDK and
  standalone verification path.

## Next Concrete Task

PP-Segmentation、PP-RotatedDetection 与 PP-Tracking 门户登记均已上线。PP-Tracking 0.1.0 的 npm、GitHub Release、HTTPS Demo、远程治理及门户第八条生产回读已完成；第一批 OC-SORT `0.2.0-alpha.0` 已完成本地候选、两算法 Demo、包验证及同输入评测。真实结果支持继续以 ByteTrack 为默认；OC-SORT 仅作为可选候选，后续发布与门户升级须独立决策，当前不修改生产 registry 或对外链接。[第一轮 ReID 可行性](../../../reports/tracking/2026-09-19-reid-feasibility/README.md)已归档来源、模型转换和浏览器成本；轻量探针在边界输入上未通过，不能登记为稳定模型。第二批已在同一 Tracking SDK 实现外部向量 DeepSORT 关联层、三算法 Demo 与包消费，已完成本地验收、最终独立复审通过，见[阶段回执](../../../reports/tracking/2026-09-19-deepsort/README.md)。下一步核验 PPLCNet ReID 的 checkpoint、权重依据、预处理与真实图片质量；可选模型接入须先演进混合能力标准，再完成模型分发验收。BoT-SORT、JDE、FairMOT、CenterTrack 继续作为更后阶段路线，不能登记为已实现。Workflow 仍须等待至少两个已发布 SDK 的兼容输入输出契约与真实用例。[生产交付证据](../../../reports/tracking/2026-09-19-release/README.md)覆盖 0.1.0 目录、CPU/跟踪筛选、详情与独立链接；390px 仅为桌面布局证据。上方各 Phase 保留为历史总体路线。
