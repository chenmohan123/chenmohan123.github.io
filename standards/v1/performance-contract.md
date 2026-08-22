# Performance and Timing Contract

Expose stable timing names with documented cold/warm semantics:

```text
modelDownloadMs
modelCacheReadMs
integrityMs
sessionMs
decodeMs
preprocessMs
inferenceMs
postprocessMs
totalMs
```

The Demo distinguishes model download, cache hit, model loading/session
creation, CPU/WASM, GPU/WebGPU, and NPU (only when verified) execution. The
result reports requested backend, actual backend, execution mode (`main` or
`worker`), runtime version, and test environment. A cold run includes network
or cache acquisition and a warm run reuses the loaded session; do not compare
the two without labeling them.

Recommended evidence includes peak memory, cache bytes, model precision,
batch size, browser/device, and test date. These measurements are observations
for the stated matrix, not universal benchmarks.
