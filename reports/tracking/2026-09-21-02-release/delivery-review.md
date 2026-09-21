# Tracking 0.2 RC 发布文档交付审查

日期：2026-09-21。状态：通过，可提交；合并须等待当前 PR CI 成功。

## 范围

- SDK：`041686f6c335a66dbe1f3796d6be5b5ae908c2cb..678ecf2ca9038bde94acbae2fbfee1b7e9496ee1`，PR #5。
- 门户：`f7ed5d8..521a7f5f156fd1cb921d08393fe9bec834131d40`，PR #48。
- 只审查本轮双语发布清单、RC 说明、发布证据、门户路线、`pp-tracking.yaml` 与配套本地验收记录；标准 1.3 和历史算法实现沿用已通过的独立审查，不重复审查。
- 本轮没有重跑完整测试、真实评测或浏览器大套测试，没有执行远程写操作。

## 规格符合性

通过。

- SDK 产品路径相对已发布提交没有变化；本轮只修改四份发布文档并新增 `reports/2026-09-21-02-release/`。没有改写 `package.json`、根 README、`src`、Demo、模型或 `dist`。
- `remote/releaseRun.json` 记录 run `35574391794` 为 `completed/success`，head 为 `041686f6c335a66dbe1f3796d6be5b5ae908c2cb`；标签对象指向同一提交。GitHub Release 为 `v0.2.0-rc.0` 预发布，正文已经更新为发布后核验状态。
- `package-check.json`、`registry/version.json` 与公开 attestation 一致：包为 46,274 字节，SHA256 为 `fe42d3ee4c5626ad823e8bd16288b079d6bd7dfd07e79fcff4e987ead8509e12`，`next=0.2.0-rc.0`、`latest=0.1.0`。SLSA subject 的 SHA512 对应同一包，workflow、标签、提交和 invocation 均绑定本次 release run；`npm-signatures.log` 记录 registry signature 与 attestation 均已验证。
- Pages run `35574347075`、deployment 与线上报告都绑定发布提交。`online/report.json` 支持三算法、ModelScope/WASM、Hugging Face/WebGPU、取消/复位/缓存隔离与中英文 390px 桌面视口结论，`errors` 为空；没有扩展为手机、其他浏览器或视频端到端能力。
- 中英文发布清单、RC 说明和发布回执对版本、通道、默认算法、实验 ReID、模型来源、兼容范围与历史 alpha 评测身份保持等价。此前陈旧的发布前条件式措辞已在双语 RC 说明第 37 行改为实际完成状态。
- 门户 `src/content/models/pp-tracking.yaml:7-40` 继续用 `kind: algorithm`、包版本 `0.1.0`、CPU/main、空资产和原验证日期描述稳定 latest；RC 能力只作为摘要和限制中的预览说明，没有把 OC-SORT、DeepSORT、ReID、WASM 或 WebGPU 写入稳定结构化字段。
- 门户本地报告和四张截图证明 Chromium 151 下 1440/390 的目录、CPU/跟踪筛选、稳定字段、RC 边界、详情与分类页无页面错误或横向溢出；SDK 线上证据单独记录 Chromium 153，两者没有混用。
- 历史报告未修改。新增脚本只读取公开 registry、线上 Demo 和 GitHub API；`collect-remote.mjs` 使用只读 `gh api`。敏感扫描未发现未掩码 token、密钥或授权头；API 中 `temp_clone_token` 为空，Actions 日志中的 token 均为 `***`。
- 本轮 Markdown 相对链接目标全部存在，新增 JSON 全部可解析。三个 checker 报告均为 21 required pass、0 fail、4 remote skip、`locally-compliant`。

## 质量结论

- Critical：0。
- Important：0。
- Minor：1。

### Minor：精确 preview 启动耗时没有归档输出

门户 `reports/tracking/2026-09-21-02-release/README.md:11` 写“生产预览 70ms 就绪”，但 `portal-e2e-preview.log:1-24` 只保存了 16 项 Playwright 通过结果，没有保存 preview 服务启动输出或 70ms 数值。现有证据足以支持 16/16 回归通过，但不能独立复核这个精确启动耗时。建议删除“70ms”或补充对应启动日志；不影响本轮产品行为、测试结论或提交资格。

## 提交与合并判定

**可提交：是。** 当前两个提交均符合本轮范围，没有阻塞性文档矛盾、越权能力声明或缺失的核心发布证据。

合并仍需满足两个条件：PR #5 与 PR #48 的最新提交 CI 均成功；先合并 SDK PR #5，再合并门户 PR #48，确保门户报告指向的 `main/reports/2026-09-21-02-release` 在门户上线时已经可访问。门户合并后的生产目录、详情与链接回读应另存最终回执，不把本地 preview 记录称为生产验收。
