# 独立跟踪 SDK 可行性证据

建议将 **ByteTrack 算法机制**作为下一阶段首发候选，先完成来源/许可处置、无权重算法标准扩展及独立 TypeScript 实现设计。当前仅完成固定 Python 参考实现的合成机制评估，没有建立或发布 SDK，也没有把上游代码加入门户。OC-SORT 保留为后续运动模型对照，不据本组小样本宣称算法精度排名。

任务目录沿用启动日 2026-09-18；封存运行实际为 **2026-09-19 00:18:14（北京时间）**，即 `2026-09-18T16:18:14.318187+00:00`。共运行五种配置、十类输入及两个适配对照，合计 **60 组、860 次 update**，另有五组多实例诊断。所有场景均成功执行；这里的“执行成功”包含预期记录的身份交换、遗漏与全局状态失败，不表示跟踪质量全部达标。

## 证据与复现

| 文件 | 内容 |
| --- | --- |
| `sources.lock.json` / `prepare_sources.py` | 21 个上游源码/许可文件的固定 URL、提交、字节数及 SHA-256；下载至忽略的 `.tmp/tracking-reference` |
| `requirements.lock.txt` | 实跑环境全部 pip 包版本；版本锁不等同于跨平台 wheel 哈希锁 |
| `inputs.json` / `generate_inputs.py` | 自建检测框、分数、类别、帧序号、时间戳与评分用 subject；无图片、权重或数据集 |
| `results.json.gz` | 完整逐帧框、ID、状态、耗时和 subject 轨迹；gzip 使用 `mtime=0` |
| `summary.json` | 环境、配置、60 组紧凑摘要和五组多实例诊断，避免完整逐帧 JSON 淹没审查 |
| `source-analysis.json` / `analyze_sources.py` | 固定源码归因线索、文本相似性复算及依赖许可元数据片段 |
| `run.py` / `verify.py` | 原始核心运行器与完整重跑对比；不改算法结果，不伪造依赖 |
| `evidence.lock.json` / `seal_evidence.py` | 输入、输出、锁和全部脚本的 SHA-256；封存脚本仅供首次建档，重跑不能重封存掩盖差异 |

从门户仓库根目录，在本次已验证环境重跑：

```powershell
$env:PYTHONUTF8 = '1'
.tmp/tracking-venv/Scripts/python.exe reports/tracking/2026-09-18-feasibility/verify.py --rerun
```

该命令先核对证据哈希、固定源码、确定性输入、包版本和 `pip check`，随后运行全部场景，在 `.tmp/tracking-rerun.json` 保留未压缩重跑结果。逐帧完整框、ID、状态、评分轨迹、计数和配置均比较，浮点容差 `rtol=atol=1e-9`；只剔除耗时、运行时间戳和环境描述等非确定性字段（依赖版本另行严格核验）。任何哈希、版本或输出不符均非零退出。摘要还须与压缩证据逐项相符。2026-09-19 实际重跑通过。

新环境需 Python 3.11、Windows 对应构建工具（本次 `cython_bbox` 本地编译），可用 `python -m venv .tmp/tracking-venv` 后安装：

```powershell
.tmp/tracking-venv/Scripts/python.exe -m pip install -r reports/tracking/2026-09-18-feasibility/requirements.lock.txt --extra-index-url https://download.pytorch.org/whl/cpu
```

包索引可用性、其他操作系统和编译器组合未验证；不要把“版本锁可读取”写成所有机器已可重现。NumPy 固定 1.23.5 以保留原始 ByteTrack 的 `np.float`，未修改为新 NumPy API。Torch 2.5.1+cpu 为真实安装（ByteTrack 顶层导入），没有下载检测模型。Paddle 的可选 numba 未安装，原始代码输出警告并使用其自带 NumPy 路径；不安装 Paddle 推理引擎，因为本轮只加载独立跟踪核心。

查看封存完整输出可执行 `python -m gzip -d reports/tracking/2026-09-18-feasibility/results.json.gz`（会生成未压缩副本，勿提交）。首次创建锁使用 `prepare_sources.py --create-lock`，正式复验使用默认校验模式，不能重建锁替代来源验证。

## 来源与再分发边界

| 来源 | 固定提交 | 已核对的许可/归因 |
| --- | --- | --- |
| [ByteTrack](https://github.com/ifzhang/ByteTrack) | `d1bf0191adff59bc8fcfeaa0b33d3d1642552a99` | 根 LICENSE 为 MIT；Kalman 文件未单列许可头，与固定 DeepSORT Kalman 存在大量相同文本 |
| [OC-SORT](https://github.com/noahcao/OC_SORT) | `8462e7e729a93ccd3bd995c0a79a890336cb3a0b` | 根 LICENSE 为 MIT；`ocsort.py` 头明确 adopted from Alex Bewley SORT；Kalman 文件保留 FilterPy/Roger Labbe MIT 归因 |
| [PaddleDetection](https://github.com/PaddlePaddle/PaddleDetection) | `b25522a0f4bde8c80603f3ba5e3472059972e3b5` | 根与跟踪文件头 Apache-2.0；JDE 指向 Towards-Realtime-MOT，Kalman 指向 DeepSORT，OC-SORT 指向 OC_SORT |
| [SORT](https://github.com/abewley/sort) | `2236dff5019565958b84df7d871d41cc1db58ac7` | 根 GPL-3.0；源码声明 version 3 or later |
| [DeepSORT](https://github.com/nwojke/deep_sort) | `f08cf1dc470eeb1cd2add1cbf077d95ac6c48aab` | 根 GPL-3.0，作为 Kalman 来源追溯，不运行其 ReID/检测器 |

固定 ByteTrack Kalman 270 行与 DeepSORT Kalman 229 行，经 `SequenceMatcher(autojunk=False)` 得到按序相同 217 行（含空行、注释）。这是需要核对来源授权、归因与分发义务的证据，**不是侵权法律定论**。根 MIT/Apache 声明不足以独自证明整个复制/翻译链可以按同一条件发布。Towards-Realtime-MOT 等更深来源与贡献历史未完成审计，生产前继续核对。

实际核心依赖为 NumPy、SciPy、lap、cython_bbox、FilterPy，另外加载真实 Torch/OpenCV；完整版本见锁。包元数据中 NumPy/SciPy/Torch 为 BSD 类声明、FilterPy 为 MIT 等，元数据片段不能替代对 wheel 内嵌库和全部传递依赖的许可审查。cython_bbox 元数据未声明 License，但安装包实际含 `cython_bbox-0.1.5.dist-info/licenses/LICENSE`，SHA-256 为 `ca29ad79473f40531db6cbbebbd144911d79d5420af8de66d2268daa13aeae4e`，含 Faster R-CNN/Microsoft 2015 MIT 及 Caffe 等第三方声明，不能解释成无许可证。`source-analysis.json` 另记录可发现的基础依赖 dist-info 许可文件路径、摘要和开头。生产 TS 实现应从论文与明确许可的数学基础重新设计并保留来源记录；不能因为重写/翻译就自行宣称消除了原有义务。本轮只提交评估脚本、自建数据、结果和来源摘要，**不再分发上述上游代码**。

## 实验口径

算法均接收未缩放的 640×640 坐标系轴对齐 `xyxy` 框。官方 ByteTrack/OC-SORT 的输入为 `N×5`（框、score），Paddle 为 `N×6`（class、score、框），检测器不参与。空检测传形状正确的空数组；不传 `None`，因为 OC-SORT 对 `None` 直接返回且不老化。包路径适配只绕过检测器包级初始化；Paddle motion 命名空间导出原始 KalmanFilter 类，没有替换核心算法函数。

- 帧率基线 30 fps，保留期均设五次 update。ByteTrack `track_thresh=0.5`、`track_buffer=5`、`match_thresh=0.8`、`mot20=False`；Paddle Byte 为 `use_byte=True`、`num_classes=2`、`conf_thres=0.5`、`low_conf_thres=0.1`、`match_thres=0.8`，并按上游调用者职责把公开 `max_time_lost` 属性设为 5（构造器默认 0）。
- OC 两种官方配置分别 `use_byte=False/True`；Paddle OC 设 `use_byte=True`，保留其 `use_angle_cost=False` 默认值。三者均 `det_thresh=0.5`、`max_age=5`、`min_hits=1`、`iou_threshold=0.3`、`delta_t=3`、`inertia=0.2`。这不是整套默认参数的精度比较，Paddle OC 的方向代价配置亦不同。
- 高分取 `score>0.5`，低分取 `0.1<score<0.5`；恰等于 0.1 或 0.5 均落在边界空隙。Byte 新轨还需 `score>=0.6`；Byte 第二次关联 IoU 距离门限 0.5、未确认关联门限 0.7；第一阶段 0.8 是含分数融合的**代价**阈值，不能直接解释成统一 IoU≥0.2。
- ByteTrack 的 cython_bbox 与 Paddle Byte IoU 使用 `+1` 像素宽高；OC 系列用连续坐标面积、不加 1。统一评分使用连续坐标 IoU≥0.5 的匈牙利一对一匹配。评分 subject 不传给算法，class 已知的输出要求同类；单类核心输出 class 为 null，不伪造类别支持。
- 指标 `id_changes` 是每个 subject 在相邻非空匹配之间的 ID 变化次数，含长丢失后合理的新身份；不是标准 MOT IDSW/IDF1/HOTA。`unmatched_detection_frames` 只计有检测但未匹配输出的目标帧，空检测帧不进入该分母。完全重叠帧从评分排除，完整输出仍保留。空检测帧数及其输出数单独记录，不能把“漏检输入帧未计入分母”解读为恢复了检测。
- 每个独立场景前清零测试进程计数，并重建实例。`class_isolated` 对照按类别分别从头运行完整序列后合并结果、增加类别 ID 前缀；这是离线隔离对照，**没有证明原始多实例在同进程并发安全**。另以不重置全局计数的实例诊断暴露原始行为。
- 原生核心每调用一次才推进一帧，不消费时间戳。`sparse_gap` 原生只传稀疏帧；`pad_empty` 对照显式补 17 次空调用。此适配上限为 100，不代表可无限补帧或原生支持可变时间步长。

## 结果与失败场景

| 场景 | 实跑观测 |
| --- | --- |
| 平移 12 帧 | 五配置均零 ID 变化、零未匹配目标帧 |
| 低分三帧 | 官方 Byte、OC+Byte、Paddle Byte/OC 均连续输出同 ID；OC 基础模式三帧无输出，随后同 ID 恢复 |
| 调用者预过滤低分 | 五配置在三次空输入期间均无输出，后续恢复同 ID；Byte 无法凭空恢复被调用者丢弃的低分信息 |
| 三帧短遮挡 | 五配置无观测输出，保留内部轨迹，随后同 ID 恢复 |
| 十帧长丢失 | 五配置淘汰旧轨；输入帧 14 重入但未确认，无输出；15 起输出新 ID，各记录一次 ID 变化与一次未匹配。Byte 内部 removed 列表出现重复旧 ID，原样保留 |
| 匀速交叉 | 除完全重叠帧外，五配置均无 ID 变化；这不代表拥挤真实场景已验证 |
| 相遇后掉头 | 五配置均有两次 ID 变化（A/B 交换）；相同形状且无外观信息不能辨别“穿过”与“掉头”，不能用算法修改粉饰 |
| 同位置换类别 | 原生单类核心和 Paddle OC 复用跨类 ID；Paddle Byte 原生分类可隔离。显式 class_isolated 全部消除跨类复用，但新类首次观测均要确认一帧 |
| 稀疏时间戳 | 原生把长间隔视作少量调用，保留旧 ID；补空对照按保留期淘汰，新观测随后用新 ID。时间策略必须成为独立 API 契约 |
| 分数边界 | score=0.5/0.1 全部无输出；Byte/Paddle Byte 一旦 lost，后续低分 0.100001/0.499999 不能通过其只面向当前 tracked 的低分阶段恢复，累计四帧未匹配；OC+Byte/Paddle OC 则可在该序列用低分恢复，累计两帧未匹配；OC 基础模式四帧未匹配 |

多实例诊断先让 A 拥有 ID 1、2，构建并更新 B，再给 A 增加第三个对象：

- 官方 Byte 全局 ID 计数从 2 变 3，A 新轨为 4；未碰撞，但 ID 序列受另一流影响，仍非实例私有。
- 官方 OC 两配置及 Paddle OC 创建 B 时重置全局 count，A 随后输出 `2,2,1`，出现同一实例内重复 ID。
- Paddle Byte 在 B 首次 update 重置按类全局计数；A 新轨获得已用的 ID 2，`joint_stracks` 按 ID 去重，第三对象未进入保留表；下一帧仍只输出 `0:1,0:2`。没有重复输出不等于隔离正确。

因此生产版本必须把计数、Kalman 状态和缓存归属实例；只给输出加流前缀无法修复同实例内部发生的 ID 碰撞/去重。重置一个流不能修改另一个流。

## 本机耗时

Python 3.11.15，Windows build 26200，Intel64 Family 6 Model 165；完整平台字符串与依赖在 `summary.json`。每配置 172 次 update，输入每帧最多两个对象（并发诊断三对象，未混入统计）。以下是一次顺序实跑的 `perf_counter_ns` 观测，包含首个未预热 update，排除导入、下载、构造器、数组布局转换、输出序列化和评分。

| 配置 | 累计 ms | 中位 ms/update | P95 ms/update | 最大 ms/update |
| --- | ---: | ---: | ---: | ---: |
| Byte | 53.1684 | 0.3070 | 0.6154 | 1.1235 |
| OC 基础 | 77.6544 | 0.4683 | 0.8499 | 1.0528 |
| OC+Byte | 73.9979 | 0.4636 | 0.6943 | 0.9252 |
| Paddle Byte | 87.9310 | 0.4913 | 0.9740 | 1.6513 |
| Paddle OC+Byte | 53.9864 | 0.3250 | 0.5430 | 0.6944 |

该表不覆盖大目标数、视频解码、检测器或端到端延迟，也不是浏览器速度、冷启动基准或算法性能排名。真实视频、MOT17/20、检测阈值联合评估、IDF1/HOTA/MOTA、TS 数值一致性、浏览器/Worker、手机和 GPU/NPU 均未验证。

## 首发候选、接口与标准前置

首选 ByteTrack 的理由是无权重、框输入、低分二次关联机制已实际复现，较适合作为独立轴对齐检测结果的初始跟踪能力；不是已经解决许可、并发和时间语义。检测器的输出过滤阈值必须低于跟踪高阈值，并与跟踪高/低门限分开设置。OC-SORT 的遮挡恢复能力仍有后续比较价值，本次合成数据无法证明谁在真实视频更优。

拟议独立 API（尚未实现）：`createTracker(options)`、`update({frameIndex, timestampMs, detections}, {signal?})`、`reset()`、`dispose()`。检测项应含调用者 detectionId、classId、score 和原图轴对齐 box；不接受旋转四点框直接混用，图像/视频解码、检测器、摄像头和门户编排都不属于跟踪核心。

输出需区分当前观测的 `tracks`、仅预测的 `lost` 和本帧终止事件 `removed`，以及 `tentative/confirmed/lost/removed` 状态、lastObservedAt、age、matchedDetectionId。历史 score 不能标为本帧检测置信度；ID 仅在 stream/sessionGeneration 范围内有效，不是物理身份识别。reset 清除全部本实例状态并增加会话代次；dispose 幂等、释放本实例资源，之后 update 返回稳定已释放错误。异步 Worker 版取消不得提交半帧状态，输入容量和并发调用需有明确上限。

timestampMs/frameIndex 严格递增，重复/倒退拒绝，视频 seek 调用 reset。下一阶段在真实数据上决定显式 Δt Kalman 与受限补空策略；过大间隔采用明确的全轨过期/重置政策，禁止无界补空。类别默认硬隔离并使用实例私有计数；分类抖动的宽松模式需另行定义，不能偷偷跨类别关联。

现行 `standards/v1/sdk-manifest.schema.json` 强制 `model`、`model.assets`、`cache` 等，`rules.yaml` 的 MODEL-001、CACHE-001、DEMO-004、PERF-001/RUNTIME-001 均含模型下载/缓存/推理语义。生产前须先在标准源设计可区分的 algorithm 类型，明确无模型资产/参数量/缓存的“不适用”、CPU 的 JavaScript 实现语义、`updateMs/totalMs`、状态和 reset 生命周期；保持既有模型 SDK 校验不回退。当前只记录扩展需求，未更改规则/schema，也没有伪造 ONNX、下载进度或 WebGPU 能力。新标准生效后才建立生产 SDK、运行其前后 checker、TS/参考逐帧对比和桌面浏览器验收。

原始 Detection 设计已经把 `web-sdk-pp-tracking` 定位为独立跨帧状态 SDK；本结论与该拆分一致。下一阶段依次处置来源/许可、确认标准与 API、设计独立实现、验证真实检测序列与浏览器，达到发布门槛后另走 npm/仓库/Demo 流程。门户只保留路线与证据链接，Workflow 继续暂缓。
