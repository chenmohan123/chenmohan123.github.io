# 模型型跟踪（ByteTrack + YOLOX）候选设计

日期：2026-09-24。层级：单 SDK 候选能力。状态：**设计已分节获批，待评审后进入实施计划**。关联 SDK：`web-sdk-PP-Tracking`。

> 前候选 CenterTrack 因颈部 DCNv2 自定义算子被实测证伪，已于 2026-09-24 停止（见 `2026-09-23-tracking-centertrack-design.md` 文首停止通知）。本设计是用户选定的替代路线：可行性矩阵 `bytetrack-model` 条目（verdict `conditional-pass`），即**复用 SDK 已有 ByteTrack 算法核心（CPU/main）+ 新增 YOLOX 检测子入口（WASM/WebGPU）**，不引入单模型端到端跟踪网络。

矩阵与来源锁见门户
[reports/tracking/2026-09-23-model-tracking-feasibility/](../../../reports/tracking/2026-09-23-model-tracking-feasibility/README.md)。

## 背景与决策

矩阵 `bytetrack-model` 条目 verdict 为 `conditional-pass`，四个 blocker 与处置：

| blocker（矩阵原文要点） | 本设计的裁定 |
| --- | --- |
| 行人检测权重（bytetrack_*_mot17）来源与体积未核验 | **不采用 MOT17 系权重**：Mix&MOT 训练数据为非商业许可且无不可变发布来源。改用官方 COCO 权重（Apache-2.0、GitHub Release 不可变资产、字节已核验）；person 为 COCO 80 类之一（index 0），非 MOT17 行人专用训练，须如实标注、不得宣称 MOT 行人精度 |
| 未选检测档位 | **YOLOX-Tiny @416**（depth 0.33 / width 0.375 / test_size 416×416；5.06M 参数、6.45 GFLOPs；官方 COCO val mAP 32.8） |
| SDK 将首次拥有检测模型，manifest 与模型/算法边界需重新裁定 | 候选阶段按 §模块形态 登记需求、不扩标准；集成阶段先扩 `standards/v1` 再改产品代码 |
| 浏览器成本未实测 | 按 §验证矩阵 在 Windows 11 桌面 Chromium CPU/main 形成 dated evidence；实测前不推断手机与其他后端 |

用户已裁定的三个关键决策：

1. **权重来源 = COCO YOLOX 官方 Release 0.1.1rc0**：上游 `Megvii-BaseDetection/YOLOX`，Apache-2.0；Release 资产不可变且可字节核验。许可链与 `ifzhang/ByteTrack`（MIT）无关：ByteTrack 算法核心已在 SDK 内自实现，本候选不引入 ByteTrack 运行时代码，仅以其官方 ONNX demo 阈值作参考对齐。
2. **默认档位 = YOLOX-Tiny @416**：体积与浏览器推理成本之间的最小档平衡点；其余档位（nano/s/m/l/x）不实现、不预告。
3. **类别范围 = person only**：只输出 COCO class 0（person），映射为根入口 classId 1；其余 79 类在解码期即被丢弃。

入口边界：根入口「调用方给检测、算法出轨迹」与 ByteTrack 默认**完全不变**；模型型跟踪候选 = `./yolox` 检测子入口 + 根入口 ByteTrack 的组合，**组合装配归调用方/Demo**，本设计不新增组合 API（YAGNI）。

候选阶段治理底线沿用 BoT-SORT 核心候选先例：不扩 `package.exports`、不进 manifest、不进公开 Demo、不发版、不远程写入。

## 目标

- 新增候选模块 `src/yolox/` 与可选子入口 `./yolox`：单帧 RGBA8 图像进、输出与根入口 `Detection[]` 同构的 person 检测（左上角 box 约定、classId 固定 1），模型走 WASM/WebGPU，生命周期与校验走 CPU/main。
- 预处理、解码、NMS 全部在 JS 侧、Torch/ONNX 图外以可复现纯函数实现，形成可哈希、可对参考实现的黄金向量；不引入官方仓库运行时代码。
- 在 Windows 11 桌面 Chromium CPU/main 实测初始化与逐帧成本，形成 dated evidence；不推断手机与其他后端。

## 非目标

- 不修改根入口算法、ByteTrack 默认、公开 Demo 选择器；不发版本、不做 npm/Hub 分发、不执行远程写入。
- 不宣称 MOT17 行人精度、官方逐值复现；COCO 权重只引用官方 README 记录值（COCO val mAP 32.8 @416）与合成序列定性行为。
- 不使用 MOT17/CrowdHuman 数据或其权重（许可 + 无不可变来源），验证序列亦不引入这两类图像。
- 不声明手机、Web Worker、NPU/WebNN、Safari、Firefox；WebGPU 只在实测后声明。
- 不实现视频播放、摄像头调度、录制或上传；不接入门户 Workflow 或其他 SDK runtime。
- 不新增「检测+跟踪」组合 API、不改动根入口任何阈值语义。

## 参考实现核实记录

2026-09-24 对上游只读核实，全部结论可复现（修订锁：YOLOX tag `0.1.1rc0` = commit `e1052df71842031413f6030723c3607b839c80ce`，与 `0.1.0` 同 sha；ByteTrack 锁 `d1bf0191adff59bc8fcfeaa0b33d3d1642552a99`，沿用矩阵记录）：

| 项 | 核实结果 | 证据 |
| --- | --- | --- |
| 上游结构 | 该修订下 `yolox/exp` 为包目录（`__init__.py` re-export `BaseExp`），base exp 在 `yolox/exp/yolox_base.py`；早期布局的 `yolox/exp.py` 404 | GitHub contents API + raw 抓取 |
| 导出工具链 | `tools/export_onnx.py`：opset 默认 11（计划 `-o 17` 与 /reid 资产对齐，实际以导出记录为准），onnxsim 默认开启，`replace_module(model, nn.SiLU, SiLU)`，`model.head.decode_in_inference = False`，dummy `(1,3,test_size[0],test_size[1])` | `tools/export_onnx.py`、`deploy/ONNXRuntime/README.md` |
| ONNX 边界 | eval 分支 `output = torch.cat([reg_output, obj_output.sigmoid(), cls_output.sigmoid()], 1)`——**sigmoid 在图内**；`decode_in_inference=False` 时输出原始头，不做解码 | `yolox/models/yolo_head.py:187-190` |
| 输出形状与通道 | 416 输入输出 `(1, 3549, 85)`；通道序 `[cx, cy, w, h, obj, cls0..79]`，w/h **未解码**；组装 `torch.cat([x.flatten(start_dim=2) for x in outputs], dim=2).permute(0,2,1)`，anchors 行主序 `j = y*W + x` | `yolo_head.py:206-214` |
| head 几何 | strides `[8, 16, 32]`（默认），`n_anchors = 1`；grid 52²+26²+13² = 2704+676+169 = 3549 | `yolo_head.py:23,35`、部署 README |
| 解码公式 | `outputs[..., :2] = (outputs[..., :2] + grids) * strides; outputs[..., 2:4] = torch.exp(outputs[..., 2:4]) * strides` | `yolo_head.py:236-251` |
| person 通道 | COCO 80 类 `person` 为 index 0 → 张量通道 5 | `yolox/data/datasets/coco_classes.py` |
| tiny 档配置 | depth 0.33、width 0.375、test_size (416,416)、exp_name=文件名 | `exps/default/yolox_tiny.py` |
| 预处理身份 | `preproc`：114.0 pad letterbox，`r=min(ih,iw)`，`cv2.resize(..., INTER_LINEAR)`（整数截断），`padded_img[:, :, ::-1]`（BGR→RGB），`/255`，再减 mean 除 std，CHW；mean/std = ImageNet 统计量 `(0.485,0.456,0.406)` / `(0.229,0.224,0.225)`，**train 与 eval 路径一致** | `yolox/data/dataloading/data_augment.py:182-204`；`yolox/exp/yolox_base.py` `get_eval_loader`（`ValTransform(rgb_means=(0.485,0.456,0.406), std=(0.229,0.224,0.225))`）与 `get_data_loader`（`TrainTransform(...同统计量..., max_labels=50)`） |
| 权重资产 | `yolox_tiny.pth`，GitHub Release 0.1.1rc0，40,755,013 字节；Apache-2.0 | matrix 条目 `officialWeights`、`yolox-rel.json` |
| 官方指标 | YOLOX-Tiny：5.06M 参数 / 6.45 GFLOPs / COCO val mAP 32.8（官方 README MODEL_ZOO 记录值，未经 SDK 复测） | `README.md` MODEL_ZOO |
| ByteTrack ONNX demo 默认值 | `--score_thr` 0.1、`--nms_thr` **0.7**、`--track_thresh` 0.5、`--input_shape` 608,1088；demo 先 `multiclass_nms(score_thr=0.1)` 再整体交给 `BYTETracker`，低分保底的二分由 tracker 内部按 `track_thresh` 完成 | `deploy/ONNXRuntime/onnx_inference.py` argparse 与主流程 |
| SDK 侧既有资产 | ByteTrack 算法 CPU/main 已随 rc.1/rc.2 发布；/reid 子入口已建立模型子入口全套先例（manifest 驱动身份、来源校验、动态 ORT 1.27.0、Cache Storage） | `src/`、`models/pplcnet-reid/0.1.0/` |

## 模块形态与入口契约

新增 `src/yolox/`；候选阶段仅经源码与候选入口源码路径消费，暂不加 `package.exports`、不进 sdk-manifest、不进公开 Demo。计划结构镜像 /reid：`models/yolox-tiny/0.1.0/{model,sources}.json` 将作为唯一身份注册数据（文件写入时点受 §模型资产与分发门槛 第 5 步约束），运行时代码不重复维护身份常量。语义等价于：

```ts
type YoloxInput = {
  image: RgbaImage                 // RGBA8 {width,height,data}，沿用 /reid 输入约定与上限
}
type YoloxDetectorResult = {
  generation: number
  detections: Detection[]           // 与根入口同构；box 左上角约定，classId 固定 1（person）
  droppedDetections: number
  runtime: { requestedBackend: 'wasm' | 'webgpu'; actualBackend: string; executionMode: 'main' }
  timings: YoloxTimings
}
type YoloxDetector = {
  load(options?: { signal?: AbortSignal; onProgress?: (p: LoadProgress) => void }): Promise<YoloxLoadResult>
  detect(input: YoloxInput, options?: { signal?: AbortSignal }): Promise<YoloxDetectorResult>
  dispose(): Promise<void>
}
```

契约要点：

- `backend` 必须显式选 `wasm` 或 `webgpu`（与 /reid 一致）；`source` 默认 modelscope，可选 huggingface；`modelBytes` 仅作显式开发配置且 byteLength 必须等于固定资产。
- 选项拒绝未知字段；`scoreThreshold`（默认 0.1）、`nmsThreshold`（默认 0.7）、`maxDetections`（默认 100，整数 1..1000）有明确边界；未启用能力拒收相关字段。score/nms 默认值对齐官方 ONNX demo（`onnx_inference.py`），但 NMS 0.7 一项更正了设计分节展示时的 0.45 误记，见文末更正记录。
- 类别固定 person：不提供类别选择或类别列表字段，收到相关字段即拒收；COCO index 0 在输出层统一映射为 classId 1（根入口 person 约定）。
- 逐帧 timings：`validationMs`、`preprocessMs`（letterbox+归一化+CHW）、`inferenceMs`、`postprocessMs`（解码+NMS+坐标回写）、`totalMs`；加载 timings 复用 /reid 的 `modelDownloadMs`/`modelCacheReadMs`/`integrityMs`/`sessionMs`。
- 加载结果须报告实际后端与执行模式；未显式导入本入口不得加载 ORT 或权重（与 hybrid「模型子入口仅显式导入后工作」一致）。

## 帧与状态生命周期

- 检测入口**无跨帧状态**（与 /reid `extract` 同构）：不维护上一帧图像或运动历史，不做帧间补偿；时间语义归调用方，输入不含 `timestampMs`、不要求递增。`generation` 仅表示该实例内成功提交的 `detect` 序号，从 0 开始递增，不代表时间戳或跟踪状态。
- 帧契约：`image.width`/`image.height` 为正整数且每边 ≤8192、总像素 ≤16,777,216（沿用 /reid `validateImage`）；`image.data` 须为独立 ArrayBuffer 承载的完整 RGBA8，长度恰为 `w*h*4`；越界即输入错误，不重采样纠正。
- 原子性：输入非法/取消/推理失败一律不推进 generation 或任何内部计数；先复制校验、在工作副本上计算、后提交；GPU 驻留输出须等待回读后再提交；调用者输入与返回值不得污染内部状态。成功结果提交时才推进 `generation`；`dispose()` 后不再产生结果。
- `load`/`detect` 期间拒绝并发（BUSY）；`dispose()` 幂等且等待在途操作，之后 `load/detect` 返回 DISPOSED。

## 预处理身份

- 固定输入 416×416；`r = min(416/h, 416/w)`，目标边长按官方 `int(w*r)`/`int(h*r)` 整数截断；右下剩余区域为 114（RGB 三通道同值，归一化前）。宽高比不一致时零填充，**不拉伸**。
- 重采样必须复刻 OpenCV `INTER_LINEAR` 半像素约定（与 `src/reid/preprocess.ts` 手工双线性同路线），**禁止 canvas `drawImage` 平滑**（数值不一致，会破坏黄金向量）。
- 通道顺序：输入 RGBA8 → 按 /reid 既有 composite 规则 alpha 合成得 RGB；SDK 输入已是 RGB，因此等价于官方 BGR→RGB 后的顺序，不再额外交换通道 → letterbox → `/255` → 减 `(0.485,0.456,0.406)` → 除 `(0.229,0.224,0.225)` → CHW fp32。填充区归一化后各通道值为 `(114/255 − mean_c)/std_c`。
- preprocessingId 单独命名（初定 `yolox-letterbox-416-imagenet-meanstd-f32-v1`，最终命名以实现为准），与 /reid 的 RGB crop 身份区分，不共用。
- 逆变换：`x_orig = x_model / r`、`y_orig = y_model / r`，宽高同比缩放；解码、回写与裁剪共用同一 `r`，写成纯函数并做往返测试；越界框裁剪到图像边界。

## 解码、NMS 与输出

### 解码（postprocessMs，全部 JS）

1. ONNX 输出 `(1, 3549, 85)` 已含 obj 与 cls 的 sigmoid（图内），JS 不再 sigmoid；`cx, cy, w, h` 需按 `decode_outputs` 语义解码：`cx=(dx+gx)*s, cy=(dy+gy)*s, w=exp(dw)*s, h=exp(dh)*s`，其中 `gx,gy` 为各层级网格坐标（行主序 `j = y*W + x`），`s` 为该行所属 stride（8/16/32）。
2. 每个 anchor 的 person 分数 `score = obj × cls[0]`（通道 5）。
3. 低于 `scoreThreshold` 的 anchor 直接丢弃；类别过滤在解码期完成，只保留 person 通道，其余 79 类不产生中间对象。
4. 坐标经仿射逆变换回原图，中心式 `(cx,cy,w,h)` 转为根入口左上角约定 `x=cx−w/2, y=cy−h/2`，裁剪到图像边界。

### NMS（postprocessMs，全部 JS）

- 单类贪心 NMS，IoU 阈值 `nmsThreshold`（默认 0.7）；排序键为 `score` 降序，**等值按 anchor 索引升序**，保证确定性；抑制条件 `IoU > nmsThreshold`（严格大于）。
- 参考实现以官方 `yolox/utils/boxes.py` 的解码/NMS 工具或逐行等价的独立实现构造，JS 与其在同一合成张量上逐值对齐；官方路径的细节（如 `multiclass_nms` 的 max_num 语义）以实际核对为准，采用与否必须显式记录下来，不得静默。
- 超过 `maxDetections` 的输出按分数截断，截断数量计入 `droppedDetections`；低于 `scoreThreshold` 的 anchor 不视为 dropped。
- 组合语义：YOLOX 只负责产出 ≥`scoreThreshold` 的检测；送根入口 ByteTrack 后，其高低分二分由 SDK 既有 ByteTrack 内部完成（默认 `highScoreThreshold: 0.5` / `lowScoreThreshold: 0.1`，与官方 demo `track_thresh` 0.5 同值；证据 `src/tracker.ts:11`），本候选不改根入口阈值。

### 实现差异（必须写入算法文档）

- 预处理、解码、NMS 均为官方参考之上的独立实现，不宣称官方逐值复现；不得把重写/翻译表述为消除来源义务。
- ONNX 导出使用官方显式开关 `decode_in_inference=False`（图内含 sigmoid、图外解码），属官方导出路径内行为，但解码代码是独立实现。
- classId 映射（COCO 0 → SDK 1）、左上角约定、越界裁剪为 SDK 侧契约，与官方 demo 输出格式不同。
- 输入为 RGBA8 时的 alpha 合成规则沿用 /reid composite 语义，属 SDK 边界行为，须在算法文档注明。

## 模型资产与分发门槛

固定身份候选：`yolox_tiny`（GitHub Release 0.1.1rc0 资产 `yolox_tiny.pth`，40,755,013 字节；上游 `e1052df`，YOLOX Apache-2.0）。实现期必须按序完成，任一步未过不得进入下一步，也不得把估计值写成事实：

1. 下载 `yolox_tiny.pth`（Release 原始字节，不经文本转换），计算字节数与 SHA-256。
2. 导出 ONNX（fp32）：执行 `tools/export_onnx.py`（opset 记录实际值，目标 17），`decode_in_inference=False`、onnxsim 记录开/关；记录完整算子清单，确认只含标准 `ai.onnx` 算子，并结合 onnxruntime-web@1.27.0 的 WASM/WebGPU 算子表核对（解码与 NMS 一律留在 JS）。
3. Python ORT 前向与官方 PyTorch 前向在固定输入上对齐（固定容差，记录最大误差）。
4. JS 预处理/解码/NMS 与 Python 参考实现在同一合成张量上逐值对齐，并覆盖仿射往返、NMS 打平、person 过滤等反例。
5. 导出后的 ONNX 做字节级锁定（字节数+SHA-256），落到 ModelScope（默认）与 Hugging Face（可选）不可变 revision，manifest 身份与来源字段一致。
6. 模型卡、README 与（未来）Demo 标注：COCO 80 类通用检测权重（Apache-2.0），person 为其中一类，非 MOT17 行人训练，不得宣称 MOT 行人精度；官方 COCO val mAP 32.8 仅作来源记录值引用。
7. 体积未核验前不得写入 manifest；源权重 `yolox_tiny.pth` 为 40,755,013 字节，导出 ONNX 的体积以第 5 步实测值为准，不写估计值。

## 验证矩阵

### 单元与参考对齐

- 预处理：letterbox 往返（`r`、整数截断、114 填充归一化值）、手工双线性与 OpenCV 参考在小图集上比对、预处理身份哈希与 Python 一致。
- 解码：网格/strides 行主序、`(dx+gx)*s` 与 `exp(dw)*s` 公式、`score=obj×cls[0]`、person 过滤、左上角转换与越界裁剪。
- NMS：等值打平顺序、IoU 严格大于语义、截断计数；原子性与错误路径（输入非法、BUSY、DISPOSED、取消、后端不支持、会话输入输出名称不匹配）；实例隔离。
- Python 参考：官方前向对齐 + JS 解码对齐，固定容差与反例（非有限值、形状不符、缺头即加载失败）。

### 序列级

- 原创**合成**序列（运动块、交叉、遮挡、重现、长丢失、稀疏时间戳），**不使用 MOT17/CrowdHuman 图像**；经 `./yolox` 产出检测后送根入口 ByteTrack，记录轨迹定性行为。
- Node 与 Chromium CPU/main（WASM）逐帧检测输出哈希一致；耗时分布记录 p50/p95，首次与重复运行分开；初始化成本与 /reid 既有证据分开归档。
- 失败与退步场景如实记录，不用调参粉饰；不把合成结果说成真实行人精度。

### 环境边界

- 只形成 Windows 11 + Chromium + CPU/main 的 dated evidence；WebGPU 仅在实际测量后声明；手机/NPU/其他浏览器标为未验证。
- 候选阶段不写公开 Demo；组合验证用本地脚本或一次性临时页面，不作为产品 Demo 保留。

## 标准影响

本子入口使 SDK 首次拥有**检测**模型模块：现有 hybrid manifest 的模块键只有 `modules.algorithm`（根算法）与 `modules.model`（/reid），检测模块与 /reid 的契约差异在于输出为 `Detection[]` 而非特征向量，模型/算法边界（谁持有检测阈值、谁持有类别约定）需在标准层裁定。按门户约定：**候选阶段不扩标准**；集成/发布阶段先扩 `standards/v1`（rules.yaml、schema 与文档）再改产品代码。本设计只登记该需求，不提前判定 schema 形状，也不以候选实现倒逼标准。

## 发布与治理

候选阶段不改 `latest`/稳定行为，不发布 npm/GitHub Release，不远程写入。后续若进入发布，只能使用独立预发布标签，并在 README、manifest、（未来）Demo 与变更记录中标注候选/实验状态、已验证环境（仅 Windows 11 + Chromium + CPU/main 及实测后端）、COCO 权重与 Apache-2.0 边界、无 MOT17 行人训练。门户只登记路线与证据链接，不把候选写成 PP-Tracking 默认能力。

## 通过门槛与后续决策

全部满足才算完成：(1) 七道资产门槛按序通过并归档证据；(2) 单元与参考对齐测试通过；(3) 合成序列 Node 与 Chromium CPU/main 哈希一致；(4) 初始化与逐帧成本形成 dated evidence；(5) typecheck/test/build/check:package、候选 ESM/CJS/类型消费、`sdk:check` 前后与独立复审通过；(6) 算法文档写明 COCO 权重身份、实现差异与 NMS/阈值对齐依据。

达标后由用户决定是否进入集成阶段：届时才设计 manifest/标准扩展、`package.exports` 扩项、双语 Demo 与发布，再评估 `0.3.0-alpha`。未达标则保留为本地候选，并归档不接入的原因。

## 2026-09-24 核实与更正记录

| 项 | 更正前 | 更正后（本 spec 撰写期实测） |
| --- | --- | --- |
| 预处理 mean/std | 曾按 ORT demo 记录为「相对官方训练路径的 demo 偏差」 | 官方 train 与 eval 路径均用 ImageNet 统计量（`yolox/exp/yolox_base.py` 的 `get_eval_loader`/`get_data_loader`），demo 与权威路径一致；SDK 必须减 `(0.485,0.456,0.406)`、除 `(0.229,0.224,0.225)` |
| 上游仓库结构 | 首轮按旧布局访问 `yolox/exp.py` 返回 404 | 该修订下 `yolox/exp` 为包目录，base exp 在 `yolox/exp/yolox_base.py` |
| 行人权重 blocker | bytetrack_*_mot17 来源与体积未核验 | 不采用 MOT17 系权重（非商业许可 + 无不可变来源）；改 COCO 权重，person 为 80 类之一，如实标注 |
| 档位 blocker | 未选检测档位 | YOLOX-Tiny @416（depth 0.33 / width 0.375，5.06M 参数，官方 COCO val mAP 32.8） |
| NMS 默认值 | 设计分节展示时写作 0.45（误记） | 官方 ONNX demo `--nms_thr` 默认 **0.7**（`deploy/ONNXRuntime/onnx_inference.py`），SDK 默认随之更正；`--score_thr` 0.1、`--track_thresh` 0.5 与之一并经核实 |
| 输入分辨率 | demo `--input_shape` 608,1088 | SDK 输入由 tiny 档自身 `test_size (416,416)` 决定，与 demo 输入尺寸不同属档位差异，非实现偏差，须在算法文档注明 |

未随本 spec 改变的既有结论：ByteTrack 算法核心与 /reid 子入口的既有契约不变；根入口默认与公开 Demo 不变；治理底线（不发版、不远程写入）与 CenterTrack 候选停止时的处置一致。本 spec 的方法论（原子性、确定性、dated evidence、不宣称官方复现）对后续候选继续适用。
