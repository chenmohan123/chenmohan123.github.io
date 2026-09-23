# Web Model SDK Portal Roadmap

**Date:** 2026-08-17  
**Status:** Accepted roadmap  
**Current release:** Portal MVP / `v0.1.0` candidate

This roadmap keeps the portal registry-first and preserves the boundary between
the portal and independent SDK repositories. It is ordered by dependency and
readiness, not by the number of models mentioned in the catalog.

## 当前优先级（2026-09-23 证据更新）

**2026-09-23 rc.2 已发布：** Tracking `0.2.0-rc.2` 已通过不可变标签、GitHub Release、npm Trusted Publishing 与独立 Demo 部署；npm `next` 指向 rc.2，`latest` 仍为 0.1.0。运动估计仍是独立 `motion` 子入口，640×360 三算法成功率约 41.7%/33.3%/41.7%，p95 约 15.5/71.8/191.1 ms，复杂运动和歧义纹理显式失败；当前质量和验证矩阵不足以自动接入 BoT-SORT，继续保留外部矩阵契约与 ByteTrack 默认。见[发布回执](../../../reports/2026-09-23-release-rc2/README.md)和[阶段回执](../../../reports/tracking/2026-09-23-motion-estimation/README.md)。不扩展视频/摄像头、手机、Worker、GPU/NPU、Safari/Firefox 或 Workflow。

**2026-09-22 rc.1 已发布：** Tracking `0.2.0-rc.1` 已接入 BoT-SORT 根工厂、严格运动类型、四算法 Demo 和版本化运动序列导入导出，见[集成回执](../../../reports/tracking/2026-09-22-botsort-integration/README.md)及[发布回执](../../../reports/tracking/2026-09-22-botsort-integration/release-receipt.md)。SDK PR #6 与门户 PR #50 已合并；不可变标签、GitHub Release、npm `next`、provenance 和线上 Demo 均已回读，`latest` 保持 0.1.0。下一阶段设计可选浏览器自动运动估计，先验证矩阵质量、失败策略和总成本；不扩展视频/摄像头、手机或 Workflow。

**2026-09-22 外部运动矩阵核心完成：** Tracking 同包本地 `0.2.0-rc.0+botsort-core.1` 已实现严格帧/时间/矩阵契约、显式失败和可选外观融合；208项测试、候选双格式/类型消费、完整05浏览器及原Demo回归通过，见[阶段回执](../../../reports/tracking/2026-09-22-botsort-core/README.md)。固定七段5316帧三配置各运行两次，轨迹逐字对齐前期探针，CMC/CMC+外观IDF1仍54.5850%/55.3487%，09仍退步。仅平移消融也退步，后续估计器须验证近静止策略，当前不调参或替换默认。下一阶段将候选接入公开根工厂、版本/manifest、四算法双语Demo和导入导出，再做发布验收；本轮无远程发布。自动图像估计、视频/摄像头和Workflow继续独立后置。以下“下一步”为历史，以本段为准。

**2026-09-21 BoT-SORT 可行性完成：** 固定七段 MOT17 FRCNN train 的 5316 帧/67639 检测，原 ByteTrack、加相机运动补偿（CMC）、再加门控外观融合的合计 IDF1 为 48.2922%/54.5850%/55.3487%，IDSW 为 1101/519/489，见[研究回执](../../../reports/tracking/2026-09-21-botsort-feasibility/README.md)。09 段退步；离线 Python 图像估计的逐段中位数约 34–48 ms，尚未在浏览器实现。完整 05 的 837 帧三配置浏览器 CPU 回放与 Node 一致，恒等补偿及历史基线一致。本轮仅本地研究，公开三算法 RC 与稳定版状态沿用下方发布回执。下一阶段先设计并实现**调用者提供原图帧间矩阵的同包 BoT-SORT 风格 CPU 核心**，严格定义帧/时间、失败/恒等、丢帧、seek/reset、尺寸和错误原子性；再评估可选浏览器估计子入口，调查退步序列。不是官方 BoT-SORT 完整复现或第四算法已上线。自动视频/摄像头编排与 Workflow 仍后置；以下早期“下一步”保留为历史，以本段为准。

**2026-09-21 RC 已发布：** Tracking `0.2.0-rc.0` 已经 PR #3、CI、不可变标签与 OIDC 发布到 npm `next`，`latest` 保留 `0.1.0`；公开包 SHA256/sha512、registry 签名和 provenance 已验证。HTTPS Demo 的三算法、ModelScope/WASM、Hugging Face/WebGPU、取消/复位/缓存及中英文窄屏流程通过。门户结构化条目继续描述稳定 0.1.0，在摘要与限制中提供 RC 预览说明，见[本轮回执](../../../reports/tracking/2026-09-21-02-release/README.md)。以下日期相同的候选与早期“下一步”均为历史记录，以本段为准。下一阶段优先做 BoT-SORT 的相机运动补偿及输入契约可行性，再决定同包实现；JDE/FairMOT/CenterTrack 继续分阶段评估，不承诺列表中的算法均能直接切换。视频/摄像头 Demo、手机和跨 SDK Workflow 仍待独立设计。

**2026-09-21发布候选验收：** Tracking已整理为本地`0.2.0-rc.0`，包/runtime/Demo版本统一；预发布使用npm `next`，正式版使用`latest`。176项单测、实际包消费、12组浏览器流程、ModelScope/WASM和Hugging Face/WebGPU生产UI通过，见[RC回执](../../../reports/tracking/2026-09-21-02-rc/README.md)。源码逐项核对证明运行逻辑相对已评测alpha仅版本标识变化，历史成绩保留原身份。ByteTrack默认、OC-SORT/DeepSORT可选、人体ReID实验状态不变。下一步是本版本发布及发布后回读；当前未执行远程写入，门户生产registry/npm/线上Demo仍0.1.0，视频/摄像头、手机及Workflow不在本阶段。

**2026-09-21真实序列评测完成：** Tracking在固定七段MOT17 FRCNN训练序列全部5316帧、67639检测上完成三算法同输入比较，浏览器与两次Node结果一致、零容量丢弃。ByteTrack/OC-SORT/DeepSORT+PPLCNet的IDF1分别48.2922%/48.4107%/45.4637%，完整IDSW/MOTA/FP/FN与实测成本见[最新回执](../../../reports/tracking/2026-09-21-mot-reid/README.md)。当前组合不支持替换ByteTrack默认；建议进入0.2本地发布候选收口，OC-SORT/DeepSORT显式可选，ReID保留人体场景实验能力。先确定候选版本、变更日志和发布预检，再取得发布授权；门户生产registry/npm/线上Demo仍0.1.0。视频/摄像头、跨设备及Workflow继续暂缓，后文早期进度保留为历史。

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

Tracking `0.2.0-rc.2` 已发布独立浏览器运动估计实验；当前成功率、复杂运动和歧义纹理证据不足以自动接入 BoT-SORT，也不提升稳定 `latest`。下一项是 **模型型跟踪算法可行性筛选**：先核对 JDE、FairMOT、CenterTrack 的具体权重身份、许可、输入输出契约、ONNX 转换和浏览器端总成本，再选择一个候选进入独立设计；未达到门槛前不加入公开算法选择器。继续保持独立 Tracking SDK、桌面优先、默认 ByteTrack、ReID/motion 实验状态与门户只登记的边界。

### 历史任务快照（由上方发布进度更新）

PP-Segmentation、PP-RotatedDetection 与 PP-Tracking 门户登记均已上线。PP-Tracking 0.1.0 的 npm、GitHub Release、HTTPS Demo、远程治理及门户第八条生产回读已完成；第一批 OC-SORT `0.2.0-alpha.0` 已完成本地候选、两算法 Demo、包验证及同输入评测。真实结果支持继续以 ByteTrack 为默认；OC-SORT 仅作为可选候选，后续发布与门户升级须独立决策，当前不修改生产 registry 或对外链接。[第一轮 ReID 可行性](../../../reports/tracking/2026-09-19-reid-feasibility/README.md)已归档来源、模型转换和浏览器成本；轻量探针在边界输入上未通过，不能登记为稳定模型。第二批已在同一 Tracking SDK 实现外部向量 DeepSORT 关联层、三算法 Demo 与包消费，已完成本地验收、最终独立复审通过，见[阶段回执](../../../reports/tracking/2026-09-19-deepsort/README.md)。下一步核验 PPLCNet ReID 的 checkpoint、权重依据、预处理与真实图片质量；可选模型接入须先演进混合能力标准，再完成模型分发验收。BoT-SORT、JDE、FairMOT、CenterTrack 继续作为更后阶段路线，不能登记为已实现。Workflow 仍须等待至少两个已发布 SDK 的兼容输入输出契约与真实用例。[生产交付证据](../../../reports/tracking/2026-09-19-release/README.md)覆盖 0.1.0 目录、CPU/跟踪筛选、详情与独立链接；390px 仅为桌面布局证据。上方各 Phase 保留为历史总体路线。
