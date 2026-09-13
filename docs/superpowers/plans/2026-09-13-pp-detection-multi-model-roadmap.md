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

---

### 任务 1：建立 2D 检测候选兼容矩阵

**文件：**

- 创建（SDK 仓库）：`reports/evaluation/2026-09-2x-2d-model-compatibility/README.md`
- 创建（SDK 仓库）：`reports/evaluation/2026-09-2x-2d-model-compatibility/candidates.json`
- 参考：`docs/superpowers/specs/2026-08-27-paddle-detection-web-sdk-design.md`
- 参考：PaddleDetection 固定 commit 的模型目录和 `deploy/EXPORT_ONNX_MODEL.md`

**产出契约：** `candidates.json` 的每个候选包含 `id`、`task`、`upstreamRevision`、`inputShape`、`outputContract`、`preprocess`、`postprocess`、`license`、`conversionPath`、`browserRisks`、`estimatedBytes`、`status` 和 `reason`。`status` 只能是 `candidate`、`blocked`、`deferred` 或 `selected`。

- [ ] **步骤 1：** 从原规划的轴对齐 2D 表中登记 PP-YOLO、PP-YOLOE、PP-PicoDet、YOLO 系列、FCOS、SSD、RTMDet 和 PP-YOLOE-SOD；旋转框、分割、关键点、跟踪、3D 单独列为 deferred，不混入候选矩阵。
- [ ] **步骤 2：** 为每个候选填写固定上游 revision、输入尺寸、输出张量、后处理类型、许可证和已知浏览器算子风险；缺失信息标记为 blocked 并写明需要的证据。
- [ ] **步骤 3：** 依据模型体积、输入输出是否接近现有 `Detection` 契约、ONNX 导出可重复性、WebGPU/WASM 算子覆盖和真实使用场景排序。
- [ ] **步骤 4：** 运行 JSON 结构校验、`git diff --check`，在 README 中明确“候选目录不代表兼容承诺”。
- [ ] **步骤 5：** 提交矩阵和评估协议，提交信息使用中文：`建立 PP-Detection 2D 模型兼容矩阵`。

### 任务 2：筛选一个首选候选并完成转换可行性证明

**文件：**

- 修改（SDK 仓库）：`reports/evaluation/2026-09-2x-2d-model-compatibility/candidates.json`
- 创建（SDK 仓库）：`reports/evaluation/2026-09-2x-2d-model-compatibility/<candidate>-conversion.json`
- 使用（SDK 仓库）：现有 `tools/model-pipeline/` 转换和检查脚本

**产出契约：** 转换报告记录精确命令、Paddle/Paddle2ONNX 版本、输入输出签名、opset、原始权重摘要、ONNX 字节数、ONNX Runtime Python 结果摘要和失败日志；不得用手工改图替代可复现命令。

- [ ] **步骤 1：** 选择排序第一且许可证允许外部分发的候选；若 PP-YOLOE-SOD 的输入输出或体积风险高于普通 2D 候选，保留其评估记录并选择风险更低者。
- [ ] **步骤 2：** 在固定环境中执行官方导出和 Paddle2ONNX 转换，记录 commit、命令和所有参数；转换失败时把候选标为 blocked，不改 runtime 迁就失败图。
- [ ] **步骤 3：** 用 Python ONNX Runtime 对固定图片集生成参考输出，检查张量形状、有限值、类别映射、框坐标和空检测结果。
- [ ] **步骤 4：** 计算 ONNX 文件字节数、SHA-256、参数量和 opset，检查许可证和 ModelScope/Hugging Face 分发条件。
- [ ] **步骤 5：** 运行转换报告的自动校验；只有报告完整且结果满足现有轴对齐框契约，才把候选状态改为 `selected`。

### 任务 3：验证浏览器后端和现有 Detection 契约

**文件：**

- 创建（SDK 仓库）：`reports/evaluation/2026-09-2x-2d-model-compatibility/<candidate>-browser.json`
- 创建（SDK 仓库）：`packages/sdk/tests/fixtures/<candidate>-manifest.json`（仅在候选进入真实浏览器验证后）
- 修改（SDK 仓库）：`packages/sdk/tests/detector.test.ts`（仅增加候选特有契约测试）
- 修改（SDK 仓库）：`tests/browser/runtime.spec.ts`（仅增加真实浏览器 smoke）

**产出契约：** 浏览器报告按 `wasm/webgpu × main/worker` 记录加载、推理、取消、释放、输出坐标和实际后端；不以 feature detection 代替真实推理。

- [ ] **步骤 1：** 先在 WASM/main 验证预处理、输出解码、NMS、阈值和坐标；固定输入与 Python 参考结果逐框比较。
- [ ] **步骤 2：** 在可用的 WebGPU/main 和 WASM/Worker、WebGPU/Worker 中复用同一 manifest，验证 Worker 不改变结果且释放后返回稳定错误。
- [ ] **步骤 3：** 验证显式来源、精度和后端失败路径；确认不会自动切换到其他来源、精度或后端。
- [ ] **步骤 4：** 先在 Chromium 桌面环境记录实际 ORT 版本、适配器、WASM/WebGPU 后端和 main/Worker 执行结果；候选准备发布、涉及移动端专项问题或重大 runtime 变化时，按影响范围安排移动设备人工 smoke，缺少设备证据时明确保持移动端未验证。
- [ ] **步骤 5：** 运行 SDK 单测、浏览器测试、`pnpm sdk:check -- --repo <path>` 和文档/manifest 校验；失败则回到候选状态，不进入稳定清单。

### 任务 4：形成接入决策，不提前扩大 SDK 范围

**文件：**

- 修改（SDK 仓库）：`reports/evaluation/2026-09-2x-2d-model-compatibility/README.md`
- 修改（门户）：`src/content/models/pp-detection.yaml`（仅当候选正式发布）
- 修改（门户测试）：`src/content/models/registry.test.ts`（仅当版本登记变化）

- [ ] **步骤 1：** 用固定门槛判断候选：转换可复现、许可证可分发、Python/浏览器结果对齐、WASM 至少通过、WebGPU 能力边界清楚、体积和耗时有记录。
- [ ] **步骤 2：** 若全部通过，创建独立实现计划，新增模型 manifest、来源、下载校验、API 兼容测试、Demo 选择项和双语文档；该实现计划不得同时引入跟踪、分割或其他任务代码。
- [ ] **步骤 3：** 若未通过，记录 blocked/deferred 原因和复查条件，保留现有 0.4.0 稳定模型不变。
- [ ] **步骤 4：** 只有新模型完成发布流程后，门户才登记版本和链接；不能把 `candidate` 或 `labs` 写成 stable。
- [ ] **步骤 5：** 提交决策报告，提交信息使用中文：`记录 PP-Detection 候选模型接入决策`。

## 验收标准

- 兼容矩阵覆盖原规划列出的轴对齐 2D 候选，并明确排除其他任务类型。
- 至少一个候选拥有可复现转换报告；若没有候选达标，报告也必须说明阻塞原因和下一次复查条件。
- 当前两个稳定模型、ModelScope 默认来源、小目标增强默认关闭和现有公共 API 在评估期间保持不变。
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
