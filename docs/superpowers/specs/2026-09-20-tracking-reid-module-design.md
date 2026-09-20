# Tracking 同包可选 ReID 模块接入设计

日期：2026-09-20。状态：下一实现阶段设计，尚未导出以下API。用户已确认继续推进图像预处理、模型来源与可选模块方向。本设计消费SDK `reports/2026-09-20-reid-preprocessing/` 的验证证据；标准要求以[混合声明提案](../../../standards/v1/proposals/algorithm-model-hybrid.md)为唯一来源，生产接入前须先实施。

## 目标和接口

继续同一个`web-sdk-pp-tracking`，`createTracker`仍从默认入口导入。模型入口建议`web-sdk-pp-tracking/reid`，导出`createReIdExtractor`、`ReIdError`及类型；ORT Web作为optional peer，只有调用模型load时动态导入。框关联调用者没有ORT依赖、模型网络请求或图像内存分配。

```ts
interface RgbaImage {
  width: number;
  height: number;
  data: Uint8Array | Uint8ClampedArray;
}
interface ReIdDetection { box: Box; score: number; classId: number }
interface ReIdExtractor {
  readonly featureSpace: Readonly<FeatureSpace>;
  load(options: { signal?: AbortSignal; onProgress?: (event: LoadProgress) => void }): Promise<void>;
  extract(input: { image: RgbaImage; detections: readonly ReIdDetection[] }, options?: { signal?: AbortSignal }): Promise<ReIdResult>;
  dispose(): Promise<void>;
}
interface ReIdResult {
  featureSpace: Readonly<FeatureSpace>;
  detections: Detection[];
  runtime: ReIdRuntimeInfo;
  timings: ReIdTimings;
}
```

工厂选项固定`modelId`、`backend: 'wasm' | 'webgpu'`、来源或明确的模型字节资源，以及`maxDetections`（默认32，上限64）。同时给URL来源与字节资源拒绝。首版不用auto backend，不静默回退或换源。先使用调用者已解码RGBA，图像文件/视频/相机解码由宿主负责；未来媒体适配独立验收，不放到门户runtime。

`LoadProgress`按标准的download/cache/integrity/session阶段报告已完成字节或状态，不能假造无实际执行的阶段。`ReIdRuntimeInfo`包括requestedBackend/actualBackend、executionMode=main、SDK及ORT版本。`ReIdTimings`遵循模型契约（解码本层不执行则decodeMs=0）；load记录下载、缓存、SHA、session，extract分别记录preprocess/inference/postprocess/total，不把算法关联耗时混入。

## 图像和特征空间

使用研究中已固定的`rgba8-white-upright-rgb-halfpixel-f64-imagenet-f32-v1`：不调用Canvas缩放；输入大小、裁剪、透明像素、half-pixel、float64中间量和最终FP32规则来自模型卡与协议。严格拒绝共享、分离或错误长度buffer。推理是异步，接收时先验证并复制图像和所有检测的元数据，防止调用者在await期间改写输入；每实例同时最多一次load/extract，第二次调用立即返回BUSY，不排无界队列。

生产extract接收与Tracker兼容的完整图内正尺寸框，score/classId也按现有Detection校验。研究像素函数支持越界裁剪，不代表生产extract放宽Tracker的图内框约束；生产不得悄悄裁剪或修改返回的检测坐标。结果按原输入顺序逐条绑定embedding，保留原浮点框、分数和类别，不能用独立平行数组返回。模型面向人体，调用者自行选择人体检测，不把它宣称为所有物体的通用ReID。

每条输出要求512个有限数和非零范数，先以float64范数归一化再写Float32Array，规则ID=`l2-f32-v1`。特征空间ID使用固定ONNX SHA、预处理ID、输出规则的完整组合；CPU/GPU、ModelScope/HF若使用相同内容和契约可共用ID，不同权重/预处理即使同为512维也禁止混用。

`extract`不调用Tracker或改变轨迹；只有整帧全部成功，调用者才把结果和原时间戳/imageSize交给`tracker.update`。空检测数组返回空结果，不运行模型，但要求已load；整帧校验失败、推理失败或取消，不返回部分embedding。这样默认框算法与外观策略边界清晰。

## 状态、取消和释放

状态为idle/loading/ready/running/disposed；load在ready时幂等，loading/running时重复load或extract均BUSY。load失败回到idle并清理半成品；extract失败回到ready，不污染下一帧。不把source/backend变更作为原实例load选项，必须dispose旧实例并重建，同时reset关联器。

SHA-256在创建session前执行；调用者ArrayBuffer也复制并校验精确bytes/hash。取消在入口、下载流、session创建前后、每个裁剪前后及结果提交前检查。ORT单次run不承诺中途硬抢占；取消后等待当前run结束，释放其Tensor并丢弃整帧结果。dispose幂等、立即禁止新调用，取消未提交工作并等待正在执行的run完成，再release session/worker/GPU引用；不能在run进行时释放session。

错误码候选：INVALID_INPUT、INVALID_MANIFEST、UNSUPPORTED_BACKEND、DOWNLOAD_FAILED、INTEGRITY_FAILED、OUT_OF_MEMORY、SESSION_FAILED、INFERENCE_FAILED、ABORTED、BUSY、NOT_LOADED、DISPOSED。可识别的内存不足使用OUT_OF_MEMORY；无法可靠分类的设备丢失在创建阶段为SESSION_FAILED、运行阶段为INFERENCE_FAILED，并保留安全原因字段，不把未知错误猜成OOM。错误不夹带密钥或图片内容。来源失败只报当前源，不自动下载另一个源。

## 缓存、依赖与分发

本地字节资源不落持久缓存；远程模型缓存采用Cache Storage，键包含SDK模型命名空间、模型SHA和schema版本，缓存命中仍校验内容。模型一致的两个源可共享缓存，但缓存只证明内容身份，不改变请求源记录。提供独立缓存清理/估算API；清理仅触及该SDK命名空间。bytes资源和远程来源使用同样的SHA与session路径。

正式源仅ModelScope和Hugging Face，默认ModelScope。当前均未上传，没有可填写的hub revision。发布前完善模型卡所采用的权重许可依据、Apache文本/署名、训练披露限制，上传后回读实际不可变revision/bytes/hash并测CORS及浏览器加载。当前缺失专属checkpoint声明是证据范围，不能写成禁止商用或凭空填许可证。

## 验收与后续顺序

1. 先实施混合标准的schema/rules/checker与测试；本设计不把纯algorithm清单改成虚构hybrid。
2. 先写失败测试，再实现子入口与生命周期。验证根入口未加载ORT/网络、非法输入原子性、并发BUSY、取消各阶段、dispose等待run、session/Tensor释放、缓存错误hash及同源失败。
3. 本地使用已固定模型字节，真实浏览器验证RGBA→特征→现有DeepSORT接口；测试两后端输出、单位范数、顺序绑定、featureSpace身份和取消后下一帧。模型推理/关联分开报告。
4. 分发信息与许可依据完成后启用正式hybrid manifest、模型源和Demo模型控件，保持Detection风格、紧凑结果布局及原外部向量模式；不增加视频/摄像头假入口。
5. 同一真实检测序列下评测ByteTrack/OC-SORT/DeepSORT的IDF1/IDSW/MOTA与完整成本，再决定稳定版本和发布。GT裁剪闭集检索不能替代此验收。

本轮实现到图像契约与研究证据，不实现以上生产API、标准schema或Demo控件；下一实现阶段有明确边界和可验证接口。
