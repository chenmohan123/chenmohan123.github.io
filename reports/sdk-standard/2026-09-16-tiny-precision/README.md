# 门户 Tiny FP16 最终集成（2026-09-16）

## 问题与范围

本轮只在门户登记 PP-YOLO Tiny 320 的 FP16 稳定变体，不修改 SDK runtime、标准或旧评测报告。目录最终保持 14 个规格、39 个稳定变体：原 0.1.0 FP32 资产继续保留，新增 0.1.1 manifest，包含同一 FP32 来源和新的 FP16 ModelScope 资产。

SDK/npm 版本仍为 0.4.0；门户默认模型仍为 PicoDet-L 320 / FP32 / ModelScope；来源仍只允许 ModelScope 与 Hugging Face。生成器绑定 SDK PR #74 的正式合并提交 `7516d394be79533fdf4980fab8c02cb198e95d97`，所有来源链接和汇编摘要均以该不可变提交重新生成。

## 最终行为

- Tiny FP16 在比较页作为稳定变体展示，随 CPU/WASM 与 GPU/WebGPU 选择显示本轮同后端 FP32 对照。
- 本轮 FP32 对照 AP 为 CPU/GPU `22.59815664/22.59815664`，热推理为 `48.49500000/30.60500000 ms`。
- FP16 AP 为 CPU/GPU `22.52764248/22.42350740`，热推理为 `53.0049999952/37.1299999952 ms`。FP16 只作体积优势说明，不参与跨批次速度或质量排名。
- FP16 文件为 2,357,376 bytes，SHA-256 为 `331cef176e8af2eacd9bfc6d011ade2d29cd41f013af2db2c716566e035413cc`；ModelScope revision 为 `f8641fe3a12e62c93af8e8b3397abfb1b78746f7`。
- Tiny W8A32 不进入稳定目录：最差 AP 下降 `0.537364` 点，超过 `0.5` 点门槛，继续以 labs 显示。

## 数据来源与 SDK 发布证据

门户生成器从 SDK 正式合并提交读取 manifest、评测 summary、quality receipt、artifact index 和 gzip 原始证据，汇编记录见 [sources.json](./sources.json)。本轮 SDK 评测报告为 [2026-09-16 Tiny 精度评测](https://github.com/chenmohan123/web-sdk-PP-Detection/blob/7516d394be79533fdf4980fab8c02cb198e95d97/reports/evaluation/2026-09-16-tiny-precision/README.md)，其中记录 18 组浏览器运行、补充契约验证和 W8A32 的失败边界。Tiny 0.1.1 manifest 与双 Hub 发布材料位于同一 SDK 提交；原 0.1.0 FP32 发布证据保留在 [2026-09-15 Tiny 发布记录](https://github.com/chenmohan123/web-sdk-PP-Detection/blob/7516d394be79533fdf4980fab8c02cb198e95d97/reports/distribution/2026-09-15-ppyolo-tiny/README.md)。

本轮 FP16 的双 Hub 固定 revision、完整回读、8 组合分发与 4 组合 Demo 证据见[本轮 Tiny 0.1.1 分发记录](https://github.com/chenmohan123/web-sdk-PP-Detection/blob/7516d394be79533fdf4980fab8c02cb198e95d97/reports/distribution/2026-09-16-tiny-precision/README.md)。

## 实际验证

评测使用固定 64 张图片、716 个标注，Windows 11、Intel Core i5-10400F、物理 NVIDIA WebGPU、Chromium 153、ORT Web 1.27.0；主线程、WASM 单线程、关闭 SDK 后端回退。每个精度均完成 WASM/WebGPU × 3 轮，耗时排除首图并取 63 图中位数，再取三轮中位数。门户生成器同时校验压缩前后摘要、模型身份、运行时后端、FP32 对照和 39 行稳定清单。

旧 38 行的 bytes、SHA-256、WASM/WebGPU 汇总与 `.tmp/tiny-precision/comparison-before.json` 完全一致；模型目录中的旧 Tiny 0.1.0 FP32 资产未替换，只增加 Tiny FP16 第 39 行。门户文档与数据均由 `tools/detection-comparison/build.mjs` 生成。

## 限制与后续

该结果是固定子集和单机桌面环境证据，不外推全量 COCO、手机、NPU、其他浏览器或摄像头 FPS。FP16 严格 IoU 保留率约 67.788%，不能宣称框坐标逐点等价；文件变小也不等于运行内存同比减少。SDK 正式 Pages 部署与 HTTPS 验证已通过，见 [生产证据](./sdk-production.json)：新旧 manifest 字节完全一致，FP16 双源×两后端 4 组与默认 PicoDet/Tiny FP32 3 组均完成真实检测且未回退。门户按 SDK 正式合并提交重新生成，`--check`、63 项单测、构建和 8 项浏览器 E2E 均通过；门户生产部署后另行归档页面复核。
