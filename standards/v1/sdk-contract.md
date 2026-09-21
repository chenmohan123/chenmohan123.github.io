# SDK Runtime Contract

The runtime is framework-neutral. React, Vue, and DOM code consume it; they do
not become part of the package contract.

```ts
interface WebModel<I, O> {
  readonly manifest: ModelManifest
  readonly capabilities: ModelCapabilities
  load(options?: LoadOptions): Promise<void>
  run(input: I, options?: RunOptions): Promise<O>
  dispose(): Promise<void>
}
```

SDK-specific factories and domain input/output types are allowed. `load` must
report download/cache/integrity/session progress. `run` must accept an
`AbortSignal` where the host supports cancellation. `dispose` releases worker,
GPU, media, and cache references owned by the instance.

Stable errors distinguish unsupported capability, invalid input/manifest,
download or checksum failure, out-of-memory, session creation, inference, and
abort. A requested backend must not be silently replaced; fallback behavior is
an explicit option and the result reports both requested and actual backend.

The manifest is the source of truth for model identity, version, assets,
precision, format, checksum, input/output contract, and verification matrix.

上述加载、模型下载和推理要求适用于模型 SDK；纯算法接口见下文。

模型清单兼容旧版必填的 `model.assets`，并可用 `model.variants[]` 描述同一
模型的 FP32、FP16、INT8 等精度或量化变体。变体必须声明 `id`、`precision`、
`quantization`、`opset`、文件大小、参数量、`wasm`/`webgpu` 后端及一个或多个
来源。来源的 `kind` 只能是 `git-lfs`、`huggingface`、`modelscope`、`custom`，
且必须使用 40 至 64 位十六进制不可变 revision、含主机的 HTTP(S) 下载地址、文件大小和 SHA-256；显式来源失败时
不得自动换源，只有 `auto` 策略可以按清单尝试。Git LFS pointer 不是模型本体。

## 纯算法 runtime（1.2.0）

算法 SDK 不加载模型，不实现虚构的 load、下载或缓存接口。工厂名称和同步/
异步计算接口可按领域定义，但必须公开输入、输出、参数约束、稳定错误码及
资源释放契约。algorithm 的 id、version、family、source、license、input、
output 为非空字符串，stateful 为布尔值；模型 SDK 不得声明此分支。

有状态算法必须文档化状态初始化、推进、实例隔离、reset 和 dispose 行为，
包括复位后 ID/代次含义、无效输入是否改变状态，以及释放后可调用的接口。
复位必须清除算法实例状态；无状态算法也须说明复位如何清空 Demo 结果。
文档必须说明取消的实际粒度，同步主线程算法只能在计算开始前检查取消，
不得声称中途抢占。来源与许可须区分算法思想、参考代码和本项目独立实现。

结果仍报告 requestedBackend、actualBackend、executionMode 和 runtimeVersion，
CPU 主线程实现声明 cpu/main。不得因没有模型而放宽实际后端报告、实例隔离、
框架无关或带日期兼容性证据的要求。算法性能字段见性能契约。

## 算法与可选模型混合 runtime（1.3.0）

混合 SDK 的默认包入口是算法 runtime，不得静态导入或初始化模型推理引擎、
worker 或权重。可选模型通过独立的非默认 `package.exports` 子路径显式导入；
两个 manifest 模块入口必须对应非空且真实存在的导出目标。

`modules.algorithm` 只声明 `cpu` 后端，`modules.model` 只声明 `wasm` / `webgpu`
后端；两者分别报告 requestedBackend、actualBackend、executionMode 和
runtimeVersion。顶层 runtime 是已实现模块能力的并集，不能把模型特征提取的
WebGPU 执行写成关联算法的 GPU 执行。模型的资产、不可变来源、完整性、缓存、
显式换源、取消与释放契约全部保留，`optional: true` 只表示默认算法路径不加载它。

完整清理必须取消正在进行的模型提取、释放模型资源、清理适用缓存，并复位
依赖该特征的关联状态。单独的跟踪复位不应冒充模型缓存清理。
