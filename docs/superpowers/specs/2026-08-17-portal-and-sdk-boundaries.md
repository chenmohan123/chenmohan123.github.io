# Portal and SDK Boundaries

**Date:** 2026-08-17  
**Status:** Accepted  
**Decision owner:** chenmohan123  
**Applies to:** `chenmohan123.github.io` and all `web-sdk-*` repositories

## Decision

The existing SDK repositories remain the owners of their model runtime and
standalone demos. The `chenmohan123.github.io` repository is a registry and
documentation portal. It must link to an SDK's existing demo instead of
reimplementing that demo.

The portal becomes a Workflow/Playground product only after multiple SDKs are
ready to be composed. Workflow editing and multi-node execution are explicitly
outside the MVP.

## Repository Responsibilities

### Independent SDK repositories

Each SDK repository owns:

- Runtime loading, preprocessing, inference, postprocessing, and disposal.
- Its public TypeScript API, package release, model assets, and checksums.
- A standalone demo that proves the SDK works independently.
- SDK-specific worker protocol, backend selection, performance data, and
  browser/device verification.
- SDK-specific troubleshooting and limitations.

For example, `web-sdk-PP-DocLayoutV3` remains the source of truth for the
PP-DocLayoutV3 runtime and its live demo:

`https://chenmohan123.github.io/web-sdk-PP-DocLayoutV3/`

### The portal repository

The portal owns:

- The curated model and SDK directory.
- Brand, task, status, and backend classification.
- Versioned metadata, links, licenses, checksums, and verified-environment
  records copied from or reviewed against SDK repositories.
- Model detail pages and documentation for installing or evaluating an SDK.
- Links to the independent SDK repository, npm package, and live demo.
- Contribution rules, metadata schema, lifecycle states, and the Labs roadmap.

The portal does not own model inference code, duplicate a single SDK's demo,
or claim compatibility beyond the environments recorded in metadata.

## MVP Boundary

The MVP is complete when the portal can:

1. List and filter models by brand, task, lifecycle status, and backend.
2. Render a validated detail page from one model metadata record.
3. Explain the SDK package, capabilities, limitations, verified environments,
   and model assets.
4. Link users to the SDK repository, npm package, and its existing standalone
   demo.
5. Run schema checks, link checks, static builds, and portal route tests in CI.

The MVP does not include:

- A second implementation of an SDK demo inside the portal.
- A workflow editor or node canvas.
- A multi-model execution engine.
- Cross-SDK runtime adapters or data-copy optimizations.
- A portal-owned model inference service.

## Workflow / Playground Trigger

Workflow work starts only when there are multiple SDKs with a compatible
contract and real composition use cases. The future workflow layer may provide
an interactive Playground, node composition, execution state, cancellation,
and efficient values such as `Tensor`, `ImageBitmap`, `VideoFrame`, or
`AudioData`.

Before starting that work, record:

- At least two independent SDKs that can run through their public APIs.
- A documented input/output contract for the nodes being composed.
- A decision about worker ownership, cancellation, backpressure, and disposal.
- A test case showing why composition provides value over linking standalone
  demos.

Until those conditions are met, new models should be added as registry records
and links, not as workflow nodes or portal demos.

## Change Review Rule

For every proposed portal feature, ask:

1. Does this describe, index, validate, or link an SDK? It belongs in the
   portal.
2. Does this execute one SDK's model? It belongs in that SDK repository and
   its standalone demo.
3. Does this connect two or more SDKs? It belongs in the future Workflow/Labs
   scope and requires a separate design decision.

If a change crosses these boundaries, update this document and the design spec
before implementation.
