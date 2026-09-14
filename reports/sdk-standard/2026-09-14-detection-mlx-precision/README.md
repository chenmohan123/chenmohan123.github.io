# PP-YOLOE+ M/L/X 精度评估检查记录

日期：2026-09-14。此次属于单 SDK 的模型工具与评测报告变更，门户仅同步规划和检查证据。SDK 仍为 `web-sdk-pp-detection@0.4.0`，没有新增稳定精度、模型下载源或 Demo 选项。

## 结果与范围

[固定评测报告](https://github.com/chenmohan123/web-sdk-PP-Detection/blob/e4814a44d42be5e213ef416cd0dfb2d7932c2340/reports/evaluation/2026-09-14-ppyoloe-mlx-precision/README.md)记录 9 组 Python 和 18 组桌面浏览器 WASM/WebGPU 的完整 64 图对比。FP16 体积缩小约 50%，W8A32 约 75%；六变体 AP 最大下降 0.348 个百分点，IoU≥0.5 的识别保留率均超过 97%。

六变体均未达到本轮沿用的 IoU≥0.99 严格坐标门槛，保留 labs。历史 S/PicoDet 的识别发布口径与该门槛不同，下一阶段先统一精度变体的验收目的，再安排重复运行、Worker 生命周期和分发验证。此结果不代表识别功能失效，也不否定文件压缩收益。

## 标准检查

- [before.json](before.json)：SDK 基线 `e87b6635c6699b2fae1a286ca497c422db4939f2` 的干净源码。
- [after.json](after.json)：SDK 提交 `e4814a44d42be5e213ef416cd0dfb2d7932c2340` 对应的最终源码。
- 两次检查均为 18 条 required 通过、0 失败、4 条远程规则跳过，状态为 `locally-compliant`。JSON 保留规则 ID、级别、证据路径和修复建议。
- 原工作区历史临时目录存在 ACL 限制，检查使用系统临时目录中的干净源码快照，未修改旧目录权限。报告中的 `before`、`source` 是快照目录名，对应关系以上述提交为准。

## 本地验证

SDK 完整 `pnpm verify` 通过，含 206 项 SDK 单测、14 项基准契约 Playwright 检查、格式、文档、发布契约、lint、类型检查和构建。相关 Python 回归 35 项、浏览器评测 runner 测试 5 项通过。独立审查核验了 51 份 gzip 摘要、27 组记录和报告表格；干净源码复算得到相同 `summary.json`，SHA-256 为 `0af361f50a41ad5fad39a2ad05577ae27fe1a2512cbc6e3fd56cbecd79ee1597`。

门户在干净源码副本中通过 50 项测试、Astro 检查与生产构建，以及 5 项浏览器检查。Astro 为 0 errors、0 warnings，6 条既有 hints。直接在原目录运行时曾误收集 `.tmp` 中旧 SDK 快照的测试，改用当前 Git 源码快照后全部通过。副本复用已安装依赖；设置进程级 `pnpm_config_verify_deps_before_run=false` 以防运行前自动安装试图替换依赖链接，实际格式、测试与构建检查照常执行。

本轮没有移动端、其他浏览器、峰值内存或全量 COCO 验证，不扩大已有兼容声明；一次运行的耗时只能作为本机观察。
