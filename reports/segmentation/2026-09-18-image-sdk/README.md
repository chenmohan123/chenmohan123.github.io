# 独立实例分割 SDK 本地阶段

日期：2026-09-18。分层：独立 SDK；门户只维护此阶段记录和路线，不引入推理代码或 Workflow。

本地仓库 `../web-sdk-PP-Segmentation`，分支 `codex/segmentation-image-sdk`，版本 `0.1.0-alpha.0`。本轮未创建远程仓库、上传模型、发布 npm、部署 Demo 或登记门户稳定目录。

## 实现与验证

- PP-YOLOE_seg_s 640 FP32，36,265,193 字节；ONNX SHA-256：`d418de8890fa13ae213aefeff4216bda2dcf961678494cd4baf55d9942a77334`。
- 框架无关 load/run/dispose、WASM/WebGPU、main/Worker、版本化缓存与 SHA-256、取消与释放；返回原图紧致二值 ROI。ROI 可越过检测框边缘，绘制使用 mask 自身偏移。
- 42 项单测、类型检查、SDK/Demo 构建及 npm 清单检查通过。真实 Demo 四组合、390px、中英、选择不跳动、取消/换图恢复、两种缓存清理、Vanilla 与生产来源禁用检查通过。
- Windows 11 10.0.26200、Chromium 153.0.8010.12、i5-10400F、RTX 5060 Ti、ORT Web 1.27.0；64 张固定 COCO 图片、716 项标注、四组合共 256 次公开 SDK 推理。

## 质量结论与后续

官方同输入 mask AP 为 36.933058%；SDK WASM 为 36.855369%、WebGPU 为 36.855373%，下降约 0.078 个百分点，通过≤0.5点门槛。主线程和 Worker 结果一致。

严格掩码门槛仍为 **failed**：423 个高置信度匹配实例中，图片 204871 的 car 完整原图 IoU 为 0.978824，低于 0.99。全部差异为官方实现将 612×612 截成 611×611 而丢失的 58 个边缘前景像素；双方共同区域逐像素一致。本轮保留 SDK 完整原图掩码和原始失败报告，不能宣称稳定验收全面通过。

下一步先明确这项尺寸语义及发布验收口径，再核验权重再分发许可、ModelScope/Hugging Face 不可变来源并准备正式发布。默认 ModelScope 的产品方向不变；目前双源尚未配置，开发 Demo 只加载本地模型。手机、NPU、视频与摄像头未验证或未实现。

可复算证据位于独立 SDK 的 `reports/2026-09-18-image-sdk/`：`acceptance.json`、四组合压缩结果、官方结果、`edge-diagnosis.json`、`postprocess-benchmark.json`、`browser-execution.json` 和 `ui/summary.json`。原始可行性记录仍保留在[上一阶段](../2026-09-18-feasibility/README.md)。

门户静态规范检查保存在 `reports/sdk-standard/segmentation-before.json` 和 `segmentation-after.json`。静态合规不替代上述真实质量门槛或远程发布核验。
