# ReID 图像预处理与接入设计回执

日期：2026-09-20。分层：单 SDK 研究；门户只记录规划。已解码 RGBA 到外观向量的预处理通过本机双后端验证，独立序列结果支持继续采用正常朝向 RGB。任意透明 PNG 解码逐字节一致未通过，反例已保留。下一实现阶段是混合标准及同包可选 ReID 模块。

完整双语报告位于 `C:/Users/chenm/.codex/worktrees/tracking-algorithms/web-sdk-PP-Tracking/reports/2026-09-20-reid-preprocessing/`，分支 `codex/tracking-algorithms`。本轮 SDK 基线为 `b29b0f1`，门户基线为 `4df6c38`。SDK 本地 `0.2.0-alpha.0`、线上 `0.1.0`；没有生产 runtime、Demo、manifest、门户 registry 或远程发布变更。

SDK 本地提交：`4bbd3d5`（评测：固定 ReID 图像预处理并验证独立序列）。

## 结果与边界

- 固定上轮 33,704,835 字节 FP32 ONNX，SHA-256 `24d347f47405bb1bd24fd582783507edbcb16571d2e845d0528b0ad7856336e4`；加载前校验原 Paddle 静态图与参数身份。
- 固定非预乘 RGBA8、白底透明合成、正常朝向 RGB、64×192 half-pixel 双线性、float64 中间计算、ImageNet 标准化及最终 FP32。特征空间未来绑定模型哈希、预处理和 L2 规则。
- 8 组人工图与 26 组真实裁剪，共 34 组；Node/Chromium 张量与 Python 逐元素一致，WASM/WebGPU 各 34/34 特征通过，最大绝对差约 1.818e-6/2.444e-6。原始门槛为 1e-3 且余弦距离 1e-5，没有放宽。
- 33 组不透明 PNG 像素相同；5 张 JPEG 本次矩阵相同，另列诊断。透明 PNG 的 4 像素反例有 7/16 字节变化、最大差 247，源于 Canvas 预乘往返等解码行为；因此仅承诺已解码 RGBA 契约，不提前承诺文件解码保真。
- 独立 MOT17-05/09/10/11/13-FRCNN，各固定六帧，共 103 裁剪、36 图库身份、67 查询。确定性 RGB 正确 53/67（79.10%），OpenCV RGB 52/67，确定性 BGR 50/67。05 只有两次查询，宏平均需谨慎；这是 GT 框同摄像头闭集检索，不能代表完整 MOT、跨摄像头或真实跟踪指标。
- 距离 0.2 未调优：RGB 拒真 37/67、认假 8/555；BGR 为 46/67、6/555。保留 0.1/0.2/0.3/0.4 全部诊断，真实多向量图库与运动门控仍待验收。
- 本机 Windows 11/i5-10400F/RTX5060Ti/Chromium153/ORT Web1.27 下，单裁剪预处理、推理与归一化总耗时中位数 WASM 60.263ms、WebGPU 10.525ms；各 5 次预热、30 次计时，GPU 确认实际 ORT 硬件且禁止 CPU EP 回退。不含解码、检测、关联或帧调度，不能当作视频帧率，也不直接与上轮口径比较。

模型卡已分别记录代码 Apache-2.0、官方训练披露、具体 checkpoint 独立声明未核实及完整训练数据条款未知；不将未知写成禁止商用，也不伪造 ModelScope/Hugging Face 地址。模型、原图和完整 GT 留在忽略目录，未分发。

## 下一实现阶段

[混合声明提案](../../../standards/v1/proposals/algorithm-model-hybrid.md)与[模块设计](../../../docs/superpowers/specs/2026-09-20-tracking-reid-module-design.md)已形成，当前标准仍为 1.2.0，提案未生效。先落实 schema/rules/checker 和回归，再实现 `web-sdk-pp-tracking/reid` 可选子入口及本地模型字节验收，随后落实正式分发与 Demo。正式清单不以本地字节或虚构源通过分发检查。

设计明确根入口不加载 ORT、关联 CPU 与模型后端分别报告、输入复制、并发 BUSY、整帧原子性、取消粒度、dispose 等待运行结束、缓存范围及 OOM/设备丢失错误分类。正式源继续 ModelScope 默认、Hugging Face 可选。真实检测同输入的三算法 ID 指标和完整成本评测仍是后续质量门槛。

本轮延续[七算法路线](../../../docs/superpowers/specs/2026-09-19-pp-tracking-multi-algorithm-design.md)，不启动门户 Workflow；视频/摄像头、BoT-SORT、JDE、FairMOT 和 CenterTrack 尚未接入。

## 本地检查

SDK verify 通过 104 项单测、类型与全部构建、三算法实际包消费及 12 组浏览器检查；7 项新像素测试保留失败到通过证据。runtime 与 22,522 字节包哈希保持基线一致。标准 [before](../../sdk-standard/tracking-reid-preprocessing-before-20260920.json)/[after](../../sdk-standard/tracking-reid-preprocessing-after-20260920.json) 各 17 项 required 通过、0 失败，仅 locally-compliant。

门户 99 项测试通过，Astro 0 errors/0 warnings、7 条既有 hints，21 页构建成功，原始日志为 [portal-test.log](portal-test.log) / [portal-build.log](portal-build.log)。SDK 报告提供原始向量、输入身份、逐条查询、透明反例与离线复算脚本；本轮没有新增远程合规或发布声明。

独立复审通过：透明 PNG 范围、Paddle 加载前哈希和 OOM 错误设计三项已解决，无未解决 Critical/Important/Minor。最终 27 份锁定证据的离线复算和 Git 暂存字节核对均通过，门户两份标准回执哈希也一致。SDK `evidence/review.md` 保存审查回执。离线张量核验限身份和既有运行记录，向量及检索统计由原始数值复算，重跑预处理需要准备原图。
