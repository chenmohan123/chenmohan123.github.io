# web-sdk-PP-OCRv6 Design

- Date: 2026-08-24
- Status: design approved in conversation; implementation not started
- Layer: single SDK
- Target repository: `chenmohan123/web-sdk-PP-OCRv6`
- Proposed npm package: `web-sdk-pp-ocrv6`
- License: Apache-2.0

## Scope

This project is a framework-neutral browser SDK for the PP-OCRv6 text
detection and recognition model family. It provides three public capabilities:

1. Text detection with polygon boxes and confidence scores.
2. Text recognition for crops or supplied image regions.
3. A complete OCR pipeline that runs `det -> crop -> rec`.

The v1 pipeline does not include document orientation classification, document
unwarping, or text-line orientation classification. The SDK is a single-model
repository and owns its runtime, model manifests, npm package, standalone Demo,
examples, benchmarks, documentation, CI, and GitHub Release. The portal only
indexes and links this SDK.

## Approved Decisions

- Use one npm package with layered internal modules: runtime, detector,
  recognizer, pipeline, and manifest/model management.
- Use ONNX Runtime Web.
- Expose `wasm` as the CPU backend and `webgpu` as the GPU backend.
- Default backend is `wasm`; default execution mode is Worker.
- Explicit `wasm` or `webgpu` selection is strict. `backend: "auto"` may try
  `webgpu -> wasm` only when `allowFallback: true` is explicitly set.
- `execution: "worker"` fails with `CAPABILITY_UNSUPPORTED` when Worker is not
  available; it does not silently move to the main thread.
- Default model pair is `small-det + small-rec`.
- Six official ONNX assets are versioned source files in Git LFS:
  `medium_det`, `small_det`, `tiny_det`, `medium_rec`, `small_rec`, and
  `tiny_rec`.
- npm contains SDK code, Worker code, types, manifests, dictionaries, and
  configuration, but no ONNX binaries.
- The default model URL points to versioned GitHub Release/CDN assets. Each
  manifest records the fixed model version, URL, byte size, and SHA-256.
- Hugging Face official repositories are recorded as provenance and fallback
  URLs. Users can provide a custom manifest and self-hosted model assets.
- The Demo uses a left-center-right desktop workbench. The right column shows
  model/runtime/timing information above an independently scrollable OCR list.
- Detection polygons and OCR rows are bidirectionally linked in the Demo.
- Results use original-image pixel coordinates and stable indices. Pipeline
  output is sorted in reading order while preserving model output order.
- Stable target surfaces are PC/mobile browsers, public-account H5 pages, and
  WeChat mini-program `web-view`. Native mini-program JavaScript/WASM runtime
  support is not promised.
- The SDK and model distribution use Apache-2.0-compatible notices, with
  upstream attribution in `THIRD_PARTY_NOTICES.md`.

## Architecture and Data Flow

The runtime layer owns capability probing, ONNX Runtime Web session creation,
Worker transport, model download, integrity verification, versioned IndexedDB
cache, progress events, cancellation, and disposal. Domain layers consume this
runtime without depending on React, Vue, or any other UI framework.

The public flow is:

```text
createDetector(options)
  -> load det manifest/model
  -> detect(image)
  -> polygons + scores + original pixel coordinates

createRecognizer(options)
  -> load rec manifest/model + dictionary
  -> recognize(crops | image regions)
  -> text + confidence + crop/index metadata

createOCR(options)
  -> load det + rec manifests/models
  -> detect(image)
  -> sort reading order
  -> crop detected regions
  -> recognize(batch)
  -> linked OCR lines + polygons + timings
```

Every instance follows `create -> load -> ready -> run -> dispose`. The public
API supports `Blob`, `File`, image URL, `ImageBitmap`, `HTMLImageElement`, and
`ImageData`. URL inputs require caller-managed CORS availability.

Every load and run result reports requested backend, actual backend, execution
mode, ONNX Runtime Web version, model identity, and timing fields. The timing
contract uses `modelDownloadMs`, `modelCacheReadMs`, `integrityMs`, `sessionMs`,
`decodeMs`, `preprocessMs`, `inferenceMs`, `postprocessMs`, and `totalMs`, with
cold and warm semantics documented separately.

## Public API Shape

The exact TypeScript names may follow the reference SDK conventions, but the
three entry points must expose equivalent options and result metadata:

```ts
type Backend = "wasm" | "webgpu" | "auto";
type ExecutionMode = "worker" | "main";

interface RuntimeOptions {
  backend?: Backend;
  execution?: ExecutionMode;
  allowFallback?: boolean;
  cache?: boolean;
  signal?: AbortSignal;
}

interface ModelSelection {
  det?: "medium" | "small" | "tiny" | CustomModel;
  rec?: "medium" | "small" | "tiny" | CustomModel;
}

interface OCRResult {
  lines: readonly OCRLine[];
  image: { width: number; height: number };
  model: ModelInfo;
  runtime: RuntimeInfo;
  timings: TimingBreakdown;
}
```

`detect`, `recognize`, and `ocr` accept an `AbortSignal` where the host
supports cancellation. A disposed instance rejects future calls with a stable
dispose error. Custom model selection accepts a manifest URL or an already
parsed manifest object; the SDK does not infer preprocessing or decoding from
file names.

## Error and Fallback Contract

The runtime exposes stable errors for `CAPABILITY_UNSUPPORTED`,
`INVALID_INPUT`, `INVALID_MANIFEST`, `MODEL_DOWNLOAD_FAILED`,
`MODEL_INTEGRITY_FAILED`, `OUT_OF_MEMORY`, `SESSION_CREATE_FAILED`,
`INFERENCE_FAILED`, `ABORTED`, and `DISPOSED`.

Strict backend requests never silently change providers. If an explicit fallback
is enabled, every fallback event records the requested backend, actual backend,
candidate model variant, stage, stable error code, and cause. A failed integrity
check prevents the asset from entering persistent cache.

## Model Assets and Manifests

The repository contains two manifest layers:

- `sdk-manifest.yaml` satisfies Web Model SDK Standard v1.1 governance.
- `models/pp-ocrv6/<model-version>/manifest.json` is the runtime inference
  contract.

The runtime manifest describes the PP-OCRv6 family version and fixed upstream
revision; each detection and recognition variant declares model identity,
parameter count, tensor names/shapes/dtypes, preprocessing, postprocessing or
decoder configuration, dictionary data where required, asset URLs, byte size,
precision, and SHA-256. The pipeline section declares `det`, `crop`, and `rec`,
the original-pixel coordinate space, and reading-order policy.

The six official ONNX repositories are:

- `PaddlePaddle/PP-OCRv6_medium_det_onnx`
- `PaddlePaddle/PP-OCRv6_small_det_onnx`
- `PaddlePaddle/PP-OCRv6_tiny_det_onnx`
- `PaddlePaddle/PP-OCRv6_medium_rec_onnx`
- `PaddlePaddle/PP-OCRv6_small_rec_onnx`
- `PaddlePaddle/PP-OCRv6_tiny_rec_onnx`

The official collection reports Apache-2.0 licensing. The official medium
detection model card reports 15.5M parameters and about 62 MB for its ONNX
asset; the small recognition model card reports about 5.2M parameters and
about 21.2 MB. Exact release byte counts and SHA-256 values are generated from
the pinned assets during implementation and recorded in the committed
manifests before the first release.

## Cache and Distribution

The persistent cache is versioned IndexedDB. Keys include SDK identity, model
ID, model version, variant, and SHA-256. Load order is memory instance, IndexedDB,
GitHub Release/CDN, then the pinned Hugging Face fallback. The SDK exposes
current-model listing/estimate/cleanup and global cleanup. `cache: false` keeps
only in-memory data.

Git LFS stores the six versioned source ONNX files in the repository. Release
automation publishes immutable, versioned CDN assets. npm provenance is enabled
and the package excludes ONNX binaries.

## Demo Design

The desktop Demo has three columns:

- Left: image selection, detection/recognition/OCR mode, model presets, backend,
  execution mode, run/reset, status, and cache controls.
- Center: the stable-size source image canvas with polygon overlays and summary
  counts.
- Right: model metadata and runtime/timing details first, followed by an
  independently scrollable OCR result list.

Clicking an image polygon highlights its OCR row; clicking an OCR row highlights
its polygon. The Demo starts in Chinese and has an in-page English toggle. It
shows local-processing privacy text and stable DOM markers required by the
standard. At 390px it stacks results, controls, model/timing details, and OCR
results without horizontal overflow.

## Examples and Compatibility

Required runnable examples are Vanilla TypeScript/DOM and React. The manifest
also declares Vite/CDN and WeChat public-account H5 plus mini-program
`web-view` examples. Native mini-program runtime support is explicitly
unsupported rather than represented by a non-runnable example link.

Compatibility evidence records browser/version, OS, device, backend, execution
mode, runtime version, and test date. WebGPU is only described as verified for
an environment that has passed a real GPU browser test. WebNN/NPU is outside
the v1 stable contract.

## Verification and Release Gates

The repository runs the governance checker before and after SDK changes, plus
format, docs parity, lint, typecheck, unit, browser, model-contract, build, and
release checks. Tests cover manifest validation, preprocess/postprocess parity,
dictionary decoding, cache and integrity behavior, Worker transport,
cancellation, strict backend selection, Demo markers, responsive layout, and
examples.

The public repository includes CI, a tag-triggered GitHub Release workflow,
CHANGELOG, bilingual README and docs, Git LFS/model verification, and a GitHub
Pages Demo workflow if Pages is selected. Repository rulesets, release-tag
protection, and deployment evidence are remote governance tasks and are not
claimed by local files alone.

## References

- [PP-OCRv6 collection](https://huggingface.co/collections/PaddlePaddle/pp-ocrv6)
- [PP-OCRv6 medium detection ONNX](https://huggingface.co/PaddlePaddle/PP-OCRv6_medium_det_onnx)
- [PP-OCRv6 small recognition ONNX](https://huggingface.co/PaddlePaddle/PP-OCRv6_small_rec_onnx)
- [PaddleOCR repository](https://github.com/PaddlePaddle/PaddleOCR)
- [PP-OCRv6 technical report](https://arxiv.org/abs/2606.13108)
- `standards/v1/README.md` in the portal repository
