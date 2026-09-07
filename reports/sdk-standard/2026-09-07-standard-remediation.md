# 2026-09-07 SDK 标准整改

本轮补齐 DocLayout 和 LCNet 的既有标准缺项，保留原公开 API；门户仅修复标准检查器的示例识别与证据路径。未更新门户产品目录、SDK 版本、npm 包、GitHub Release 或线上部署。

## 改动范围

| 仓库 | 改动 |
| --- | --- |
| `web-sdk-PP-DocLayoutV3` | 标准缓存读取耗时、当前模型与全部 SDK 缓存清理、容量估计、清理期间的任务释放与回填保护，补充 Demo、测试及双语文档 |
| `web-sdk-PP-LCNet_x1_0_doc_ori` | 独立加载耗时、会话实际后端与 Worker 运行信息、限定作用域缓存 API、Demo 状态与独立 Vanilla 示例 |
| 门户 | 将真实 `examples/vanilla-vite` 同时识别为 Vanilla 和 Vite 示例；示例规则的报告指向实际示例文件 |

标准来源仍是 `standards/v1`，未把规则复制到 SDK 实现或门户页面。

## 验证与证据

[最终离线检查结果](2026-09-07-remediation.json)：DocLayout required 失败从 4 项降为 0，LCNet 从 8 项降为 0；两库各通过 18 项 required，远程规则各跳过 4 项，状态为 `locally-compliant`。其中 DocLayout 的 Vanilla 缺项包含检查器对真实 `vanilla-vite` 示例的识别误判。

独立复查提出的缓存键碰撞、清理影响其他模型写入、缓存身份未随远端版本更新、加载期间应用另一清单等问题均已修复，并通过先失败后通过的回归验证。

两库的详细回归及环境限制分别记录在：

- `web-sdk-PP-DocLayoutV3/docs/reviews/2026-09-07-cache-standard.md`
- `web-sdk-PP-LCNet_x1_0_doc_ori/docs/reviews/2026-09-07-standard-remediation.md`

门户检查器定向测试 20 项、全部单元测试 28 项、浏览器测试 5 项通过，门户构建通过。Astro 没有错误或警告，保留 3 个既有 Zod 弃用提示。

LCNet 独立示例使用已公开的 `0.1.2` npm 包，无工作区源码依赖；`pnpm examples:verify` 已验证独立安装和构建、90° 图片的真实 WASM 推理、取消以及下载失败后的状态恢复。模型传输在回归中固定为仓库官方模型字节；该验证不代表本轮新 API 已经在 npm 发布，也不证明远程模型站点持续可用。截图可由 `scripts/verify-vanilla-browser.mjs` 重新生成。

DocLayout 的 `pnpm run verify` 被既有 `work/pytest-basetemp-20260815` 目录的权限错误挡在格式扫描阶段。没有修改该目录或权限；修改文件的显式格式检查通过，其余验证阶段逐项运行。不得将其写成完整 `pnpm verify` 一次通过。

## 远程治理与发布边界

[远程治理证据](2026-09-07-governance.json) 记录了 2026-09-07 的 GitHub 只读 API 响应：两个仓库的 main 分支和发布标签 Ruleset 均启用、无 bypass；main 要求 PR、当前 CI 检查和已解决的讨论，并阻止删除与强推；发布标签阻止更新与删除；Pages 使用 GitHub Actions 且开启 HTTPS。复用了宿主机已有登录，未改变认证状态。

这份证据对应现有远程配置，不能证明本轮未提交代码已经部署。离线检查器的远程规则仍应标为跳过；完整部署与新版本发布须有对应提交、运行和发布记录。原始 Pages 审查报告保留，未被本轮结果覆盖。
