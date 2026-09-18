# 旋转框独立 SDK 可行性评估

日期：2026-09-18。分层：单 SDK 的前置可行性实验。本轮只写报告和忽略目录中的实验产物，未创建 SDK、修改产品源码或发布模型。

**建议把 PP-YOLOE-R-s 单尺度 FP32 作为独立旋转框 SDK 的首发候选。** 两个候选均已完成实际转换、官方数值对照及本机桌面 WASM/WebGPU 验证。FCOSR-M 可以保留为后续候选，但模型体积和 WASM 耗时明显更大；固定上游不存在可核验的 FCOSR-s/n 小规格配置或权重。

## 候选与来源

固定 PaddleDetection revision 为 `b25522a0f4bde8c80603f3ba5e3472059972e3b5`。源码 ZIP、2114 个解压文件、相关配置与模型头均核验摘要，离线压缩快照和官方链接保存在 [来源锁](sources.lock.json)。

| 项目 | PP-YOLOE-R-s | FCOSR-M |
| --- | --- | --- |
| 官方配置 | `ppyoloe_r_crn_s_3x_dota` | `fcosr_x50_3x_dota` |
| Backbone | CSPResNet-s | ResNeXt-50 32x4d |
| 上游小规格事实 | s/m/l/x 均有单尺度/MS 配置，本轮选 s 单尺度 | 固定源码仅 x50 配置，官方名称 M |
| 官方权重字节 | 33,111,074 | 126,775,230 |
| 本轮 FP32 ONNX 字节 | 33,161,415 | 126,887,047 |
| 本轮训练参数元素数 | 8,243,749 | 31,337,497 |
| 上游报告 DOTA 1.0 mAP | 73.82 | 76.62 |
| 本轮模型状态 | 转换与两后端数值通过 | 转换与两后端数值通过 |
| 建议 | 首发候选 | 后续候选 |

上游 mAP 仅引用固定 README，不是本轮复测结果。PP-YOLOE-R 官方 8.09M 是重参数化后口径，本实验保留原网络导出，不能把两种参数口径混用。所有权重实际 HTTP 200、文件长度和 SHA-256 已固定。采用依据为固定 PaddleDetection 项目的 Apache-2.0 声明与官方权重表；审阅文件未发现独立权重许可文本，这是证据解释边界，不增加额外授权门槛。后续模型卡应保留上游许可与转换归因。上游 DOTA 示例图仅用于本地评估，不发布图片。

## 已验证范围

两模型均导出固定 `1x3x1024x1024`、FP32、opset 17 ONNX，ONNX checker 通过。图中不含自定义旋转算子，输出 `scores[1,15,N]` 和 `rboxes[1,N,5]`；N 分别为 21504/21824。转换记录见 [PP-YOLOE-R](conversion-ppyoloe_r_crn_s_3x_dota.json) 与 [FCOSR](conversion-fcosr_x50_3x_dota.json)。

输入来自固定上游两张 DOTA 示例，另外生成顺时针 90 度图、768 宽非方形裁剪和纯黑负例，共五个输入。它们用于实现对齐，不用于 GT/mAP 评测。输入、变换、来源和摘要见 [dataset.lock.json](dataset.lock.json)。浏览器读取与 Python 相同的 FP32 张量，没有覆盖浏览器图片预处理。非方形路径固定补到 1024，未验证上游动态宽高路径或大图切片拼接。

独立参考由官方 Paddle 原始头、官方 `_box2corners`、官方 Shapely 旋转 NMS 组成；同时用官方完整 Paddle 后处理验证 Shapely 的最终框。两个模型五个输入全部匹配，见 [PP-YOLOE-R Python 记录](reference-ppyoloe_r_crn_s_3x_dota.json) 和 [FCOSR Python 记录](reference-fcosr_x50_3x_dota.json)。

浏览器完成两模型乘两后端乘五输入，共 20 组完整实例对照。要求类别/数量一致、无遗漏或额外实例、原始张量有限、空白无框，并满足旋转 IoU >= 0.995、分数误差 <= 0.001、角点误差 <= 0.1 像素。最终数据见 [浏览器数值对照](browser-comparison.json) 与 [验证摘要](verification.json)。原始框张量包含低分背景项，其最大误差不能直接当作最终检测框误差；报告分别保存两者。

## 旋转框契约

- 五参数为 `cx,cy,w,h,angle`，坐标单位是网络输入像素，角度为弧度。正方向遵循图像 y 轴向下的旋转矩阵。PP-YOLOE-R 用 0..90 度分布投影；FCOSR 使用截断取余，原始角度可为负，不能直接统一写成 `0..90` 度。
- 四点顺序严格沿用上游：局部 `(+w/2,+h/2)`、`(-w/2,+h/2)`、`(-w/2,-h/2)`、`(+w/2,-h/2)` 旋转再平移。没有强制“左上角起点”、交换宽高或角度再规范化。返回四点时按 `scale_x/scale_y` 还原；不裁剪坐标，以免把矩形改成其他多边形。
- 后处理采用每类分数严格大于 FP32 0.1、每类按分数降序截取前 2000、旋转多边形 IoU 严格大于 0.1 时抑制，跨类别不抑制，保留总数不设上限。最终按类别递增、类别内分数降序输出，不能替换为轴对齐框 IoU。
- JavaScript 相同分数按原始索引稳定排序；上游 NumPy 对完全相同分数的排序没有稳定性承诺，本轮实际输出集合对齐，但未声称所有平分情形与上游内部索引一致。接壤、退化、负角、半周旋转、近零角与正交框均有 Shapely 几何对照，见 [几何样例](geometry-fixtures.json)。

## 本机性能与 GPU 证据

环境为 Windows `10.0.26200`、Chromium `153.0.8010.12`、ORT Web `1.27.0`、Intel i5-10400F、NVIDIA RTX 5060 Ti；浏览器适配器为 NVIDIA blackwell，非软件 fallback。WASM 为单线程，模型在 main 线程运行。

性能仅测同一首图、已加载会话的 `session.run` 三次热推理中位数，包含结果返回，不包含图片解码、预处理或后处理；不是端到端性能、长期稳定性或设备普适承诺。具体会话创建、首次推理、三次原始耗时和后处理耗时见 [browser-execution.json](browser-execution.json)。本机观察 PP-YOLOE-R-s 的 WASM 约 2 秒、WebGPU 数十毫秒，FCOSR-M 的 WASM 约 18 秒、WebGPU 约 0.12 秒。密集图旋转 NMS 在本实验中可超过模型 WebGPU 推理耗时，SDK 阶段需要单独考虑 Worker 与后处理预算。

| 模型/后端 | 三次热推理中位数 | 五输入最小旋转 IoU | 最大最终角点误差 |
| --- | ---: | ---: | ---: |
| PP-YOLOE-R-s / WASM | 2178.8 ms | 0.9993547 | 0.01072 px |
| PP-YOLOE-R-s / WebGPU | 31.8 ms | 0.9995252 | 0.01415 px |
| FCOSR-M / WASM | 17919.6 ms | 0.9999195 | 0.00240 px |
| FCOSR-M / WebGPU | 125.2 ms | 0.9999886 | 0.00030 px |

WebGPU 每次 PP-YOLOE-R-s/FCOSR-M 推理分别记录 296/530 次原生 GPU compute dispatch，结合 GPUQueue 命令提交与适配器信息证明实际使用 GPU。ORT profiling 回调为空的 [初次失败记录](initial-profiling-diagnostic.json) 已保留，因此没有每算子时间或完整图分区证明，不宣称全部节点都在 GPU。

四张实际叠加截图留在忽略目录 `<work>/<candidate>/preview-{wasm,webgpu}.png`，不进入 Git。已检查 canvas 非空、图像正确呈现且旋转框覆盖实际检测结果；本地截图与 GPU 原始命令记录均有 SHA-256。

## 首发前仍需完成

1. 新建独立旋转框 SDK，先定义公共输入输出、角度与四点语义、标准错误、显式后端、Worker/取消/释放、缓存与完整性契约，并按标准运行 SDK checker、包测试和 Demo 浏览器验证。
2. 用公共 SDK API 补测 Blob/RGBA/浏览器预处理、极端长宽比、边界框、阈值和平分排序；对真实遥感大图明确切片、重叠和全图旋转 NMS，当前五输入不能覆盖这些情况。
3. 扩大带来源及许可的真实图集，在目标桌面设备上验证内存、运行耗时及回归。移动端按后续发布范围另行验证，不阻塞桌面首版。未经测量的浏览器、移动端、FP16/INT8、PP-YOLOE-R m/l/x/MS 或整个 PaddleDetection 模型库均未验证。
4. 按上游项目许可保留归因，补齐不可变 revision、模型 SHA-256 与双源分发后再发布。当前来源是上游官方权重下载加本地转换，尚未建立公开 ONNX 分发渠道。

这些是后续产品阶段的工作，不是本次转换与本机推理的阻塞。完整步骤、诊断及本地原始数组位置见 [复现说明](reproduction/README.md)。
