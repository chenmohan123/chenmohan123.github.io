# Web SDK 社区模型发布报告

验证日期：2026-08-27（Asia/Shanghai）

## 结论

已在 `chenmohan` 账号下向 Hugging Face 和 ModelScope 各发布三个公开模型仓库，许可证均为 Apache-2.0。三个 SDK Demo 保留 `SDK 默认` 为默认来源，并提供 `Hugging Face`、`ModelScope` 两个固定版本来源；SDK runtime/API 未修改。

六个固定 manifest 均返回 HTTP 200、可解析为 JSON，并允许 `https://chenmohan123.github.io` 发起跨域请求。两个平台各下载验证 9 个 ONNX，共 18 个；字节数与 SHA-256 均与 SDK 原始模型一致。六组“SDK × 社区来源”真实浏览器推理均成功。

## 公开仓库与固定版本

| SDK | Hugging Face 仓库 | Hugging Face manifest revision | ModelScope 仓库 | ModelScope manifest tag |
| --- | --- | --- | --- | --- |
| PP-DocLayoutV3 | <https://huggingface.co/chenmohan/web-sdk-pp-doclayoutv3> | `13bbf4e3e91172c0407cf14742ac8291dc69353b` | <https://modelscope.cn/models/chenmohan/web-sdk-pp-doclayoutv3> | `v1.0.3` |
| PP-LCNet_x1_0_doc_ori | <https://huggingface.co/chenmohan/web-sdk-pp-lcnet-x1-0-doc-ori> | `5665496d5026b0b4f435a1c3040ef8fb7bb44402` | <https://modelscope.cn/models/chenmohan/web-sdk-pp-lcnet-x1-0-doc-ori> | `v1.0.0` |
| PP-OCRv6 | <https://huggingface.co/chenmohan/web-sdk-pp-ocrv6> | `9286e2c113f4ad1980d39efc3838f8bfb83b2173` | <https://modelscope.cn/models/chenmohan/web-sdk-pp-ocrv6> | `v1.0.0` |

Hugging Face 集合：<https://huggingface.co/collections/chenmohan/web-sdk-models-6a8e53a60f0e73507f5d4290>，已包含 3 个模型。

ModelScope 集合：<https://modelscope.cn/collections/chenmohan/Web-SDK-Models>，已验证“全部（3）”，包含 PP-DocLayoutV3、PP-LCNet_x1_0_doc_ori 和 PP-OCRv6。

DocLayoutV3 的 Hugging Face manifest 引用资产提交 `0f7aad997ccdb8b3421fa1ad1da962bd02c2d6bd`。ModelScope manifest 引用不可变资产标签 `v1.0.2-assets`；早期 `v1.0.2` manifest 的旧式资产 URL 返回 404，因此保留旧标签并发布修正版 `v1.0.3`，未移动或覆盖已发布标签。

## 固定 manifest

| SDK | 平台 | URL | HTTP | CORS |
| --- | --- | --- | ---: | --- |
| PP-DocLayoutV3 | Hugging Face | `https://huggingface.co/chenmohan/web-sdk-pp-doclayoutv3/resolve/13bbf4e3e91172c0407cf14742ac8291dc69353b/1.0.2/manifest.json` | 200 | `https://chenmohan123.github.io` |
| PP-DocLayoutV3 | ModelScope | `https://modelscope.cn/models/chenmohan/web-sdk-pp-doclayoutv3/resolve/v1.0.3/1.0.2/manifest.json` | 200 | `*` |
| PP-LCNet_x1_0_doc_ori | Hugging Face | `https://huggingface.co/chenmohan/web-sdk-pp-lcnet-x1-0-doc-ori/resolve/5665496d5026b0b4f435a1c3040ef8fb7bb44402/1.0.0/manifest.json` | 200 | `https://chenmohan123.github.io` |
| PP-LCNet_x1_0_doc_ori | ModelScope | `https://modelscope.cn/models/chenmohan/web-sdk-pp-lcnet-x1-0-doc-ori/resolve/v1.0.0/1.0.0/manifest.json` | 200 | `*` |
| PP-OCRv6 | Hugging Face | `https://huggingface.co/chenmohan/web-sdk-pp-ocrv6/resolve/9286e2c113f4ad1980d39efc3838f8bfb83b2173/1.0.0/manifest.json` | 200 | `https://chenmohan123.github.io` |
| PP-OCRv6 | ModelScope | `https://modelscope.cn/models/chenmohan/web-sdk-pp-ocrv6/resolve/v1.0.0/1.0.0/manifest.json` | 200 | `*` |

## 模型资产校验

下表每个文件均分别从 Hugging Face 与 ModelScope 完整下载，并与 SDK 原始文件比较；两个平台结果相同。

| SDK | 文件 | 字节数 | SHA-256 |
| --- | --- | ---: | --- |
| PP-DocLayoutV3 | `1.0.2/model-fp16.onnx` | 74,279,796 | `463ba56faa555baf84271b4002b33b0c5fcc50776fe4f39344235eccb72073f2` |
| PP-DocLayoutV3 | `1.0.2/model-fp32.onnx` | 142,574,928 | `476da6d3892bc6211ec90f53df1f68722626b3cf67af77d1c75bd0bd2ee8d269` |
| PP-LCNet_x1_0_doc_ori | `1.0.0/inference.onnx` | 6,788,069 | `af9a0a4f317ff0709ce752067807f819cb15d883f8ecad89f28df1c6ee2d9c92` |
| PP-OCRv6 | `1.0.0/PP-OCRv6_medium_det.onnx` | 62,032,837 | `eb13b44b25bb36f89528b68720af8a61d9cf381176107f465db1757b65d086e1` |
| PP-OCRv6 | `1.0.0/PP-OCRv6_medium_rec.onnx` | 76,554,979 | `9c09abf0957f7968c7586464b7397b84ad2387a0497a351af40e9acc71b673ba` |
| PP-OCRv6 | `1.0.0/PP-OCRv6_small_det.onnx` | 9,880,512 | `d73e0058b7a8086bbd57f3d10b8bcd4ff95363f67e06e2762b5e814fe9c9410e` |
| PP-OCRv6 | `1.0.0/PP-OCRv6_small_rec.onnx` | 21,159,378 | `5435fd747c9e0efe15a96d0b378d5bd157e9492ed8fd80edf08f30d02fa24634` |
| PP-OCRv6 | `1.0.0/PP-OCRv6_tiny_det.onnx` | 1,780,590 | `193bab7a04fca699a6c82e6abb5b81bdb28177f0abd4062552b04908dafb19f8` |
| PP-OCRv6 | `1.0.0/PP-OCRv6_tiny_rec.onnx` | 4,462,639 | `9ef676d6ed3c88256a2d92c640c44f25b0c40947e111b14b8be8f594091563e6` |

OCRv6 的三个识别字典也按相对 manifest 路径发布；manifest 保留字典条目数和上游 revision 信息。

## Demo 接入与真实推理

三个 Demo 的来源顺序均为 `default`、`huggingface`、`modelscope`。`default` 不传远程 manifest，也不传自定义 `model`；OCRv6 默认 `small/small` 同样省略 `model`，继续使用 SDK 默认行为。切换来源会取消或等待旧任务、释放旧实例，并清空旧结果和状态。

| SDK | Hugging Face | ModelScope | 验证方式 |
| --- | --- | --- | --- |
| PP-DocLayoutV3 | 检测完成，13 个版面区域 | 检测完成 | 本地 Demo、示例 `layout-demo.jpg`、WebGPU/FP16 |
| PP-LCNet_x1_0_doc_ori | 检测完成 | 检测完成 | 本地 Demo、官方倒置样例、WASM |
| PP-OCRv6 | 识别完成，144 行 | 识别完成 | 生产构建预览、示例图片、WebGPU、small/small |

OCRv6 的 Vite 开发服务器会把 ONNX Runtime WASM 资产请求回退为 HTML，导致 WASM 初始化失败；同一代码的生产构建包含正确 WASM 资产，两个社区来源均已在生产预览中完成真实推理。该限制属于既有开发服务器资产路径问题，不是远程 manifest、ONNX 或 CORS 问题。

## 本地验证

| 项目 | 结果 |
| --- | --- |
| DocLayoutV3 SDK 单元测试 | 9 个文件、81 项通过 |
| LCNet SDK 单元测试 | 12 个文件、24 项通过 |
| OCRv6 仓库/SDK 测试 | 5 项仓库契约 + 20 个文件、61 项 SDK 测试通过 |
| 三个 Demo 类型检查 | 全部通过 |
| DocLayoutV3 / LCNet Demo lint | 全部通过；OCRv6 Demo 未配置 lint 脚本 |
| 三个 Demo 生产构建 | 全部通过；OCRv6 有既有的大 chunk 警告 |
| 三个 Demo Playwright | DocLayoutV3 `15/15`、LCNet `18/18`、OCRv6 `14/14` 通过 |
| 门户测试 / Astro check / build | `20/20`、0 diagnostics、构建通过 |
| SDK 标准检查 | OCRv6 `locally-compliant`；DocLayoutV3/LCNet 保持既有 `partial` |

DocLayoutV3 的仓库级 `pnpm verify` 未整体通过：第一步 `prettier --check .`
发现 36 个既有格式漂移文件；提升工作区权限后，12 项示例构建断言全部通过，
但 Vitest worker 在约 65 秒结束时发生 `onTaskUpdate` RPC 超时并将进程标记为失败。
该仓库的 81 项 SDK 单元测试、Demo 类型检查、lint、生产构建和 15 项
Playwright 测试均已分别通过。

DocLayoutV3 的标准检查仍有 6 项 required、2 项 recommended 本地缺口；LCNet 仍有 7 项 required、2 项 recommended 本地缺口。两者另有 4 项远程规则被离线检查器标记为 `skip`。这些是已有治理缺口，不由本次 Demo 来源改动引入。

## 范围与限制

- 远程仓库为个人维护的公开 ONNX 衍生/镜像仓库，不是 PaddlePaddle 或 PaddleOCR 官方仓库，也未获得其背书。
- 所有模型卡均保留上游来源、Apache-2.0 许可和第三方声明。
- 本次未修改任何 SDK runtime/API；Demo 与报告变更仅推送到功能分支，不直接修改远程默认分支。
- 固定 revision/tag 保证 Demo 不跟随可变 `main` 或 `master`；发布新内容时应创建新版本，而不是移动既有标签。
