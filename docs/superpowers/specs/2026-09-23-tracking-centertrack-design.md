# 模型型跟踪（CenterTrack）候选设计

日期：2026-09-23。层级：单 SDK 候选能力。状态：**前提已被实测推翻，本设计停止实施（2026-09-24 更正）**。关联 SDK：`web-sdk-PP-Tracking`。

> **2026-09-24 停止通知（重要）**：本设计赖以成立的决定性差异点——
> CenterTrack「无自定义算子」——**已被实测证伪，不成立**。
>
> - `src/lib/opts.py:86`：`self.parser.add_argument('--dla_node', default='dcn')`，DCN 是**默认值**而非可选；
> - `src/lib/model/networks/necks/dlaup.py:99`：`self.conv = DCN(chi, cho, kernel_size=(3,3), ...)`，颈部实例化 DCNv2；
> - `experiments/mot17_half.sh` 未覆盖该默认；固定权重 `mot17_half.pth`（79,987,301 字节，sha256 `2272af…eed6`）实测 418 个张量，其中 **32 个 `conv_offset_mask` DCN 键全部位于 `dla_up.*`**。
>
> 因此 CenterTrack 与 FairMOT 属**同一类 DCN 双后端阻断**：ONNX 导出无标准算子路径（torchvision `deform_conv2d` 导出探测亦不可用：dynamo=True 产出默认域自定义 `DeformConv` 节点，`onnx.checker` 报 "No Op registered for DeformConv"），WebGPU EP 算子表（onnxruntime-web@1.27.0）无 DeformConv/DeformableConv2D。
>
> **处置**：本设计**不进入资产导出、不等候 0.3.0-alpha 实现**；下文除「2026-09-24 更正记录」外的内容作为用户已批准设计的历史档案保留，其中被证伪的判断已在对应位置标注，不再作为实施依据。是否转向（自研 DCN 标准算子分解 / 改走 ByteTrack+YOLOX / 停止单模型路线）属用户级决策，未裁定前不单方面推进。
>
> 依据与修正范围见门户报告文末「2026-09-24 更正记录」；来源锁证据见 `reports/tracking/2026-09-23-model-tracking-feasibility/sources.lock.json`（`necks/dlaup.py` 与 `centertrack-weights/mot17_half.pth` 两条）。

本设计由用户在上阶段可行性筛选后确认推进；矩阵与来源锁见门户
[reports/tracking/2026-09-23-model-tracking-feasibility/](../../../reports/tracking/2026-09-23-model-tracking-feasibility/README.md)。

## 背景与决策

~~只读筛选结论：FairMOT 因 DCNv2 自定义算子双后端阻断、JDE 因 AGPL-3.0 上游与最高推理成本，均不通过；CenterTrack 有条件通过（MIT 根许可、无自定义算子、单次前向即出跟踪）。~~（**2026-09-24 更正：该段筛选结论中「CenterTrack 有条件通过（无自定义算子）」已被实测推翻，见文首停止通知**；FairMOT 与 JDE 的不通过结论不变。）用户确认两个关键决定：

1. **入口边界为自包含“图像进→轨迹出”**：SDK 首次拥有检测能力，但仅限该可选入口；根入口仍是“调用方给检测、算法出轨迹”，两者互不影响。
2. **权重身份固定 `mot17_half`**：上游 `xingyizhou/CenterTrack@e4e7534cc2ebfbd31e0cde680988f286c65fe34f`，MIT；须标注 MOT17 训练数据非商业边界。

候选阶段沿用 BoT-SORT 核心候选先例：不扩 package.exports、不进 manifest、不进公开 Demo、不发版、不远程写入。

## 目标

- 新增候选模块 `src/centertrack/` 与可选子入口 `./model-tracking`：单帧图像进、与根入口同构的 `Track[]` 出，模型走 WASM/WebGPU，生命周期与校验走 CPU/main。
- 在 JS 侧维护三输入回灌（当前帧图像、上一帧图像、上一帧轨迹渲染的热图）与帧间状态，保持原子性与可取消。
- 在 Windows 桌面 Chromium CPU/main 实测初始化与逐帧成本，形成 dated evidence；不推断手机与其他后端。

## 非目标

- 不修改根入口、ByteTrack 默认、公开 Demo 选择器；不发版本、不做 npm/Hub 分发、不执行远程写入。
- 不宣称官方逐值复现、官方 MOT 测试集成绩或真实行人精度；验证集不使用 MOT17/CrowdHuman 图像（含许可原因）。
- 不声明手机、Web Worker、NPU/WebNN、Safari、Firefox；WebGPU 只在实测后声明。
- 不实现视频播放、摄像头调度、录制或上传；不接入门户 Workflow 或其他 SDK runtime。

## 参考实现核实记录

2026-09-23 对固定提交 `e4e7534` 只读核实，全部结论可复现：

| 项 | 核实结果 | 证据 |
| --- | --- | --- |
| 网络定义 | **~~DLA-34，纯 torch 算子，无 DCN/deformable import~~（2026-09-24 更正：不成立）**。backbone 确为纯 DLA-34 无 DCN，但颈部 `necks/dlaup.py:99` 在默认配置（`opts.py:86 --dla_node default='dcn'`）下实例化 DCNv2；checkpoint 实测 32 个 `dla_up.*` DCN 键 | `src/lib/model/networks/backbones/dla.py`（首轮唯一核对文件，漏检 neck）；`src/lib/model/networks/necks/dlaup.py:17/92/99/164`、`src/lib/opts.py:86` |
| 前向签名 | `forward(self, x, pre_img=None, pre_hm=None)` | `src/lib/model/networks/generic_network.py:91` |
| 首帧回灌 | `self.pre_images = images`（当前帧同时作 pre_img），tracker 以空轨迹初始化 | `src/lib/detector.py:96-110` |
| 输入尺寸 | MOT `default_resolution = [544, 960]`（h×w），`down_ratio=4` → 输出 136×240，`num_categories=1` | `src/lib/dataset/datasets/mot.py:15` |
| 归一化 | `(img/255 - mean)/std`，mean=`[0.40789654,0.44719302,0.47026115]`，std=`[0.28863828,0.27408164,0.27809835]`，BGR 通道序（cv2 约定） | `src/lib/dataset/generic_dataset.py:39-41`、`detector.py:222` |
| 几何变换 | 仿射：源中心 `c=(w/2,h/2)`、尺度 `s=max(h,w)`，映射到全输入平面（等比缩放+中心对齐+零填充），非拉伸 | `detector.py:175-221`、`utils/image.py:37` |
| 输出头 | `hm`(1)、`reg`(2)、`ltrb_amodel`(4)、`tracking`(2)；`--ltrb_amodel` 时框取自 `ltrb_amodal` 且基于 `xs0` | `model/decode.py:83-158` |
| 解码 | sigmoid（在 detector 侧 `output['hm'].sigmoid_()`）→ `_nms` 3×3 极大值 → `_topk` K=100 → 峰值处 gather 各回归头 | `detector.py:301`、`model/decode.py:96-158` |
| 阈值 | mot17_half：`track_thresh=0.4`、`pre_thresh=0.5`；官方把 `out_thresh`/`new_thresh` 提升为 `max(track_thresh, 默认)` = 0.4 | `experiments/mot17_half.sh`、`opts.py:280-287` |
| pre_hm 渲染 | 上一帧轨迹中 `score>=pre_thresh` 且 `active==1`；半径 `gaussian_radius(ceil(h),ceil(w))`（min_overlap=0.7），高斯 sigma=直径/6，落点经 trans_input | `detector.py:254-290`、`utils/image.py:105-146` |
| 关联 | 估计前位 `ct+tracking` 与上一帧轨迹中心的平方距离；无效条件 `dist²>轨迹面积` 或 `dist²>检测面积`（面积量纲，须显式声明）；默认贪心，可选匈牙利；新轨条件 `score>new_thresh` | `utils/tracker.py:28-127` |
| 官方生命周期 | 无 tentative 阶段；未匹配轨迹 `age<max_age` 才保留且无运动预测（v=0）；`max_age` 默认 -1，mot17_half 未显式设置 | `utils/tracker.py:113-126` |
| 权重来源 | `mot17_half` Google Drive `1rJ0fzRcpRQPjaN17lcqfKgsz-wJRifHh`，val MOTA 66.1，test 45ms（TITAN Xp）；官方注明 MOT17/CrowdHuman 为非商业许可数据集 | `readme/MODEL_ZOO.md:18,33` |

## 模块形态与入口契约

新增 `src/centertrack/`；候选阶段仅经源码与候选入口消费，暂不加 `package.exports`、不进 manifest、不进公开 Demo。语义等价于：

```ts
type ModelTrackInput = {
  image: ImageData                  // RGBA8，沿用 /motion 输入约定与上限
  imageSize: { width: number; height: number }
  timestampMs: number
}
type ModelTrackingResult = {
  generation: number
  timestampMs: number
  tracks: Track[]                   // 与根入口同构；classId 固定 1（person）
  droppedDetections: number
  runtime: { requestedBackend: 'wasm' | 'webgpu'; actualBackend: string; executionMode: 'main' }
  timings: ModelTrackingTimings
}
type ModelTracker = {
  load(options?: { signal?: AbortSignal; onProgress?: (p: LoadProgress) => void }): Promise<LoadResult>
  track(input: ModelTrackInput, options?: { signal?: AbortSignal }): Promise<ModelTrackingResult>
  reset(): void
  dispose(): Promise<void>
}
```

契约要点：

- `backend` 必须显式选 `wasm` 或 `webgpu`（与 /reid 一致）；`source` 默认 modelscope，可选 huggingface；`modelBytes` 仅作显式开发配置且 byteLength 必须等于固定资产。
- 选项拒绝未知字段；阈值与容量参数（detectThreshold、preHeatThreshold、newTrackThreshold、maxDetections、maxTracks、keepMs）有明确边界，未启用能力拒收相关字段。
- 逐帧 timings：`validationMs`、`preprocessMs`（含缩放归一化与 pre_hm 渲染）、`inferenceMs`、`postprocessMs`（解码）、`associationMs`、`updateMs`、`totalMs`；加载 timings 复用 /reid 的 `modelDownloadMs`/`modelCacheReadMs`/`integrityMs`/`sessionMs`。
- 加载结果须报告实际后端与执行模式；未显式导入本入口不得加载 ORT 或权重（与 hybrid“模型子入口仅显式导入后工作”一致）。

## 帧与状态生命周期

- 帧契约：`imageSize` 为正整数且 ≤32768；`timestampMs` 严格递增，倒退或重复返回输入错误；尺寸变化或 seek 必须先 `reset()`；不自动补空帧、不替调用者决定时间语义。
- 实例状态：上一帧图像张量副本、上一帧轨迹（含 `active` 标记）、ID 计数、generation、上一帧 timestampMs。首帧 `pre_img` 取当前帧、`pre_hm` 取空（官方语义）。
- 原子性：输入/取消/推理失败一律不推进时间、ID、代次或轨迹；先复制校验、在工作副本上计算、后提交；调用者输入与返回值不得污染内部状态。GPU 驻留输出须等待回读后再提交。
- `reset()` 清空全部状态，generation+1、ID 回 1；`dispose()` 幂等且等待在途操作，之后 `load/track/reset` 返回 DISPOSED；load/track 期间拒绝并发（BUSY）。

## 预处理身份

- 固定输入 544×960（H×W）→ 输出 136×240；`pre_hm` 与输出头同分辨率。
- 几何：按官方仿射实现（中心对齐、等比缩放、零填充），盒子与热图坐标用同一仿射及其逆变换，写成纯函数并做往返测试；宽高比不一致时按官方语义零填充，**不拉伸、不改写官方裁切策略**。
- 归一化：BGR 通道序下 `(v/255 − mean)/std`；preprocessingId 单独命名（`bgr-affine-544x960-centernet-meanstd-f32-v1`），与 /reid 的 RGB 身份区分。
- 输入为 RGBA8 时在预处理内完成通道重排，不得要求调用方提供 BGR。

## 解码、pre_hm 渲染与关联

### 解码（postprocessMs）

1. `hm` 经 sigmoid 后做 3×3 极大值抑制（等值峰值按固定顺序取先者，保证确定性）。
2. 取 top-K=100 峰值；对每个峰值 gather `reg`(2)、`ltrb_amodal`(4)、`tracking`(2)。
3. 中心按 `(col*4 + reg.x, row*4 + reg.y)` 计算特征图坐标；框按 `ltrb_amodal` 相对 `xs0`/`ys0` 展开（与官方 `xs0` 基一致）。
4. 低于 `detectThreshold`（默认 0.4）的检测丢弃；坐标经仿射逆变换回原图坐标。
5. 输出限流：超过 `maxDetections` 按分数截断并计入 `droppedDetections`。

### pre_hm 渲染（preprocessMs）

- 仅对上一帧 `score >= preHeatThreshold`（默认 0.5）且在上一帧被匹配（active）的轨迹绘制。
- 半径 = `gaussian_radius(ceil(h), ceil(w))`（min_overlap=0.7 闭式解，clamp≥0），高斯 `sigma = (2r+1)/6`，采用官方 `draw_umich_gaussian` 的取大语义（不累乘超上限）。
- 落点为轨迹框中心经 trans_input 到输入分辨率（544×960），渲染到 `(1,544,960)` 后由运行时填入 `pre_hm` 输入。

### 关联（associationMs）

- 每个检测的估计前位 = `ct + tracking`；与上一帧轨迹中心计算平方距离。
- 无效条件（与官方一致并显式声明量纲）：`dist² > 轨迹框面积` 或 `dist² > 检测框面积`；类别不同直接无效（本模型仅 person，等价于不触发）。
- 匹配用 SDK 既有线性分配模块；默认贪心（官方默认），可选匈牙利；确定性与打平顺序须固定。
- 未匹配检测 `score > newTrackThreshold`（默认 0.4）建新轨；未匹配轨迹按 SDK 既有生命周期保留（tentative/tracked/lost/removed）；`keepMs` 与 `minHits` 初始默认取 SDK 既有算法同义参数值，实测后可调并记录依据。

### 实现差异（必须写入算法文档）

- 生命周期采用 SDK 既有语义（含 tentative 与 lost 保留期），官方无 tentative 且 `max_age` 默认 -1（未匹配即消亡、无运动预测）；本实现不照搬该行为。
- 关联门限的量纲为“平方距离 vs 面积”，官方如此实现；本实现保留该语义并在代码与文档显式标注，不改写成几何距离。
- 解码顺序、`topk` 打平、贪心顺序须确定；不得引入随机或并行不确定性。
- 以上均为独立实现的显式差异，**不宣称官方逐值复现**；不得把重写/翻译表述为消除来源义务。

## 模型资产与分发门槛

固定身份候选：`mot17_half`（Google Drive `1rJ0fzRcpRQPjaN17lcqfKgsz-wJRifHh`，上游 `e4e7534`，MIT）。实现期必须按序完成，任一步未过不得进入下一步，也不得把估计值写成事实：

1. 下载权重，计算字节数与 SHA-256。
2. 导出 ONNX（fp32）；记录 opset 与完整算子清单，确认只含标准 `ai.onnx` 算子（结合 onnxruntime-web@1.27.0 的 WASM/WebGPU 算子表核对，解码与 NMS 一律留在 JS）。
3. Python ORT 前向与官方 PyTorch 前向在固定输入上对齐（固定容差，记录最大误差）。
4. JS 解码/渲染/关联与 Python 参考实现在同一合成张量上逐值对齐。
5. 落到 ModelScope（默认）与 Hugging Face（可选）不可变 revision，manifest 身份与来源字段一致。
6. 模型卡、README 与（未来）Demo 标注 MOT17 训练数据非商业边界；CrowdHuman 变体同为非商业，不采用。
7. 体积未核验前不得写入 manifest；fp32 百 MB 级仅为量级参考。

## 验证矩阵

### 单元与参考对齐

- 仿射与逆变换往返、Gaussian 渲染（半径/收缩边界）、3×3 NMS 与 top-K（含并列打平）、`ltrb_amodal` 展开、pre_hm 的 active 过滤、关联无效条件（面积量纲反例）、原子性与错误路径（输入非法、BUSY、DISPOSED、取消、尺寸变化/seek、倒退时间）、实例隔离。
- Python 参考：官方前向对齐 + JS 解码对齐，固定容差与反例（非有限值、形状不符、缺头即加载失败）。

### 序列级

- 原创**合成**序列（运动块、交叉、遮挡、重现、长丢失、稀疏时间戳、类别不适用场景），不引入 MOT17/CrowdHuman 图像。
- Node 与 Chromium CPU/main（WASM）逐帧输出哈希一致；轨迹与耗时分布记录 p50/p95，首次与重复运行分开。
- 失败与退步场景如实记录，不用调参粉饰；不把合成结果说成真实行人精度。

### 环境边界

- 只形成 Windows 11 + Chromium + CPU/main 的 dated evidence；WebGPU 仅在实际测量后声明；手机/NPU/其他浏览器标为未验证。

## 标准影响

本入口是“算法+模型同模块”的第三模块形态，现有 hybrid manifest 仅有 `modules.algorithm`/`modules.model` 两个模块键。按门户约定：候选阶段不扩标准；集成/发布阶段先扩 `standards/v1`（rules.yaml、schema 与文档）再改产品代码。本设计只登记该需求，不提前判定 schema 形状，也不以候选实现倒逼标准。

## 发布与治理

候选阶段不改 `latest`/稳定行为，不发布 npm/GitHub Release，不远程写入。后续若进入发布，只能使用独立预发布标签，并在 README、manifest、（未来）Demo 与变更记录中标注候选/实验状态、已验证环境与非商业数据边界。门户只登记路线与证据链接，不把候选写成 PP-Tracking 默认能力。

## 通过门槛与后续决策

全部满足才算完成：(1) 五道资产门槛按序通过并归档证据；(2) 单元与参考对齐测试通过；(3) 合成序列 Node 与 Chromium CPU/main 哈希一致；(4) 初始化与逐帧成本形成 dated evidence；(5) typecheck/test/build/check:package、候选 ESM/CJS/类型消费、`sdk:check` 前后与独立复审通过；(6) 算法文档写明实现差异与非商业边界。

达标后由用户决定是否进入集成阶段：届时才设计 manifest/标准扩展、package.exports、双语 Demo 与发布，再评估 `0.3.0-alpha`。未达标则保留为本地候选，并归档不接入的原因。

## 2026-09-24 更正记录

| 项 | 更正前（2026-09-23） | 更正后（2026-09-24 实测） |
| --- | --- | --- |
| 决定性差异点 | 「无自定义算子」 | **不成立**：默认 `--dla_node='dcn'`，颈部 `necks/dlaup.py` 实例化 DCNv2，与 FairMOT 同类双后端阻断 |
| 网络定义核实 | 只核 `backbones/dla.py` | 漏检 `necks/dlaup.py`；算子集判定必须覆盖 backbone/neck/head 全部网络定义文件**并**核对 checkpoint 键集 |
| ONNX 路线 | 「纯标准算子，导出验证待实操」 | 无可标准化的 DCN 路径；torchvision `deform_conv2d` 导出探测不可用；`--dla_node conv/gcn` 变体与官方权重不兼容（实测 missing/unexpected 80–104 / 144） |
| 权重体积 | 未核验（门禁第 7 条明示不得写入 manifest） | 79,987,301 字节，sha256 `2272af8918b5a0e57b8285684b801b24ac5d0b6c30887b63ad566152af19eed6`（Google Drive 下载后字节级锁定；分发来源仍不满足不可变 revision 要求） |
| 输入分辨率 | `mot.py:15 default_resolution = [544, 960]`（本 spec 记录正确；同报告 matrix.json 首轮误写 608×1088，系 FairMOT 值，已一并更正） | 不变，仍为 544×960（H×W） |
| 实施状态 | 已获用户批准，待实施 | **停止**：不进入资产导出，不进入 0.3.0-alpha 实现；剩余路径（自研 DCN 分解 / 改走 ByteTrack+YOLOX / 停止单模型路线）为用户级决策 |

未随本更正改变的内容：前向签名、首帧回灌、归一化、仿射几何、解码、pre_hm 渲染、关联与生命周期等官方行为核实记录仍准确（均出自只读核实），可作为后续任何候选复用的参考；本 spec 的模块契约、验证矩阵、非商业边界等章节仅因前提失效而失效，其**方法论**（原子性、确定性、dated evidence、不宣称官方复现）对后续候选继续适用。

对用户已批准范围的处置说明：本更正只撤回「按 CenterTrack 前提实施」这一被证伪的分支，保留用户此前批准的治理底线（不改 Demo/ByteTrack 默认/版本/公共接口、不提交、不远程写入），不把「停止本候选」扩张为对 ByteTrack+YOLOX 等替代路线的单方面选择。

