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

旋转框首版已按可行性结论发布，当前不扩展切片、媒体、手机或 NPU 承诺。多目标跟踪已完成[固定参考可行性评估](../../../reports/tracking/2026-09-18-feasibility/README.md)：五配置60组合成实跑和多实例状态诊断，首发候选为 ByteTrack 算法机制。低分恢复有效，同时保留交叉掉头身份交换、跨类复用、全局 ID 和时间间隔边界；根 MIT/Apache 与基础来源 GPL 的追溯差异尚需处置。下一阶段先完成来源/许可、无权重算法标准扩展和独立 API/实现设计，再验证真实序列与桌面浏览器。本轮没有建立生产 SDK、发布 npm 或分发上游代码，不把合成结果当作 MOT 精度或浏览器性能。分割精度变体和媒体扩展留待后续，Workflow 继续暂缓。

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

PP-Segmentation 与 PP-RotatedDetection 门户登记均已上线。跟踪固定参考评估已完成，下一阶段以 ByteTrack 算法机制为候选，处理来源/许可与无权重标准，设计独立 API、实例状态和时间策略后再进入 TS/真实序列/桌面浏览器验证；当前无跟踪生产 SDK。上方各 Phase 为历史总体路线；Workflow 实施仍暂缓，不因新增目录项或跟踪评估而启动。
