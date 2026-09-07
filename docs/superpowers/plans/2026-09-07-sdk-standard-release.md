# SDK 标准整改发布执行计划

> 执行方式：按仓库并行准备发布，合并前使用 requesting-code-review 独立复查；按 verification-before-completion 留存当前代码的验证证据。

**目标：** 将已完成的标准整改分别通过 3 个 PR 合并 main、发布 Pages，并发布 DocLayout 1.2.0、LCNet 0.2.0。

**架构：** 两个 SDK 分别维护 runtime、Demo、npm 与发布工作流；门户维护检查器、目录版本与报告。发布标签创建后触发已有 npm OIDC 流程，标签不可移动。

**技术：** pnpm、TypeScript、Vite、Playwright、GitHub Actions、npm provenance。

**依据：** `standards/v1/README.md`、SDK/Examples/文档发布/仓库治理契约，及 `reports/sdk-standard/2026-09-07-standard-remediation.md`。用户已批准 PR、合并 main、Pages 和上述 npm 版本。

## 约束

- 使用中文提交、发布说明和回复。保留本轮之前全部有效修改。
- gh 复用宿主机登录状态，不读取或输出 token，不改变登录状态。
- 每仓库使用 `codex/` 分支；CI 通过才合并，不绕过 Ruleset。
- 明确区分本地测试、GitHub CI、Pages 和 npm 证据；不扩展未经验证的 GPU 兼容承诺。

## 1. SDK 发布准备

- [ ] 前置运行门户 `pnpm sdk:check -- --repo ../web-sdk-PP-DocLayoutV3 --repo ../web-sdk-PP-LCNet_x1_0_doc_ori`。
- [ ] DocLayout `packages/sdk/package.json`、`sdk-manifest.yaml`、当前文档与示例引用同步 1.2.0，整理 CHANGELOG 与发布说明。
- [ ] LCNet 同步 0.2.0，补 `.github/workflows/release.yml` 的标签触发约束、main 祖先校验、包版本匹配、LFS 下载与来源校验。
- [ ] 先为 LCNet 的错误标签/版本、非 main 发布来源补失败测试，再实现校验并确认通过。
- [ ] 独立示例在发布前使用当前打包 tarball 验证；正式清单引用新公开版本。保留正确锁文件，避免 CI 安装尚未发布的版本。
- [ ] 各仓类型、lint、测试、构建、打包消费者与浏览器验证；DocLayout 在不包含历史不可读临时目录的干净检出中验证完整 verify。

## 2. 审查、PR 与 Pages

- [ ] 独立只读复查两库发布改动及前轮 4 个缓存反馈的修复。
- [ ] 两 SDK 分别提交中文 commit，推送并创建 PR，等待当前提交全部必需 CI。
- [ ] 合并 main，核验 GitHub Pages 成功运行关联的 SHA，并线上验证版本与缓存/推理交互。

## 3. npm 与门户

- [ ] 从已合并并验证的 main 创建 v1.2.0、v0.2.0 标签并触发发布，不移动已有标签。
- [ ] 验证 npm registry 的版本、dist.integrity 与 provenance，使用已公开包重新验证独立示例，创建中文 GitHub Release。
- [ ] 门户目录同步已发布版本、清单缓存能力与真实证据；检查器既有修复和报告一起形成第 3 个 PR。
- [ ] 门户测试、构建、浏览器检查通过后合并 main，验证 Pages 页面与链接。
- [ ] 输出 3 个 PR、Pages 和 npm 发布链接以及真实限制；三个本地工作区同步 main，保留不属于本任务的改动。
