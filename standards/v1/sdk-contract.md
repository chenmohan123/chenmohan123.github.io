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

模型清单兼容旧版必填的 `model.assets`，并可用 `model.variants[]` 描述同一
模型的 FP32、FP16、INT8 等精度或量化变体。变体必须声明 `id`、`precision`、
`quantization`、`opset`、文件大小、参数量、`wasm`/`webgpu` 后端及一个或多个
来源。来源的 `kind` 只能是 `git-lfs`、`huggingface`、`modelscope`、`custom`，
且必须固定 revision、HTTP(S) 下载地址、文件大小和 SHA-256；显式来源失败时
不得自动换源，只有 `auto` 策略可以按清单尝试。Git LFS pointer 不是模型本体。
