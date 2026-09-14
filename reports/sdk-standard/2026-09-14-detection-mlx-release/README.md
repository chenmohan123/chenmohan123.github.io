# Detection M/L/X 六个精度变体发布收尾

日期：2026-09-14。分层为单 SDK 模型/Demo 发布与门户登记，未扩展 Workflow 或复制 SDK runtime。当前 PicoDet、PP-YOLOE+ S/M/L/X 各三精度，共 15 个稳定变体；本轮新增六个 FP16/W8A32，三个 FP32 是既有对照。SDK/npm 为 0.4.0，M/L/X 当前模型清单为 0.1.1。

## 固定证据

- [SDK 发布记录](https://github.com/chenmohan123/web-sdk-PP-Detection/blob/f6d79e4b51125c491eecd48bf7efd745ff5d3c9f/reports/distribution/2026-09-14-ppyoloe-mlx-precision/README.md)：固定三轮质量 54/54、main/Worker 生命周期 24/24、双源权重完整回读 12/12、元数据与目录回读 20/20。
- [正式 Demo 记录](https://github.com/chenmohan123/web-sdk-PP-Detection/blob/f6d79e4b51125c491eecd48bf7efd745ff5d3c9f/reports/distribution/2026-09-14-ppyoloe-mlx-precision/production-verification.json)：12/12，无页面错误；SDK [Pages 运行 34840438741](https://github.com/chenmohan123/web-sdk-PP-Detection/actions/runs/34840438741)，实际部署提交 `26333e2c77adf424b75a056e387f91f13c2d65d9`。三份线上清单与部署提交逐字节一致。
- 先前文档误用了门户提交，本次已经重新执行正式 Demo 验证并修正归因。包含修正记录的提交与被验证部署提交各自保留，不把门户 SHA 作为 SDK Demo 身份。
- 门户产品发布为 PR #28，提交 `74aaf38a4dca7cbdab9f77790ff2c890e9e93ed9`，对应 [Pages 运行 34838949893](https://github.com/chenmohan123/chenmohan123.github.io/actions/runs/34838949893)。本次仅补证据、规划状态和 15 项展示断言。

## 标准和回归

[before.json](before.json) 与 [after.json](after.json) 都为 required 失败 0、recommended 失败 0、远程规则 skip 4。after 检查使用含 SDK `f6d79e4b51125c491eecd48bf7efd745ff5d3c9f` 全部文件的干净源码快照，避免历史临时目录参与静态扫描。远程规则使用 [governance.json](governance.json) 的只读 GitHub API 证据，未修改保护规则或增加 bypass。

- SDK：完整 Demo 82/82；转换及质量证据 Python 35/35；浏览器评测 runner 5/5；双语文档 5/5；发布契约 29/29。CI 在受保护 PR 上执行完整 verify 与浏览器/package smoke。
- 门户：排除历史 `.tmp` 副本后的当前测试集 50/50，浏览器 5/5，覆盖全部 15 个资产及 390px 无横向溢出；Astro 检查 0 errors、6 处既有 hints，生产构建生成 9 个页面。
- 本机旧缓存/输出目录的 Windows ACL 曾阻止检查；验证改用新临时输出、源码快照和实际已安装 Chromium 153 路径，没有修改旧目录权限、跳过测试断言或把环境失败计作通过。正式 PR CI 使用干净检出复核。

识别门槛为 AP 下降≤0.5 点、score≥0.5/同类 IoU≥0.5 保留≥95% FP32 检测；实际最大 AP 下降 0.348 点，最低保留率 97.43%。FP16 约缩小 50%，W8A32 约缩小 75%；文件缩小不推导普遍加速或峰值内存改善。本轮桌面证据不扩大手机、微信 WebView 或完整 COCO 兼容声明。
