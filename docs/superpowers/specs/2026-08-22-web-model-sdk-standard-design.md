# Web Model SDK Standard Design

**Date:** 2026-08-22  
**Status:** Accepted for implementation planning  
**Decision owner:** chenmohan123  
**Applies to:** `chenmohan123.github.io` and every `web-sdk-*` repository

## Goal

Make `chenmohan123.github.io` the versioned control plane for a consistent
browser-model SDK ecosystem. The repository will contain the standard,
templates, machine-readable rules, an offline local-repository checker, an
`AGENTS.md` operating contract, and a thin Codex Skill that routes common SDK
governance workflows.

The first implementation is the governance foundation. It must be usable for
both existing SDK repositories (`web-sdk-PP-DocLayoutV3` and
`web-sdk-PP-LCNet_x1_0_doc_ori`) without requiring either SDK to be rewritten in
the same change set.

## Product Boundaries

The ecosystem has three layers with different owners:

```text
Single SDK repository
├─ Framework-neutral SDK runtime and npm package
├─ Demo for the current model only
├─ Bilingual docs, examples, benchmarks, CI, and releases
└─ GitHub Pages Demo URL

chenmohan123.github.io portal
├─ SDK/model directory, search, categories, and comparisons
├─ Single-SDK introduction pages
│  └─ links to the SDK GitHub repository, npm package, and standalone Demo
├─ Combination recipes and Workflow entry points
└─ future cross-SDK Playground surface

Optional standalone Workflow website
└─ multi-SDK composition, node execution, data contracts, cancellation,
   backpressure, and workflow runtime state
```

An individual SDK Demo never becomes a multi-model catalog. The portal does
not duplicate a single SDK's inference implementation. Workflow work starts
only after at least two SDKs expose compatible public contracts and a concrete
composition use case has been documented.

## Repository Architecture

The standard source lives in the portal repository and is versioned as a
coherent rule set:

```text
AGENTS.md
standards/
└─ v1/
   ├─ README.md
   ├─ sdk-contract.md
   ├─ demo-contract.md
   ├─ portal-contract.md
   ├─ docs-release-contract.md
   ├─ examples-contract.md
   ├─ performance-contract.md
   ├─ ui-tokens.json
   ├─ sdk-manifest.schema.json
   ├─ rules.yaml
   └─ templates/
      ├─ sdk-manifest.yaml
      ├─ README.zh-CN.md
      ├─ README.en.md
      ├─ demo-checklist.md
      └─ release-checklist.md
tools/
└─ sdk-standard-check/
skills/
└─ web-model-sdk-standard/
   ├─ SKILL.md
   └─ references/
      ├─ audit.md
      ├─ scaffold.md
      ├─ demo.md
      └─ portal.md
reports/
└─ sdk-standard/
```

`standards/v1` is the single source of truth. `AGENTS.md`, the checker, the
Skill, and future portal pages reference these files rather than duplicating
the rules. The checker is read-only against target SDK repositories. Reports
are generated artifacts and may be committed for portal consumption, but the
checker never mutates the target repository.

## Standard Levels

Rules are classified as:

- `required`: a new SDK cannot be declared compliant until these pass.
- `recommended`: useful quality and portability improvements; they do not
  block an initial release.
- `labs`: experimental capabilities that require evidence and an explicit
  status, but are not compatibility promises.

Conditional requirements are expressed in `rules.yaml`. For example, Vue is
required only when Vue is a declared target framework; WeChat H5/web-view
examples are required only when the SDK claims those surfaces. Unsupported
surfaces must be stated explicitly instead of represented by an empty or
broken example.

## Required Contracts

### SDK runtime

The runtime remains framework-neutral and exposes a lifecycle equivalent to:

```ts
interface WebModel<I, O> {
  readonly manifest: ModelManifest
  readonly capabilities: ModelCapabilities
  load(options?: LoadOptions): Promise<void>
  run(input: I, options?: RunOptions): Promise<O>
  dispose(): Promise<void>
}
```

SDK-specific factories and domain types remain allowed. The standard covers
lifecycle, cancellation, disposal, capability reporting, structured errors,
model integrity, and cache ownership; it does not force all model inputs or
outputs into one domain shape.

### Model information

Every SDK and registry record must be able to display model name, model and SDK
version, parameter count when known, byte size, precision, model format, model
source, license, checksum, runtime version, and supported input/output types.

### Runtime and timing information

The public result or Demo telemetry uses stable names for:

```text
requestedBackend       actualBackend
executionMode          runtimeVersion
device/browser matrix  modelSource (network/cache/memory/custom)
modelDownloadMs        modelCacheReadMs
integrityMs             sessionMs
preprocessMs            inferenceMs
postprocessMs           totalMs
```

Cold-start and warm-run semantics must be documented. `cpu`, `gpu`, and
`npu` are allowed execution targets, but NPU is shown only with a real browser
or host verification record; the standard never implies that browsers expose
NPU execution by default.

### Cache controls

The Demo must expose the current model's cache state, estimated usage, a
single-model cleanup action, and a global cleanup action. Cache keys include
SDK/model identity, model version, backend where relevant, and asset checksum.
Cleanup is user initiated and reports the result; it does not silently delete
unrelated browser storage.

### Documentation and release

Chinese is the default README and Demo language. An English README and
equivalent English docs are required, with explicit links between language
variants. README, npm package metadata, and the portal record expose install,
GitHub, and live Demo links. A public repository has a GitHub About description,
Homepage/Demo link, topics, CI, and at least one GitHub Release. Release notes
identify model source, license, runtime backends, bundled/default assets, and
known limitations.

### Examples

Vanilla/原生 TypeScript is the portability baseline. React is the complete
reference implementation. Vue, CDN, Vite, and WeChat H5/web-view examples are
added according to declared target surfaces. The SDK runtime itself must not
depend on React, Vue, or another UI framework.

## UI Contract

The standard unifies semantics and visual tokens, not one identical page
layout. The two canonical shells are:

- **Single-SDK Demo:** a focused Utility Workbench with a brand bar, controls,
  progress/error state, current-model workspace, and model/runtime/timing
  information.
- **Portal:** a Catalog + Inspector layout with search/filter/category controls,
  model cards or rows, and a detail surface that links to the independent SDK
  Demo and repository.

Both shells share `ui-tokens.json` and these semantic states:

```text
idle / downloading / loading / ready / running / success / error / unsupported
```

Tokens cover page and panel backgrounds, text, borders, primary action,
success, warning, error, experimental status, spacing, typography, radius,
and focus styles. Rounded corners are at most 8px by default. Status cannot be
communicated by color alone; text or an icon with an accessible label is also
required. Layouts must remain usable at mobile widths without horizontal
overflow. A heavy UI framework such as Ant Design or MUI is not a first-phase
dependency. A shared `@web-model-sdk/ui` package may be extracted after two
SDKs have adopted the contract and duplication is measured.

## Local Checker

The checker accepts one or more local SDK paths and works without network
access. It reads `package.json`, repository files, Markdown, examples,
workflows, manifests, and optional config. A declared manifest is preferred;
when an old SDK has none, safe discovery heuristics produce findings that say
the evidence was inferred.

Example commands:

```powershell
pnpm sdk:check -- --repo ..\web-sdk-PP-DocLayoutV3 --standard v1 --format table
pnpm sdk:check -- --repo ..\web-sdk-PP-LCNet_x1_0_doc_ori\.worktrees\implementation --format json --out reports\sdk-standard\lcnet.json
pnpm sdk:check -- --repo repo-a --repo repo-b --format markdown --out reports\sdk-standard\summary.md
```

Rule IDs use domain prefixes such as `META-*`, `DOC-*`, `DEMO-*`, `MODEL-*`,
`RUNTIME-*`, `PERF-*`, `CACHE-*`, `EXAMPLE-*`, `RELEASE-*`, and `UI-*`.

The report shape is stable:

```json
{
  "standardVersion": "1.0.0",
  "repository": "web-sdk-PP-DocLayoutV3",
  "summary": {
    "requiredPassed": 32,
    "requiredFailed": 2,
    "recommendedPassed": 14,
    "status": "partial"
  },
  "findings": [
    {
      "id": "DEMO-004",
      "level": "required",
      "status": "fail",
      "path": "apps/demo/src/main.ts",
      "message": "Missing one-click cleanup for this SDK model cache",
      "remediation": "Expose clearModelCache and render the confirmed result"
    }
  ]
}
```

Exit codes are `0` for no required failures, `1` for required failures, `2`
for invalid input/configuration, and `3` for checker errors. Optional network
link checks and Playwright smoke tests are separate flags so offline audits
remain deterministic.

## AGENTS.md Contract

The root `AGENTS.md` is a short router, not a copy of the standard. It tells
agents to read `standards/v1/README.md` for any SDK, Demo, portal, Workflow,
examples, UI, release, or audit task; classify the target layer; run the local
checker before and after changes; use templates for new files; preserve
evidence/path/remediation in reports; and update the standard schema/rules
before introducing a new requirement. It also repeats the portal boundary:
portal pages index and link independent SDKs instead of duplicating inference.

## Skill Contract

`skills/web-model-sdk-standard/SKILL.md` is a thin, repository-versioned
orchestration layer. It routes four explicit workflows to focused references:

- `scaffold`: create a new SDK from templates and run the first audit.
- `audit`: inspect an existing SDK and explain evidence-backed findings.
- `migrate`: fix selected findings in a target SDK with user-approved scope.
- `portal`: update registry metadata, categories, links, and compliance status.

The Skill references `standards/v1` and invokes the checker; it does not copy
the standard text or grant permission for remote mutations. If global Skill
discovery is desired later, this folder can be installed into the user's
Codex skills directory without changing the source-of-truth files.

## Scope and Delivery Phases

The first implementation plan covers only the governance foundation:

1. Add `standards/v1` documents, schema, tokens, rules, and templates.
2. Add the local checker, report schema, CLI scripts, and focused tests.
3. Add root `AGENTS.md` and the versioned Skill with references.
4. Add CI checks for the portal's own standard files and a sample audit fixture.
5. Add contributor documentation explaining how to audit the two existing SDKs.

Later plans remain independent:

- **Portal surfaces:** bilingual standards docs, compliance badges, report
  ingestion, and SDK comparison views.
- **SDK migration:** bring DocLayoutV3 and LCNet through the checker, then
  align Demo shells, cache controls, timings, examples, npm pages, About, and
  Releases.
- **Workflow product:** design and implement cross-SDK composition only after
  the compatibility trigger in the portal boundary decision is met.

## Acceptance Criteria for the Governance Foundation

The first phase is ready when:

1. A new SDK author can follow one template directory and obtain a valid
   manifest, README pair, Demo checklist, and Release checklist.
2. `pnpm sdk:check -- --repo <path>` runs offline against both existing SDK
   repositories and emits deterministic JSON plus human-readable findings.
3. Required/recommended/Labs rules, report fields, and exit codes are covered
   by tests.
4. Root `AGENTS.md` gives an unambiguous read order and pre/post-check workflow.
5. The Skill is self-contained, references the versioned standard, and passes
   the Skill validator without unfinished scaffolding.
6. UI tokens and semantic Demo states are documented well enough for a React
   reference template and a Vanilla baseline to be implemented in a later
   migration phase.
7. The portal's existing registry and SDK boundary decisions remain intact;
   no single SDK runtime or Demo is duplicated in this phase.

## Risks and Decisions Deferred

- A shared UI package is deferred until real duplication exists across at
  least two migrated SDKs.
- GitHub API scanning is deferred; local paths keep the checker deterministic
  and permission-free. A remote adapter can consume the same report schema.
- Pixel-perfect visual enforcement is deferred; semantic tokens, DOM markers,
  responsive smoke tests, and human review provide the initial UI gate.
- NPU/WebNN, OPFS, PWA packaging, and full streaming remain Labs unless a
  verified runtime and an explicit compatibility matrix are added.
