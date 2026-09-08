# 四个 SDK 的 npm 发布准备核对

核验日期：2026-09-08（北京时间）。范围：单 SDK 发布准备。只读核对四库本地 main、远端 main、npm registry、实际 tarball、来源证明、GitHub 发布记录和 Ruleset；未修改 SDK、创建提交/PR/标签、发布包或启动 runner。

遵循 `standards/v1/README.md`、`docs-release-contract.md`、`repository-governance-contract.md` 和 `templates/release-checklist.md`。本报告不代替主任务修正检查器后的四库标准检查，也不表示候选版本已经完成发布验证。

## 发布结论

| 仓库 / npm 包 | 当前公开版本 | 公开包来源提交 | 当前本地及远端 main | 建议 |
| --- | --- | --- | --- | --- |
| web-sdk-PP-Detection / web-sdk-pp-detection | 0.1.1 | 8245cd396e5c759bc096f6be66930f8fe1c30b16 | 5adeb3963a61f722d7570139beec7631df6cc351 | 新版候选 0.2.0 |
| web-sdk-PP-OCRv6 / web-sdk-pp-ocrv6 | 0.1.8 | ec3a24e80818a8e9caace4bb95ef81abffa1296a | 9cc1f8d9da54164a77bcb9ea781cedebddb6139e | 新版候选 0.2.0；发布前补齐 GOV-002 |
| web-sdk-PP-DocLayoutV3 / web-sdk-pp-doclayoutv3 | 1.2.0 | b4c10c2c3914cc3399b1851f0926910fe777b4f8 | 53cbbfb3cfa350abdd505765ca36540708fdd213 | 无需发新版，保留 1.2.0 |
| web-sdk-PP-LCNet_x1_0_doc_ori / web-sdk-pp-lcnet-x1-0-doc-ori | 0.2.0 | 0e404877890ab79442f3db43b44aaf726b81e131 | 同公开包来源提交 | 无需发新版，保留 0.2.0 |

以上四个公开包的 `gitHead` 均与本地对应版本标签及公开 SLSA 来源证明中的提交一致。四库工作区均无改动，本地 main 与只读 GitHub API 返回的远端 main 一致。

Detection 新增 `ModelManager.getCacheEstimate(model?)`、`clearCurrentModelCache(model?)`、可选 `ModelCache.scope/list()`、`loadTimings.modelSource`、`runtime.runtimeVersion/environment`；同时修复缓存清理竞态、初始化计时、Worker 输入转移后的回退和连续媒体会话复用。存在向后兼容的 API 增量，因此建议 minor 版本 0.2.0，不能仅按 Demo 修复理解。模型仍为 PicoDet-L-320 1.0.1 FP32。

OCRv6 新增 `getModelCacheUsage`、`resolveModelCacheIdentity`、可选 `CacheWriter/createWriter`、`RuntimeOptions.wasmPaths`、自定义模型 `preset`、初始化与冷热状态、组件实际后端；同时修复缓存迟到写入、加载/取消/释放竞态、OCR 耗时与默认 manifest URL。建议 minor 版本 0.2.0。模型仍为 PP-OCRv6 1.0.0。

DocLayoutV3 的 v1.2.0 已指向包含缓存画布修复的 b4c10c2；之后仅改发布后的 registry 等待、相关测试、工作区测试命令和审查文档，`packages/sdk` 没有改动。LCNet 的 main 与 v0.2.0 完全一致。

## 公开包实物证据

从 `https://registry.npmjs.org/<包名>` 读取 latest，下载其 `dist.tarball`，逐包计算 SHA-512 并与 `dist.integrity` 比较，四包均一致。读取公开 `dist.attestations.url` 的 SLSA payload，来源均为各自仓库 `.github/workflows/release.yml`、版本标签 push、GitHub hosted runner；本轮未执行 Sigstore 签名验证。

| 包 | 公开时间（UTC） | 文件数 / 解压字节 | 包内主要内容 | source map 与当前 main 对照 |
| --- | --- | --- | --- | --- |
| Detection 0.1.1 | 2026-08-31 10:50:20.986 | 9 / 6,291,665 | ESM、浏览器全局入口、类型、Worker、README；无 ONNX | 23 个 SDK 源文件，15 个相同、8 个已变更 |
| OCRv6 0.1.8 | 2026-08-26 05:33:38.906 | 11 / 420,392 | ESM、类型、Worker、manifest、3 份识别字典、README；无 ONNX | 27 个 SDK 源文件，15 个相同、12 个已变更 |
| DocLayoutV3 1.2.0 | 2026-09-07 13:57:14.392 | 9 / 6,393,792 | ESM、浏览器全局入口、类型、Worker、README；无 ONNX | 18 个 SDK 源文件全部相同 |
| LCNet 0.2.0 | 2026-09-07 13:09:28.936 | 26 / 15,514,085 | ESM、浏览器全局入口、类型、Worker、内置 ONNX、manifest、模型来源、README | 18 个 SDK 源文件全部相同 |

source map 比较仅归一化 CRLF/LF，遍历各包 `dist/*.map` 内 `../src/` 的内嵌源码并去重。类型及新增文件另以版本标签和 main 的 Git diff 核对。

实物缓存位于 `C:/Users/chenm/AppData/Local/Temp/codex-npm-readiness-20260908/<包名>/`，包含 `registry.json`、`attestations.json`、原始 `.tgz`、解压后的 `package/`。公开证据可由以下地址重新读取：

- `https://registry.npmjs.org/web-sdk-pp-detection/0.1.1`；`https://registry.npmjs.org/-/npm/v1/attestations/web-sdk-pp-detection@0.1.1`
- `https://registry.npmjs.org/web-sdk-pp-ocrv6/0.1.8`；`https://registry.npmjs.org/-/npm/v1/attestations/web-sdk-pp-ocrv6@0.1.8`
- `https://registry.npmjs.org/web-sdk-pp-doclayoutv3/1.2.0`；`https://registry.npmjs.org/-/npm/v1/attestations/web-sdk-pp-doclayoutv3@1.2.0`
- `https://registry.npmjs.org/web-sdk-pp-lcnet-x1-0-doc-ori/0.2.0`；`https://registry.npmjs.org/-/npm/v1/attestations/web-sdk-pp-lcnet-x1-0-doc-ori@0.2.0`

## 候选版本需要更新的位置

所有 SDK 路径均相对于 `F:/git/00_chenmohan/github/<仓库>/`。仅列准备事项，本轮未修改。

### Detection

- 版本源：`packages/sdk/package.json:3`、根 `package.json:3`、`packages/sdk/src/index.ts:26` 的 `CURRENT_SDK_VERSION`、`sdk-manifest.yaml:7`。Demo 从运行时常量显示版本。
- 版本断言：`scripts/repository-contract.test.mjs:31`、`scripts/verify-release.test.mjs:187`（包、运行时、日志均硬编码 0.1.1）、`apps/demo/tests/demo.spec.ts:336`。
- 将 `CHANGELOG.md` 的 Unreleased 整理为新版本；准备中文发布说明，按契约明确模型来源、许可证、资产、后端与已验证边界。根 README、npm 的 `packages/sdk/README.md` 补充新 API 入口。
- `docs/{zh-CN,en}/api.md` 与 `performance.md` 移除“尚未发布到 npm 0.1.1”的时效性表述并说明 0.2.0 起可用。
- 示例固定版本：`examples/{react,vue,vanilla-vite,wechat-webview}/package.json`，`examples/{cdn,vanilla}/index.html`，六种示例 README；联动 `examples/tests/examples.test.ts:122`、`scripts/examples-contract.test.mjs:27` 和相关 lockfile。新包公开前，不能让独立安装验证误装尚不存在的 registry 0.2.0；候选阶段应明确使用本地 tarball，公开后再核验 registry 示例。
- 发布文档存在一处具体旧缺陷：`packages/sdk/README.md` 宣称默认模型可省略 `model`，但 `packages/sdk/src/index.ts` 的 `createPPDetection()` 在 `model`、`manifest` 均缺省时抛错；新版准备时需让双语 npm README 与实际调用契约一致。

### OCRv6

- 版本源：`packages/sdk/package.json:3`、根 `package.json:3`、`sdk-manifest.yaml:7`、`apps/demo/src/App.tsx:255` 的硬编码显示。
- 将 `CHANGELOG.md` 的“未发布”整理为新版本；准备完整中文发布说明并同步双语根 README、npm `packages/sdk/README.md` 的新增配置和缓存/性能入口。
- `docs/{zh-CN,en}/api.md`、`performance.md` 以及 `packages/sdk/src/types.ts:29` 的未发布声明需同步；英文 API 文档现有缓存引导段为中文，发布时一并保持双语等价。
- 独立工程：`examples/{react,vanilla,vite}/package.json` 和 `pnpm-lock.yaml` 内对应 SDK 条目；CDN：`examples/{cdn,wechat-web-view}/index.html` 的 import map；五种示例 README。
- 示例断言和文字：`examples/tests/{consumers,examples,browser}.test.mjs`；`examples/{react,vanilla,vite}/runner.ts`、`examples/{cdn,wechat-web-view}/runner.js` 及 README 中针对 0.1.8 生命周期与 `wasmPaths` 的限制说明。不能只全局替换版本数字；需用候选 tarball 验证新版取消/释放和 Worker 资源配置后再调整说明。保留无关依赖版本（例如 lockfile 中的 confbox 0.1.8）。

DocLayoutV3、LCNet 本轮无需改 npm 版本、示例固定版本或历史发布说明。

## 当前远程门禁和 Trusted Publishing

通过宿主机 `gh auth status` 确认使用 chenmohan123 现有 keyring 登录，后续只读访问，未登录/退出或更换凭据。沙箱内认证失败未当作宿主机登录失效。

| 仓库 | main Ruleset | 标签 Ruleset | 当前 main 必需检查 |
| --- | --- | --- | --- |
| Detection | 21779070，active | 21779094，active，v* 禁更新/删除 | Validate workspace、Browser WASM and package smoke 均成功 |
| OCRv6 | 21529943，active | 缺失；包含继承规则的 API 查询仍只有 branch Ruleset | verify 成功 |
| DocLayoutV3 | 20787243，active | 21227862，active，v* 禁更新/删除 | Validate workspace、Browser WASM and package smoke 均成功 |
| LCNet | 21226718，active | 21227870，active，v* 禁更新/删除 | verify 成功 |

四个 main Ruleset 均要求 PR、解决审查对话、最新提交的必需 CI，并禁止删除/非快进；bypass 均为空。OCRv6 缺少标准 required 规则 GOV-002，这是正式发布前的远程阻塞项；本轮没有远程设置修改授权，因此只记录修复要求。它不阻止先完成本地版本准备。

Detection、OCRv6、DocLayoutV3 的发布 job 都使用 `environment: npm`；GitHub API 显示这些 npm environment 当前无 protection rules 或分支策略。LCNet 的发布 workflow 不声明 npm environment，远程也没有 npm environment。npm Trusted Publisher 的匹配条件应分别对应上述仓库、`release.yml` 和所用 environment；LCNet 不应凭空加 npm environment。四包最近成功上传的 provenance 是现有链路曾运行的证据，不能证明 npm 当前私有 Publisher 设置从未变动。本轮未读取 npm 账户中的 Publisher 配置。

- Detection：v* push，GitHub hosted Ubuntu，Node 24（`.nvmrc`）、pnpm 11.16.0；标签提交必须属于 origin/main；下载并校验真实模型；安装 Chromium；`node scripts/verify-release.mjs --release vX.Y.Z` 检查标签/包版本、模型哈希与证据，再运行 `pnpm run verify`、打包浏览器 smoke；随后 `npm publish --access public --provenance`。该脚本本身不检查远程 Ruleset，也不运行门户的标准检查器。
- OCRv6：v* push 或手动输入 tag；checkout 指定标签并检查属于 origin/main；Node 24、pnpm 11；LFS 取模型；`pnpm verify`、`node scripts/verify-release.mjs vX.Y.Z`、SDK build、`verify-package-assets.mjs` 后发布。其 `verify-release.mjs` 仅核对标签和包版本以及若干文件存在，不验证 manifest 版本/当前 CHANGELOG 条目，也不检查远程标签保护；准备阶段需单独核对。workflow 自动创建 GitHub Release 并上传模型资产，正式启动等于同时执行这些远程写入。
- DocLayoutV3：v* push、npm environment、Node 24、pnpm 11.16.0、LFS、main 祖先检查，完整模型/工作区/打包 smoke 后发布；新 main 已延长发布后 registry 只读核验等待。该流程改动不需要通过增加 SDK 版本来发布。
- LCNet：仅 vX.Y.Z push、GitHub hosted Ubuntu、无 npm environment，Node 24，固定 npm 11.6.2 与 pnpm 11.16.0；`release-guard.mjs` 校验事件/标签/检出 SHA 一致、包版本/manifest/日期日志一致和 main 祖先关系；`pnpm verify`、lint、Chromium、`examples:verify` 通过后 OIDC 发布。无须启动物理 GPU runner。

历史发布作业：Detection `33383889496`、DocLayoutV3 `34129623612` 的 `Publish with npm provenance` 均成功，失败仅发生在 `Record published integrity`。registry 现有包和 provenance 已另行核对，不应为让历史作业变绿而重跑整次发布。OCRv6 `32934462929`、LCNet `34125589719` 发布作业成功。

远程来源：`/repos/chenmohan123/<仓库>/branches/main`、`/commits/<上述 main SHA>/check-runs`、`/rulesets` 及 `/rulesets/<上述 ID>`、`/environments`、`/actions/workflows/release.yml/runs`、相应 `/actions/runs/<ID>/jobs`、`/releases/latest`，均为 2026-09-08 只读快照。

## 下一阶段验证

1. 使用本次修正后的标准检查器，按仓库治理要求在 SDK 修改前后各运行一次，保留报告；候选版本准备期间重新确认版本、manifest、CHANGELOG、API 和示例说明一致。
2. Detection 完成 `pnpm run verify`、完整 `verify-release.mjs --release v0.2.0`（仅本地校验，不创建标签或发布）、相关 Demo/缓存/性能回归、package smoke 和独立示例 tarball 验证；确认真实模型资产仍匹配清单。CI 的物理 GPU job 当前为 skipped，不把它写成当前提交新完成的 GPU 验证。
3. OCRv6 完成 `pnpm verify`、发布脚本静态校验、SDK/Demo 类型检查和构建、`verify-package-assets.mjs`、Demo Playwright、独立示例 tarball 与主线程/Worker 生命周期 smoke；确认包内 manifest 和字典齐全且无 ONNX。
4. 正式发布前刷新必需 CI、GOV-002 等远程证据与 npm Publisher 匹配配置；仅在后续明确授权发布标签/npm/Release 的范围内执行远程写入。当前授权只覆盖准备。
5. 新包上传后单独查询版本和完整性、核对 provenance 与标签提交，再验证实际公开 tarball 和更新后的固定版本示例。DocLayoutV3、LCNet 继续沿用已发布版本。

本轮未执行候选版本构建、测试或 `npm pack` 生命周期脚本；上述测试是待执行项。已完成的实物下载、哈希比较、源码对照和远程快照足以区分是否存在未发布 SDK 变更，不能替代改版本后的完整验证。
