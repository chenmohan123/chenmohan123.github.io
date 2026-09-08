# Detection 与 OCR 0.2.0 正式发布核验

核验日期：2026-09-08（Asia/Shanghai）。用户已明确确认门户 PR/合并/Pages、OCR 标签保护、两个 SDK 的标签/npm/GitHub Release 以及发布后示例同步。

## 远端交付

门户检查器 [PR #15](https://github.com/chenmohan123/chenmohan123.github.io/pull/15) 已通过必需 CI 并合并到 `de0e04444a8006030a145c999e9d5bdbdf4acfdd`，[Pages 部署](https://github.com/chenmohan123/chenmohan123.github.io/actions/runs/34191583911) 成功，线上 5 项冒烟通过。随后仅将目录中的 Detection npm 版本从 0.1.1 更新为真实已发布的 0.2.0；本地 50 项测试、构建及 5 项浏览器验证通过。

OCR 新增并通过 API 复核 Ruleset `22511290`：active，匹配 `refs/tags/v*`，禁止更新/删除，无 bypass。Detection 现有标签保护 `21779094` 仍有效。两库从已验证的 main 创建 `v0.2.0`，没有移动或重建标签。

| 包 | 不可变标签对应提交 | npm | GitHub Release |
| --- | --- | --- | --- |
| web-sdk-pp-detection@0.2.0 | `32b057b825037802ed025f1740409b1529d97fc5` | [registry 元数据](https://registry.npmjs.org/web-sdk-pp-detection/0.2.0) | [v0.2.0](https://github.com/chenmohan123/web-sdk-PP-Detection/releases/tag/v0.2.0) |
| web-sdk-pp-ocrv6@0.2.0 | `ccecf95adcd18517c802828b45577c3c5985623c` | [registry 元数据](https://registry.npmjs.org/web-sdk-pp-ocrv6/0.2.0) | [v0.2.0](https://github.com/chenmohan123/web-sdk-PP-OCRv6/releases/tag/v0.2.0) |

OCR [发布作业](https://github.com/chenmohan123/web-sdk-PP-OCRv6/actions/runs/34191528481) 成功，Release 包含六个官方 ONNX 与 manifest。Detection [发布作业](https://github.com/chenmohan123/web-sdk-PP-Detection/actions/runs/34191507994) 的 npm 上传成功并返回“正在处理包”，后续 registry 查询等待两分钟超时，作业因此为失败；稍后直接读取 registry、下载实物并验证全部成功。没有为改变历史作业状态重复上传。两库 Release 使用各自已审阅的版本专属中文说明。

## 公开包实物与来源

下载公开 registry `dist.tarball`，实际 SHA-512 与 `dist.integrity` 一致，公开 SLSA provenance 的 subject 摘要、`refs/tags/v0.2.0`、`.github/workflows/release.yml`、目标提交、GitHub hosted 构建及作业链接相互匹配。`gitHead` 同样匹配标签提交。详见 [public-packages.json](public-packages.json)。本次核对 provenance 内容与摘要，未执行 Sigstore 签名验签。

| 包 | 实际归档字节 | 文件数 | 与发布提交匹配的 SDK source map 源文件 |
| --- | ---: | ---: | ---: |
| Detection | 1,337,711 | 9 | 24 |
| OCR | 171,352 | 11 | 29 |

源码比较仅归一化 CRLF/LF。实际 npm publish 在 GitHub Linux 构建，与 Windows 本地 pnpm pack 的包哈希不同；以本表公开实物证据及后续真实 npm 消费验证为准。Detection 的本地 pnpm pack 曾包含父目录 LICENSE，而实际 npm publish 包为 9 文件；npm 许可元数据仍为 Apache-2.0，仓库保留 LICENSE。未将本地候选包哈希写作 registry 包哈希。

DocLayoutV3 1.2.0 和 LCNet 0.2.0 已覆盖现有 SDK 修复，本轮没有重复发布。

## 公开版本示例验收

- Detection 六种入口固定 0.2.0；四个构建型示例独立从 npm 安装并构建，六入口官方 PicoDet WASM/重复点击/取消共 12 项通过。额外独立公开包消费者完成类型、构建、main/Worker 推理、模型缓存查询/清理、取消与重复释放。
- OCR 三工程固定 npm 0.2.0、两静态入口固定 CDN 0.2.0；三个独立工程安装/类型/构建通过，五入口 × 两来源共 10 组真实 WASM OCR 通过。工作区校验包含 119 项 SDK、14 项 Demo/示例生命周期测试，全部通过。
- 两库修改前后标准检查均 required 18 通过、0 失败，四个远端规则本地跳过。pnpm 仅对已核验的自有精确版本添加最低发布时间例外，其余依赖解析保持原值。

报告分别位于 Detection 的 `docs/reviews/2026-09-08-examples-0.2.0.md` 和 OCR 的 `reports/release/0.2.0-examples.md`。本报告记录本地验收快照；后续示例 PR 的 CI、合并和 Pages 状态以对应 GitHub 记录为准。

运行环境为 Windows 10.0.26200、Chromium 151.0.7922.34、ONNX Runtime Web 1.27.0、WASM。Detection 示例隔离网络并使用本地官方模型字节；OCR 替换模型传输为现有微型 ONNX。上述证据不新增模型源网络、物理 GPU、移动端或微信宿主兼容结论。本轮未启动 runner，认证始终复用宿主机状态。
