# BoT-SORT 集成本地交付最终审查

日期：2026-09-22。SDK：`C:/Users/chenm/.codex/worktrees/tracking-algorithms/web-sdk-PP-Tracking`；门户：`C:/Users/chenm/.codex/worktrees/segmentation-portal/chenmohan123.github.io`。审查时 SDK 已暂存、尚未提交，门户在整理计划勾选和交付记录。本轮为只读最终审查，仅写入本报告；未编辑 SDK、F: 主仓或其他生产文件，未提交、远程写入或启动子代理。

## 结论

当前交付范围没有未解决的 Critical / Important 阻塞。前次审查的四项问题均已修复并复查，当前包、文档和归档证据一致。可继续既定的两仓本地提交；本结论不包含远程发布、线上 Demo、实际手机或新增 rc.1 ReID 推理验证。

## 独立核对

- `package.json`、manifest、根运行时、模型包装层版本字面量、API、Demo 品牌栏及双语 rc.1 说明一致为 `0.2.0-rc.1`。双语首页明确 npm/线上 Demo 仍为 rc.0，rc.1 使用本地 tarball；未把本地准备写成远程已发布。
- `node reports/2026-09-22-botsort-integration/verify.mjs --local` 在最终来源锁刷新前后均通过：140 份源码文件、15 份归档和指定本地产物匹配。
- 当前根 ESM SHA-256 为 `db48cf3e47c9ed487f7dbaa968188869ecc70b3ce06c4140cdc986c0f0040a56`，与公开入口回放摘要及固定 05 浏览器回执相同。公开类型修复已落入当前声明文件；实际包消费脚本包含禁止将 BoT-SORT 赋给旧 Tracker、缺少 motion 和混入图库参数的 strict/NodeNext 负例。
- 实际 tarball 共 54560 字节，SHA-256 为 `bf6d3463422e7c66d57dbfed9cafad6e1fb7be77ace11b72735d0bbc48b7bd97`。以内存解包独立核对 32 个发行文件，全部逐字匹配当前工作树/构建产物；未重新打包或运行全量测试。
- 完整 `verify.log` 记录 19 个测试文件、220 项测试通过，包含包消费及 Demo/Vanilla/React 构建。浏览器日志与两份 JSON 分别包含 12 和 6 组，共 18 组；pageErrors 均为空。可选 ORT chunk 体积提示在双语报告中明确保留，不被误写为全部构建无提示。
- 七段摘要合计 5316 帧、67639 检测，三配置各两次，共 42 次运行。逐项核对重复 MOT/非耗时哈希及零容量丢弃，全部一致；进一步与历史核心摘要核对 MOT 和仅版本归一后的非耗时哈希，42 次均通过。冻结运动和向量哈希与历史一致。
- 固定 05 的 837 帧、三配置浏览器 MOT/非耗时哈希全部与对应 Node 结果一致。历史 metrics 中三个合计 IDF1 四舍五入为 48.2922% / 54.5850% / 55.3487%，与双语报告一致；09 段退步和训练序列边界持续披露。
- 双语报告和发布说明均说明未重跑检测、图像估计、ReID 或 GT 评分，不把跟踪耗时写成媒体端到端耗时。390px 明确为桌面视口；没有新增手机、Safari/Firefox、Worker/NPU、视频或摄像头兼容承诺。模型文件、双源注册数据、依赖锁及 CI 工作流没有本阶段实际 diff。
- 门户只修改路线图、设计/计划及回执，没有复制 SDK runtime 或把未发布第四算法写入生产目录。标准 after JSON 直接核对为 21 项 required 通过、0 失败、4 项远程跳过，3 项 recommended 通过；`locally-compliant` 用语准确。
- SDK 暂存区 `git diff --cached --check` 通过。

## 证据边界与换行说明

门户 136 项测试、21 页构建、0 错误/0 警告及 7 个既有提示，SDK 28 份 Markdown 的 210 个本地链接，以及门户 5 份文档的 37 个本地链接，来自主代理本轮命令回执；未保存独立原始日志。最终 `validation.json` 与门户回执准确转录这些结果，本次没有重复全量运行。SDK 双语运动示例的两条实际输出已保存于 `examples.json`，均为 `botsort 1 100`。

`models/pplcnet-reid/0.1.0/sources.json` 为历史未改文件，当前 Windows 磁盘字节使用 CRLF，Git 对象为 LF。独立读取暂存对象与磁盘文件并归一换行后逐字相同；Git 对象 SHA-256 为 `b6f6ab212d657fb85112d2fc264e6554014ae7b46b7652d6bda0b9b362e00168`，与 `provenance.gitObjectOverrides` 的记录一致。来源锁保留磁盘原始哈希，例外仅说明 Git 提交字节，不能解释为模型来源或运行时变更。

本报告针对上述已验证工作树和归档；本地提交完成后应按既定流程回读提交范围。远程动作继续遵循本阶段“不 push、不 PR、不发布”的边界。
