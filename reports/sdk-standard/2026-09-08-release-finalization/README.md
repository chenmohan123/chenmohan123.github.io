# 两个 SDK 0.2.0 合并与 Pages 验收

核验日期：2026-09-08（Asia/Shanghai）。分层为单 SDK 发布准备与 Demo 部署；门户检查器变更独立保留在本地分支。本文补充此前的候选核验，不改写历史快照。

## 已合并的代码

| SDK | PR | 已验证分支提交 | 合并后的 main |
| --- | --- | --- | --- |
| Detection | [#26](https://github.com/chenmohan123/web-sdk-PP-Detection/pull/26) | `7f13aa288a6c088132b41c6b113e34dcd7f4a0b2` | `32b057b825037802ed025f1740409b1529d97fc5` |
| OCRv6 | [#19](https://github.com/chenmohan123/web-sdk-PP-OCRv6/pull/19) | `725f462c204322a4f87e5ea342b66ab8daa0bc1e` | `ccecf95adcd18517c802828b45577c3c5985623c` |

两个 PR 都经过独立只读审查，未发现本轮新增的阻塞缺陷。使用宿主机既有 GitHub 登录，必需 CI 通过后按准确 head SHA 执行 squash merge，未使用管理员绕过。拉取合并结果后，两个仓库的 `git diff --exit-code HEAD origin/main` 均退出 0，代码树与验证版本一致。

- Detection 的 PR 必需检查 `Validate workspace`、`Browser WASM and package smoke` 均成功，见 [PR CI](https://github.com/chenmohan123/web-sdk-PP-Detection/actions/runs/34187760235)。合并提交的 [CI](https://github.com/chenmohan123/web-sdk-PP-Detection/actions/runs/34188150803) 也成功。
- OCR 的 PR 必需检查 `verify` 成功，见 [PR CI](https://github.com/chenmohan123/web-sdk-PP-OCRv6/actions/runs/34187887417)。合并提交的 [CI](https://github.com/chenmohan123/web-sdk-PP-OCRv6/actions/runs/34188162644) 也成功。
- Detection 的物理 GPU 作业按原有条件跳过，本轮没有启动 runner，不新增物理 GPU 兼容结论。

Detection 的运行时代码仅同步版本常量；OCR 保留了模型、清单与字典响应体取消统一返回 `ABORTED` 的修复与四项回归。SDK 本地单测分别为 132、119 项通过。完整验证及包消费证据见 [Detection 定稿报告](https://github.com/chenmohan123/web-sdk-PP-Detection/blob/32b057b825037802ed025f1740409b1529d97fc5/docs/reviews/2026-09-08-npm-0.2.0-finalization.md) 和 [OCR 定稿报告](https://github.com/chenmohan123/web-sdk-PP-OCRv6/blob/ccecf95adcd18517c802828b45577c3c5985623c/reports/release/0.2.0-candidate/finalization-2026-09-08.md)。

## Pages 与线上浏览器

| Demo | Pages 源提交 | 部署证据 |
| --- | --- | --- |
| [Detection](https://chenmohan123.github.io/web-sdk-PP-Detection/) | `32b057b825037802ed025f1740409b1529d97fc5` | [成功](https://github.com/chenmohan123/web-sdk-PP-Detection/actions/runs/34188150781) |
| [OCRv6](https://chenmohan123.github.io/web-sdk-PP-OCRv6/) | `ccecf95adcd18517c802828b45577c3c5985623c` | [成功](https://github.com/chenmohan123/web-sdk-PP-OCRv6/actions/runs/34188162700) |
| [DocLayoutV3](https://chenmohan123.github.io/web-sdk-PP-DocLayoutV3/) | `53cbbfb3cfa350abdd505765ca36540708fdd213` | [原部署仍对应当前 main，成功](https://github.com/chenmohan123/web-sdk-PP-DocLayoutV3/actions/runs/34137705244) |
| [LCNet](https://chenmohan123.github.io/web-sdk-PP-LCNet_x1_0_doc_ori/) | `0e404877890ab79442f3db43b44aaf726b81e131` | [原部署仍对应当前 main，成功](https://github.com/chenmohan123/web-sdk-PP-LCNet_x1_0_doc_ori/actions/runs/34125160316) |

GitHub API 确认 Detection、OCR Pages 的 `build_type=workflow`、`https_enforced=true`。两个新版页面均显示 0.2.0，默认 ModelScope，模型来源只有 ModelScope/Hugging Face 且可切换。

线上测试复用各 Demo 的 `runtime-assets.spec.ts`，使用临时 Playwright 配置将 baseURL 指向上述 HTTPS 地址并移除本地 webServer，再补充版本与来源控件检查。摘要见 [pages-smoke.json](pages-smoke.json)。

- Detection：3 项通过，0 失败、0 跳过，覆盖两个来源路径的 WASM 检测与线上版本/来源控件。
- OCR：10 项通过，0 失败、0 跳过，覆盖主线程/Worker、独立文本检测/识别、两个来源、冷热运行、错误后迟到进度与线上版本/来源控件。
- 页面、SDK、Worker、ORT 和 WASM 均来自线上部署；只替换外部模型传输为现有微型真实 ONNX fixture。因此这些结果不能视为真实模型源网络、官方模型精度或物理 GPU 验收。

原始 JSON 与临时配置只在本地保留：Detection `.tmp/pages-0.2.0/`，OCR 配置位于 `apps/demo/test-results/pages-0.2.0/`，JSON 位于 `test-results/pages-0.2.0/result.json`。

## 最终包与尚未发布的范围

| 包 | 本地归档字节数 | SHA-256 |
| --- | ---: | --- |
| web-sdk-pp-detection@0.2.0 | 1,364,878 | `0b19a390c6fc127ace546d3068622afcb6f876d0ceddba9206f3fc0b49b38753` |
| web-sdk-pp-ocrv6@0.2.0 | 172,327 | `2c1aebf8dafbbbba3d9ae5b42e55efebe74284672f182b08fabd2ce9c32f9f53` |

部署后再次计算本地归档 SHA-256，与定稿报告一致。0.2.0 尚未上传 npm，未创建版本标签或 GitHub Release。2026-09-08 最终只读查询 registry，Detection latest 仍是 0.1.1、OCR latest 仍是 0.1.8，两个 registry 都没有 0.2.0；公开示例继续固定各自已有版本。DocLayoutV3 1.2.0、LCNet 0.2.0 无须重新发布。

下一步待明确授权的具体操作：

1. 将门户 `codex/fix-standard-schema-validation` 的已验证检查器修复与证据推送、创建 PR，必需 CI 通过后合并 main 并验证门户 Pages。实现说明见 [检查器核验](../2026-09-08-schema-checker/README.md)。此前自动审批在执行前拒绝该门户推送/建 PR，理由是远程授权覆盖四个 Demo，门户仅授权本地修复；没有绕过重试。
2. 对 `chenmohan123/web-sdk-PP-OCRv6` 应用 [已准备的标签 Ruleset](../2026-09-08-schema-checker/ocr-release-tag-ruleset.json)：`refs/tags/v*` 禁止更新/删除，无 bypass，不限制创建。当前未应用。
3. 从上表已验证 main 为 Detection 和 OCR 各创建不可变 `v0.2.0` 标签并触发现有 npm provenance 发布流程，完成 GitHub Release。正式说明分别为 [Detection](https://github.com/chenmohan123/web-sdk-PP-Detection/blob/32b057b825037802ed025f1740409b1529d97fc5/docs/zh-CN/release-0.2.0.md)、[OCR](https://github.com/chenmohan123/web-sdk-PP-OCRv6/blob/ccecf95adcd18517c802828b45577c3c5985623c/reports/release/0.2.0.md)。发布后核对 registry、包内容、provenance 与标签提交，再通过 PR 更新公开示例到固定 0.2.0 并验证真实 npm 消费。

上述 npm/标签/治理操作没有执行。未将本地标准检查跳过的远端规则写成全部合规；OCR 标签保护仍是正式发布前的待办。
