# Tracking BoT-SORT 公开入口与 Demo 集成回执

日期：2026-09-22。层级：单 SDK；门户只更新规划和验收记录。本地候选为 `0.2.0-rc.1`，不是远程发布。

SDK 根工厂现可显式选择 BoT-SORT，严格要求 frameId、timestampMs 和绑定前后成功帧的 motion；原三算法兼容，ByteTrack 继续默认。BoT-SORT 为独立风格实现，不是官方逐值移植。根入口仍为无 ORT 依赖的 CPU/main，可选 ReID 子入口、模型和双源分发不变。

Demo 沿用现有统一风格，新增第四算法、原创相机平移样例、运动回执、显式失败策略和可选外观参数。版本2输入导出保留算法、已应用参数、运动与特征空间，导入按文件恢复；旧输入继续兼容。完整验证后替换，非法末帧/参数保留原结果，seek/reset 和语言切换符合原状态约定。

固定七段 MOT17 训练序列5316帧、67639检测，三配置各两次，MOT及归一化版本后的非耗时输出与[核心阶段](../2026-09-22-botsort-core/README.md)一致，0容量丢弃。IDF1仍为恒等48.2922%、CMC54.5850%、CMC+外观55.3487%，09段仍退步。公开入口在Chromium153回放完整05段837帧与Node哈希一致。没有重新计算图像运动、ReID或GT评分；不是端到端媒体速度测试。

SDK 本地完整 verify 覆盖220单测、类型、四算法与ReID实际tarball的ESM/CJS/NodeNext消费、无ORT隔离、Demo/示例构建和18组浏览器交互。桌面及390px中英文无横向溢出和pageerror，390px不等同手机验证。独立审查的四项边界问题已复现、修复和复查，无剩余阻塞：非法配置不能被清洗、旧Tracker类型不能抹去motion要求、参数应用保留隐藏配置、空检测版本2外观序列可往返。

SDK 证据归档于 `reports/2026-09-22-botsort-integration/`：README中英文、完整verify日志、实际包回执、公开入口摘要、两份Demo/浏览器回执、固定05回执、来源锁及完整性脚本。未提交原图、检测/GT、向量或轨迹；旧证据保持原字节。

门户最终验证：136项测试通过，Astro检查0错误/0警告、保留7项既有提示，21个静态页面构建成功。修改后标准检查21项required通过、0失败、4项远程规则跳过，3项recommended通过；状态仅为locally-compliant。本地tarball为54560字节，SHA-256 `bf6d3463422e7c66d57dbfed9cafad6e1fb7be77ace11b72735d0bbc48b7bd97`。双语运动示例均实际输出 `botsort 1 100`；SDK本轮28份Markdown的210个本地链接有效。

设计：[本阶段设计](../../../docs/superpowers/specs/2026-09-22-tracking-botsort-integration-design.md)；计划：[本阶段计划](../../../docs/superpowers/plans/2026-09-22-tracking-botsort-integration.md)。标准证据：[修改前](../../sdk-standard/tracking-botsort-integration-before-20260922.json)、[修改后](../../sdk-standard/tracking-botsort-integration-after-20260922.json)。本地检查不能替代远程治理、CI或发布回读。

下一阶段建议完成 rc.1 预发布及 npm/线上 Demo 验证，再单独设计浏览器自动运动估计；视频/摄像头、JDE/FairMOT/CenterTrack 和跨 SDK Workflow 继续分阶段评估。生产目录没有登记未发布能力，本轮没有 push、PR、合并或发布。

SDK 本地提交：`e6a749566a7f6cfb0564dcc2bfc1eecbd3436b51`，分支 `codex/botsort-integration`。最终交付审查见[审查记录](final-review.md)；历史未改 `sources.json` 的磁盘 CRLF / Git LF 字节差异在来源锁中显式登记，没有修改模型声明。
