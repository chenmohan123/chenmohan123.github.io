# Tracking 0.2 发布候选回执

日期：2026-09-21。分层为单 SDK 版本与发布准备、门户规划文档。生产 registry、npm 和线上 Demo 仍为 `0.1.0`，本轮没有远程写入，没有复制 SDK runtime 或实现 Workflow。

SDK 实现提交 `99874c7fc89801dd2abfb1d78ad3bd767b6ed4d2` 将当前包/runtime/Demo/manifest 更新为 `0.2.0-rc.0`。ByteTrack 保持默认，OC-SORT/DeepSORT 显式可选，PPLCNet 人体 ReID 为实验能力。模型自身 `0.1.0`、两源 revision、SHA256 及许可边界保持不变。

预发布 npm 使用 `--tag next`，正式版使用 `--tag latest`；已存在相同完整性版本只核验、不上传或改标签。8项发布测试先 RED 后 GREEN。完整 verify 经修正一个固定旧版本的测试期望后通过：176项单测、SDK/Demo 类型与构建、真实包 ESM/CJS/两入口类型消费、无 ORT 默认入口、Vanilla/React 构建、12组浏览器流程。

真实生产 UI 的 ModelScope/WASM、Hugging Face/WebGPU 均成功，关联实际仍为 CPU；取消、切换复位、缓存隔离、中英文与390px布局通过，浏览器异常为空。环境为本机 Windows11/Chromium153、i5-10400F/RTX5060Ti；390px只是桌面视口，人工图只用于会话/接口测试，不冒充质量样本。构建保留既有可选ORT大分块提示。

实际候选包46313字节，SHA256 `fa082976517c4d767a36d59388661a82d3759507e334a71093e7addb1ea54076`。完整双语报告、发行包摘要、源码/构建/模型身份、运行记录、截图、远程只读原始响应、检查清单与证据锁位于 SDK `reports/2026-09-21-02-rc/`；本地 tarball 在 SDK `.tmp/web-sdk-pp-tracking-0.2.0-rc.0.tgz`。包内不包含权重或输入媒体。

17份runtime源码逐项与正式评测提交`0194ea5`核对，只有4处版本声明变更；模型声明完全不变。5316帧旧成绩继续引用[alpha阶段](../2026-09-21-mot-reid/README.md)，本轮仅复核32份归档哈希和指标/计时公式，未重跑全量评测、未将旧构建hash写成RC测量。

[before](../../sdk-standard/tracking-02-rc-before-20260921.json) / [after](../../sdk-standard/tracking-02-rc-after-20260921.json)标准回执为21 required通过、0失败、4远程skip，保持locally-compliant口径。远程只读确认npm仅有0.1.0/latest，默认分支和v*保护有效、Pages为Actions Source并强制HTTPS，既有成功部署有源码提交。未回读Trusted Publisher配置或执行新版本OIDC发布，不将历史发布任务当RC发布证明。

本地Demo为 <http://127.0.0.1:4204/>。下一步是本版本发布与发布后核验：经PR/CI合入、不可变RC tag/预发布Release、npm next及integrity回读、目标版本Demo部署与门户更新。当前仅完成本地候选准备。视频/摄像头、手机、其他浏览器、Worker/NPU、跨摄像头及Workflow继续后置；更后阶段BoT-SORT/JDE/FairMOT/CenterTrack未登记为已实现。

门户本轮构建通过：21页、0 errors、0 warnings，7项既有 hints 来自旧评测脚本类型与 Zod 弃用，见 `portal-build.log`。本轮未改门户产品代码，因此没有重复门户UI流程或无关测试套件。

最终任务审查与整体审查均通过，无严重或重要项；独立审查再次核对Git归档字节、当前构建/tarball及源码等价身份。SDK初始归档提交为`a51f0b0`，最终审查记录保存在其报告目录`closure/final-review.md`；后续收尾提交只保存文档与证据锁，不改变`99874c7`候选实现或实际包。
