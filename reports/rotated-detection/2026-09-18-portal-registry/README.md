# PP-RotatedDetection 门户登记

日期：2026-09-18。范围：门户目录、旋转框检测分类、详情链接与当前规划。独立 SDK 和 Demo 的实现不变，Workflow 继续暂缓。

## 登记依据

新增 `web-sdk-pp-rotated-detection@0.1.0`，门户共 7 个 SDK。PP-YOLOE-R-s 1024 FP32 的模型身份、33,161,415 字节、SHA-256 和默认 ModelScope 固定地址均与 SDK 清单一致；保留 DOTA 15 类、单张图片和桌面验证边界。发布状态与固定回执见 [metadata.json](metadata.json)。

SDK 固定提交 `b54ae15ca124fd111cac6e683409fdbb88a14e13` 的[发布回执](https://github.com/chenmohan123/web-sdk-PP-RotatedDetection/tree/b54ae15ca124fd111cac6e683409fdbb88a14e13/reports/2026-09-18-release)已记录 npm 0.1.0、GitHub Release、HTTPS Demo 和双源八组合验收；本轮另保存[线上元数据回读](online-metadata.json)，确认 npm 版本与 integrity、正式非草稿 Release 及 Demo HTTP 200。本轮没有重新执行模型推理，也不把五输入或 P0861 单图结果解释为全量 DOTA mAP。SDK、官方代码与转换权重按 Apache-2.0 采用并保留 PaddleDetection 归因；固定许可回执同时说明未发现独立点名权重的许可文本。

## 边界与路线

门户只登记和跳转，不复制旋转框 runtime。当前不声明大图切片、视频、摄像头、跨帧跟踪、手机或 NPU 支持。ByteTrack 与 OC-SORT 正在进行独立跟踪 SDK 可行性评估；结论完成前不建立生产 SDK，Workflow / Playground 继续暂缓。

## 检查结果

- 2026-09-19 完成最终门户验证：`pnpm test` 共 68 项通过，其中包括旋转框登记结构、固定 ModelScope 资产、分类标签和筛选回归。
- `pnpm build` 的 Astro 类型检查为 0 错误，18 个静态页面构建成功；7 条既有提示来自历史评估脚本和 Zod 弃用 API。
- `pnpm test:e2e` 共 14 项通过，使用 `F:/git/00_chenmohan/github/web-sdk-PP-Detection/.tmp/dependencies-compatible-browsers`，覆盖 1280px/390px 的分类、包名搜索、详情、GitHub/npm/Demo 链接、任务路由和页面宽度。
- SDK 标准检查[前](sdk-check-before.json)和[后](sdk-check-after.json)均为 18 项 required 通过、required 失败 0、4 项远程规则跳过、3 项 recommended 通过，状态为 `locally-compliant`。本地 checker 不替代线上治理与部署验证。
- 浏览器首次运行因指定目录只有 revision 1243、门户 Playwright 需要 revision 1234，14 项均在浏览器启动前失败；补齐 1234 后第二次运行复用了旧 Astro 服务，8 项通过、6 项仍读到旧的 6 条目录。结束该临时服务并用当前工作树重启后，14 项全部通过。两次失败均未发现产品逻辑错误。

所有 pnpm 命令均附加 `--config.verify-deps-before-run=false --config.manage-package-manager-versions=false`。`git diff --check` 通过；未修改 SDK、npm 配置或远程仓库。

## 风险

当前兼容结论只覆盖固定发布证据中的 Windows/Chromium 桌面环境。大图切片、视频、摄像头、跨帧跟踪、手机、NPU、Safari、Firefox 和微信 web-view 均未验证；DOTA 15 类也不等同于 COCO 通用检测。权重按 Apache-2.0 采用，但上游未独立点名权重许可，门户保留该证据边界。
