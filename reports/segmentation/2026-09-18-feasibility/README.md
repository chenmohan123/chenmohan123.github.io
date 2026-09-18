# 实例分割独立 SDK：FP32 可行性评估

日期：2026-09-18。状态：**可行性通过，建议 PP-YOLOE_seg_s 640 FP32 进入独立 SDK 设计，仍为 labs／未发布**。

本轮落实用户“先推进独立 SDK，暂缓门户整合”的决定。已核对五个具体配置的官方来源，实际导出并验证其中的 PP-YOLOE_seg_s。它在当前桌面浏览器的 CPU/WASM 与 WebGPU 上均完成推理，6张固定图片的44个阈值以上实例、空白图及原图掩码与参考结果对齐。体积和算子可行，掩码后处理是下一阶段的主要性能问题。

本目录是独立 SDK 的选型实验档案。`reproduction/` 只用于复现实验，不作为产品 runtime；门户运行时代码没有引入分割推理。尚未创建新 SDK、上传模型、发布 npm 或修改线上 Demo。

## 候选选择

来源固定为 PaddleDetection [`b25522a0f4bde8c80603f3ba5e3472059972e3b5`](https://github.com/PaddlePaddle/PaddleDetection/tree/b25522a0f4bde8c80603f3ba5e3472059972e3b5)。已逐文件核验源码ZIP与本地解压后的2114个文件一致；33份相关配置、源码、README和许可原样压缩归档，链接与摘要见 [sources.lock.json](sources.lock.json)。

| 具体配置 | 官方权重大小（MB） | 官方 mask AP | 本轮实际范围与建议 |
| --- | ---: | ---: | --- |
| `ppyoloe_seg_s_80e_coco` | 36.12 | 32.5 | 640输入，导出及桌面CPU/GPU一致性通过；首发推荐 |
| `mask_rtdetr_hgnetv2_s_6x_coco` | 58.73 | 41.0 | 官方有640配置及该系列ONNX路径；保留后续质量候选，尚未转换或实测 |
| `solov2_r50_fpn_1x_coco` | 290.75 | 35.5 | 800/1333等比输入，权重较大；本轮仅来源和配置筛选 |
| `solov2_r50_enhance_coco` | 137.77 | 39.0 | 512增强版含DCNv2，需单独验证导出及浏览器算子；尚未实测 |
| `mask_rcnn_r50_fpn_1x_coco` | 268.30 | 35.6 | 官方提供opset16导出说明，ROI及mask恢复链路需验证；尚未实测 |

MB按十进制计算。权重大小是官方 `.pdparams` HTTP HEAD 返回的字节数，五项均为200；不能直接当作ONNX大小。AP摘自固定上游README，不是本轮测量，也不是同设备浏览器排名。PP-YOLOE_seg_s 作为当前较小且已验证的候选适合先实现图片版；Mask-RT-DETR-S的官方AP更高，可在首版完成后独立评估其收益与成本。没有证据证明首发推荐模型是全库质量或速度最优。

PP-YOLOE **实例分割**与现有Detection中的PP-YOLOE+ **目标检测**任务不同。该分割系列固定README中M/L/X的下载链接为空，本轮不承诺把分割S/M/L/X全部纳入。

## 导出与输出语义

[conversion.json](conversion.json)记录实际ONNX图、环境、输出及摘要：

- 模型：`ppyoloe-seg-s-640-fp32.onnx`，**36,265,193字节（36.27 MB）**，opset17。
- SHA-256：`d418de8890fa13ae213aefeff4216bda2dcf961678494cd4baf55d9942a77334`。
- 官方权重SHA-256：`ee507d8f9e5fad6290ee54ee6704b9b1f2ab26a109cc668e1a966f90fe174cef`。
- 可训练参数8,995,698；输入float32 `[1,3,640,640]`。
- 原始官方backbone、neck、head与权重保持一致；包装器只剥离动态NMS和原图mask恢复，输出解码框 `[1,8400,4]`、80类分数 `[1,80,8400]`、mask系数 `[1,32,8400]`、prototypes `[1,32,160,160]`。
- ONNX仅包含标准域算子，包括Conv、ConvTranspose、Resize、Sigmoid等；通过ONNX checker。标准算子清单本身不代表所有设备兼容，浏览器证据见下文。

参考预处理为RGB、OpenCV INTER_CUBIC直缩640×640、float32除以255；该官方配置不做ImageNet均值/标准差归一化。实验使用score **>0.5**、逐类NMS IoU0.7、每类预筛top1000、全局keep300。mask系数乘prototypes后经sigmoid，先双线性放大至640、按解码框裁剪，再双线性恢复原图并以 **>0.5** 二值化。两次插值及裁剪顺序需要保留，不能直接裁剪低分辨率mask并宣称等价。

首次导出曾因实验包装器错误使用返回None的`Layer.eval()`而失败，修正为分开赋值和调用后成功；不是模型算子失败。失败与成功日志留在本地实验目录。

## 实际验证

[python-reference.json](python-reference.json)比较官方Paddle最终结果与Python ONNX加独立后处理；[browser-execution.json](browser-execution.json)记录真实浏览器运行；[browser-comparison.json](browser-comparison.json)记录按类别和框IoU进行的一一匹配、逐输出差异与本地原始产物摘要。

| 对照 | 实例数 | 最小mask IoU | 最大框差（原图像素） | 最大分数差 |
| --- | ---: | ---: | ---: | ---: |
| Python ONNX对官方Paddle | 44 | 1.0 | 0.0001221 | 0.000003219 |
| 浏览器WASM对Python ONNX | 44 | 1.0 | 0.0001221 | 0.000007272 |
| 浏览器WebGPU对Python ONNX | 44 | 1.0 | 0.0001374 | 0.000003577 |

浏览器行的框和分数基线为已通过官方对照的Python ONNX；**三行掩码均直接对照官方Paddle输出**。原始浮点张量并非逐位相同；报告保留每个输出的最大/平均绝对误差。提前设定的门槛为框差≤0.05像素、分数差≤0.0001、mask IoU≥0.99；本轮未调整门槛。

样本按既有固定图集的文件名排序取前6张，ID为10977、26690、27186、27932、60823、105264；各图阈值以上实例数为4、10、3、0、17、10，另加640×480黑色空白图，结果为0。总计7输入×2浏览器后端，未出现额外或漏掉的阈值以上实例。输入摘要与图片来源见 [dataset.lock.json](dataset.lock.json)。

此次6图是转换一致性检查，**没有计算GT mask AP，不证明总体识别精度**。浏览器直接使用Python预处理后的张量，尚未验证浏览器图片解码和缩放。全部是main模式，不能扩展为Worker、完整SDK、移动端或NPU的兼容声明。

两种后端的实际mask叠加截图均已目视检查，区域与坐标一致：[WASM截图](preview-wasm.png)、[WebGPU截图](preview-webgpu.png)。截图使用COCO图片10977，仅作本地评估记录；来源、图片许可和修改说明见 [图片归因](#图片归因)，不作为未来产品Demo的授权素材。

## 性能与实现影响

日期为2026-09-18；Windows `10.0.26200`、Intel i5-10400F、Chromium `153.0.8010.12`、ORT Web `1.27.0`，WASM单线程、main执行。浏览器请求并绑定物理NVIDIA Blackwell适配器（`fallback=false`）；宿主机报告RTX 5060 Ti、驱动`32.0.16.1692`。见 [host.json](host.json)。这证明本次WebGPU执行提供程序使用物理适配器，不是逐算子全GPU剖析。

| 实测项目 | CPU／WASM | WebGPU |
| --- | ---: | ---: |
| 会话创建（已取到模型字节） | 1070.1ms | 1161.6ms |
| 首次`session.run` | 1448.8ms | 2142.9ms |
| 同一图片热推理中位数（3轮） | **1283.7ms** | **31.2ms** |
| 非空结果的JS后处理范围（6图中5图） | 113.5～709.6ms | 146.5～771.0ms |

热推理测试图是10977；首次运行可能含shader等编译开销。推理计时到`session.run`返回CPU输出，不包含图片解码、预处理、后处理、绘制或模型下载。这些是实验脚本的分段计时，不能标为SDK端到端耗时。Python ORT4线程的140～185ms也不能与浏览器单线程结果直接作性能结论。

17实例图片60823的WebGPU推理32.9ms，JS后处理771.0ms，二者合计约803.9ms且仍未包括解码绘制。当前实现逐实例计算并恢复整幅mask，是可行性参考实现，**不适合据此承诺实时视频**。下一阶段应优先优化插值/矩阵计算、限制结果规模及总mask内存，并在Worker中运行以避免阻塞交互；Worker本身不等于计算加速。

## 来源与许可边界

固定PaddleDetection源码许可证为Apache-2.0，原样存档于 [upstream/LICENSE.gz](upstream/LICENSE.gz)。五份权重均由对应官方README直接链接；在本轮检查的文件中未发现单独的权重许可文本。该事实记录不等于双Hub再分发审查完成。

发布前仍需保留上游LICENSE、适用NOTICE、转换与第三方归因，核验权重再分发信息并形成双源模型卡。`ppyoloe_ins_head.py`含YOLOv8 mask proto参考注释；本轮未对第三方来源作完整许可追溯，不能声称已排除第三方许可问题。本轮仅下载至本地做转换评估，未向ModelScope/Hugging Face上传。

### 图片归因

本轮样本源自COCO val2017，逐图许可各异，详见 [dataset.lock.json](dataset.lock.json) 中的原始Flickr链接、COCO来源、license名称及URL。两张截图都使用图片10977：原始来源为 [Flickr图片](http://farm9.staticflickr.com/8060/8241415983_02d80c2fca_z.jpg)，COCO元数据声明 [CC BY-NC 2.0](http://creativecommons.org/licenses/by-nc/2.0/)。本轮修改为叠加预测框、半透明掩码及实验页面文字。元数据未包含作者姓名，本报告保留来源链接；对外发布截图或选作Demo素材前需补齐作者归因和用途核验，或改用授权明确的自有图片。本地评估截图不按仓库代码许可重新授权。

## 下一阶段建议与验收范围

建议下一阶段建立独立 `web-sdk-PP-Segmentation`，npm名拟为`web-sdk-pp-segmentation`，先做图片版，首发仅PP-YOLOE_seg_s 640 FP32。仓库、包名尚未创建或占用核验；这些是后续设计建议。

1. **定义单帧任务契约。** Blob/RGBA输入；输出原图尺寸、类别、分数、框和逐实例二值mask。建议以原图整数偏移、ROI宽高及行优先Uint8Array保存紧凑mask，ROI外为0，保留实例间重叠；不把实例序号当作跨帧跟踪ID。ROI提取必须以与官方对齐的原图mask为基准，先验证语义再优化计算。
2. **实现独立runtime与后处理优化。** 框架无关的load/run/dispose、显式CPU/GPU及main/Worker、取消恢复和资源释放，遵守[现有SDK契约](../../../standards/v1/sdk-contract.md)。记录requested/actual backend、执行模式和各阶段耗时；在高分辨率、多实例情况下限制内存并提供明确错误，避免无限生成全图mask。
3. **完成独立Demo。** 延续Detection的视觉与紧凑布局：当前模型、图片输入、原图/mask叠加、实例选择、来源/后端、耗时及缓存；选中结果不造成布局跳动。中文默认、完整英文，桌面及390px布局可用。当前不加入摄像头、视频、人体姿态组合或门户推理。
4. **扩大验证。** 固定至少64张含segmentation GT的图片，比较官方与浏览器的mask AP及逐实例对齐；AP运行使用事先固定的低分阈值配置，不能复用本轮score>0.5的可视化阈值。建议以同输入官方AP为基线预先确定允许误差，再执行主线程/Worker×WASM/WebGPU真实矩阵。另测空白图、边缘/重叠实例、极端长宽比、透明图、错误输入、取消/恢复、重复创建释放及内存边界。桌面优先，手机按后续发布范围安排。
5. **准备发布。** ModelScope默认，另有Hugging Face；固定revision、字节数与SHA-256，显式来源失败不静默换源。完成来源/许可归因、SDK前后标准检查、必要单测/构建/浏览器验收、双语文档与独立发布，最后才登记门户。FP16/W8A32和其他模型另行评估。

此顺序与最初按任务契约划分SDK的规划一致；Workflow / Detection→TinyPose继续暂缓。相关路线已更新：[门户路线](../../../docs/superpowers/plans/2026-08-17-web-model-sdk-portal-roadmap.md)、[独立SDK路线](../../../docs/superpowers/plans/2026-09-13-pp-detection-multi-model-roadmap.md)。

## 复现与证据范围

步骤见 [reproduction/README.md](reproduction/README.md)。大模型、原始图片、预处理张量及浏览器原始输出保存在本地`.tmp/segmentation-20260918`，不纳入Git；结果JSON包含摘要和比较明细。仅凭仓库内摘要不能离线重算全部数值，须按步骤重新取得来源或保留本地产物。

本轮只修改路线与实验报告，没有单SDK或门户产品代码变更。实际模型/浏览器实验已完成，文档收尾检查以`git diff --check`、JSON与来源摘要核验为准，摘要核验记录见 [verification.json](verification.json)；既有SDK及门户构建状态不因本轮报告检查而更新。
