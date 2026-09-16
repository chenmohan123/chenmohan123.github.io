# 门户 Tiny FP16 最终集成（2026-09-16）

## 问题与范围

本轮只在门户登记 PP-YOLO Tiny 320 的 FP16 稳定变体，不修改 SDK runtime、标准或旧评测报告。目录最终保持 14 个规格、39 个稳定变体：原 0.1.0 FP32 资产继续保留，新增 0.1.1 manifest，包含同一 FP32 来源和新的 FP16 ModelScope 资产。

SDK/npm 版本仍为 0.4.0；门户默认模型仍为 PicoDet-L 320 / FP32 / ModelScope；来源仍只允许 ModelScope 与 Hugging Face。生成器本轮绑定本地可读取的 SDK 候选提交 `e535ba6a04d715e064847769742b5243523eb0c8`。截至提交时未发现 `.tmp/tiny-precision/sdk-merged.json`，因此该提交是候选绑定，不代表 SDK 已完成合并；生产合并后应重新生成并复核来源摘要。

## 最终行为

- Tiny FP16 在比较页作为稳定变体展示，随 CPU/WASM 与 GPU/WebGPU 选择显示本轮同后端 FP32 对照。
- 本轮 FP32 对照 AP 为 CPU/GPU `22.59815664/22.59815664`，热推理为 `48.49500000/30.60500000 ms`。
- FP16 AP 为 CPU/GPU `22.52764248/22.42350740`，热推理为 `53.0049999952/37.1299999952 ms`。FP16 只作体积优势说明，不参与跨批次速度或质量排名。
- FP16 文件为 2,357,376 bytes，SHA-256 为 `331cef176e8af2eacd9bfc6d011ade2d29cd41f013af2db2c716566e035413cc`；ModelScope revision 为 `f8641fe3a12e62c93af8e8b3397abfb1b78746f7`。
- Tiny W8A32 不进入稳定目录：最差 AP 下降 `0.537364` 点，超过 `0.5` 点门槛，继续以 labs 显示。

## 数据来源与 SDK 发布证据

门户生成器从 SDK 候选提交读取 manifest、评测 summary、quality receipt、artifact index 和 gzip 原始证据，汇编记录见 [sources.json](./sources.json)。本轮 SDK 评测报告为 [2026-09-16 Tiny 精度评测](https://github.com/chenmohan123/web-sdk-PP-Detection/blob/e535ba6a04d715e064847769742b5243523eb0c8/reports/evaluation/2026-09-16-tiny-precision/README.md)，其中记录 18 组浏览器运行、补充契约验证和 W8A32 的失败边界。Tiny 0.1.1 manifest 与双 Hub 发布材料位于同一 SDK 提交；原 0.1.0 FP32 发布证据保留在 [2026-09-15 Tiny 发布记录](https://github.com/chenmohan123/web-sdk-PP-Detection/blob/e535ba6a04d715e064847769742b5243523eb0c8/reports/distribution/2026-09-15-ppyolo-tiny/README.md)。

## 实际验证

评测使用固定 64 张图片、716 个标注，Windows 11、Intel Core i5-10400F、物理 NVIDIA WebGPU、Chromium 153、ORT Web 1.27.0；主线程、WASM 单线程、关闭 SDK 后端回退。每个精度均完成 WASM/WebGPU × 3 轮，耗时排除首图并取 63 图中位数，再取三轮中位数。门户生成器同时校验压缩前后摘要、模型身份、运行时后端、FP32 对照和 39 行稳定清单。

旧 38 行的 bytes、SHA-256、WASM/WebGPU 汇总与 `.tmp/tiny-precision/comparison-before.json` 完全一致；模型目录中的旧 Tiny 0.1.0 FP32 资产未替换，只增加 Tiny FP16 第 39 行。门户文档与数据均由 `tools/detection-comparison/build.mjs` 生成。

## 限制与后续

该结果是固定子集和单机桌面环境证据，不外推全量 COCO、手机、NPU、其他浏览器或摄像头 FPS。FP16 严格 IoU 保留率约 67.788%，不能宣称框坐标逐点等价；文件变小也不等于运行内存同比减少。生产复核仍需确认 SDK 最终合并提交是否与候选一致，并以最终提交重新运行生成器 `--check`、门户构建和浏览器 E2E；本地本轮不执行 push、PR 或 merge。
