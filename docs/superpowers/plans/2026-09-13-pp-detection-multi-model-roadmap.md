# PP-Detection 多模型兼容路线实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 明确 PP-Detection 单 SDK 的模型边界，并完成下一阶段 2D 检测模型兼容性评估，选择一个有证据支持的候选进入后续移植。

**架构：** `web-sdk-pp-detection` 继续负责轴对齐 2D 单帧目标检测，一个 SDK 可以承载多个经过验证的模型变体。跟踪、关键点、实例分割、3D、旋转框和业务组合不复制到该 SDK，而是共享基础设施、分别建立任务 SDK 或 Portal Workflow。模型权重通过版本化 manifest 和 ModelScope/Hugging Face 来源按需下载，npm 包不内置 ONNX 二进制。

**技术栈：** ONNX Runtime Web、Paddle2ONNX、TypeScript、Python 评测脚本、Vitest、Playwright、WebGPU/WASM。

**依据：** `docs/superpowers/specs/2026-08-27-paddle-detection-web-sdk-design.md`；`standards/v1/README.md`；已发布 `web-sdk-pp-detection@0.4.0` 及其双语发布说明。

## 与最初规划的关系

- 不改变原规划的分层：PP-Detection 是单 SDK，门户只登记和比较，跨 SDK 组合只有在输入输出契约和真实用例都成立后才建立 Workflow。
- 不把 PaddleDetection 模型库全部承诺为浏览器兼容。官方模型列表是候选目录，只有完成转换、算子、数值、浏览器和发布证据的模型才进入稳定 manifest。
- 原规划中的轴对齐 2D 检测范围继续有效，PicoDet、PP-YOLOE 和小目标检测变体属于本 SDK 候选；PP-YOLOE-R/FCOSR、分割、关键点、跟踪和 3D 保持独立路线。
- 0.4.0 的小目标增强是推理策略实验，不等同于接入 PP-YOLOE-SOD 模型；候选模型必须单独评估，增强能力继续默认关闭。

## 全局约束

- 所有结论记录浏览器、操作系统、设备、运行时、后端、执行模式、模型变体和日期。
- 显式选择的来源、精度和后端失败时不得静默替换；只有 `auto` 策略允许按清单尝试。
- 稳定变体必须固定 revision、路径、字节数和 SHA-256，并通过真实模型验证；未通过者只能标为 labs 或 rejected。
- 模型权重不进入 npm 包；默认来源保持 ModelScope，同时保留 Hugging Face 镜像。
- SDK runtime 保持框架无关，React 只属于 Demo；门户不得复制 SDK 推理代码。
- 评估阶段不改变当前稳定模型、默认来源、小目标增强默认值或公开 API。
- 验证采用桌面优先：迭代先完成与改动相关的 Chromium 桌面环境主线程/Worker、WASM/WebGPU 和生命周期验证；移动端按发布范围和风险安排复核，不作为每轮迭代的重复门槛。
- 每个任务结束后保存报告并运行 `git diff --check`；只有候选通过完整门槛后才开始移植实现。

## 当前执行状态（2026-09-14）

当前进入 M/L/X 六个 FP16、W8A32 变体的独立模型发布。用户已在验证前确认识别门槛：相对同规格、同后端 FP32 的 AP 下降≤0.5 个百分点，score≥0.5、同类 IoU≥0.5 的一对一匹配保留≥95% FP32 检测。IoU≥0.99 只作坐标诊断，文件缩小独立计为收益。

- [x] 固定发布协议，保留上一批次的原始结果和严格坐标门槛结论。
- [x] 完成 M/L/X × 三精度 × WASM/WebGPU × 三轮，共 54 组浏览器质量验证及证据复算。
- [x] 完成六个新增变体 × WASM/WebGPU × main/Worker，共 24 组生命周期验证。
- [x] 发布 M/L/X 0.1.1 稳定清单、ModelScope/Hugging Face 固定权重与许可，并完整回读。
- [x] 更新独立 Demo 和门户，完成检查、PR、合并和正式 HTTPS Demo 验收。

质量 54/54、生命周期 24/24、双源权重 12/12、元数据与目录 20/20、正式 Demo 12/12 均通过；完整 Demo 回归 82/82，门户单测 50/50、浏览器检查 5/5。SDK PR #67、门户 PR #28 已合并上线，SDK PR #69 修正部署归因及文档数量。正式 Demo 接受验证的 SDK 提交为 `26333e2c77adf424b75a056e387f91f13c2d65d9`，Pages 运行 `34840438741`；[固定发布记录](https://github.com/chenmohan123/web-sdk-PP-Detection/blob/f6d79e4b51125c491eecd48bf7efd745ff5d3c9f/reports/distribution/2026-09-14-ppyoloe-mlx-precision/README.md)包含更正后的证据。

本批次已完成，五款模型各提供 FP32、FP16、W8A32，共 15 个稳定变体；默认仍为 PicoDet、FP32、ModelScope，npm 保持 0.4.0。原 2D 输出契约和单 SDK 多模型边界继续适用。后续回到既有 2D 候选矩阵，优先评估更轻量且有明确场景收益的模型；SOD、旋转框、分割、关键点、跟踪和 3D 不因本批次而扩大稳定兼容声明。

### S/M/L/X FP32 发布批次（2026-09-14）

- S/M/L/X 四规格 FP32 已通过模型与 Demo 独立发布流程，SDK PR [#65](https://github.com/chenmohan123/web-sdk-PP-Detection/pull/65) 已合并并完成 Pages 部署，提交为 `e87b6635c6699b2fae1a286ca497c422db4939f2`。M/L/X 新增 0.1.0 稳定清单，S 保留 0.1.1 的 FP32/FP16/W8A32；npm 仍为已发布的 0.4.0。
- 五款模型均默认 ModelScope，仅提供 ModelScope 与 Hugging Face；M/L/X 六份远程权重完整回读校验通过。四规格沿用同一上游 Apache-2.0 发布口径，保留许可和转换归因，不存在本轮发现的按规格差异。
- S/M/L/X × WASM/WebGPU × 主线程/Worker 的 16 组真实模型生命周期通过，新增规格只声明记录中的桌面环境。M/X 浏览器质量覆盖 64 图；L 复用同一模型摘要的 WebGPU 64 图、WASM 8 图证据，不混用子集排名。
- [固定发布证据](https://github.com/chenmohan123/web-sdk-PP-Detection/blob/e87b6635c6699b2fae1a286ca497c422db4939f2/reports/distribution/2026-09-14-ppyoloe-smlx/README.md)包含数值、生命周期、双源摘要与许可。门户登记五款模型九个稳定变体，保持同一 Detection SDK 和原有 2D 输出契约；这与最初规划一致。
- L 的 FP16/W8A32 和 SOD 保留原 labs 结论，未因 FP32 发布而提升状态。FP32 发布完成后，按用户确认进入 M/L/X 三精度对比，范围见下节。

### M/L/X 精度对比批次（2026-09-14）

- [x] 固定 M/L/X 已发布 FP32 摘要，分别转换 FP16、W8A32，记录字节数、转换版本、算子精度边界和产物摘要。FP16 文件约缩小 50%，W8A32 约缩小 75%，体积收益单独计入判断。
- [x] 在同一固定 64 图上完成九组 Python 和十八组浏览器 WASM/WebGPU 运行，逐组对照相同规格、相同后端的 FP32。
- [x] 汇总 AP、IoU≥0.99 严格框一致性、IoU≥0.5 常规识别保留率及耗时；核验压缩证据、模型、图片、清单和运行环境身份。
- [x] 六变体 AP 最大下降为 0.348 个百分点，FP16 常规识别保留率为 99.21%–100%，W8A32 为 97.43%–99.63%；均未达到本轮严格坐标门槛，保留 labs 报告及复查条件，未新增稳定精度或升级 npm。

本批次沿用 L 既有评估的候选门槛：AP 下降不超过 0.5 个百分点，score≥0.5、同类 IoU≥0.99 的一对一匹配保留至少 95% FP32 框。历史 S/PicoDet 稳定精度发布的匹配门槛为 IoU≥0.5，两者不同；本轮同时报告这两种口径，严格坐标未达标不能直接表述为识别失效。每组合一次完整运行只用于初筛和本次耗时观察，不替代稳定发布前的重复验证。

这次初筛后的发布口径已由用户确认，执行范围见上方当前批次。以保持目标识别为目的时，六变体均通过历史 S/PicoDet 的单轮质量口径；要求坐标接近 FP32 的应用继续使用 FP32。三轮复现、Worker 生命周期、ModelScope/Hugging Face 固定分发回读与 Demo 验证仍是正式发布步骤。体积收益独立计入发布判断，不额外要求推理必须加速。初筛报告位于 SDK 的 `reports/evaluation/2026-09-14-ppyoloe-mlx-precision/README.md`，原始结论保留为历史记录。

### 前一批次记录（2026-09-13）

- 任务 1 已完成：兼容矩阵覆盖 PicoDet、PP-YOLOE、PP-YOLO、FCOS、SSD、RTMDet、YOLO 家族和 PP-YOLOE-SOD，并将旋转框、分割、关键点、跟踪、3D 与业务组合列为独立路线。
- 任务 2 已完成当前批次：PP-YOLOE+ SOD 640 与普通 PP-YOLOE+ L 640 均有固定转换和 Python 参考证据；L 的 FP16/W8A32 已完成转换，但逐框结果未达到稳定门槛。
- 任务 3 已完成当前批次：SOD 与 L 精度变体已在桌面 Chromium 的 WASM/WebGPU 相关组合中验证；本轮不重复移动端测试。
- 任务 4 已完成当前批次：SOD 和 L 的精度变体均保留为 labs/未发布状态，没有改动稳定 manifest、默认 ModelScope 来源或门户目录。PR #60 已合并到 SDK `main`。
- 下一阶段入口：优先筛选体积更小且输出契约接近现有 Detection 的 2D 候选，或针对 FP16/W8A32 的量化误差做可复现改进；只有达到逐框和分发门槛才进入独立移植计划。

---

### 任务 1：建立 2D 检测候选兼容矩阵

**文件：**

- 创建（SDK 仓库）：`reports/evaluation/2026-09-2x-2d-model-compatibility/README.md`
- 创建（SDK 仓库）：`reports/evaluation/2026-09-2x-2d-model-compatibility/candidates.json`
- 参考：`docs/superpowers/specs/2026-08-27-paddle-detection-web-sdk-design.md`
- 参考：PaddleDetection 固定 commit 的模型目录和 `deploy/EXPORT_ONNX_MODEL.md`

**产出契约：** `candidates.json` 的每个候选包含 `id`、`task`、`upstreamRevision`、`inputShape`、`outputContract`、`preprocess`、`postprocess`、`license`、`conversionPath`、`browserRisks`、`estimatedBytes`、`status` 和 `reason`。`status` 只能是 `candidate`、`blocked`、`deferred` 或 `selected`。

- [x] **步骤 1：** 从原规划的轴对齐 2D 表中登记 PP-YOLO、PP-YOLOE、PP-PicoDet、YOLO 系列、FCOS、SSD、RTMDet 和 PP-YOLOE-SOD；旋转框、分割、关键点、跟踪、3D 单独列为 deferred，不混入候选矩阵。
- [x] **步骤 2：** 为每个候选填写固定上游 revision、输入尺寸、输出张量、后处理类型、许可证和已知浏览器算子风险；缺失信息标记为 blocked 并写明需要的证据。
- [x] **步骤 3：** 依据模型体积、输入输出是否接近现有 `Detection` 契约、ONNX 导出可重复性、WebGPU/WASM 算子覆盖和真实使用场景排序。
- [x] **步骤 4：** 运行 JSON 结构校验、`git diff --check`，在 README 中明确“候选目录不代表兼容承诺”。
- [x] **步骤 5：** 提交矩阵和评估协议，提交信息使用中文：`建立 PP-Detection 2D 模型兼容矩阵`。

### 任务 2：筛选一个首选候选并完成转换可行性证明

**文件：**

- 修改（SDK 仓库）：`reports/evaluation/2026-09-2x-2d-model-compatibility/candidates.json`
- 创建（SDK 仓库）：`reports/evaluation/2026-09-2x-2d-model-compatibility/<candidate>-conversion.json`
- 使用（SDK 仓库）：现有 `tools/model-pipeline/` 转换和检查脚本

**产出契约：** 转换报告记录精确命令、Paddle/Paddle2ONNX 版本、输入输出签名、opset、原始权重摘要、ONNX 字节数、ONNX Runtime Python 结果摘要和失败日志；不得用手工改图替代可复现命令。

- [x] **步骤 1：** 选择排序第一且许可证允许外部分发的候选；若 PP-YOLOE-SOD 的输入输出或体积风险高于普通 2D 候选，保留其评估记录并选择风险更低者。
- [x] **步骤 2：** 在固定环境中执行官方导出和 Paddle2ONNX 转换，记录 commit、命令和所有参数；转换失败时把候选标为 blocked，不改 runtime 迁就失败图。
- [x] **步骤 3：** 用 Python ONNX Runtime 对固定图片集生成参考输出，检查张量形状、有限值、类别映射、框坐标和空检测结果。
- [x] **步骤 4：** 计算 ONNX 文件字节数、SHA-256、参数量和 opset，检查许可证和 ModelScope/Hugging Face 分发条件。
- [x] **步骤 5：** 运行转换报告的自动校验；只有报告完整且结果满足现有轴对齐框契约，才把候选状态改为 `selected`。

### 任务 3：验证浏览器后端和现有 Detection 契约

**文件：**

- 创建（SDK 仓库）：`reports/evaluation/2026-09-2x-2d-model-compatibility/<candidate>-browser.json`
- 创建（SDK 仓库）：`packages/sdk/tests/fixtures/<candidate>-manifest.json`（仅在候选进入真实浏览器验证后）
- 修改（SDK 仓库）：`packages/sdk/tests/detector.test.ts`（仅增加候选特有契约测试）
- 修改（SDK 仓库）：`tests/browser/runtime.spec.ts`（仅增加真实浏览器 smoke）

**产出契约：** 浏览器报告按 `wasm/webgpu × main/worker` 记录加载、推理、取消、释放、输出坐标和实际后端；不以 feature detection 代替真实推理。

- [x] **步骤 1：** 先在 WASM/main 验证预处理、输出解码、NMS、阈值和坐标；固定输入与 Python 参考结果逐框比较。
- [x] **步骤 2：** 在可用的 WebGPU/main 和 WASM/Worker、WebGPU/Worker 中复用同一 manifest，验证 Worker 不改变结果且释放后返回稳定错误。
- [x] **步骤 3：** 验证显式来源、精度和后端失败路径；确认不会自动切换到其他来源、精度或后端。
- [x] **步骤 4：** 先在 Chromium 桌面环境记录实际 ORT 版本、适配器、WASM/WebGPU 后端和 main/Worker 执行结果；候选准备发布、涉及移动端专项问题或重大 runtime 变化时，按影响范围安排移动设备人工 smoke，缺少设备证据时明确保持移动端未验证。
- [x] **步骤 5：** 运行 SDK 单测、浏览器测试、`pnpm sdk:check -- --repo <path>` 和文档/manifest 校验；失败则回到候选状态，不进入稳定清单。

### 任务 4：形成接入决策，不提前扩大 SDK 范围

**文件：**

- 修改（SDK 仓库）：`reports/evaluation/2026-09-2x-2d-model-compatibility/README.md`
- 修改（门户）：`src/content/models/pp-detection.yaml`（仅当候选正式发布）
- 修改（门户测试）：`src/content/models/registry.test.ts`（仅当版本登记变化）

- [x] **步骤 1：** 用固定门槛判断候选：转换可复现、许可证可分发、Python/浏览器结果对齐、WASM 至少通过、WebGPU 能力边界清楚、体积和耗时有记录。
- [x] **步骤 2：** S/M/L/X FP32 的独立发布已在 PR #65 完成：新增 M/L/X manifest、双源与下载校验、生命周期验证、Demo 选择项和双语文档；没有引入其他任务代码。
- [x] **步骤 3：** 若未通过，记录 blocked/deferred 原因和复查条件，保留现有 0.4.0 稳定模型不变。
- [x] **步骤 4：** 只有新模型完成发布流程后，门户才登记版本和链接；不能把 `candidate` 或 `labs` 写成 stable。
- [x] **步骤 5：** 提交决策报告，提交信息使用中文：`记录 PP-Detection 候选模型接入决策`。

## 验收标准

- 兼容矩阵覆盖原规划列出的轴对齐 2D 候选，并明确排除其他任务类型。
- 至少一个候选拥有可复现转换报告；若没有候选达标，报告也必须说明阻塞原因和下一次复查条件。
- 当前五款稳定模型、ModelScope 默认来源、小目标增强默认关闭和现有公共 API 在评估期间保持不变。
- 所有浏览器结论带环境和日期；没有把一次桌面或手机 smoke 扩大成通用兼容承诺。
- 开发迭代先确保桌面端通过相关验证；移动端复核按发布范围和风险安排，缺少手机证据不阻塞桌面评估与后续开发，也不能据此声明移动端兼容。
- 通过 SDK checker、相关单测、浏览器 smoke、文档检查和构建；门户只同步正式发布的模型。

## 计划自审

- 原规划的 2D / 旋转框 / 分割 / 关键点 / 跟踪 / 3D 分层在任务 1 和任务 4 中均有对应边界。
- “一个 SDK 支持多个模型”通过 manifest 和检测结果契约实现，不创建每个权重一个 SDK。
- “全部模型都兼容”被明确排除，候选状态和稳定发布门槛避免过度承诺。
- PP-YOLOE-SOD 与 0.4.0 小目标切片增强被分开记录，避免把策略实验误写成模型兼容。
- 计划没有要求修改共享标准或门户 runtime；只有新模型正式发布后才更新门户登记。
- 未使用 TBD、TODO 或未定义的接口名称；所有后续实现均以本计划的报告和 manifest 契约为输入。
