# Web Model SDK Portal Roadmap

**Date:** 2026-08-17  
**Status:** Accepted roadmap  
**Current release:** Portal MVP / `v0.1.0` candidate

This roadmap keeps the portal registry-first and preserves the boundary between
the portal and independent SDK repositories. It is ordered by dependency and
readiness, not by the number of models mentioned in the catalog.

## 当前优先级（2026-09-18 用户确认）

后续优先建设和完善各种独立 SDK，门户继续负责登记、分类、比较及独立仓库、npm、Demo 的跳转。Workflow / Playground 整合流程暂缓，Detection → TinyPose 自动人体检测与姿态组合也不进入当前实施范围。

这调整的是实施顺序，沿用最初按任务契约拆分 SDK 的边界；不是要求把每个模型架构或精度变体拆成一个 npm 包。每项新能力先完成独立模型可行性、runtime、Demo、文档和发布验证，再登记门户。

用户确认后，2026-09-18 已从实例分割 FP32 候选评估推进到独立 `web-sdk-PP-Segmentation` 图片版的本地实现。首发候选为 **PP-YOLOE_seg_s 640 FP32**，框架无关 SDK、主线程/Worker、独立 Demo 和桌面 64 图四组合评估均已有结果。仍为未发布 alpha：AP 下降约 0.078 个百分点通过，但官方尺寸截断使 1/423 高置信度实例未满足严格掩码一致性门槛，保留失败记录，不登记门户稳定目录。见[本地 SDK 阶段记录](../../../reports/segmentation/2026-09-18-image-sdk/README.md)、[原始可行性报告](../../../reports/segmentation/2026-09-18-feasibility/README.md)及 [PaddleDetection 独立 SDK 路线](2026-09-13-pp-detection-multi-model-roadmap.md#当前推进决策2026-09-18)。

下文阶段保留原始路线和历史基线。Phase 6 是延期方向，满足技术入口条件不自动启动实施；恢复时再明确用户用例、优先级和独立设计。

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

**当前状态（2026-09-18）：暂缓。** 当前优先级为独立 SDK，尚未批准开始组合执行面；保留下列技术入口条件供后续重新规划。

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

独立实例分割 SDK 的本地图片版已经实现。下一项是明确官方尺寸截断与完整原图掩码的验收语义，再处理权重许可、双源固定分发和正式发布；当前不改变严格门槛，也不裁掉 SDK 保留的原图边缘。门户只随已发布 SDK 更新登记，Workflow 继续暂缓。原 Phase 1 的贡献文档、元数据模板和首轮校验器属于历史实施入口，不再作为当前下一任务。
