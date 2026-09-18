# 本地复现

本目录是旋转框独立 SDK 的前置实验，不是产品 runtime。命令从门户仓库根目录运行，结果覆盖同日期报告；保留历史证据时应使用独立副本。

## 环境与固定输入

复用本机既有环境：Python 3.11.15、Paddle 2.6.2、Paddle2ONNX 1.3.1、ONNX 1.16.2、Python ORT 1.20.1、NumPy 1.26.4、OpenCV 4.11.0、Shapely 2.1.1，以及 PaddleDetection、requests、PyYAML 依赖。浏览器采用 Playwright 1.63.0、ORT Web 1.27.0；实际 Chromium/硬件信息见 [执行记录](../browser-execution.json) 和 [宿主机记录](../host.json)。

上游 ZIP 必须与 [来源锁](../sources.lock.json) 的 SHA-256 一致。目录约定：

```text
<cache>/downloads/paddledetection.zip
<cache>/upstream/PaddleDetection-b25522a0f4bde8c80603f3ba5e3472059972e3b5/
```

两张图片直接来自固定源码 ZIP 的 `demo/`，不需要另外下载 DOTA。实验生成旋转图、非方形裁剪图及空白图；来源、变换和张量摘要见 [输入锁](../dataset.lock.json)。图片与模型均留在 Git 忽略目录。

```powershell
$rotPython = 'F:/git/00_chenmohan/github/web-sdk-PP-Detection/.tmp/phase2/venv/Scripts/python.exe'
$rotCache = 'F:/git/00_chenmohan/github/web-sdk-PP-Detection/.tmp/phase2'
$rotUpstream = "$rotCache/upstream/PaddleDetection-b25522a0f4bde8c80603f3ba5e3472059972e3b5"
$rotWork = '.tmp/rotated-feasibility'
$rotScripts = 'reports/rotated-detection/2026-09-18-feasibility/reproduction'
$rotDeps = 'F:/git/00_chenmohan/github/web-sdk-PP-TinyPose'
$env:PYTHONIOENCODING = 'utf-8'
$env:PLAYWRIGHT_BROWSERS_PATH = 'F:/git/00_chenmohan/github/web-sdk-PP-Detection/.tmp/dependencies-compatible-browsers'
```

## 执行顺序

每一步必须退出码为 0，再进行下一步；发生失败时保留日志，不能直接改写状态。

```powershell
& $rotPython "$rotScripts/prepare.py" --cache $rotCache --work $rotWork
& $rotPython "$rotScripts/prepare_geometry.py" --work $rotWork
& $rotPython "$rotScripts/export_candidate.py" --upstream $rotUpstream --work $rotWork --candidate ppyoloe_r_crn_s_3x_dota
& $rotPython "$rotScripts/export_candidate.py" --upstream $rotUpstream --work $rotWork --candidate fcosr_x50_3x_dota
& $rotPython "$rotScripts/reference.py" --upstream $rotUpstream --work $rotWork --candidate ppyoloe_r_crn_s_3x_dota
& $rotPython "$rotScripts/reference.py" --upstream $rotUpstream --work $rotWork --candidate fcosr_x50_3x_dota
node "$rotScripts/browser.mjs" $rotWork $rotDeps
& $rotPython "$rotScripts/compare_browser.py" --work $rotWork
& $rotPython "$rotScripts/verify_evidence.py" --upstream $rotUpstream --work $rotWork
```

`prepare.py` 核对 ZIP 的全部 2114 个文件，再固定相关源码快照、官方权重链接、HEAD 元数据和实际下载摘要。已有锁时拒绝权重变化。`prepare_geometry.py` 从固定 npm tarball 提取 polygon-clipping 0.15.7 的浏览器包，并以 Shapely 生成几何参考；锁文件同时保存 tarball 与脚本摘要。

`export_candidate.py` 直接调用官方 backbone/neck/head，固定 `1x3x1024x1024`、FP32、opset 17，输出分数和五参数框。没有重参数化优化，也没有自定义旋转 NMS 算子。PP-YOLOE-R 权重没有序列化非训练角度投影常量，脚本仅允许这一个已知缺项，并校验官方构造器生成的 `0..90` 度弧度投影，最大 FP32 舍入误差须不超过 `3e-7`。不允许静默跳过其他权重。

`reference.py` 使用固定上游 `onnx_infer.py` 的 RGB 解码、三次插值 resize、归一化和 CHW 变换；本实验在右/下方用归一化后的 0 补到 1024 方形。非方形案例因此不是上游默认仅补齐 stride 的动态尺寸路径。先比较 Paddle 与 Python ORT 原始张量，再以官方四点转换和 Shapely NMS生成参考，同时验证官方完整 Paddle 后处理。样本每类候选数均不超过 2000，避免官方 ONNX 参考未实现 top-k 造成不等价。

`browser.mjs` 用临时空闲端口、仅绑定 `127.0.0.1` 的白名单服务器，顺序执行两模型、两后端和五输入；结束自动关闭服务器和浏览器。它复用 Python 输入张量以隔离解码误差，JavaScript 负责五参数转四点及旋转 NMS，交集使用 polygon-clipping。9 组几何样例和 NMS 的类别隔离、FP32 分数阈值边界、重叠抑制、top-k 均需通过。WebGPU 记录物理适配器和每次推理的原生 GPUQueue.submit、compute dispatch，不由设备列表推断实际执行。

`compare_browser.py` 对全部实例直接匹配官方 Paddle 参考，同时核对 Python ORT 结果，要求类别和数量一致、无漏检/多余项、所有原始值有限；旋转 IoU 至少 0.995、分数误差最多 0.001、逐角点误差最多 0.1 像素，空白必须无框。`verify_evidence.py` 核对摘要、ONNX checker、源码快照和 Python/JS 语法；它不重新执行推理。

## 本地原始产物

```text
<work>/<candidate>.pdparams
<work>/<candidate>/model.onnx
<work>/<candidate>/exported/model.pdmodel
<work>/<candidate>/exported/model.pdiparams
<work>/images/<id>.png
<work>/inputs/<id>.f32
<work>/<candidate>/reference/<id>.npz
<work>/<candidate>/reference/<id>.json
<work>/<candidate>/browser-output/{wasm,webgpu}/<id>/{raw0.f32,raw1.f32,detections.json}
<work>/<candidate>/preview-{wasm,webgpu}.png
<work>/<candidate>/gpu-trace-{wasm,webgpu}.json
```

NPZ 中保存 Paddle/ORT 的 scores、rboxes，以及官方 Paddle 四点框经官方 Shapely NMS 后的 `official` 结果。模型和原始数组的摘要只能验证同一本地文件，不能代替原始数据重算。

## 已知诊断

[首次严格权重检查](../initial-strict-weight-check.json) 保留 PP-YOLOE-R 非训练投影常量缺项；[舍入诊断](../projection-rounding-diagnostic.json) 记录两种 FP32 运算顺序带来的 `2.384e-7` 弧度差异。最终未修改上游网络或学习权重。

[首次 profiling 诊断](../initial-profiling-diagnostic.json) 中 WebGPU 推理已完成，但 ORT profiling 回调为空，不能作为 kernel 证据，因此严格检查失败。最终改用原生 GPU 命令记录佐证实际 GPU 执行；没有每个算子的时间或图分区证明，不宣称所有算子都在 GPU。

收尾修正了分数阈值精度边界：FP32 的 `0.1` 实际为 `0.10000000149011612`，直接与 JavaScript 双精度字面量 `0.1` 比较会错误保留该等值候选。最终先用 `Math.fround(scoreThreshold)` 转成 FP32 阈值，再执行严格 `>`；浏览器合成样例同时检查 `0.1` 和可精确表示的 `0.5` 边界，修正后完整重跑两模型的两后端五输入。

本轮未修改 SDK，未运行 SDK 合规检查或产品构建；这份通过状态只能用于可行性选型。公开 SDK 接口、Worker、取消、缓存、模型来源与发布流程必须另行实现和验证。
