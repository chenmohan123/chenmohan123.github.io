# Tracking 0.2 RC 发布与门户同步

日期：2026-09-21。分层：独立 SDK 发布、门户标准 1.3 与目录说明；没有门户 runtime 或 Workflow 编排。

SDK [PR #3](https://github.com/chenmohan123/web-sdk-PP-Tracking/pull/3) 已合并，标签 `v0.2.0-rc.0` 固定提交 `041686f6c335a66dbe1f3796d6be5b5ae908c2cb`。[npm](https://www.npmjs.com/package/web-sdk-pp-tracking/v/0.2.0-rc.0) 的 `next=0.2.0-rc.0`、`latest=0.1.0`。[Release](https://github.com/chenmohan123/web-sdk-PP-Tracking/releases/tag/v0.2.0-rc.0) 为预发布；[发布 run 35574391794](https://github.com/chenmohan123/web-sdk-PP-Tracking/actions/runs/35574391794) 已实际完成 OIDC 上传及 provenance，[Pages run 35574347075](https://github.com/chenmohan123/web-sdk-PP-Tracking/actions/runs/35574347075) 成功。

公开包 46,274 字节，SHA256 `fe42d3ee4c5626ad823e8bd16288b079d6bd7dfd07e79fcff4e987ead8509e12`，与最终候选相同。隔离消费者的 `npm audit signatures` 已验证 registry signature 和 attestation；声明对应本仓库 release.yml、固定标签、提交与实际发布 run。线上 Demo 通过三算法、真实 ModelScope/WASM 与 Hugging Face/WebGPU、取消/复位/非法输入/缓存隔离和中英文 390px 桌面视口，浏览器错误为空。完整回执归档于[SDK 发布报告](https://github.com/chenmohan123/web-sdk-PP-Tracking/tree/main/reports/2026-09-21-02-release)。历史 alpha 评测和此前 RC 包哈希未改写。

门户仍以稳定 0.1.0 登记算法、CPU、无权重和原验证日期；摘要/限制明确 RC 的 next 安装、Demo 与 ReID 实验边界。门户 schema 未新增 hybrid/预发布字段，不用 RC 覆盖稳定兼容性声明。此前标准 1.3 的 hybrid 清单、模块后端与耗时、默认入口隔离和检查器实现一并通过本 PR 交付；历史阶段审查证据仍见各目录。

本地验证：136 项单测通过；21 页生产构建通过（0 errors、0 warnings、7 条既有 hints）；完整 16 项 Playwright 回归通过本次生产构建预览，见配套日志。本机 Astro dev 在 Vite 模块加载阶段超过 60 秒启动期限，两次超时均未进入页面断言；保留失败日志，生产预览 70ms 就绪。没有为这项本机现象改产品或 CI 配置，干净 GitHub CI 的 dev 模式结果按 PR 实际回执核对。

SDK 本轮完整 verify：176 单测、实际包消费、12 组浏览器；标准前后及收尾检查 21 required pass、0 fail、4 远程 skip，见 [before](../../sdk-standard/tracking-02-release-before-20260921.json)、[after](../../sdk-standard/tracking-02-release-after-20260921.json)、[final](../../sdk-standard/tracking-02-release-final-20260921.json)。远程 skip 由 SDK API 证据单独核验。

门户 PR、合并、生产部署与线上目录/详情回读在此文初稿时仍待完成；完成后记录为独立交付回执，不把本地构建当作线上结果。下一阶段为 BoT-SORT 相机运动补偿与输入契约可行性，不自动扩展为视频/摄像头、手机、NPU 或跨 SDK Workflow。
