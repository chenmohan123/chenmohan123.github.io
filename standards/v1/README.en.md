# Web Model SDK Standard v1

[中文（默认）](README.md) is the primary entry point. This equivalent English
document uses standard version `1.1.0`. Version `1.1.0` remains compatible
with `1.0.0` SDK manifests because it adds repository governance rather than
runtime fields.

Read the [runtime contract](sdk-contract.md), [single-SDK Demo contract](demo-contract.md),
[portal boundary](portal-contract.md), [docs and release contract](docs-release-contract.md),
[repository governance and deployment contract](repository-governance-contract.md),
[examples contract](examples-contract.md), [performance contract](performance-contract.md),
then the machine-readable [rules](rules.yaml), [manifest schema](sdk-manifest.schema.json),
and [UI tokens](ui-tokens.json).

An SDK repository owns its framework-neutral runtime, npm package, current-model
Demo, documentation, examples, benchmarks, CI, and Releases. The portal owns
catalogs, categories, comparisons, introduction pages, and Workflow entry
points. Cross-SDK execution starts only after compatible public contracts and a
real composition use case are recorded.

Rules are `required`, `recommended`, or `labs`. The local checker is read-only,
offline by default, accepts local repository paths, and returns exit code `0`
only when all required rules pass.

Audit snapshots may be written to `reports/sdk-standard/` as JSON or Markdown.
Required failures block compliance; recommended findings are improvements and
Labs findings require explicit evidence and limits. Do not include user files,
secrets, or uploaded model inputs in a report.

Rulesets, deployments, and GitHub Pages are remote state, so the offline
checker reports those rules as `skip`. Passing every local required rule means
`locally-compliant`; the repository is fully `compliant` only after read-only
GitHub or hosting-provider API checks verify every applicable remote required
rule. GitHub Pages is optional, and `PAGES-001` applies only when it is the
selected host.

### Model variants and sources

The legacy `model.assets` field remains required for compatibility. New SDKs
may additionally declare `model.defaultVariant`, `model.defaultSource`, and
`model.variants[]`. Each variant declares its id, precision, quantization,
ONNX opset, byte size, parameter count, supported `wasm`/`webgpu` backends,
and one or more sources.

Each source declares a `kind` (`git-lfs`, `huggingface`, `modelscope`, or
`custom`), a non-empty pinned revision, repository and path, an HTTP(S)
`downloadUrl`, positive byte count, and a 64-character hexadecimal SHA-256.
An explicitly selected source must not be silently replaced after failure;
only an `auto` policy may try sources in manifest order. A Git LFS pointer is
not the browser-downloadable model payload.
