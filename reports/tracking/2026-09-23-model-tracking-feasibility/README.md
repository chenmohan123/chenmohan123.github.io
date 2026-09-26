# 模型型跟踪算法可行性筛选（2026-09-23）

> **2026-09-24 更正（重要）**：本轮下文关于 CenterTrack「无自定义算子 / 有条件通过」的
> 结论**已被实测推翻，不成立**。首轮只核对了 `backbones/dla.py`，漏掉同仓
> `necks/dlaup.py`；而官方默认 `--dla_node='dcn'`，在颈部实例化 DCNv2，checkpoint
> 实测含 32 个 DCN 张量。CenterTrack 与 FairMOT 属**同一类 DCN 双后端阻断**。
> 依据与修正范围见文末「2026-09-24 更正记录」；其余候选的结论不受影响。

分层：独立 Tracking SDK 的研究评估，门户只同步结论与路线。本轮为**只读筛选**：
未下载权重、未执行 ONNX 转换、未测量浏览器推理成本；不改公开 Demo 选择器，
ByteTrack 默认不变，npm 与门户状态不变（`next=0.2.0-rc.2`、`latest=0.1.0`）。

依据[门户路线图](../../../docs/superpowers/plans/2026-08-17-web-model-sdk-portal-roadmap.md)
"下一项是模型型跟踪算法可行性筛选：先核对 JDE、FairMOT、CenterTrack 的具体权重
身份、许可、输入输出契约、ONNX 转换和浏览器端总成本，再选择一个候选进入独立
设计；未达到门槛前不加入公开算法选择器"，本轮评估 JDE、FairMOT、CenterTrack
三个单模型联合跟踪，并以 ByteTrack / BoT-SORT 的"检测模型 + 现有算法"路径作
对照。

## 范围与底线

- 评估对象只有跟踪形态本身，不引入门户 Workflow，不把任何 SDK runtime 复制进门户。
- 现状基线：`web-sdk-pp-tracking@0.2.0-rc.2`，根入口 CPU/main 四算法，检测由
  调用方提供；可选 `./reid` 子入口持有唯一模型资产 `pplcnet-reid-fp32`
  （33,704,835 字节，opset 17，输入 1×3×192×64，输出 512 维）。
- 证据分三档：**A** 本地字节级核验；**B** 官方仓库元数据/文档只读核验；**C**
  未经本轮核验的推断或估计。矩阵字段与证据档位见 `matrix.json`。

## 核对方法与覆盖范围

| 维度 | 本轮做法 | 结果 |
| --- | --- | --- |
| 许可 | GitHub API 取根 LICENSE 字节并计算 SHA-256；上游依赖只取 SPDX（B 档） | 五仓库根许可均为 MIT；JDE 上游为 AGPL-3.0 |
| 契约 | 读官方 README / MODEL_ZOO / cfg / 源码 forward（B 档） | 均拿到确定性证据，见下表 |
| ONNX 导出 | 读仓库是否含官方导出脚本；读网络定义判断是否存在非标准算子 | FairMOT 含 DCNv2；ByteTrack 有官方脚本 |
| WASM/WebGPU 算子 | 本地 `onnxruntime-web@1.27.0` 的 `docs/webgpu-operators.md`（**A 档**） | WebGPU EP 无 DeformConv/NMS/TopK/Upsample |
| 体积 | YOLOX 用 GitHub Release 资产字节数（A 档）；其余为 Google Drive，无不可变资产 | 见下表 |
| 成本 | 只引用已归档的 PPLCNet 实测锚点与本轮推导的像素比 | 零实测，见"未验证项" |

## 输入输出契约

| 候选 | 输入 | 输出 | 证据 |
| --- | --- | --- | --- |
| FairMOT | 1×3×1088×608 单帧 | 检测 + 嵌入多尺度拼接 | README、`src/lib/opts.py:50` 默认 `dla_34` |
| JDE | 1×3×1088×608（另有 864×480 / 576×320） | 3 个 YOLO 头 `torch.cat(output, 1)`；模型内无 NMS | `cfg/yolov3_1088x608.cfg`、`models.py:281` |
| CenterTrack | **三输入**：当前帧图像 + 前一帧图像 + 前一帧检测热图 | 多分辨率中心点头（heatmap/wh/tracking），跟踪拼接在模型外 | `generic_network.py:91` `def forward(self, x, pre_img=None, pre_hm=None)` |
| ByteTrack 模型型 | YOLOX 1×3×H×W | 检测框 + score，随后进 SDK 现有 `update()` | `deploy/ONNXRuntime/README.md` |
| BoT-SORT 模型型 | YOLOX 检测 + 逐目标 ReID 裁剪 | 检测 + 外观向量 + 外部运动矩阵（API 不变） | `BoT-SORT/README.md` |

CenterTrack 的三输入是最需要提前定契约的一项：它把"前一帧检测结果"作为模型
输入回灌，意味着 SDK 需要维护帧间状态才能喂对该输入，与现有"每帧检测独立
传入"的根入口语义不同。

## 官方代码与权重许可

| 仓库 | 根许可 | 固定提交 | 许可链要点 |
| --- | --- | --- | --- |
| ifzhang/FairMOT | MIT | `4aa62976bde6266cbafd0509e24c3d98a7d0899f` | backbone 用 `ifzhang/DCNv2`（BSD-3-Clause）自定义 CUDA 算子；CrowdHuman 预训练数据许可待核 |
| Zhongdao/Towards-Realtime-MOT（JDE） | MIT | `e9fa1e8014a9577410ce99505b871e4bc5aa1cde` | README 自述大量代码借自 `ultralytics/yolov3`（**AGPL-3.0**）与 `longcw/MOTDT`（MIT） |
| xingyizhou/CenterTrack | MIT | `e4e7534cc2ebfbd31e0cde680988f286c65fe34f` | MODEL_ZOO 自述 MOT17/CrowdHuman 数据集为 non-commercial |
| NirAharon/BoT-SORT | MIT | `251985436d6712aaf682aaaf5f71edb4987224bd` | 基于 ByteTrack + FastReID（Apache-2.0）；备选 yolov7（**GPL-3.0**）本轮不建议采用 |
| ifzhang/ByteTrack | MIT | `d1bf0191adff59bc8fcfeaa0b33d3d1642552a99` | 与 2026-09-18 可行性报告锁定一致 |
| Megvii-BaseDetection/YOLOX | Apache-2.0 | `6ddff4824372906469a7fae2dc3206c7aa4bbaee` | 检测权重与官方导出工具链 |

结论：**根许可都可用，但根 MIT 不足以证明复制/翻译链可发布**——JDE 的
AGPL-3.0 上游与 FairMOT 的 DCN 自定义算子需要各自的处置结论，这与
2026-09-18 可行性报告对 ByteTrack/DeepSORT Kalman 链的结论是同一类问题。

## ONNX 转换

| 候选 | 官方导出脚本 | 非标准算子 | 判断 |
| --- | --- | --- | --- |
| FairMOT | 无 | `dcn_v2::DCN`（`pose_dla_dcn.py:16 from dcn_v2 import DCN`，DeformConv 用 3×3 DCN） | **双后端阻断**：既不在 ai.onnx 标准算子集，也不在 WebGPU EP 表内 |
| JDE | 无 | 无。cfg 117 层仅 convolutional/shortcut/route/upsample/yolo | 标准算子；upsample 需在导出时固定为 Resize |
| CenterTrack | 无 | ~~无~~ **`DCN`（DCNv2）**。~~`backbones/dla.py` grep 无 dcn/deformable~~ **更正：`necks/dlaup.py:17 from ..DCNv2.dcn_v2 import DCN`、`:99 self.conv = DCN(...)`、`:164 'dcn': (DeformConv, DeformConv)`；`opts.py:86 --dla_node default='dcn'`，`mot17_half.sh` 未覆盖** | **双后端阻断**（2026-09-24 实测），与 FairMOT 同类 |
| ByteTrack 模型型 | **有** `tools/export_onnx.py` | 无 | 官方路径，本文档给出 bytetrack_s.onnx 示例 |
| BoT-SORT 模型型 | 无（社区有先例） | 无 | `PINTO0309/BoT-SORT-ONNX-TensorRT`（MIT）已用 onnxruntime+numpy+scipy 跑通 YOLOX-X + FastReID |

## WASM / WebGPU 算子兼容性

本轮对 SDK 固定的 `onnxruntime-web@1.27.0` 做了本地字节级核验
（`node_modules/onnxruntime-web/docs/webgpu-operators.md`，WebGPU EP 算子表）：

- 表内包含 Conv、BatchNormalization、Resize、Concat、Slice、GridSample、
  InstanceNormalization 等候选所需常规算子；
- 表内**没有** DeformConv / DeformableConv2D、NonMaxSuppression、TopK、
  Upsample；
- 部分算子标注 "no GPU kernel"（如 Reshape、Shape），会触发 CPU 回退与告警。

由此得到三条硬结论：

1. **FairMOT 的 DCN 同时阻断 WASM 与 WebGPU**。WebGPU 表里没有对应算子；
   WASM 侧若要运行需自行注册自定义算子实现。重写可变形卷积会改变数值，届时
   不能再以 FairMOT 身份宣称官方精度——这与 SDK "显式来源失败不静默换源"、
   "不能把重写说成官方移植"的既有约定冲突。
2. **CenterTrack 的 DCN 同类阻断（2026-09-24 更正后新增）**。首轮此处误判为
   "无自定义算子"；实测后与 FairMOT 同一阻断类型：默认 `--dla_node='dcn'`
   在 `dla_up` 颈部实例化 DCNv2，既不在 ai.onnx 标准算子集，也不在 WebGPU EP
   表内。差别只在代码路径（FairMOT 在 backbone、CenterTrack 在 neck），不在
   阻断性质。要落地只有两条路：自行实现可变形卷积（改变数值，不能以
   CenterTrack 身份宣称官方精度），或把 DCN 拆解为标准算子的子图（等于一次新的
   研究与导出工程，不在已批准范围内）。
3. **解码与 NMS 必须留在 JS**。所有候选都不应把 NMS 塞进模型图；这一条与
   PP-RotatedDetection 的既有做法一致。

另有一条对本轮结论方式本身的教训：ONNX 导出的算子判断**必须核对网络定义全集**
（backbone / neck / head 全部文件）加 checkpoint 键集，只读单个文件不足以下
"无自定义算子"的结论。2026-09-23 的三个单模型候选里，CenterTrack 的正因此误判，
FairMOT 的正确判断则来自完整读了 `pose_dla_dcn.py`。

WASM/CPU 侧：ai.onnx 标准算子（含 NMS、TopK、Upsample）由 ORT CPU EP 覆盖，
因此 JDE 与 CenterTrack 在 WASM 上的阻断点不在算子集，而在于必须完成一次真实
导出才能断言。现有 `pplcnet-reid-fp32`（opset 17）已在 WASM 与 WebGPU 双后端
验证过（manifest 2026-09-21 条目），这构成可用的基线参考。

## 模型体积与分发

| 候选 | 权重来源 | 体积 | 不可变来源 |
| --- | --- | --- | --- |
| YOLOX（ByteTrack/BoT-SORT 检测） | GitHub Release `0.1.1rc0` | nano 7,694,953 / tiny 40,755,013 / s 72,089,125 / m 203,114,461 / l 434,357,141 / x 793,463,373 字节 | **是** |
| 当前 PPLCNet ReID | ModelScope / Hugging Face | 33,704,835 字节 | 是 |
| FairMOT `fairmot_dla34.pth` | Google Drive / 百度 / OneDrive | 未核验 | **否** |
| JDE `JDE-1088x608` 等 | Google Drive / 百度 | 未核验 | **否** |
| CenterTrack `mot17_half` | Google Drive | **79,987,301 字节（2026-09-24 实测）** | **否** |
| BoT-SORT ReID `MOT17-SBS-S50` | Google Drive | 未核验 | **否** |

fp32 ONNX 体积约为参数量 ×4 字节，可作为量级参考；本轮不给出未核验的精确
数字。凡 Google Drive 唯一来源的权重，都**不满足** `standards/v1` 对模型来源
的不可变 revision 与 SHA-256 要求，这是三个单模型候选共同的前置阻断项：进入
设计阶段的第一件事就是把权重落到 ModelScope（默认）或 Hugging Face（可选）并
计算摘要。（2026-09-24 补充：CenterTrack 的 `mot17_half` 已按资产门槛计划下载
并完成字节级锁定，但分发来源仍是 Google Drive——该前置阻断项对它依然成立，且
它的算子集阻断已先行判死不通过。）

## 初始化与推理成本

带日期的实测锚点只有当前 ReID 资产（Chromium 153 / Windows 11 10.0.26200 /
i5-10400F / RTX 5060 Ti，2026-09-19，见
[2026-09-19-reid-feasibility](../../../reports/tracking/2026-09-19-reid-feasibility/README.md)）：

- 单目标暖运行中位数 WASM 19.135 ms / WebGPU 20.185 ms；
- 16 目标串行 WASM 291.000 ms / WebGPU 214.380 ms；
- 7 次模型加载另计 9,005.000 ms（约 1.29 s/次）。

本轮推导（**C 档，非实测**）：JDE/CenterTrack 的 1088×608 输入为 659,584
像素/帧，是 ReID 12,288 像素输入的 53.7 倍，且骨干规模远大于 PPLCNet，因此
单帧成本必然高出至少一个量级；再叠加 100 MB 级下载。官方 GPU 参考仅作背景：
JDE 22.2 FPS（Titan Xp，整系统，MOT-16 train）、FairMOT 约 30 FPS、CenterTrack
test 45 ms。**不能**把这些 GPU 数字换算成浏览器结论。

## 筛选结论

| 候选 | 结论 | 主要理由 |
| --- | --- | --- |
| FairMOT | **不通过** | DCNv2 自定义算子双后端阻断；重写即改变数值 |
| JDE | **不通过** | 许可链含 AGPL-3.0 上游未裁定；1088×608 Darknet-53 成本最高；官方精度最低 |
| CenterTrack | **不通过**（2026-09-24 由「有条件通过」更正） | DCNv2 自定义算子双后端阻断：`opts.py:86 --dla_node default='dcn'` 默认启用，`necks/dlaup.py:99` 实例化 `DCN`，checkpoint 实测 32 个 `conv_offset_mask` 键全在 `dla_up`；权重无不可变来源；浏览器成本未实测 |
| ByteTrack 模型型 | **有条件通过** | 算法已在 SDK；YOLOX Apache-2.0 + 不可变 Release + 官方导出脚本 |
| BoT-SORT 模型型 | **有条件通过** | 算法已在 SDK；FastReID Apache-2.0；社区纯 onnxruntime 先例；需双模型分发 |

**（2026-09-24 更正）以下「建议下一阶段独立设计的候选：CenterTrack（待确认）」及其
理由已经作废**，由本报告更正后的结论取代。

> **更正后的结论**：三个单模型联合跟踪候选**全部不通过**（FairMOT、JDE、
> CenterTrack），两个"检测模型 + 现有算法"路径仍为有条件通过。首轮推荐的
> CenterTrack 因 DCNv2 双后端阻断与 FairMOT 同因，不构成可进入独立设计的候选。
>
> 若下一阶段仍要走模型型跟踪，**次选 ByteTrack + YOLOX 是唯一未被推翻的路径**
> （算法已在 SDK、YOLOX Apache-2.0、GitHub Release 不可变资产、官方导出脚本），
> 代价是 SDK 将首次拥有检测模型，需先裁定 manifest 与模型/算法边界。
>
> 是否走向该次选、或停止单模型路线、或为 CenterTrack 单独立项做 DCN 标准算子
> 分解，属用户级决策，本报告只固定证据、不做裁决。

进入设计前必须完成的共同门槛（缺一不可）：

1. 下载权重并计算 SHA-256 与字节数，落到 ModelScope/Hugging Face 不可变 revision；
2. 完成 ONNX 导出并逐算子核验 WASM/WebGPU 支持，断言解码与 NMS 留在 JS；
3. 把输入输出契约改写成显式 API（形状、dtype、语义、失败路径、状态生命周期）；
4. 在 Windows 桌面 Chromium CPU/main 实测初始化与逐帧成本，不扩展成手机结论；
5. 训练数据许可（MOT17/CrowdHuman non-commercial）单独标注。
6. **（2026-09-24 追加）算子集判断必须覆盖 backbone/neck/head 全部网络定义文件
   与 checkpoint 键集，不得以单一文件的 grep 结论替代。**

## 本轮核验

本轮未修改任何 SDK 或门户生产代码，仅在门户新增本报告目录（三个文件）与一份
检查器证据。因此 Demo 选择器、ByteTrack 默认、npm 与线上状态全部不变。

- 门户 `sdk:check -- --repo ../web-sdk-PP-Tracking`：`locally-compliant`，
  required 失败 0、远程跳过 4，证据见
  [tracking-mtf-after-20260923.json](../../../reports/sdk-standard/tracking-mtf-after-20260923.json)。
- 门户 `astro check`：0 error / 0 warning / 7 hint（7 条为既有提示）；
  门户构建 21 页通过。
- 门户单测：882 通过 / 11 失败 / 64 跳过。11 项失败全部位于 `.tmp/` 下的旧
  暂存目录（detection-compatibility-before、ppyoloe-release-audit 等，目录
  时间戳为 09-13/09-14），与被 gitignore 的 `.tmp/` 未列入 vitest exclude 有关，
  与本报告无关；与被评估的 `web-sdk-PP-Tracking` 无关。

上述核验只证明本轮没有破坏既有状态，**不证明**任何候选的模型型跟踪可行性——
那需要下载权重并实测。2026-09-24 的更正也未修改任何 SDK 或门户生产代码，且被
评估的 `web-sdk-PP-Tracking` 自该次核验后未改动，故上述结论继续有效。

## 未验证项与限制

- JDE、FairMOT 权重的实际字节数与参数规模未核验（未下载）；CenterTrack
  `mot17_half` 已于 2026-09-24 下载并字节级锁定（79,987,301 字节，SHA-256
  `2272af89…eed6`），但分发来源仍是 Google Drive，不满足不可变 revision。
- 任何候选的浏览器初始化与推理成本均未实测；本轮零测量。
- 各模型导出的 ONNX 算子清单未验证，上述算子判断基于网络定义与本地算子表。
- CenterTrack **未做导出尝试**：默认配置即含 DCNv2，在完成 DCN 处置决策前不启动
  导出；torchvision `deform_conv2d` 的导出探测已实测不可用（产出默认域自定义
  `DeformConv` 节点，`onnx.checker` 报 "No Op registered for DeformConv with
  domain_version of 17"）。
- `--dla_node conv/gcn` 变体与官方权重不兼容（实测 missing/unexpected 80–104 /
  144），无法整网加载，因此"改用非 DCN 节点"不是保持权重身份的可行选项。
- 官方 MOT 榜单数字不能推断浏览器序列上的精度，也不能推断官方测试集成绩。
- FairMOT CrowdHuman 预训练数据许可细节未核验。
- JDE 的 AGPL-3.0 上游是否实际触发义务需法律裁定；本报告只固定证据，不给结论。

## 2026-09-24 更正记录

更正原因：确认 CenterTrack 进入候选并启动资产门槛实施后，按计划下载
`mot17_half.pth` 并核对权重键集，发现 32 个 `conv_offset_mask` DCN 张量全部位于
`dla_up.*`；回溯官方源码确认 `opts.py:86 --dla_node default='dcn'` 与
`necks/dlaup.py:99` 的 `DCN(...)` 实例化。**首轮可行性筛选的"无自定义算子"结论
只核对了 `backbones/dla.py`，漏检 `necks/dlaup.py`，属事实错误。**

更正动作（均不改 SDK、Demo、版本与 npm 状态）：

| 项 | 首轮（2026-09-23，错误） | 更正后（2026-09-24） |
| --- | --- | --- |
| CenterTrack 非标准算子 | 无 | `DCN`（DCNv2），默认启用 |
| CenterTrack verdict | conditional-pass | **fail**（与 FairMOT 同类阻断） |
| 推荐候选 | CenterTrack | 无（单模型路径候选用尽；次选 ByteTrack+YOLOX 未被推翻） |
| `mot17_half` 体积 | 未核验 | 79,987,301 字节 + SHA-256 |
| 来源锁定条数 | 26 | 28（新增 `necks/dlaup.py` 与 checkpoint 字节锁） |

证据（均可复现）：`necks/dlaup.py` 原始字节
`682311235d86ca902e504c31f217582f9c18c2269ce247ce6fb4a382686d8778`（6,315 字节）；
checkpoint `torch.load(..., weights_only=True)` 得 418 键 / 32 DCN 键（ida_0 4 /
ida_1 8 / ida 2 12 / ida_up 8）。

未进入实施范围（需用户另行授权）：DCNv2 的 ONNX 分解方案、备选候选切换、停止单
模型路线。相应地，已批准的 CenterTrack 设计 spec 与资产门槛计划同步标注前提失效，
不进入资产导出与 `0.3.0-alpha`。

## 复现入口

`matrix.json` 为结构化矩阵（含 verdict、blockers、strengths、unverified）；
`sources.lock.json` 固定 28 条来源的仓库、提交、URL 与 SHA-256（字节级锁定
的条目标注 `sha256`，仅取 SPDX 元数据的条目标注 `sha256: null` 并说明原因）。
执照与源码核验均通过 GitHub API 只读完成，时间为 2026-09-23；CenterTrack 的
DCN 证据与 `mot17_half` 字节锁为 2026-09-24 补充。
