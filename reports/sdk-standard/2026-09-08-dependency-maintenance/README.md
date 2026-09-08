# 2026-09-08 门户依赖补丁核验

基线：`8126bdb36222bb240fd037902bce1cc46f2bad8f`。

## 范围与原因

仅更新 `pnpm-lock.yaml` 中的 `fast-uri`，从 3.1.5 升到 3.1.6；不改变直接依赖范围。Ajv 8.20.0 的 `^3.0.1` 已允许该补丁版本，锁文件完整性值已与官方 npm registry 核对。

官方 [3.1.6 发布说明](https://github.com/fastify/fast-uri/releases/tag/v3.1.6) 修复 GHSA-jqff-g426-hqxp、GHSA-f65p-4m7j-42xc、GHSA-fph4-wmhf-6fwf、GHSA-5jgf-p345-68v8，对应本仓库 Dependabot 告警 #19–#22。

`pnpm why fast-uri` 确认路径全部源于开发依赖：本地标准检查器 Ajv，以及 `@astrojs/check` 的 YAML 语言服务。检查器同步编译本地 Schema，没有远程 Schema 加载；模型 URL 校验使用 `new URL()`。本次确认受影响依赖存在，未证明线上 SSRF 利用路径。

## 实际验证

- `pnpm install --frozen-lockfile`：通过，完整性验证通过，未重新解析其他依赖。
- `pnpm why fast-uri`：唯一解析版本 3.1.6。
- `pnpm audit --json`：所有级别告警为 0。
- 采用上游修复用例，直接调用 Ajv 实际解析到的 `fast-uri`：四类问题共五个恶意输入旧版失败、新版全部通过；正常 HTTP 路径和 Schema 引用在前后均通过。见 [修改前](portal-fast-uri-before.json) 与 [修改后](portal-fast-uri-after.json)。这些样本只做字符串解析，不发送网络请求。
- `pnpm test`：6 个文件、50 项通过，包含标准检查器与完整 Schema 校验。
- `pnpm build`：类型检查 0 错误、0 警告，生成 9 个静态页面；保留既有 3 条 Zod 弃用提示。
- `pnpm test:e2e`：Chromium 5 项通过。
- `pnpm sdk:check -- --repo tools/sdk-standard-check/fixtures/complete-sdk --format table`：required 失败 0；远程规则跳过 4，样本原有 recommended 失败 1。
- `git diff --check`：通过。

本报告记录本地核验。PR 的必需 CI、合并结果、Dependabot 告警关闭状态与 Pages 部署须在远端分别验证。
