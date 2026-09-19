# PP-Tracking 0.1.0 发布与门户生产验收

日期：2026-09-19。独立 SDK `web-sdk-pp-tracking@0.1.0` 的 npm、GitHub Release、HTTPS Demo、仓库治理与 Pages 部署已完成远程核验；门户第八个算法条目已通过 PR、CI、受保护合并、Pages 部署和生产页面验收。

## 独立 SDK 链接核验

- 仓库与不可变来源提交：[`chenmohan123/web-sdk-PP-Tracking`](https://github.com/chenmohan123/web-sdk-PP-Tracking)，`c2ee347884426aa1a03962b76ac2915959397611`。
- npm：[`web-sdk-pp-tracking@0.1.0`](https://www.npmjs.com/package/web-sdk-pp-tracking/v/0.1.0)。公开 tarball 为 16541 字节，sha512 integrity 与本地唯一候选一致，并已完成 ESM/CJS 与状态 API 实际消费。
- GitHub Release：[`v0.1.0`](https://github.com/chenmohan123/web-sdk-PP-Tracking/releases/tag/v0.1.0)。资产 SHA256 为 `4b532782a008a5ef411d6db00fb58900884fef0c1759c15c9441d30a3093b2bb`。
- HTTPS Demo：[`https://chenmohan123.github.io/web-sdk-PP-Tracking/`](https://chenmohan123.github.io/web-sdk-PP-Tracking/)。线上交互证据仍限 Windows 桌面 Chromium 153、CPU/main 与 390px 桌面窄视口，不扩展手机或跨浏览器声明。
- SDK 完整发布证据：[独立仓库固定交付目录](https://github.com/chenmohan123/web-sdk-PP-Tracking/tree/1824e274bfb5e6814c2d4eb070081e7df7247b22/reports/2026-09-19-release)。SDK 证据 PR #2 已合并到 `1824e274bfb5e6814c2d4eb070081e7df7247b22`，[CI run 35425841954](https://github.com/chenmohan123/web-sdk-PP-Tracking/actions/runs/35425841954)与[Pages run 35425842071](https://github.com/chenmohan123/web-sdk-PP-Tracking/actions/runs/35425842071)均成功；源码、Demo 与入包文件和首发来源提交 `c2ee347884426aa1a03962b76ac2915959397611` 无差异。门户侧 [sdk-delivery.json](sdk-delivery.json) 保留为门户合并前的历史快照，不覆盖其当时的 `productionVerified=false`。

首版由本机认证发布，npm registry 返回 `provenance: null`。Trusted Publisher 已通过 HTTP 201 保存为仓库 `chenmohan123/web-sdk-PP-Tracking`、工作流 `release.yml`、环境 `npm`；配置回执没有独立 GET，Release 工作流只核对已存在的同完整性版本并跳过重复发布。因此 0.1.0 不声明经过 OIDC 发布；未来新版本须以实际 npm 回执为准。

## 门户生产验收

- [门户 PR #46](https://github.com/chenmohan123/chenmohan123.github.io/pull/46) 已通过受保护流程合并，合并提交为 `85a756e25a8ca1fbf164fb1cc48de26a998a46e1`；[main CI run 35425845677](https://github.com/chenmohan123/chenmohan123.github.io/actions/runs/35425845677)成功。
- [Pages run 35425845679](https://github.com/chenmohan123/chenmohan123.github.io/actions/runs/35425845679) 完成且结论为 success；github-pages 部署 ID `6537824165` 与上述合并提交一致。Pages Actions、HTTPS、环境分支策略、默认分支 Ruleset 及无 bypass actor 见[门户交付回执](portal-delivery.json)。
- 生产 Playwright 验证确认目录共有 8 个独立 SDK，CPU 与跟踪筛选、PP-Tracking 详情和独立仓库/npm/Demo 链接可用，beta 标记、真实 MOT17 指标、独立实现与无需权重边界可见；1440px 与 390px 均无横向溢出，且没有 page error。原始结果见[生产验收报告](portal/report.json)，截图见[目录 1440px](portal/directory-1440.png)、[目录 390px](portal/directory-390.png)、[详情 1440px](portal/detail-1440.png)和[详情 390px](portal/detail-390.png)。

生产门户验证使用桌面 Chromium 151.0.7922.34；独立 SDK Demo 的线上验证使用桌面 Chromium 153.0.8010.12。两组证据均包含 390px 桌面窄视口，不代表手机实机验证，也不能互换浏览器版本。初次生产脚本曾误把目录页的 Beta 标签断言到详情页；修正验收脚本后通过，产品源码没有因此修改。

`status: beta` 继续表示算法质量与兼容性边界，不表示链接或门户条目待发布。首版 npm 仍为本机认证发布、`provenance: null`；Trusted Publisher 已保存，但 0.1.0 未经新版本 OIDC 发布验证。未来版本必须以实际 npm 回执为准。

[Task 3 文档与元数据窄范围审查](task-3-docs-review.md)固定的是合并前两仓文档提交，结论为 Critical/Important/Minor 均为 0；它不预先代表本次生产回执收尾审查，本轮独立审查由主代理另行归档。
