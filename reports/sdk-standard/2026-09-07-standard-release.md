# SDK 标准整改发布记录

日期：2026-09-07。此记录承接 [标准整改](2026-09-07-standard-remediation.md)，分别记录 SDK 发布与门户目录更新。历史报告保留原验证日期和版本。

## 发布范围

| 仓库 | 版本 | 发布 PR | 在线 Demo |
| --- | --- | --- | --- |
| DocLayoutV3 | 1.2.0 | [#40](https://github.com/chenmohan123/web-sdk-PP-DocLayoutV3/pull/40)、[画布修复 #41](https://github.com/chenmohan123/web-sdk-PP-DocLayoutV3/pull/41) | [打开](https://chenmohan123.github.io/web-sdk-PP-DocLayoutV3/) |
| LCNet 文档方向 | 0.2.0 | [#5](https://github.com/chenmohan123/web-sdk-PP-LCNet_x1_0_doc_ori/pull/5) | [打开](https://chenmohan123.github.io/web-sdk-PP-LCNet_x1_0_doc_ori/) |
| 门户 | 目录同步 | [#14](https://github.com/chenmohan123/chenmohan123.github.io/pull/14) | [打开](https://chenmohan123.github.io/) |

两个 SDK 补齐标准耗时、真实缓存容量、当前/全部清理和并发保护。LCNet 新增实际运行会话信息、独立 Vanilla 示例与发布门禁；门户只维护目录、检查器和验证记录。

## 验证结果

- DocLayout：SDK 89 项、独立示例 12 项、Demo 26 项、打包与 WASM 浏览器 6 项通过；格式、文档契约、发布契约、lint、类型和构建通过。公开 npm 1.2.0 的独立 Vite 示例完成安装、构建和真实 WASM 推理。
- LCNet：13 项 Node 校验、51 项单元测试、32 项开发 Demo、10 项生产 Demo 通过；独立示例验证当前 tarball 和公开 npm 0.2.0 的真实 90° 推理、取消与错误恢复。
- 门户：28 项单元测试、5 项浏览器测试、Astro 构建和两个详情页的生产预览通过；保留 3 个既有 Zod 弃用提示。
- 标准检查：两个 SDK 各 18 项 required 通过、0 项失败、4 项远程规则跳过。远程配置与交付状态由 GitHub API 单独核对。

## 发布中发现并修复的问题

LCNet 的干净 CI 检出没有旧 dist，暴露 Demo 类型检查早于 SDK 构建的问题；已将完整验证调整为先构建，再类型检查和测试。

DocLayout 仍有旧版本断言，本地旧 dist 和复用开发服务掩盖了它；已更新断言，重新构建并启动全新服务验证。线上截图复查又发现清空结果后画布残留检测框，因此增加一个补充 PR；两项回归比较真实画布像素，清理后恢复原图，完整 Demo 共 26 项通过。

## 证据与限制

两份 npm 版本已公开：[DocLayout 1.2.0](https://www.npmjs.com/package/web-sdk-pp-doclayoutv3/v/1.2.0)、[LCNet 0.2.0](https://www.npmjs.com/package/web-sdk-pp-lcnet-x1-0-doc-ori/v/0.2.0)。[结构化发布证据](2026-09-07-release-evidence.json) 保存 PR 合并提交、main/tag Ruleset、Pages 运行、npm 来源证明及完整性，来源证明与各自不可变标签及提交一致。

DocLayout 发布作业的 `npm publish` 已成功，npm 随后提示需要数分钟处理。原流程仅等待约 14 秒就结束完整性查询，导致整条发布运行标为失败；版本可见后已另行核对公开 registry 和 provenance。没有重复 publish、移动标签或将该运行写成成功。LCNet 的发布运行成功。

两个独立消费者均通过 `npm audit signatures --omit=dev`：各 19 个运行依赖具有可验证的 registry 签名，3 个包具有可验证的来源证明。

LCNet 的 [GitHub Release](https://github.com/chenmohan123/web-sdk-PP-LCNet_x1_0_doc_ori/releases/tag/v0.2.0) 已创建。DocLayout 的 GitHub Release 待创建，[中文发布说明](https://github.com/chenmohan123/web-sdk-PP-DocLayoutV3/blob/v1.2.0/docs/releases/1.2.0.md) 已准备；npm 与 Pages 已公开。

两库的源码发布验收见各自 `docs/reviews/2026-09-07-release-1.2.0.md` 与 `docs/reviews/2026-09-07-release-0.2.0.md`。这些是发布前快照，线上结果以本次远程证据为准。

测试环境为 Windows 11、Chromium 151.0.7922.34、Node 24.16.0。线上真实模型验证使用默认 ModelScope 与 CPU/WASM，覆盖推理、缓存清理、390 像素宽布局和页面异常检查；不代表模型站点持续可用。LCNet 的 4 项 WebGPU 用例因无适配器跳过，DocLayout 未重跑物理 GPU 矩阵，未新增硬件兼容承诺。

两个 npm 版本已确认，门户 #14 可进入合并阶段；合并后的部署记录通过 [Pages Actions](https://github.com/chenmohan123/chenmohan123.github.io/actions/workflows/deploy.yml) 对应提交核验。
