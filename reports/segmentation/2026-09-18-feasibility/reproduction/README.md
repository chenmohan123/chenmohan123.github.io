# 本地复现

这些脚本是本次可行性实验的参考实现，未提供公开SDK接口。运行会覆盖同目录的结果报告；需要保留原记录时先在独立副本中运行。所有命令从门户仓库根目录执行。

## 固定输入与依赖

本轮复用已有Detection评测环境，没有修改其源码或数据。Python3.11.15、Paddle2.6.2、Paddle2ONNX1.3.1、ONNX1.16.2、Python ORT1.20.1、NumPy1.26.4、OpenCV4.11.0.86、requests2.32.5；另需PyYAML和PaddleDetection的依赖。浏览器依赖来自TinyPose仓库：Playwright1.63.0、ORT Web1.27.0，实际Chromium版本见执行报告。

源码ZIP地址、SHA-256和固定revision见 [sources.lock.json](../sources.lock.json)。首次复现需准备该ZIP与解压目录：

```text
<cache>/downloads/paddledetection.zip
<cache>/upstream/PaddleDetection-b25522a0f4bde8c80603f3ba5e3472059972e3b5/
```

图片来源与SHA-256见 [dataset.lock.json](../dataset.lock.json)。本轮从既有64图目录按文件名排序取前6张，不是随机抽样，也不是全量COCO。新环境可以只准备记录中的6张同名JPG；空白图由脚本生成。核对本次记录时必须使用相同图片字节。图片许可与模型许可分开处理。

```powershell
$segPython = 'F:/git/00_chenmohan/github/web-sdk-PP-Detection/.tmp/phase2/venv/Scripts/python.exe'
$segCache = 'F:/git/00_chenmohan/github/web-sdk-PP-Detection/.tmp/phase2'
$segUpstream = "$segCache/upstream/PaddleDetection-b25522a0f4bde8c80603f3ba5e3472059972e3b5"
$segImages = "$segCache/dataset/images"
$segWork = '.tmp/segmentation-20260918'
$segScripts = 'reports/segmentation/2026-09-18-feasibility/reproduction'
$segDeps = 'F:/git/00_chenmohan/github/web-sdk-PP-TinyPose'
$env:PYTHONIOENCODING = 'utf-8'
$env:PLAYWRIGHT_BROWSERS_PATH = 'F:/git/00_chenmohan/github/web-sdk-PP-Detection/.tmp/dependencies-compatible-browsers'
```

## 顺序执行

每条命令退出码为0后再执行下一条，失败时保留日志并定位，不能跳过失败或改写通过状态。

```powershell
& $segPython "$segScripts/prepare.py" --cache $segCache --work $segWork
& $segPython "$segScripts/export_candidate.py" --upstream $segUpstream --work $segWork
& $segPython "$segScripts/reference.py" --upstream $segUpstream --work $segWork --images $segImages
node "$segScripts/browser.mjs" $segWork $segDeps
& $segPython "$segScripts/compare_browser.py" --work $segWork
& $segPython "$segScripts/verify_evidence.py" --work $segWork
```

`prepare.py`核对ZIP和全部解压文件，验证五候选官方链接与HTTP HEAD；只下载PP-YOLOE_seg_s权重，已有锁文件时拒绝摘要变化。网络或权重来源变更会失败，不静默换源。

`export_candidate.py`在实验目录存放Paddle动态转静态缓存，使用官方模型和包装器输出四个原始张量。固定权重、源码摘要并执行ONNX checker。当前Paddle版本的`Layer.eval()`返回None，不能把其返回值赋给模型。

`reference.py`记录官方Paddle原始头与ONNX浮点误差；另以官方Paddle最终框/mask验证独立NumPy后处理。固定阈值见主报告。输出`.npz`内`raw0..3`是Python ONNX输出、`masks`是官方Paddle最终二值mask；同名JSON为通过官方对照的Python ONNX检测结果。

`browser.mjs`从指定依赖仓库加载Playwright和ORT，启动仅绑定127.0.0.1的临时白名单服务器，顺序运行WASM/WebGPU。同输入张量避免混入浏览器解码差异；JS后处理在`postprocess.mjs`。WebGPU要求物理适配器，未发现适配器时直接失败。每后端7输入、第一图3次热推理、绘图截图及会话释放。`browser-execution.json`的`executed`仅表示运行完成，不代表数值通过。

`compare_browser.py`检查模型、输入和维度，按类别及框IoU匹配全部实例，直接比较官方mask，并对照Python ONNX框/分数。检查有限值、二值mask、面积、空白图、无额外/丢失实例及先前阈值；只有全部通过才写入`browser-comparison.json`的`passed`。文件摘要记录于`localArtifacts`，原始浮点差异作诊断，不宣称逐位一致。

`verify_evidence.py`复核源码快照、报告引用、模型和全部原始输出摘要、图片来源、Python语法及本地Markdown文件链接，生成`verification.json`。它不重新运行推理，须在前述比较通过后执行。`host.json`为本次宿主机设备补充快照，换机器复测时应重新记录硬件与驱动；浏览器环境以新生成的执行报告为准。

## 原始证据位置

```text
<work>/ppyoloe_seg_s_80e_coco.pdparams
<work>/ppyoloe-seg-s-640-fp32.onnx
<work>/exported/model.pdmodel
<work>/exported/model.pdiparams
<work>/inputs/<id>.f32
<work>/reference/<id>.npz
<work>/reference/<id>.json
<work>/browser-output/{wasm,webgpu}/<id>/{raw0.f32,...,raw3.f32,masks.u8,detections.json}
```

ONNX、图片和上述原始数组没有提交到Git；仅有摘要不能代替原始数组重算。对外分发报告前需核验截图素材归因；本地报告的图片归因见主README，不能将它们自动变成产品Demo素材。

## 未覆盖范围

这不是SDK E2E脚本，不验证Blob/RGBA公共API、Worker传输、取消生命周期、缓存/远程分发或浏览器预处理。6图结果也不是GT精度评估。SDK实现后必须通过公共接口重新做对应验证，不能直接复用本实验的`passed`作为产品发布结果。
