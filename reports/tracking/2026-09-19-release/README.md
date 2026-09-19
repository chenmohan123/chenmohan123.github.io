# PP-Tracking 0.1.0 发布与门户登记候选

日期：2026-09-19。独立 SDK `web-sdk-pp-tracking@0.1.0` 的 npm、GitHub Release、HTTPS Demo、仓库治理与 Pages 部署已完成远程核验；门户第八个算法条目已具备登记条件。本目录只记录门户合并前的链接核验与候选状态，不能作为门户生产站已包含第八条的证据。

## 独立 SDK 链接核验

- 仓库与不可变来源提交：[`chenmohan123/web-sdk-PP-Tracking`](https://github.com/chenmohan123/web-sdk-PP-Tracking)，`c2ee347884426aa1a03962b76ac2915959397611`。
- npm：[`web-sdk-pp-tracking@0.1.0`](https://www.npmjs.com/package/web-sdk-pp-tracking/v/0.1.0)。公开 tarball 为 16541 字节，sha512 integrity 与本地唯一候选一致，并已完成 ESM/CJS 与状态 API 实际消费。
- GitHub Release：[`v0.1.0`](https://github.com/chenmohan123/web-sdk-PP-Tracking/releases/tag/v0.1.0)。资产 SHA256 为 `4b532782a008a5ef411d6db00fb58900884fef0c1759c15c9441d30a3093b2bb`。
- HTTPS Demo：[`https://chenmohan123.github.io/web-sdk-PP-Tracking/`](https://chenmohan123.github.io/web-sdk-PP-Tracking/)。线上交互证据仍限 Windows 桌面 Chromium 153、CPU/main 与 390px 桌面窄视口，不扩展手机或跨浏览器声明。
- SDK 完整发布证据：[独立仓库交付目录](https://github.com/chenmohan123/web-sdk-PP-Tracking/tree/main/reports/2026-09-19-release)。门户侧摘要见 [sdk-delivery.json](sdk-delivery.json)。

首版由本机认证发布，npm registry 返回 `provenance: null`。Trusted Publisher 已通过 HTTP 201 保存为仓库 `chenmohan123/web-sdk-PP-Tracking`、工作流 `release.yml`、环境 `npm`；配置回执没有独立 GET，Release 工作流只核对已存在的同完整性版本并跳过重复发布。因此 0.1.0 不声明经过 OIDC 发布；未来新版本须以实际 npm 回执为准。

## 门户候选状态

`src/content/models/pp-tracking.yaml` 保持 `status: beta`、CPU/JavaScript 主线程、空资产与无需模型权重语义，并保留固定 MOT17 训练序列、状态生命周期、设备和浏览器限制。beta 表示算法质量与兼容性边界，不表示 SDK 链接仍待发布。

当前分支只准备门户第八条记录和部署内容。门户 PR、合并、生产站第八条、筛选/详情及线上回放尚待主代理完成并回读；完成前不得把本报告称为生产验收回执。
