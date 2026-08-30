# PaddleDetection Web SDK 设计

- 日期：2026-08-27
- 状态：方案已在对话中确认，等待文档审阅；尚未开始实现
- 分层：单 SDK（首发）+ 门户登记 + 后续 Workflow 配方
- 目标仓库：chenmohan123/web-sdk-PP-Detection
- 建议 npm 包：web-sdk-pp-detection
- 开源协议：Apache-2.0
- 首发运行时：ONNX Runtime Web

## 背景与目标

PaddleDetection 同时包含轴对齐目标检测、旋转框检测、实例分割、关键点、
多目标跟踪、3D 检测和 PP-Human/PP-Vehicle 等多模型组合。它们的输入输出、
后处理、跨帧状态和浏览器可运行性不同，不能把整个 PaddleDetection 直接
包装成一个没有稳定契约的浏览器大包。

首发 SDK 面向轴对齐目标检测，必须在 PC、移动端浏览器、微信公众号 H5 和
微信小程序 web-view 中处理图片、摄像头帧和视频帧，并允许调用者显式选择
CPU/WASM 或 GPU/WebGPU。默认模型由 Git LFS 溯源和分发，同时可切换
Hugging Face、ModelScope 或用户自己的模型清单。FP32 和 FP16 是稳定变体，
INT8 在实测后加入，INT4 和 FP8 只作为实验能力。

## 已确认决策

### 仓库边界

按任务契约拆分仓库，而不是按单个权重文件或量化文件拆分：

- web-sdk-pp-detection：轴对齐框检测，覆盖 PicoDet、PP-YOLOE 和小目标
  检测变体；首发默认模型优先选择轻量 PicoDet。
- web-sdk-pp-rotated-detection：旋转框和角度框后处理。
- web-sdk-pp-segmentation：实例分割的 mask/多边形结果。
- web-sdk-pp-tinypose：人体关键点和可见性结果。
- web-sdk-pp-tracking：跨帧轨迹生命周期和跟踪状态。

PP-Human、PP-HumanV2、PP-Vehicle、PP-Sports 是多模型和业务规则组合，先
在门户中登记为 Workflow 配方，不把其他 SDK 的推理代码复制到检测 SDK。
只有至少两个 SDK 有兼容的公开输入输出契约且存在有价值的组合用例后，才为
Workflow 单独设计执行面。

### 运行时边界

SDK 核心只负责单帧推理、模型生命周期和结果契约。摄像头权限、视频播放、
帧循环和 UI 由宿主页面或示例负责。实例遵循 create -> load -> ready ->
detect -> dispose 生命周期。

显式指定 wasm 或 webgpu 时严格执行，不静默替换后端。只有调用者选择
backend: auto 并允许回退时，才按清单中的有效候选尝试其他后端；结果必须
同时报告请求后端和实际后端。

### 模型分发

来源类型为 git-lfs、huggingface、modelscope 和 custom。git-lfs 是默认
溯源和仓库存储方式，另外两个是可选镜像。LFS pointer 文件不是浏览器模型
本体；清单下载地址必须指向不可变的 LFS media、GitHub Release 或其他支持
CORS 的 CDN 资产。每个来源固定 revision、路径、字节数和 SHA-256，并记录
CORS/Range 验证结果。

npm 包只包含 runtime、Worker、类型、默认清单和轻量资源，不包含 ONNX
二进制。首次加载从默认 Git LFS 发布资产获取模型，校验后写入版本化
IndexedDB 缓存。用户可以传入自定义清单或自托管模型。

SDK 代码采用 Apache-2.0。模型文件不因为 SDK 采用 Apache-2.0 就自动获得
相同许可；每个模型变体和每个镜像来源都必须在第三方声明中记录上游项目、
权重许可、数据集/标签限制和是否允许再分发。未核实再分发许可的模型只能
作为外部来源引用，不能打包进 Release 或作为默认资产。

### 精度与量化

精度是模型变体属性，量化方法单独记录，不为每种精度建立独立仓库：

- fp32：兼容性基线，优先完成 WASM/CPU 和 WebGPU 验证。
- fp16：WebGPU 和移动端优先，确认 shader-f16 能力及 WASM 表现。
- int8：完成权重/激活量化和算子验证后加入，区分 QDQ、QLinear、动态和
  权重专用量化。
- int4：通常需要 MatMulNBits 等特定算子，只以实验变体出现。
- fp8：暂不作为稳定浏览器能力承诺。
- bf16、稀疏或其他格式：完成逐模型、逐后端验证后再加入。

文件存在不等于浏览器可运行。没有通过对应后端和浏览器验证的精度组合
必须返回 CAPABILITY_UNSUPPORTED，不得自动降级到另一种精度。

## 模型版图与首发范围

PaddleDetection release/2.9 的模型库按任务归纳如下：

| 类别 | 代表模型/工具 | 首发处理 |
| --- | --- | --- |
| 轴对齐 2D 检测 | YOLOv3、PP-YOLO、PP-YOLOE、PP-PicoDet、FCOS、SSD、RTMDet | 首发 SDK，先固定轻量 PicoDet |
| 小目标检测 | PP-YOLOE-SOD | 检测 SDK 变体；切片/多尺度策略另行评估 |
| 旋转框检测 | PP-YOLOE-R、FCOSR | 后续独立 SDK |
| 实例分割 | Mask R-CNN、Cascade Mask R-CNN、SOLOv2、Mask-RT-DETR | 后续独立 SDK |
| 人脸检测 | BlazeFace 等 | 可作为检测变体，专用后处理另行评估 |
| 人体关键点 | PP-TinyPose、HRNet、Lite-HRNet | 后续独立 SDK |
| 多目标跟踪 | JDE、FairMOT、ByteTrack、OC-SORT、BoT-SORT | 后续独立 SDK |
| 半监督检测 | DenseTeacher 等 | 训练方法，不作为浏览器推理 SDK |
| 3D 检测 | PointPillars、CenterPoint、PETR 等 | 暂不列入首批 |
| 行人/车辆/运动分析 | PP-Human、PP-Vehicle、PP-Sports | Portal Workflow 配方 |

官方 EXPORT_ONNX_MODEL.md 列出的可转换范围只是模型库的子集，部分模型
要求固定输入尺寸、batch=1；PP/YOLO 系列的 MatrixNMS 转换为 NMS 后可能
有精度差异。因此默认模型必须完成数值对齐和真实浏览器验证后，才能进入
稳定清单和发布说明。

## 系统架构

建议仓库内部按职责组织：

    packages/sdk/                 框架无关 runtime 与检测 API
    packages/model-tools/         转换、量化、清单和校验脚本
    models/                       Git LFS 模型源和版本化清单
    apps/demo/                    React 在线 Demo 工作台
    examples/vanilla/             Vanilla TypeScript/DOM 基线
    examples/react/               React 参考示例
    examples/vite/                Vite 集成示例
    examples/cdn/                 script-tag/CDN 示例
    examples/wechat-web-view/     公众号 H5/小程序 web-view 示例
    docs/zh-CN/                   中文文档
    docs/en/                      英文文档
    tests/                        单元、浏览器、模型和示例契约测试
    benchmarks/                   冷启动、热运行和视频帧基准

runtime 层拥有能力探测、ONNX Runtime Web Session、Worker 通信、模型下载、
完整性校验、IndexedDB 缓存、取消、错误归一化和资源释放。检测域层只拥有
图像预处理、输出解码、NMS/阈值过滤和轴对齐框结果，不引用 React 或 Vue。

公共数据流为：

    createPPDetection(options)
      -> 解析模型变体、来源和后端
      -> load(): 获取、缓存、校验、创建 Session
      -> detect(imageOrVideoFrame)
      -> decode + preprocess + inference + postprocess
      -> 检测框、模型信息、runtime 信息、耗时
      -> dispose(): 释放 Worker、Session 和 GPU/CPU 资源

## 公共 API

首发 API 的目标形状如下，具体类型名称可沿用现有 SDK 命名习惯：

    type Backend = "wasm" | "webgpu" | "auto";
    type ExecutionMode = "main" | "worker";
    type Precision = "fp32" | "fp16" | "int8" | "int4" | "fp8" | "bf16" | string;

    type ImageSource =
      | Blob | File | ImageBitmap | HTMLImageElement
      | HTMLCanvasElement | OffscreenCanvas | ImageData | VideoFrame;

    interface PPDetection {
      readonly manifest: DetectionManifest;
      readonly capabilities: DetectionCapabilities;
      load(options?: { signal?: AbortSignal }): Promise<void>;
      detect(input: ImageSource, options?: DetectOptions): Promise<DetectionResult>;
      getCacheEstimate(): Promise<{ bytes: number; entries: number }>;
      clearCurrentModelCache(): Promise<void>;
      clearAllCache(): Promise<void>;
      dispose(): Promise<void>;
    }

detect 支持 AbortSignal、置信度阈值、可选时间戳和调用方元数据。SDK 不主动
申请摄像头权限，也不负责视频播放；业务页面将 video 当前帧转换为
VideoFrame、ImageBitmap 或 Canvas 后调用 detect。

检测结果使用原始图像像素坐标，至少包含 detections、image 尺寸、model、
runtime、timings 和可选 frame.timestampMs。每个检测项包含稳定 index、
classId、label、score 以及 x、y、width、height。

## 摄像头、视频和实时调度

三个输入场景共用单帧 API：

- 图片：上传 File、拖放 Blob 或交给 Canvas/ImageBitmap。
- 摄像头：宿主调用 getUserMedia()，将视频流绑定到 HTMLVideoElement，用
  requestVideoFrameCallback；不可用时使用节流后的 requestAnimationFrame。
- 视频：宿主用 video 播放本地文件，按时间戳采样，支持暂停、单帧和最大 FPS。

示例层的调度器只允许一个未完成的推理任务，队列长度为 1；新帧到来时若
上一帧仍在推理，丢弃旧帧并保留最新帧。停止摄像头或视频时取消 AbortSignal，
释放 VideoFrame、Canvas 和 SDK 实例。调度器报告输入 FPS、实际处理 FPS、
丢帧数、当前帧时间戳和最近一次完整耗时。

SDK 不能把摄像头权限、视频元素或页面可见性策略写进 runtime。跨域视频帧
还必须满足浏览器 CORS 和 Canvas 污染约束。

## Manifest 与模型来源

为兼容现有 SDK，维护两层清单：

1. 根目录 sdk-manifest.yaml：满足 Web Model SDK Standard v1.1 的仓库、发布、
   Demo、性能和模型治理要求。
2. models/pp-detection/<model-version>/manifest.json：检测 runtime 的详细
   输入输出、预处理、后处理、标签和多来源资产契约。

标准 manifest 的 model 节需要在实现前扩展为向后兼容的“变体 + 来源”结构。
每个变体至少声明 id、precision、quantization、opset、bytes、parameterCount、
backends 和 sources；每个 source 声明 kind、repository、revision、path、
downloadUrl、sha256 和 CORS/Range 验证结果。runtime manifest 还要声明张量
名称、shape、dtype、输入尺寸、归一化、标签表、输出解码和 NMS 规则。

来源选择规则：

- 显式来源失败返回 MODEL_SOURCE_UNAVAILABLE，不自动换源。
- source: auto 才允许按清单顺序尝试来源，并记录请求来源、实际来源和失败原因。
- 自定义 manifest 必须提供完整输入输出契约、文件大小和 SHA-256；SDK 不根据
  文件名猜预处理或后处理。
- 完整性校验失败的资产不得进入持久化缓存。

## 后端、精度与回退

API 使用 wasm 表示 CPU/WASM，使用 webgpu 表示 GPU/WebGPU。Demo 同时展示
“CPU/WASM”和“GPU/WebGPU”，结果保留精确运行时名称。

- 显式 webgpu、wasm 或精度组合不可用时立即返回 CAPABILITY_UNSUPPORTED。
- backend: auto 且 allowFallback: true 时，才可以尝试清单中已验证的候选；
  每个候选记录实际后端和失败阶段。
- 后端回退不等于精度回退；精度变更也必须出现在有效候选中。
- Worker 不可用且显式要求 worker 时返回 CAPABILITY_UNSUPPORTED，不自动改到
  主线程。

首发稳定组合为 picodet-l-320-fp32 和 picodet-l-320-fp16。picodet-l-320-int8
只有在真实浏览器和数值对齐通过后加入。INT4、FP8 只在 labs 清单中出现，
并显示证据、限制和不支持的浏览器/后端。

## 缓存、错误与资源释放

持久缓存使用带版本键的 IndexedDB；键至少包含 SDK id、模型 id、模型版本、
变体、来源 revision 和 SHA-256。SDK 暴露当前模型缓存估算、清理当前模型、
清理全部 SDK 缓存以及禁用持久化缓存的选项。

错误码至少包括 CAPABILITY_UNSUPPORTED、INVALID_INPUT、INVALID_MANIFEST、
MODEL_SOURCE_UNAVAILABLE、MODEL_DOWNLOAD_FAILED、MODEL_INTEGRITY_FAILED、
OUT_OF_MEMORY、SESSION_CREATE_FAILED、INFERENCE_FAILED、ABORTED 和 DISPOSED。

dispose() 必须释放 Worker、Session、WebGPU 资源、Canvas/帧引用和缓存句柄。
实例释放后再次调用 load 或 detect 必须返回 DISPOSED。

## 性能与计时

所有加载和推理结果使用标准字段，并定义冷启动和热运行语义：

    modelDownloadMs
    modelCacheReadMs
    integrityMs
    sessionMs
    decodeMs
    preprocessMs
    inferenceMs
    postprocessMs
    totalMs

冷启动包含网络或缓存获取、完整性校验和 Session 创建；热运行复用已加载
Session。CPU/WASM 和 GPU/WebGPU 在同一模型变体、同一输入、同一来源条件下
分别测量；WebGPU 不可用时显示 unsupported，不生成伪造耗时。

每条性能证据记录浏览器版本、操作系统、设备、运行时版本、后端、执行模式、
模型变体、精度、输入尺寸和测试日期。结果是特定环境的观测，不能写成所有
设备都成立的基准；建议额外记录峰值内存和缓存字节数。

## Demo 设计

在线 Demo 是当前模型工作台，不是模型目录。React 实现完整参考 Demo，使用
三个场景标签复用同一 SDK 实例和结果渲染器：

1. 图片：上传/拖放图片，执行单次检测并绘制框。
2. 摄像头：申请权限、启动/停止视频流、实时绘制框、显示处理 FPS 和丢帧数。
3. 视频：选择本地视频、播放/暂停、单帧、最大 FPS 和实时结果叠加。

控制区提供模型变体、来源、精度、后端、执行模式、阈值、最大 FPS、加载、
运行、停止、重置、当前模型缓存清理和全局模型缓存清理。信息区至少显示
模型名、版本、来源、格式、精度/量化、文件大小、参数量、ONNX opset、类别数、
许可证、请求/实际后端、执行模式、运行时版本、冷/热耗时、兼容性矩阵、限制、
自定义模型契约和隐私声明。

Demo 初始语言为中文，提供页面内中英文切换，并包含标准要求的
data-sdk-cache-clear、data-sdk-model-info、data-sdk-runtime-info、
data-sdk-timing 等标记。390px 宽度不产生横向溢出。

## 示例与平台边界

必须提供 Vanilla TypeScript/DOM 和 React 示例；manifest 声明的平台还应
提供 Vite、CDN、公众号 H5/微信小程序 web-view 示例。每个示例提供安装、
运行和当前版本说明。

支持范围：

- PC 浏览器：按浏览器、操作系统、后端和运行时版本建立验证矩阵。
- 移动浏览器：优先测试轻量模型和 WASM，WebGPU 只在真实设备验证后声明。
- 微信公众号 H5：受 HTTPS、CORS、WebView 内核和权限策略约束。
- 微信小程序 web-view：运行 H5 页面，遵循同一 HTTPS/CORS 约束。
- 微信原生小程序 JavaScript/WASM runtime：明确标记为不支持。

SDK 不上传图片、视频或摄像头帧；示例只在浏览器本地处理。跨域媒体、
COOP/COEP、多线程 WASM 和 WebGPU 的可用性分别写入部署文档。

## 转换、验证与发布门槛

1. 从官方固定分支和模型源导出 PicoDet 部署模型，使用 Paddle2ONNX 转换，
   记录 opset、固定输入 shape 和转换命令。
2. 在 Python ONNX Runtime 与浏览器 ONNX Runtime Web 中做数值对齐，覆盖
   预处理、框解码、NMS、阈值边界和空检测结果。
3. 生成 FP32、FP16 候选；INT8 只有在量化误差、算子覆盖和 CPU/GPU 实测
   达标后加入；INT4/FP8 保留实验报告。
4. 为每个变体生成真实字节数、参数量、SHA-256、来源 revision、输入输出签名
   和验证矩阵，填入 runtime manifest 和根 sdk-manifest.yaml。
5. 实现单帧 API、Worker、取消、缓存、严格后端选择、来源选择和资源释放。
6. 实现 React Demo 和五类示例，覆盖图片、摄像头、视频、模型信息、CPU/GPU
   冷热加载和推理计时。
7. 运行 pnpm sdk:check -- --repo <path>，再运行格式、文档对照、lint、
   typecheck、单元、浏览器、模型契约、示例和构建测试。
8. 通过受保护默认分支的 CI 后，发布不可变 GitHub Release 和 npm 版本；远程
   Ruleset、Pages 和部署状态通过 GitHub API 或托管商 API 留存带日期证据。

验收必须同时证明：图片单帧在 WASM/CPU 和可用的 WebGPU 上与参考结果对齐；
摄像头和视频调度不堆积任务且能停止、取消和统计丢帧；显式后端、来源和精度
不会静默改写；自定义 manifest 在契约错误、校验失败和后端不支持时给出稳定
错误；Demo 和示例在声明的平台可运行且限制与测试日期清晰。

## 风险与非目标

- 不承诺所有 PaddleDetection 模型都能转换为 ONNX，或所有 ONNX 都能在
  ONNX Runtime Web 中运行。
- 不把 WebNN、NPU、FP8、INT4 写成稳定能力，除非有真实验证证据和对应标准
  规则说明。
- 不在首发 SDK 内实现跨 SDK Workflow、PP-Human/PP-Vehicle 完整编排、服务端
  推理或原生微信小程序 runtime。
- 不把 CPU/GPU 时间写成跨设备排名；性能数据都带环境和日期。
- Git LFS、Hugging Face、ModelScope 的网络、CORS、Range 请求和配额可能变化；
  固定 revision、摘要、镜像选择和本地缓存只能降低该风险。

## 参考资料

- PaddleDetection 官方仓库：https://github.com/PaddlePaddle/PaddleDetection
- 官方 ONNX 导出说明：deploy/EXPORT_ONNX_MODEL.md
- Web Model SDK Standard v1：standards/v1/README.md
- 单 SDK Demo 契约：standards/v1/demo-contract.md
- 性能与耗时契约：standards/v1/performance-contract.md
- 仓库治理与部署契约：standards/v1/repository-governance-contract.md
