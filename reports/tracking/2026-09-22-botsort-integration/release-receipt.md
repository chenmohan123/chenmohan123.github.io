# PP-Tracking 0.2.0-rc.1 线上发布回执

日期：2026-09-22。原集成回执记录发布前验收；本文件补充两仓合并后的远程发布和线上回读。

- SDK PR [#6](https://github.com/chenmohan123/web-sdk-PP-Tracking/pull/6) 合并提交 `ea20757c0ddb0a3c387981e9b57e8ea6d247e7f8`；门户 PR [#50](https://github.com/chenmohan123/chenmohan123.github.io/pull/50) 合并提交 `b292740444f8a9ab487035120c9ad2f53a314218`。
- SDK [`v0.2.0-rc.1` Release](https://github.com/chenmohan123/web-sdk-PP-Tracking/releases/tag/v0.2.0-rc.1) 与发布工作流 [35711667585](https://github.com/chenmohan123/web-sdk-PP-Tracking/actions/runs/35711667585) 成功；npm `next` 指向 `0.2.0-rc.1`，`latest` 保持 `0.1.0`。
- 发布 tarball SHA-256 为 `bf6d3463422e7c66d57dbfed9cafad6e1fb7be77ace11b72735d0bbc48b7bd97`，与本地固定包一致；npm packument 提供 SLSA provenance 声明。
- SDK Pages 部署 [35711334750](https://github.com/chenmohan123/web-sdk-PP-Tracking/actions/runs/35711334750) 成功；门户 Pages 部署 [35711420301](https://github.com/chenmohan123/chenmohan123.github.io/actions/runs/35711420301) 成功。
- [线上 Demo](https://chenmohan123.github.io/web-sdk-PP-Tracking/) 已回读 `0.2.0-rc.1`、ByteTrack、OC-SORT、DeepSORT 和 BoT-SORT；门户条目已同步 rc.1 Release 链接和 npm `next` 入口。

兼容范围仍限于已归档的 Windows 桌面 Chromium CPU/main 验证。手机、自动视频/摄像头调度、Safari、Firefox、Worker、NPU 和真实端到端速度没有新增声明。
