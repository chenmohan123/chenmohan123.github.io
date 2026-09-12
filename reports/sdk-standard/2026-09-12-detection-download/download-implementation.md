# 任务1：SDK 下载恢复实现报告

日期：2026-09-12（Asia/Shanghai）。仓库：F:/git/00_chenmohan/github/web-sdk-PP-Detection；分支 codex/download-recovery-docs；基线 2bf1bc2。未提交、未推送、未切换分支，未改版本、文档、门户登记或模型资产。

## 实现行为

- 新增公开 ModelDownloadOptions，download 从 createPPDetection 经 ModelManager 构造配置传到 loadModelAsset。
- 每次请求默认总时限 180000ms、无新增字节时限 30000ms、最多重试 2 次（共 3 次）。时限允许 0；时间为 0..2147483647 安全整数，重试为 0..5 安全整数；不合法参数返回 INVALID_INPUT。
- 仅请求与流网络异常、内部超时及 HTTP 408/429/500/502/503/504 在原 URL 重试；退避 500/1000/2000/4000/4000ms。第二次起使用 cache: reload。显式来源最终仍包装 MODEL_SOURCE_UNAVAILABLE；调用方取消返回 ABORTED。
- 每次尝试拥有独立 AbortController 与计时器，异步竞争可提前结束；主动中止请求并尽力取消响应流。自定义 fetcher、reader、cancel 忽略取消、永不完成、迟到完成或拒绝时，调用方仍及时结束，后台拒绝有处理器。
- 空字节块不续期空闲时限；新增字节不能重置总时限。每次从 0 报告进度，包含可选 attempt/maxAttempts，经工厂事件传递。
- 重试丢弃残片，完整读取且字节数/摘要校验成功后才交给原缓存流程。modelDownloadMs 包含重试和等待。清单 JSON 保持原加载流程。

## 修改文件

- packages/sdk/src/model/download.ts：策略解析、时限/取消、同源重试、流清理、尝试进度。
- packages/sdk/src/model/model-manager.ts：接收、预校验及传递下载配置。
- packages/sdk/src/types.ts：共享 ModelDownloadOptions、工厂选项及尝试进度字段。
- packages/sdk/src/index.ts：公开类型导出及配置下传。
- packages/sdk/tests/download-recovery.test.ts：新增 41 项下载契约测试。
- packages/sdk/tests/download.test.ts：旧进度断言兼容附加字段；原 reader.cancel 用例显式关闭重试。
- packages/sdk/tests/model-manager.test.ts：新增策略/释放/缓存/并发测试。旧显式网络失败改为默认共 3 次；两处仅验证 auto 来源切换的 HTTP 503 fixture 改用不可重试 404，保留原测试含义。
- packages/sdk/tests/factory.test.ts：实际工厂请求时限、禁用重试及尝试进度透传。

## TDD 证据

- 实现前新增下载测试：34 项中 26 项失败、8 项通过；失败明确来自请求/读取挂起、取消无效、缺少重试、非法参数未拒绝。
- 实现前新增管理器/工厂 4 项测试：4 项失败。工厂测试自身异步拒绝观察方式修正后，重新运行失败用例，仍由缺少重试导致失败，已无未处理拒绝。
- 实现后相关四文件 84 项通过；后续补充缓存回读、并发隔离 2 项并重跑全套。

## 验证

- 主执行者提供的 before：原下载与 ModelManager 31 项通过，规范检查 before 通过。
- 最终 pnpm test：20 文件、193 项全部通过，2026-09-12 18:49:43 开始，退出码 0。
- pnpm typecheck：通过，退出码 0。
- pnpm lint：SDK 和 Demo 均通过，退出码 0。
- pnpm build：ESM、Worker、浏览器全局包及声明构建通过，退出码 0。
- index.d.ts 已核对公开 ModelDownloadOptions 及三个下载入口使用该类型，进度包含 attempt/maxAttempts。
- 上述 8 文件 Prettier 检查全部通过；git diff --check 通过。

## 并发边界及限制

- 管理器释放会取消在途下载，单项取消不影响其他下载；共享缓存中其他请求仍可在完整校验后写入。
- 覆盖请求/读取/退避取消，迟到响应清理失败、迟到请求拒绝、非标准 reader 迟到字节、回调异常不重试、持续慢流、空块、正常续期、所有可重试 HTTP、不可重试 HTTP、完整性失败、错误 206。
- 清理尽力而为：无法迫使故意忽略取消的外部实现停止，但 SDK promise 有界结束，迟到结果不推进进度或写缓存；不会无限等待外部 cancel promise。
- 本报告证据来自 Node/Vitest 实际 Response/ReadableStream 及必要的非标准 reader。真实浏览器/HTTP、真实模型、规范 after、独立审查及 CHANGELOG/发布由主执行者负责；不扩大已有设备/精度兼容性声明。
- 无已知未解决的本地 SDK 实现问题。
