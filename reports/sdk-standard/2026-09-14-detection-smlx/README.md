# PP-YOLOE+ S/M/L/X FP32 线上发布验收

验证日期：2026-09-14（Asia/Shanghai；JSON 使用 UTC）。SDK 为已发布的 `web-sdk-pp-detection@0.4.0`，本轮仅更新模型与 Demo，不另发 npm 版本。

## 发布与来源

- SDK PR：[#65](https://github.com/chenmohan123/web-sdk-PP-Detection/pull/65)，合并提交 `e87b6635c6699b2fae1a286ca497c422db4939f2`。
- [PR CI](https://github.com/chenmohan123/web-sdk-PP-Detection/actions/runs/34769713955) 与[合并后 CI](https://github.com/chenmohan123/web-sdk-PP-Detection/actions/runs/34769902397) 均成功。
- [Pages 部署](https://github.com/chenmohan123/web-sdk-PP-Detection/actions/runs/34769902417) 成功，关联上述合并提交；API 确认 `build_type=workflow`、`https_enforced=true`。
- [正式 Demo](https://chenmohan123.github.io/web-sdk-PP-Detection/) 可选择 PicoDet 与 PP-YOLOE+ S/M/L/X，全部默认 ModelScope，来源仅 ModelScope 和 Hugging Face。
- M/L/X 新增 0.1.0 FP32 稳定清单；S 保留 0.1.1 的三精度。权重不加入 npm 或门户，门户只登记固定模型资产和证据。
- [固定模型发布报告](https://github.com/chenmohan123/web-sdk-PP-Detection/blob/e87b6635c6699b2fae1a286ca497c422db4939f2/reports/distribution/2026-09-14-ppyoloe-smlx/README.md)记录双源完整回读、上游许可、数值和生命周期验证。

## 正式站点真实推理

在 Windows 11 的 Chromium 153.0.8010.12 中打开正式 HTTPS 页面，无 fixture、无网络替换。各规格从全新浏览器上下文开始，显式选择 FP32，使用页面自带 `people.jpg`；依次运行 CPU 和 GPU，通过页面“导出 JSON”取得结果。

| 规格 | 模型字节数 | CPU 检测目标数 | GPU 检测目标数 |
| --- | ---: | ---: | ---: |
| S | 31,954,220 | 15 | 15 |
| M | 94,022,904 | 20 | 20 |
| L | 209,181,400 | 15 | 15 |
| X | 394,163,636 | 18 | 18 |

8 组均通过：模型 ID、FP32 精度、字节数、ModelScope 来源和 SHA-256 与版本化清单一致；实际后端分别为 WASM/WebGPU，回退列表为空，识别出 person，无页面异常。首轮观察到 ModelScope 请求及重定向后的 HTTP 200，GPU 轮可复用同一上下文缓存。目标数量用于核对执行记录，不作为精度排名。

- [verification.json](verification.json)：浏览器版本、部署提交、下载状态、模型和运行时摘要。
- `s-CPU.json` 至 `x-GPU.json`：8 份页面直接导出的完整检测结果。
- [M/GPU 截图](m-GPU.png)、[X/GPU 截图](x-GPU.png)：正式页面识别结果。

## 本地与 CI 检查

SDK 标准检查使用基线 `ff663002923fafe8cb5de5514bc779c3b05c4585` 与本轮最终源码快照，各有 18 条 required 通过、0 失败，4 条远程规则跳过；详细规则、证据路径和修复建议保存在 `sdk-check-before.json` 与 `sdk-check-after.json`。历史临时目录存在 ACL 限制，未修改其权限，改在干净源码快照执行遍历。SDK 完整 `verify` 已在 PR CI 的干净检出通过。

门户本地 `pnpm test --exclude '**/.tmp/**'` 通过 50 项；排除项仅为历史 SDK 审计快照，防止门户误收集其他仓库的测试。Astro 检查为 0 errors / 0 warnings（6 条既有 hints），生产构建通过；5 项 Playwright 回归通过，包含九个变体与 390px 视口无横向溢出。Playwright 使用门户版本对应的本机已安装 Chromium，未修改依赖和浏览器配置。

本轮新增 M/L/X 没有手机或微信 WebView 验证；桌面证据不扩展为所有设备兼容结论。L 的 FP16/W8A32 与 SOD 保持原 labs 状态。
