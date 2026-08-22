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
