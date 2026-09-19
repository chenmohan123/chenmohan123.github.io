# PP-Tracking 多算法第一批实施计划

> **For agentic workers:** 使用 superpowers:subagent-driven-development，按任务实施并独立审查。子代理不得继续派子代理。

**目标：** 固定七方案同 SDK 路线，完成可选 OC-SORT 的本地 SDK、Demo 与真实检测序列对比。
**架构：** 同一工厂选择纯算法策略，共用输入/轨迹生命周期，模型路线分批接入。
**技术栈：** TypeScript、现有独立 Kalman/assignment、React/Vite、Vitest、Playwright、Python/TrackEval。
**设计：** `docs/superpowers/specs/2026-09-19-pp-tracking-multi-algorithm-design.md`。

## 全局约束

- 门户 P=`C:/Users/chenm/.codex/worktrees/segmentation-portal/chenmohan123.github.io`，分支 `codex/tracking-algorithm-roadmap`，基线 `a0cc187`。
- SDK S=`C:/Users/chenm/.codex/worktrees/tracking-algorithms/web-sdk-PP-Tracking`，分支 `codex/tracking-algorithms`，基线 `1824e27`。
- 原 SDK O=`F:/git/00_chenmohan/github/web-sdk-PP-Tracking` 保持不变，可只读复用其 `.tmp` 数据包、TrackEval 和 Python 环境；所有新输出写 S/.tmp 的唯一新目录。
- 中文文档/提交/注释，公开指南保留英文镜像；apply_patch 手工编辑，明确文件 git add，不远程写，不覆盖历史报告。
- pnpm 附 `--config.verify-deps-before-run=false --config.manage-package-manager-versions=false`。一次仅一个实施代理。
- 数学依据论文与项目已有独立实现，不读旧 SORT/DeepSORT/OC-SORT/Paddle 跟踪或 Kalman 代码；新增运行库必须确认来源/许可，不以翻译代码绕过义务。
- 本轮不含摄像头/视频流水线、ReID、GPU/Worker、官方实现逐值兼容、模型发布或线上更新。

### Task 1：算法选择与 OC-SORT 核心

**文件：** S/src/{types,tracker,assignment,index}.ts、必要的单一职责 OC-SORT 模块；S/tests/ocsort.test.ts、tracker/assignment 定向测试；S/docs/{zh-CN,en}/algorithm.md；S/reports/2026-09-19-ocsort/来源与设计记录；NOTICE。

- [ ] 固定公开 OC-SORT 论文身份与数学规则，在独立指南中说明 OCM/ORU/OCR、参数与历史上限，保留未采用官方代码的事实边界。
- [ ] 先写失败测试，验证工厂算法选择、未知项拒绝和默认旧算法等价；新增算法身份输出。
- [ ] 用原创小场景测试方向歧义、零运动、IoU/类别硬门限、末次观测恢复和插值重更新；对数学步骤有独立计算断言，避免只检查实现分支。
- [ ] 实现可选 OC-SORT 和有界观测状态，保持事务提交、时间/容量规则、默认 ByteTrack 的原算法输出；不用复制整份 tracker。
- [ ] 验证无效选项、异常/预取消原子性、reset/dispose、跨实例隔离，运行定向测试、类型和构建以及前后 checker；本地中文提交与报告。

### Task 2：Demo、候选版本和统一路线

**文件：** S/demo/src/{App,playback,style}、S/tests/{demo.test.ts,browser.mjs}、S/package.json/manifest/version声明、双语 README/API/quick-start/compatibility/performance 等当前指南；P 两份当前路线和本设计。

- [ ] 增加双语算法选项与各自有效参数，切换停止并重建实例、清空结果，语言切换保留状态，导出携带算法身份。
- [ ] 更新本地候选到 0.2.0-alpha.0，所有当前版本字段一致；历史 0.1.0 证据不改写，明确线上仍是 0.1.0。
- [ ] 路线列出全部七方案的依赖/顺序/状态，更新原当前段落中的旧候选时态；不更改门户生产 registry，不把未来模型显示为已实现。
- [ ] 完整 SDK verify 一次，浏览器验证两算法、参数互斥、语言、播放/seek/导入导出、390px；checker、打包消费通过，保存证据，本地中文提交。

### Task 3：同输入真实评测与验收

**文件：** S/scripts/evaluation/mot17/ 相关配置选择与元数据、相应 CLI 测试；S/reports/2026-09-19-ocsort/ 对比证据与双语解释；P 当前路线评测结论。

- [ ] 为现有评测 CLI 增加明确两算法对比模式，保持历史默认模式可复跑、不可覆盖保护；按实际候选读取版本，记录来源提交/构建摘要。
- [ ] 固定同一 MOT17/TrackEval 身份，跑七序列两算法及确定性复核；比较旧 ByteTrack 基线的 MOT 输出/指标，任何回退先定位。
- [ ] 两算法各一完整真实序列 Chromium/Node 对齐，记录实际浏览器版本与 CPU/main；保存原始输出到 .tmp，仅归档允许公开的摘要/哈希。
- [ ] 报告 IDF1/IDSW/MOTA/FP/FN、处理耗时/容量和差异，不宣称训练集排行榜、真实视频端到端或跨设备兼容；OC-SORT 未改善仍如实记录。
- [ ] 运行评测工具的相关测试和最终 checker。只有源码变化或失败才重复大套验证；报告当前本地候选、后续外观路线、发布待办，本地提交并完成整分支审查。
