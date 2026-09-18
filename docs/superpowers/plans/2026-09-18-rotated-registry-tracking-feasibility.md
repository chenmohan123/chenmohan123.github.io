# 旋转框登记与跟踪独立 SDK 可行性计划

**目标：** 登记已发布的 PP-RotatedDetection 0.1.0，并验证 ByteTrack/OC-SORT 作为独立跟踪 SDK 的可行性。

**设计依据：** 原始 `../specs/2026-08-27-paddle-detection-web-sdk-design.md` 的任务拆分；用户确认独立 SDK 优先、门户组合暂缓、桌面验证优先。

**范围：** 门户只登记与跳转。跟踪先做固定源码、许可、机制和接口评估，不建立生产 SDK、不发布 npm 测试版本，不将合成场景当成 MOT 基准。

## Task 1：登记旋转框 SDK

- 工作区：当前隔离门户 worktree；不要改原门户目录或其它 SDK。
- 阅读 `AGENTS.md`、`standards/v1/README.md`、门户契约、规则和 schema。
- 从 `F:/git/00_chenmohan/github/web-sdk-PP-RotatedDetection` 的 manifest、README、`reports/2026-09-18-release/` 读取已发布信息。版本 0.1.0、npm `web-sdk-pp-rotated-detection`、PP-YOLOE-R-s 1024 FP32、33,161,415 字节、SHA-256 `de2f4c94061bda4bfaa0773ed5bc3aabdc59cf5b2f72301d15ae500b8f971089`。固定回执提交 `b54ae15ca124fd111cac6e683409fdbb88a14e13`。
- 新增门户 `pp-rotated-detection.yaml`，登记第七个 SDK；新增 `rotated-detection` 分类、中文标签与筛选。资产使用 manifest 的固定 ModelScope URL。保留 DOTA 15 类、单张图片、桌面环境、无切片/媒体/手机/NPU 验证边界。
- 门户当前已有 Segmentation 0.1.0，保留原条目。更新两份总路线（2026-08-17 门户和 2026-09-13 Detection）为旋转 SDK 已发布、跟踪正在评估；Workflow 仍暂缓。最终跟踪结论由 Task 2 补齐。
- 在 `reports/rotated-detection/2026-09-18-portal-registry/` 保存登记说明、SDK checker 前后报告、必要线上元数据读取证据。运行现有 unit、Astro build、Playwright（使用 Detection 的兼容浏览器目录）。所有 pnpm 需附加 `--config.verify-deps-before-run=false --config.manage-package-manager-versions=false`。
- 手动编辑用 apply_patch；文档/注释/提交中文。只 add 明确文件。不 push、不创建 PR、不修改 SDK 或 npm 配置。提交本任务文件，报告实际验证结果和限制。

## Task 2：评估独立跟踪算法

- 固定官方 ByteTrack、OC-SORT 与 PaddleDetection 的源码提交。记录源码许可、跟踪文件头、关键依赖及再分发边界。
- 不下载权重，不引入检测器。输入为逐帧检测框、类别、分数和帧时间；用可复现的合成场景验证平移、低分漏检、短遮挡、长丢失重入、交叉、多类别、跳帧。实际运行原始参考代码；保留输出与配置，不修改参考算法来粉饰结果。
- 结果包含 ID 连续性、轨迹消失/恢复、失败场景与本机运行耗时；不把耗时宣称浏览器性能，不把合成场景宣称 MOT17/20 精度。真实数据和浏览器 TS 实现未验证就明确待办。
- 写入 `reports/tracking/2026-09-18-feasibility/`，提供源码锁、依赖锁、可重跑脚本、合成输入、逐帧结果、中文结论。
- 根据结果提出一个首发候选及独立 API 边界，说明类别隔离、时间间隔、reset/dispose、轨迹状态。现行标准强制模型资产/缓存/推理后端，若不适用于无权重算法，先记录标准扩展需求，生产 SDK 前再修改规则/schema；不能伪造模型或 WebGPU 支持。
- 更新总路线的当前段落为实际结论及下一阶段。检查原始设计无冲突。
- 本任务仅评估证据，合成输入自建，不发布上游源码、数据集或 SDK。只提交明确文件。

## 集成验收

每任务完成后检查规格和质量；最终运行门户 unit、build、浏览器测试及证据重跑。检查 diff 无运行时混入门户、无令牌与临时二进制。完成已授权门户 PR、合并与 Pages 回读；其余项目不变。
