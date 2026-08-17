# Web Model SDK Portal Design

**Date:** 2026-08-17  
**Status:** Accepted with MVP boundary clarification  
**Primary audience:** Frontend developers evaluating and integrating browser-side model SDKs

## 1. Product Scope

The site at `https://chenmohan123.github.io/` is a developer-facing registry and documentation portal for models that can run in the browser. It links to independent SDK repositories and their standalone demos. It is not a general-purpose end-user AI application in the first release.

The first MVP includes:

- A model and SDK directory grouped by brand, task, runtime, and status.
- A model detail page with installation, capability, compatibility, performance, and limitation data.
- A model detail page linking to the existing `web-sdk-PP-DocLayoutV3` repository, npm package, and standalone demo.
- A public roadmap for models that are beta, in development, under investigation, or unsuitable for browser execution.
- A stable metadata and lifecycle contract that future SDK repositories can follow.
- A shared cache contract with a Cache Storage/IndexedDB baseline and visible quota/cleanup controls.
- Documented SDK contracts for worker execution, caching, streaming, and backend capability reporting; implementation remains in each independent SDK repository.
- No workflow editor in the MVP, but a stable input/output boundary reserved for a future workflow runtime.

The directory uses a mixed status model. Listed models are not implied to be runnable: `available`, `beta`, `in-development`, `research`, and `not-applicable` are explicit states.

## 2. Repository and Hosting Topology

Use one portal repository plus independent SDK repositories:

```text
chenmohan123.github.io       # Astro portal, registry, aggregate links and demos
web-sdk-PP-DocLayoutV3       # existing SDK and its dedicated demo
web-sdk-<model-name>         # one repository and npm release per SDK
web-model-sdk-spec           # contract, metadata schema and authoring rules
web-model-workflow           # future workflow runtime; do not build in MVP
```

The portal is deployed as a static Astro site to GitHub Pages. SDK packages are published independently to npm. Model weights are hosted outside the portal according to size and regional access needs: GitHub Releases for small artifacts, and ModelScope, Hugging Face, Baidu BOS, or another object storage/CDN for larger artifacts. Every asset is referenced by a versioned manifest with a checksum.

This keeps portal releases, SDK releases, and model-weight releases independently versioned. The portal does not contain model inference implementations.

## 3. Portal Architecture and User Flow

The primary path is:

```text
Model directory -> Model detail -> Install or linked standalone Demo -> Copy SDK code
```

The portal contains:

- `/`: searchable model directory with brand, task, backend, and status filters.
- `/models/[slug]`: model identity, SDK package, runtime capabilities, browser/device verification, performance, limitations, license, and links.
- `/brands/[brand]`: brand-specific aggregate view.
- `/tasks/[task]`: task-specific aggregate view.
- `/models/[slug]`: includes a link to the independent SDK repository and standalone Demo when available.
- `/docs`: SDK contract, contribution guide, and troubleshooting.

The homepage is registry-first. An SDK's standalone Demo is a first-class external destination from its model detail page. A portal-owned Playground is reserved for a future Workflow runtime that composes multiple SDKs.

## 4. SDK Contract

SDKs may use different model formats, runtimes, preprocessors, and postprocessors. The contract standardizes lifecycle, capability reporting, cancellation, and resource ownership rather than forcing all model inputs and outputs into one shape.

```ts
export interface WebModel<I, O> {
  readonly manifest: ModelManifest
  readonly capabilities: ModelCapabilities

  load(options?: LoadOptions): Promise<void>
  run(input: I, options?: RunOptions): Promise<O>
  dispose(): Promise<void>
}
```

Each SDK can expose a domain-specific factory such as `createPPDocLayoutV3`, while implementing the same lifecycle semantics. Required behavior:

- `load()` loads runtime resources and model weights and reports progress.
- `run()` executes locally in the browser and supports cancellation.
- `dispose()` releases GPU resources, workers, audio/video resources, and cache references held by the instance.
- `manifest` describes identity, versions, assets, license, and data types.
- `capabilities` describes actual backend and feature support.
- Standard error classes distinguish unsupported backends, download/checksum failures, insufficient memory, invalid input, inference failures, and aborts.

The contract must allow future high-efficiency values such as `Tensor`, `ImageBitmap`, `VideoFrame`, and `AudioData`. SDKs should avoid converting these to CPU arrays between every pipeline node unless required by the model.

## 5. Metadata and Registry Data

The first version keeps curated metadata in the portal repository under `src/content/models/*.yaml`. Astro Content Collections validate the schema and generate all model, brand, task, and index pages.

Representative fields:

```yaml
id: pp-doclayoutv3
brand: baidu
task: document-layout
status: available
package: web-sdk-pp-doclayoutv3
repository: https://github.com/chenmohan123/web-sdk-PP-DocLayoutV3
demo: /models/pp-doclayoutv3/demo
license: Apache-2.0
runtime:
  backends:
    - name: webgpu
      status: stable
    - name: wasm
      status: fallback
    - name: webnn
      status: experimental
  browsers: [chrome, edge, safari]
io:
  input: image
  output: layout-regions
assets:
  source: modelscope
  size: 12MB
  version: 1.0.0
  checksum: sha256:...
```

Backend status is deliberately separate from model status:

- `stable`: verified for the stated browser/device matrix.
- `fallback`: supported as a reliable fallback, usually WASM.
- `experimental`: available for Labs evaluation and not an MVP compatibility promise.

Metadata records verified browsers, devices, adapter names, driver versions where relevant, and test date. It must not claim that a backend works on every environment merely because feature detection returns true.

GitHub Actions validates YAML fields, enum values, package and repository links, demo links, asset manifests, checksums, and the static build. Cross-repository manifest synchronization can be automated later; the first version intentionally keeps editorial status in the portal repository.

## 6. Runtime and Labs Strategy

### 6.1 Backend priority

The runtime detects concrete capabilities instead of only a boolean support flag.

For WebGPU, record at least:

- Adapter and device availability.
- `shader-f16` support.
- Maximum buffer size and relevant binding limits.
- Required feature and limit negotiation results.
- Device-loss events and recovery behavior.

The default priority is WebGPU, then WASM when the SDK supports it. WebNN belongs under `Labs` and is experimental rather than MVP-stable. The first WebNN evaluations should use lightweight CNNs such as `PP-LCNet_x1_0_doc_ori`, comparing WebNN, WebGPU, and WASM on:

- Model loading and initialization time.
- Warm and cold inference latency.
- Peak memory and persistent cache size.
- Output precision and task accuracy.
- Operator coverage and fallback operators.
- Browser, OS, device, and driver details.

Labs results are evidence with a test matrix, not a universal compatibility claim.

### 6.2 WASM fallback and cross-origin isolation

WASM is the stable fallback where supported. SDKs evaluate SIMD and multithreading separately. Multithreaded WASM commonly requires `SharedArrayBuffer`, which in turn requires cross-origin isolation through `COOP` and `COEP` response headers.

GitHub Pages does not offer convenient custom response-header configuration. The portal therefore:

- Records the single-thread WASM limitation explicitly for GitHub Pages demos.
- Detects `crossOriginIsolated` and shows the effective mode.
- Does not promise multithreaded WASM on the default Pages host.
- Keeps Cloudflare Pages or another headers-configurable host as a later deployment option for isolated demos.

### 6.3 Unified model cache

SDKs use a shared cache abstraction instead of independently inventing storage rules:

```ts
interface ModelCache {
  inspect(key: string): Promise<CacheEntry | undefined>
  put(key: string, source: Response | ArrayBuffer, metadata: CacheMetadata): Promise<void>
  remove(key: string): Promise<void>
  clear(scope?: string): Promise<void>
  estimate(): Promise<StorageEstimate>
  requestPersistence(): Promise<boolean>
}
```

Storage roles are:

- Cache Storage for HTTP response-oriented immutable model files.
- IndexedDB for manifests, chunk maps, metadata, and smaller binary artifacts.
- OPFS for large resumable files where browser support is sufficient.
- `navigator.storage.estimate()` for quota and usage display.
- `navigator.storage.persist()` as an explicit user-approved persistence request.

Cache entries are versioned by model ID, model version, backend, and asset checksum. The UI exposes per-model cleanup and a global cache clear action.

### 6.4 Worker execution and efficient media values

SDK inference runs in a Web Worker whenever the selected runtime supports it. The main thread owns UI state; the worker owns model sessions and long-running inference. Image inputs use `ImageBitmap` and transferable buffers where possible to reduce copies.

The contract reserves streaming operations for ASR, TTS, and video models:

- ASR: `MediaDevices`, audio capture, `AudioData`, and incremental transcripts.
- TTS: chunked audio output and optional `AudioWorklet` playback.
- Video: `VideoFrame`, `WebCodecs`, timestamps, and backpressure.
- Model-specific streaming methods support cancellation, queue limits, and disposal.

Streaming is not required for the first DocLayoutV3 MVP, but its types must not make future streaming impossible.

### 6.5 Model downloads

Download manifests and asset delivery account for:

- CORS and CORP headers for cross-origin model files.
- Range requests and server support for resumable downloads.
- Versioned URLs and immutable cache keys.
- Chunking for large weights.
- Abort and resume behavior after tab closure or network interruption.
- Per-chunk and final checksum validation.
- Clear errors for a server that does not permit the requested access pattern.

## 7. Privacy, Errors, and User Communication

Playgrounds process user files locally by default and state that behavior in the UI. SDKs do not silently introduce a remote inference endpoint. Any optional cloud acceleration is separately labeled and opt-in.

The UI distinguishes:

- Backend unavailable versus model not yet implemented.
- Download blocked by CORS/CORP versus network failure.
- Insufficient memory versus invalid input.
- Device lost versus model checksum mismatch.
- Single-thread fallback versus full-featured execution.

## 8. Testing and Verification

Testing is layered:

- Portal schema, generated routes, filter/search behavior, and link checks.
- SDK preprocessing, postprocessing, types, cancellation, errors, and disposal.
- Backend capability detection and WebGPU device-loss handling.
- WASM SIMD and single-thread/multithread behavior, including `crossOriginIsolated` checks.
- Cache integrity, quota failures, interrupted downloads, resume, and cleanup.
- Worker message protocols and transferable media values.
- Minimal real-model smoke tests in each runnable demo.
- Browser/device verification on Chrome, Edge, Safari, desktop, and mobile where claimed.
- Performance measurements for cold load, warm load, inference latency, peak memory, and accuracy.

Every compatibility entry records the test date and environment. A test result is never generalized beyond its verified matrix.

## 9. Deferred Labs Roadmap

The following are explicitly outside the MVP but reserved in the architecture:

- WebNN backend experiments and benchmark reports.
- A headers-configurable deployment such as Cloudflare Pages for cross-origin-isolated WASM demos.
- PWA offline model packages.
- Browser built-in AI APIs.
- OPFS-backed large-file caching and advanced cross-session download resume beyond the baseline cache.
- ASR/TTS/video streaming demos using AudioWorklet, WebCodecs, `AudioData`, and `VideoFrame`.
- A workflow runtime that passes `Tensor`, `ImageBitmap`, `VideoFrame`, and related zero-copy values between nodes.

## 10. Acceptance Criteria for the First Implementation Plan

The first implementation is ready to start when:

1. The portal repository name and deployment target are confirmed.
2. The model metadata schema and backend status vocabulary are checked into the portal.
3. `web-sdk-PP-DocLayoutV3` can be represented without special-case portal code.
4. The portal can build a directory, detail page, and Playground link from one YAML record.
5. The SDK contract documents load, run, dispose, errors, and capability reporting.
6. The first demo reports WebGPU/WASM capability, model download progress, local-processing behavior, cache usage, and the active main-thread/Worker execution mode.
7. The baseline cache supports Cache Storage or IndexedDB, storage estimation, versioned keys, checksum validation, and user-initiated cleanup.
8. WebNN, multithreaded WASM, OPFS/resume enhancements, and complete streaming implementations have explicit Labs or follow-up entries rather than being implied as MVP support.

## 11. Repository State

This document was prepared in a projectless workspace that is not currently a Git repository. It cannot be committed until the `chenmohan123.github.io` repository exists or this workspace is initialized as that repository.
