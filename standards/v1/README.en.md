# Web Model SDK Standard v1

[中文（默认）](README.md) is the primary entry point. This equivalent English
document uses standard version `1.0.0`.

Read the [runtime contract](sdk-contract.md), [single-SDK Demo contract](demo-contract.md),
[portal boundary](portal-contract.md), [docs and release contract](docs-release-contract.md),
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
