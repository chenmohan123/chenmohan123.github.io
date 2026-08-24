# web-sdk-PP-OCRv6 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish a framework-neutral `web-sdk-pp-ocrv6` browser SDK that runs PP-OCRv6 detection, recognition, and `det -> crop -> rec` OCR locally through ONNX Runtime Web.

**Architecture:** Create a new sibling repository at `F:\git\00_chenmohan\github\web-sdk-PP-OCRv6`. Keep a single npm package with focused runtime, detector, recognizer, pipeline, manifest, cache, and Worker modules. Store six pinned official ONNX source files in Git LFS, publish immutable release/CDN assets, and keep ONNX binaries out of npm. Build a Chinese-first left-center-right Demo plus the required Vanilla and React examples.

**Tech Stack:** TypeScript, pnpm, ONNX Runtime Web, Vite, React reference Demo, Vitest, Playwright, tsup, GitHub Actions, Git LFS, IndexedDB, Apache-2.0.

---

## Scope and Working Rules

- The target is a single SDK repository, not a portal change or multi-SDK Workflow.
- Read `standards/v1/README.md`, the v1 contracts, `rules.yaml`, schema, and UI tokens before changing the new repository.
- Use `web-sdk-PP-DocLayoutV3` and `web-sdk-PP-LCNet_x1_0_doc_ori` as local reference implementations only; do not add React or portal dependencies to runtime modules.
- Run `pnpm sdk:check -- --repo F:\git\00_chenmohan\github\web-sdk-PP-OCRv6 --format table` before and after SDK changes.
- Keep all six official ONNX binaries out of npm package `files`; verify Git LFS objects are present before model tests.
- Do not claim browser/device compatibility beyond dated verification evidence.

## File Map

Create these ownership boundaries in the new repository:

- `packages/sdk/src/runtime/`: capability probe, ORT session, Worker bridge, stable backend selection, cancellation, and disposal.
- `packages/sdk/src/model/`: runtime manifest parsing, asset download, SHA-256/byte verification, and model lifecycle.
- `packages/sdk/src/cache/`: IndexedDB and memory cache implementations plus cache estimate/cleanup.
- `packages/sdk/src/detector/`: image decode, resize/normalize, DB-style detection postprocess, reading-order helpers, and detector API.
- `packages/sdk/src/recognizer/`: crop preparation, recognition preprocessing, dictionary/CTC-NRTR decoding, and recognizer API.
- `packages/sdk/src/pipeline/`: detector-to-crop-to-recognizer orchestration and linked OCR results.
- `packages/sdk/src/types.ts` and `packages/sdk/src/errors.ts`: public types and stable error codes.
- `models/pp-ocrv6/<version>/`: runtime manifests, dictionaries, source metadata, and Git LFS ONNX files.
- `apps/demo/`: standalone Chinese-first React Demo and Playwright tests.
- `examples/vanilla/`, `examples/react/`, `examples/vite/`, `examples/cdn/`, `examples/wechat-web-view/`: runnable host examples.
- `docs/zh-CN/`, `docs/en/`: mirrored quick-start, API, compatibility, troubleshooting, privacy/deployment, models, and performance guides.
- `.github/workflows/`: CI, GitHub Pages, and immutable tag release workflows.

### Task 1: Scaffold the Repository and Governance Contract

**Files:**
- Create: `F:\git\00_chenmohan\github\web-sdk-PP-OCRv6\package.json`
- Create: `F:\git\00_chenmohan\github\web-sdk-PP-OCRv6\pnpm-workspace.yaml`
- Create: `F:\git\00_chenmohan\github\web-sdk-PP-OCRv6\tsconfig.base.json`
- Create: `F:\git\00_chenmohan\github\web-sdk-PP-OCRv6\LICENSE`
- Create: `F:\git\00_chenmohan\github\web-sdk-PP-OCRv6\THIRD_PARTY_NOTICES.md`
- Create: `F:\git\00_chenmohan\github\web-sdk-PP-OCRv6\sdk-manifest.yaml`
- Create: `F:\git\00_chenmohan\github\web-sdk-PP-OCRv6\packages/sdk/package.json`
- Test: `F:\git\00_chenmohan\github\chenmohan123.github.io\tools/sdk-standard-check`

- [ ] **Step 1: Create the empty package and standard manifest**

Use `packages/sdk/package.json` with package name `web-sdk-pp-ocrv6`, version
`0.1.0`, `license: Apache-2.0`, `onnxruntime-web` dependency, `files: ["dist"]`,
public `publishConfig`, ESM/types exports, and an exported Worker entry. Copy
the v1.1 manifest template and declare runtime backends `[wasm, webgpu]`,
execution modes `[worker, main]`, examples for Vanilla/React/Vite/CDN/WeChat
web-view, IndexedDB cache, and the six model assets with source URLs recorded
as soon as Task 2 pins them.

- [ ] **Step 2: Add the minimum failing repository contract test**

Create `scripts/repository-contract.test.mjs` that asserts the package is
public, has a semver version, has reciprocal README paths, and has
`packages/sdk/src/index.ts` plus `apps/demo/index.html` before implementation.
Run:

```powershell
node --test scripts/repository-contract.test.mjs
```

Expected: FAIL because the source entry, Demo, and bilingual README do not yet
exist.

- [ ] **Step 3: Add the initial source/test/build skeleton**

Create `packages/sdk/src/index.ts`, `packages/sdk/src/types.ts`,
`packages/sdk/src/errors.ts`, `packages/sdk/tests/package-smoke.test.ts`,
`packages/sdk/tsconfig.json`, and `packages/sdk/tsup.config.ts`. Export the
public names `createDetector`, `createRecognizer`, `createOCR`, `clearModelCache`,
`clearAllModelCache`, and `probeCapabilities`; the factories may throw a
temporary `INVALID_MANIFEST` until Task 2 supplies the first valid manifest.

- [ ] **Step 4: Run and commit the scaffold**

Run `pnpm install`, `pnpm --filter web-sdk-pp-ocrv6 test`,
`pnpm --filter web-sdk-pp-ocrv6 typecheck`, and the portal checker. Expected:
the package smoke test passes and the checker reports only missing runtime,
Demo, documentation, and model evidence. Commit:

```powershell
git add package.json pnpm-workspace.yaml tsconfig.base.json LICENSE THIRD_PARTY_NOTICES.md sdk-manifest.yaml packages scripts
git commit -m "chore: scaffold pp-ocrv6 web sdk"
```

### Task 2: Pin and Verify the Six Official Model Assets

**Files:**
- Create: `models/pp-ocrv6/1.0.0/model-source.json`
- Create: `models/pp-ocrv6/1.0.0/manifest.json`
- Create: `models/pp-ocrv6/1.0.0/dictionaries/*.txt`
- Create: `models/pp-ocrv6/1.0.0/*.onnx` through Git LFS
- Create: `scripts/fetch-pp-ocrv6-models.mjs`
- Create: `scripts/verify-pp-ocrv6-models.mjs`
- Test: `scripts/model-contract.test.mjs`

- [ ] **Step 1: Write the failing asset contract test**

In `scripts/model-contract.test.mjs`, enumerate the six required component IDs
and assert each manifest asset has a fixed URL, positive byte count, 64-character
SHA-256, precision, input/output contract, and pinned upstream repository. Also
assert `package.json` does not include `models/**/*.onnx` in its published files.
Run `node --test scripts/model-contract.test.mjs`; expected: FAIL because the
six assets and runtime manifest are absent.

- [ ] **Step 2: Implement deterministic model fetch and verification scripts**

`fetch-pp-ocrv6-models.mjs` must download each official
`PaddlePaddle/PP-OCRv6_*_onnx` `inference.onnx`, `inference.json`,
`inference.yml`, and required dictionary/config files at a caller-supplied
fixed revision into `models/pp-ocrv6/1.0.0/`. It must refuse a floating branch
when `--revision` is absent. `verify-pp-ocrv6-models.mjs` must read each file,
compute bytes/SHA-256, inspect ONNX graph input/output names and shapes, and
write no manifest value that differs from the observed file.

- [ ] **Step 3: Add the checked-in runtime manifest and source notice**

Record the exact revision, GitHub Release/CDN URL, Hugging Face URL, file size,
SHA-256, parameter count, precision, opset, preprocessing, postprocessing,
decoder, and dictionary for all medium/small/tiny det/rec variants. Keep
official model files tracked by Git LFS and add `.gitattributes` entries for
`models/**/*.onnx filter=lfs diff=lfs merge=lfs -text`.

- [ ] **Step 4: Run model contract tests and commit assets**

Run `git lfs ls-files`, `node scripts/verify-pp-ocrv6-models.mjs`,
`node --test scripts/model-contract.test.mjs`, and the portal checker. Expected:
all six assets report matching bytes/SHA-256 and model contract tests pass.
Commit model assets separately:

```powershell
git add .gitattributes models scripts/model-contract.test.mjs scripts/verify-pp-ocrv6-models.mjs
git commit -m "feat: pin pp-ocrv6 model assets"
```

### Task 3: Implement Runtime Types, Errors, Capability Probe, and Backend Selection

**Files:**
- Create: `packages/sdk/src/runtime/capabilities.ts`
- Create: `packages/sdk/src/runtime/select-plan.ts`
- Modify: `packages/sdk/src/types.ts`
- Modify: `packages/sdk/src/errors.ts`
- Test: `packages/sdk/tests/runtime-selector.test.ts`
- Test: `packages/sdk/tests/errors.test.ts`

- [ ] **Step 1: Write failing tests for strict backend and stable errors**

Cover `wasm`, `webgpu`, and `auto`; assert explicit WebGPU absence rejects
without fallback, `auto + allowFallback` produces an ordered candidate list,
and Worker absence rejects `execution: "worker"`. Assert every public error
contains one of the documented stable codes and serializable details.

- [ ] **Step 2: Implement the types and capability probe**

Define `Backend`, `ExecutionMode`, `RuntimeInfo`, `Capabilities`, `TimingBreakdown`,
`ModelInfo`, `OCRLine`, and the model-selection/custom-manifest types. Probe
WASM, SIMD, threads, WebGPU, Worker, and OffscreenCanvas without claiming
support from user-agent strings. Implement `selectExecutionPlan` so strict
requests have one candidate and fallback is opt-in.

- [ ] **Step 3: Run focused tests and commit**

Run `pnpm --filter web-sdk-pp-ocrv6 test -- runtime-selector errors` and
`pnpm --filter web-sdk-pp-ocrv6 typecheck`; expected PASS. Commit with
`git commit -m "feat: add runtime capability and error contracts"`.

### Task 4: Implement ORT Sessions, Worker Protocol, Cancellation, and Disposal

**Files:**
- Create: `packages/sdk/src/runtime/ort-session.ts`
- Create: `packages/sdk/src/runtime/worker-bridge.ts`
- Create: `packages/sdk/src/runtime/inference.worker.ts`
- Create: `packages/sdk/src/runtime/protocol.ts`
- Test: `packages/sdk/tests/ort-session.test.ts`
- Test: `packages/sdk/tests/worker-bridge.test.ts`

- [ ] **Step 1: Write failing session/Worker tests**

Use mocked `onnxruntime-web` sessions to assert provider selection (`wasm` or
`webgpu`), configured WASM asset paths, progress phases, transfer of input and
output buffers, abort propagation, and exactly-once `dispose`.

- [ ] **Step 2: Implement the ORT session factory**

Create sessions with `executionProviders: ["webgpu"]` or `["wasm"]`, configure
WASM paths and thread count, expose session creation timing, and translate ORT
errors to `SESSION_CREATE_FAILED`, `OUT_OF_MEMORY`, `INFERENCE_FAILED`, or
`ABORTED` without changing the requested provider.

- [ ] **Step 3: Implement the Worker protocol**

Define messages `{ type: "load" | "run" | "dispose", requestId, ... }` and
responses `{ type: "progress" | "result" | "error", requestId, ... }`. Transfer
model/input/output buffers, serialize stable errors, reject all pending requests
on Worker failure, and release the ORT session on `dispose`.

- [ ] **Step 4: Run focused tests and commit**

Run `pnpm --filter web-sdk-pp-ocrv6 test -- ort-session worker-bridge` and
`pnpm --filter web-sdk-pp-ocrv6 typecheck`; expected PASS. Commit with
`git commit -m "feat: add worker-first onnx runtime"`.

### Task 5: Implement Model Download, Integrity, and Cache Lifecycle

**Files:**
- Create: `packages/sdk/src/model/manifest.ts`
- Create: `packages/sdk/src/model/download.ts`
- Create: `packages/sdk/src/model/integrity.ts`
- Create: `packages/sdk/src/model/model-manager.ts`
- Create: `packages/sdk/src/cache/indexeddb-cache.ts`
- Create: `packages/sdk/src/cache/memory-cache.ts`
- Create: `packages/sdk/src/cache/model-cache.ts`
- Test: `packages/sdk/tests/manifest.test.ts`
- Test: `packages/sdk/tests/model-manager.test.ts`
- Test: `packages/sdk/tests/cache.test.ts`

- [ ] **Step 1: Write failing manifest/cache tests**

Assert malformed manifests reject missing tensors, decoder/dictionary, bytes,
URL, or SHA-256; relative release URLs resolve against the manifest URL; cache
keys change when version or SHA changes; failed verification never stores data;
and current/global cleanup remove the expected entries only.

- [ ] **Step 2: Implement manifest parsing and model loading**

Parse the two model-component manifests into immutable typed structures, resolve
the GitHub Release/CDN URL and pinned Hugging Face fallback, stream progress,
measure `modelDownloadMs` and `modelCacheReadMs`, verify byte count/SHA-256, and
return source `memory`, `cache`, or `network`.

- [ ] **Step 3: Implement versioned IndexedDB and memory caches**

Use an object store keyed by SDK/model/version/variant/SHA-256; store bytes,
manifest identity, and timestamps. Expose list, estimate, clear-current, and
clear-all. In non-browser tests fall back to the memory implementation without
changing the public API.

- [ ] **Step 4: Run focused tests and commit**

Run `pnpm --filter web-sdk-pp-ocrv6 test -- manifest model-manager cache` and
`pnpm --filter web-sdk-pp-ocrv6 typecheck`; expected PASS. Commit with
`git commit -m "feat: add verified model cache lifecycle"`.

### Task 6: Implement Detector Preprocess, Postprocess, and API

**Files:**
- Create: `packages/sdk/src/detector/decode.ts`
- Create: `packages/sdk/src/detector/preprocess.ts`
- Create: `packages/sdk/src/detector/postprocess.ts`
- Create: `packages/sdk/src/detector/reading-order.ts`
- Create: `packages/sdk/src/detector/detector.ts`
- Test: `packages/sdk/tests/detector-preprocess.test.ts`
- Test: `packages/sdk/tests/detector-postprocess.test.ts`
- Test: `packages/sdk/tests/detector.test.ts`

- [ ] **Step 1: Write failing detector fixture tests**

Use decoded raster fixtures and reference tensors to assert RGB conversion,
resize/letterbox behavior, normalization, output tensor shape handling,
thresholding, polygon restoration to original pixels, clipping, and stable
indices. Include empty detections and an aborted run.

- [ ] **Step 2: Implement image decoding and preprocessing**

Decode the approved image inputs through browser APIs, preserve original width
and height, apply manifest preprocessing, and return a contiguous Float32Array
plus tensor dimensions. Reject unsupported or undecodable input as
`INVALID_INPUT`.

- [ ] **Step 3: Implement PP-OCRv6 detection postprocess**

Read the manifest-declared output tensors, apply the declared threshold and
unclip/box filtering, restore polygons from normalized/model coordinates to
original-image pixels, clip to image bounds, and emit score plus stable index.

- [ ] **Step 4: Implement the detector lifecycle**

`createDetector` must load the selected det variant through Task 5, create a
Worker-first ORT executor through Task 4, expose capabilities/model/runtime/load
timings, serialize runs, support `AbortSignal`, and release the executor on
`dispose`.

- [ ] **Step 5: Run focused tests and commit**

Run `pnpm --filter web-sdk-pp-ocrv6 test -- detector-preprocess detector-postprocess detector`;
expected PASS. Commit with `git commit -m "feat: add pp-ocrv6 text detector"`.

### Task 7: Implement Recognizer Preprocess, Crop, Dictionary Decode, and API

**Files:**
- Create: `packages/sdk/src/recognizer/crop.ts`
- Create: `packages/sdk/src/recognizer/preprocess.ts`
- Create: `packages/sdk/src/recognizer/decode.ts`
- Create: `packages/sdk/src/recognizer/recognizer.ts`
- Test: `packages/sdk/tests/recognizer-crop.test.ts`
- Test: `packages/sdk/tests/recognizer-decode.test.ts`
- Test: `packages/sdk/tests/recognizer.test.ts`

- [ ] **Step 1: Write failing recognition tests**

Assert quadrilateral perspective/axis-aligned crops, aspect-ratio handling,
manifest resize and normalization, CTC blank/repeated-token collapse, NRTR
decoder output, dictionary lookup, confidence calculation, and empty/invalid
crop errors. Use fixed logits fixtures from the pinned model contract.

- [ ] **Step 2: Implement crop and recognition preprocessing**

Map original-pixel polygons to source pixels, create deterministic crops,
resize to the manifest width/height policy, normalize into the declared tensor,
and batch crops without changing their stable indices.

- [ ] **Step 3: Implement decoder and recognizer lifecycle**

Decode the manifest-declared output heads with the pinned dictionary and
decoder settings, return text/confidence/index metadata, load rec variants via
the shared model manager, and expose the same runtime/load/dispose contract as
the detector.

- [ ] **Step 4: Run focused tests and commit**

Run `pnpm --filter web-sdk-pp-ocrv6 test -- recognizer-crop recognizer-decode recognizer`;
expected PASS. Commit with `git commit -m "feat: add pp-ocrv6 text recognizer"`.

### Task 8: Implement the OCR Pipeline and Public Package Exports

**Files:**
- Create: `packages/sdk/src/pipeline/ocr.ts`
- Create: `packages/sdk/src/pipeline/types.ts`
- Modify: `packages/sdk/src/index.ts`
- Test: `packages/sdk/tests/pipeline.test.ts`
- Test: `packages/sdk/tests/package-smoke.test.ts`

- [ ] **Step 1: Write the failing end-to-end pipeline test**

Mock detector and recognizer results for three polygons in non-reading order;
assert `createOCR().ocr(image)` returns original-pixel polygons, sorted reading
order, preserved detector indices, linked OCR indices, text/confidence, and
stage timings for detection, crop, recognition, and total time.

- [ ] **Step 2: Implement reading-order and orchestration**

Run detector once, sort a copy of detections top-to-bottom/left-to-right using
the manifest tolerance, crop in sorted order, batch-recognize, and join results
by stable index. Keep raw detector order in a separate field. Propagate aborts,
strict backend errors, and disposal through both components.

- [ ] **Step 3: Export the stable API**

Export factories, public option/result types, model manifest types, cache
controls, capability probe, error class/codes, and the Worker entry without
exporting UI code. Add package smoke assertions for ESM import and the browser
global/CDN build.

- [ ] **Step 4: Run focused tests and commit**

Run `pnpm --filter web-sdk-pp-ocrv6 test -- pipeline package-smoke`,
`pnpm --filter web-sdk-pp-ocrv6 typecheck`, and `pnpm --filter web-sdk-pp-ocrv6 build`;
expected PASS. Commit with `git commit -m "feat: expose pp-ocrv6 ocr pipeline"`.

### Task 9: Build the Chinese-First Left-Center-Right Demo

**Files:**
- Create: `apps/demo/index.html`
- Create: `apps/demo/src/main.tsx`
- Create: `apps/demo/src/App.tsx`
- Create: `apps/demo/src/i18n/zh-CN.ts`
- Create: `apps/demo/src/i18n/en.ts`
- Create: `apps/demo/src/styles.css`
- Create: `apps/demo/tests/demo.spec.ts`
- Create: `apps/demo/public/samples/ocr-fixture.png`

- [ ] **Step 1: Write failing browser tests**

In `apps/demo/tests/demo.spec.ts`, assert Chinese initial copy, language toggle,
left-side controls, `data-sdk-model-info`, `data-sdk-runtime-info`,
`data-sdk-timing`, cache clear controls, 390px no-overflow, image result canvas,
and bidirectional polygon/OCR-row highlighting. Mock the SDK boundary so tests
do not download 6 model files.

- [ ] **Step 2: Implement Demo state and controls**

Create explicit states `idle`, `downloading`, `loading`, `ready`, `running`,
`success`, `error`, and `unsupported`. Wire file selection, mode selection,
det/rec preset selection, backend (`wasm`/`webgpu`/`auto`), execution mode,
fallback checkbox, run/reset, abort, current/global cache cleanup, and language
toggle to the public SDK API.

- [ ] **Step 3: Implement the left-center-right result view**

Keep the center canvas stable and draw original-pixel polygons over the image;
render model/runtime/timing metadata above an independently scrollable OCR list
in the right column. Use the shared UI token values for page, panel, text,
action, success, warning, error, spacing, radius, focus, and status colors.

- [ ] **Step 4: Implement responsive behavior and accessibility**

Use desktop three-column layout at 1024px and above, a collapsible control bar
between 600px and 1023px, and the approved mobile order at 599px and below.
Provide labels, keyboard focus, text alternatives for result rows, and no
horizontal overflow at 390px.

- [ ] **Step 5: Run browser tests and commit**

Run `pnpm --filter demo test`, `pnpm --filter demo build`, and
`pnpm exec playwright test apps/demo/tests/demo.spec.ts`; expected PASS.
Commit with `git commit -m "feat: add pp-ocrv6 workbench demo"`.

### Task 10: Add Examples and Bilingual Documentation

**Files:**
- Create/modify: `README.md`, `README.en.md`
- Create: `docs/zh-CN/quick-start.md`, `docs/zh-CN/api.md`,
  `docs/zh-CN/models.md`, `docs/zh-CN/compatibility.md`,
  `docs/zh-CN/performance.md`, `docs/zh-CN/troubleshooting.md`,
  `docs/zh-CN/deployment.md`, `docs/zh-CN/privacy.md`
- Create: matching files under `docs/en/`
- Create: `examples/vanilla/index.html`, `examples/vanilla/main.ts`,
  `examples/vanilla/README.md`
- Create: `examples/react/*`, `examples/vite/*`, `examples/cdn/*`,
  `examples/wechat-web-view/*`
- Test: `examples/tests/examples.test.mjs`
- Test: `scripts/check-doc-parity.test.mjs`

- [ ] **Step 1: Write failing documentation/example checks**

Assert README language links, GitHub/npm/Demo links, mirrored Chinese/English
guide filenames, install/run commands in every runnable example, and explicit
unsupported native mini-program wording. Run `node --test scripts/check-doc-parity.test.mjs examples/tests/examples.test.mjs`;
expected: FAIL until the files exist.

- [ ] **Step 2: Implement quick-start and API examples**

Document this exact usage in Chinese and English, with the same API in Vanilla
and React:

```ts
const ocr = await createOCR({
  model: { det: "small", rec: "small" },
  backend: "wasm",
  execution: "worker",
  allowFallback: false
});
const result = await ocr.ocr(file);
await ocr.dispose();
```

Include custom `manifestUrl`, self-hosted CDN paths, cache cleanup, error codes,
timing semantics, browser/CORS requirements, and the no-upload privacy model.

- [ ] **Step 3: Implement examples with declared support boundaries**

The Vanilla example is the portability baseline; React is the complete
reference; Vite and CDN demonstrate bundler/script-tag loading; the WeChat
example documents public-account H5 and mini-program `web-view` hosting. The
native mini-program runtime page must state unsupported rather than provide a
non-runnable example link.

- [ ] **Step 4: Run parity/example tests and commit**

Run `node --test scripts/check-doc-parity.test.mjs examples/tests/examples.test.mjs`
and the portal checker; expected PASS for all local documentation/example rules.
Commit with `git commit -m "docs: add pp-ocrv6 guides and examples"`.

### Task 11: Add CI, Pages Demo, Release Automation, and Package Verification

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/pages.yml`
- Create: `.github/workflows/release.yml`
- Create: `CHANGELOG.md`
- Create: `scripts/verify-release.mjs`
- Create: `scripts/verify-package-assets.mjs`
- Test: `scripts/verify-release.test.mjs`

- [ ] **Step 1: Write failing release/package tests**

Assert the package tarball contains `dist`, types, manifests, dictionaries, and
Worker output but no `.onnx`; assert the release workflow accepts only immutable
`v*` tags and the changelog includes model source, license, default assets,
backends, and limitations. Run `node --test scripts/verify-release.test.mjs`;
expected: FAIL before workflows and release metadata exist.

- [ ] **Step 2: Implement least-privilege CI**

Make CI run install, format check, docs parity, lint, typecheck, unit tests,
model contract tests, Demo/browser tests, build, and package asset verification.
Use explicit permissions and fail when Git LFS assets are pointers or checksums
do not match.

- [ ] **Step 3: Implement Pages deployment**

Build the Demo from the protected default branch through the official Pages
artifact/deploy actions, target `github-pages`, set `contents: read`,
`pages: write`, and `id-token: write`, disable broader defaults, and serialize
production deployments with concurrency.

- [ ] **Step 4: Implement tag release workflow**

On an immutable `v*` tag, rerun CI, package without ONNX, publish npm with
provenance/trusted publishing, attach versioned model assets and manifests to a
GitHub Release, and generate release notes containing the pinned upstream
revision and checksums. Never move an existing release tag.

- [ ] **Step 5: Run release checks and commit**

Run `pnpm verify`, `node scripts/verify-release.mjs`,
`node scripts/verify-package-assets.mjs`, and `pnpm pack --dry-run` from
`packages/sdk`; expected PASS with no ONNX file in the tarball. Commit with
`git commit -m "ci: add pp-ocrv6 verification and release workflows"`.

### Task 12: Full Verification and Publish Readiness

**Files:**
- Modify: `reports/sdk-standard/pp-ocrv6.json`
- Create: `reports/compatibility/pp-ocrv6-2026-08-24.json`
- Create: `reports/release/0.1.0.md`

- [ ] **Step 1: Run the complete local verification**

From the portal repository run:

```powershell
pnpm sdk:check -- --repo F:\git\00_chenmohan\github\web-sdk-PP-OCRv6 --format json --out reports\sdk-standard\pp-ocrv6.json
```

From the SDK repository run `pnpm verify`. Expected: no local required failures;
remote governance rules remain `skip` until API evidence is collected.

- [ ] **Step 2: Run dated browser/device verification**

Record browser version, OS, device, backend, execution mode, runtime version,
model version, cold/warm timings, and test date for Chromium WASM/Worker,
verified WebGPU/Worker, a 390px viewport, public-account H5, and WeChat
mini-program `web-view`. Do not add an environment to stable compatibility
claims unless its run passes.

- [ ] **Step 3: Review publish artifacts**

Inspect the npm tarball, GitHub Release asset list, manifest URLs/checksums,
Demo build, bilingual docs, examples, and `THIRD_PARTY_NOTICES.md`. Verify no
credential, secret, or model binary is accidentally included in npm metadata or
the Demo bundle.

- [ ] **Step 4: Capture remote governance evidence before public release**

Using read-only GitHub API access, record the default-branch Ruleset, release-tag
Ruleset, Pages source/environment/HTTPS/concurrency, and successful deployment
commit in the release report. An unavailable API permission is recorded as
`unknown`, never as `pass`.

- [ ] **Step 5: Commit the readiness evidence**

Run `git diff --check`, inspect `git status --short`, and commit only the
verification reports with `git commit -m "chore: record pp-ocrv6 release readiness"`.

## Plan Self-Review

- Spec coverage: architecture/tasks 3-8; model assets/task 2; cache/task 5;
  Demo/task 9; examples/docs/task 10; governance/release/tasks 1, 11, and 12;
  compatibility and performance/tasks 9 and 12.
- No task claims native mini-program runtime support or unverified WebGPU/NPU.
- Public API names and backend/execution values are consistent across Tasks 3,
  4, 6, 7, 8, and 9.
- The only binary source is the six Git LFS model assets; Task 11 explicitly
  verifies that npm excludes `.onnx`.
- No remote GitHub mutation is included in local implementation; remote ruleset,
  Pages, release, and npm publication require authenticated release execution.
