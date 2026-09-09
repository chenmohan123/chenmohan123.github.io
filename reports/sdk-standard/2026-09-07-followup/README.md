# 发布流程与 GPU 后续检查

> 归档说明（2026-09-09）：本目录是 2026-09-07 的历史快照，原始问题状态与测试边界保持不变。
> 后续整改分别见[示例与缓存](../2026-09-07-examples-cache/README.md)、
> [运行时与耗时](../2026-09-08-runtime-performance/README.md)和
> [检查器 schema](../2026-09-08-schema-checker/README.md)；模型来源真实传输的后续证据见
> [2026-09-09 线上验收](../2026-09-09-real-network/README.md)。

日期：2026-09-07。标准版本：1.1.0。此目录保存本轮新证据，不修改上一轮发布时的历史快照。

## 已落地的发布流程修复

DocLayout [PR #42](https://github.com/chenmohan123/web-sdk-PP-DocLayoutV3/pull/42) 已合并到 `main@53cbbfb3cfa350abdd505765ca36540708fdd213`。发布后完整性查询允许十分钟的可见性等待，每次请求上限 15 秒，整个步骤上限 17 分钟；持续失败明确提示不要重复发布。没有重新发布 npm 或修改版本标签。

PR CI `34137067003`、main CI `34137705127`、Pages `34137705244` 均成功。本地发布回归 25 项通过；完整验证的历史目录权限限制及逐项验证结果见 SDK 中的 `docs/reviews/2026-09-07-npm-registry-wait.md`。

Detection [PR #23](https://github.com/chenmohan123/web-sdk-PP-Detection/pull/23) 修复物理 GPU 测试配置，已合并到 `main@bca3ac5f2d56fb58a543b36b5a0e8e3ab23007c8`。PR CI `34138756082`、main CI `34139100124` 与 Pages `34139100078` 均成功；只修改测试与验证文档，生产 SDK/Demo 不变。本地完整 `pnpm run verify` 通过，详细记录见 SDK 中的 `docs/reviews/2026-09-07-physical-gpu-smoke.md`。

## OCRv6 与 Detection 标准审计

两库的检查器结果都是 required 18 通过、0 失败、4 远程规则跳过，但人工复现证明检查器遗漏了实际缺陷。不能据这个自动结果声称所有功能符合标准。

| SDK | 主要发现 | 详细证据 |
| --- | --- | --- |
| OCRv6 0.1.8，`5a0923d` | 清缓存后在途下载写回；当前缓存身份固定；IndexedDB 容量缺项；热运行和空结果耗时错误；回退后的实际后端误报；多个示例不能构建；manifest 状态枚举不合规 | [审计报告](ocr-standard-followup.md)、[原始扫描](ocr-audit-2026-09-07.json) |
| Detection 0.1.1，`6474f5e` | 主要示例缺少模型参数；缓存界面和并发清理缺口；初始化计时缺项；视频每帧重建会话、迟到启动缺少保护；部分文档声明矛盾 | [审计报告](detection-followup-audit.md)、[原始扫描](detection-followup-audit.json) |

这些 SDK/Demo 实现问题是本轮审计发现，尚未在本轮整改。建议先修复无法运行的示例与缓存并发，再处理后端/耗时报告、视频会话复用及检查器漏检。原始审计报告的“未执行 GPU”是审计子任务边界，后续 GPU 结果以本页为准。

## 真实 GPU 结果

环境：Windows 11、NVIDIA GeForce RTX 5060 Ti、驱动 32.0.16.1074、Chromium 151.0.7922.34。完整 Chromium 取得 `nvidia / blackwell` 适配器，`isFallbackAdapter=false`；[环境探测](gpu-environment.json) 同时保留 Chrome 152 的能力探测，不将其当成推理通过记录。默认 headless shell 没有适配器，不能把其跳过状态写成硬件通过。

| SDK | 本轮结果 | 范围与限制 |
| --- | --- | --- |
| DocLayout 1.2.0 | FP16 严格 WebGPU 真实模型推理用例 1 项通过 | 使用仓库模型与 `table.png`；没有重新运行 FP32 七图基准或跨设备矩阵 |
| LCNet 0.2.0 | ModelScope/Hugging Face 两个选择路径的 WebGPU 用例通过，均识别为 90° | 使用仓库官方模型字节替代远程传输；真实 SDK、ORT 和浏览器推理，不证明两个模型站点持续可用 |
| OCRv6 0.1.8 | 线上默认 Small、GPU + Worker，识别出 146 行；隔离网络后 Small → Tiny 切换及下载错误恢复均通过 | [真实线上结果](ocr-gpu-smoke-live.json) 保留 Tiny 下载超过 180 秒的超时；[隔离网络复测](ocr-gpu-smoke.json) 使用 SHA-256 校验的同一官方模型字节，仍运行线上 SDK 与清单；390px 无横向溢出 |
| Detection 0.1.1 | 线上 ModelScope、GPU FP32 检测出 12 个目标；修复后的物理 GPU 用例通过 | [线上结果](detection-gpu-smoke.json)。原测试错误引用 ORT 资源和文档示例图；测试修复使用完整 Chromium、正确 `/ort/` 路径与已有 `people.jpg`，并要求非软件适配器和 person 结果 |

没有启动、迁移或修改 runner。需要运行 runner 时，使用用户指定的 `F:\github-runner`。

以上是功能与控制流检查，不是 OCR 精度评测、性能基准或通用兼容承诺。没有重发任何 npm 版本。
