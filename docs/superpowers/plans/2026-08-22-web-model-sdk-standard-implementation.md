# Web Model SDK Standard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a versioned Web Model SDK governance foundation to `chenmohan123.github.io`: standards, templates, offline local-repository checks, `AGENTS.md`, and a thin `web-model-sdk-standard` Skill.

**Architecture:** `standards/v1` is the only normative source. A dependency-light Node ESM checker reads that source and scans one or more local SDK repositories without mutating them, emitting deterministic findings and reports. `AGENTS.md` and the Skill route agents to the standard and checker; the existing Astro portal and independent SDK runtimes remain unchanged in this phase.

**Tech Stack:** Markdown, YAML, JSON Schema, Node.js 22 ESM, existing `yaml` and `zod` dependencies, Vitest, pnpm, GitHub Actions.

---

## File Map

**Create standard source and templates:**

- `AGENTS.md` — repository-level routing and pre/post-check contract.
- `standards/v1/README.md` — Chinese-first standard index and reading order.
- `standards/v1/README.en.md` — English equivalent and link to Chinese default.
- `standards/v1/sdk-contract.md` — framework-neutral runtime lifecycle, errors, cancellation, and disposal.
- `standards/v1/demo-contract.md` — single-SDK Demo regions, states, bilingual behavior, cache controls, and smoke markers.
- `standards/v1/portal-contract.md` — portal classification, links, and Workflow boundary.
- `standards/v1/docs-release-contract.md` — README/npm/GitHub/release requirements.
- `standards/v1/examples-contract.md` — Vanilla baseline, React reference, and conditional Vue/CDN/web-view examples.
- `standards/v1/performance-contract.md` — timing fields and cold/warm measurement semantics.
- `standards/v1/ui-tokens.json` — versioned semantic colors, spacing, typography, radii, focus, and state tokens.
- `standards/v1/sdk-manifest.schema.json` — JSON Schema for a repository declaration.
- `standards/v1/rules.yaml` — rule IDs, levels, detector names, and remediation text.
- `standards/v1/templates/sdk-manifest.yaml` — copyable declaration with all required and conditional fields.
- `standards/v1/templates/README.zh-CN.md` — Chinese-first README skeleton with npm/GitHub/Demo links.
- `standards/v1/templates/README.en.md` — English README skeleton linked from the Chinese README.
- `standards/v1/templates/demo-checklist.md` — manual Demo acceptance checklist.
- `standards/v1/templates/release-checklist.md` — npm/GitHub Release/About checklist.

**Create checker and fixtures:**

- `tools/sdk-standard-check/src/types.mjs` — JSDoc-backed report and finding shapes.
- `tools/sdk-standard-check/src/files.mjs` — safe path reads, locale discovery, and repository metadata helpers.
- `tools/sdk-standard-check/src/manifest.mjs` — optional manifest loading and validation against the v1 contract.
- `tools/sdk-standard-check/src/discover.mjs` — evidence discovery for package, docs, Demo, examples, cache/timing markers, workflows, and release metadata.
- `tools/sdk-standard-check/src/check.mjs` — standard loading, repository scan orchestration, and report assembly.
- `tools/sdk-standard-check/src/rules.mjs` — detector implementations keyed by `rules.yaml` detector names.
- `tools/sdk-standard-check/src/report.mjs` — summary calculation and table/JSON/Markdown renderers.
- `tools/sdk-standard-check/cli.mjs` — `--repo`, `--standard`, `--format`, `--out`, and `--network` argument handling with exit codes 0–3.
- `tools/sdk-standard-check/standard-files.test.ts` — source-file and AGENTS routing assertions.
- `tools/sdk-standard-check/checker.test.ts` — unit tests for complete, partial, malformed, and multi-repository scans.
- `tools/sdk-standard-check/fixtures/complete-sdk/package.json` — minimal passing package metadata.
- `tools/sdk-standard-check/fixtures/complete-sdk/sdk-manifest.yaml` — complete manifest fixture.
- `tools/sdk-standard-check/fixtures/complete-sdk/README.md` and `README.en.md` — bilingual link evidence.
- `tools/sdk-standard-check/fixtures/complete-sdk/docs/zh-CN/quick-start.md` and `docs/en/quick-start.md` — docs evidence.
- `tools/sdk-standard-check/fixtures/complete-sdk/apps/demo/index.html` — semantic Demo markers and Chinese default.
- `tools/sdk-standard-check/fixtures/complete-sdk/examples/vanilla/README.md` and `examples/react/README.md` — baseline example evidence.
- `tools/sdk-standard-check/fixtures/complete-sdk/.github/workflows/release.yml` — release workflow evidence.
- `tools/sdk-standard-check/fixtures/complete-sdk/CHANGELOG.md` — changelog evidence.
- `tools/sdk-standard-check/fixtures/partial-sdk/package.json` — intentionally incomplete metadata.
- `tools/sdk-standard-check/fixtures/partial-sdk/README.md` — intentionally missing English/docs links.
- `tools/sdk-standard-check/fixtures/partial-sdk/apps/demo/index.html` — intentionally missing cache and timing markers.
- `tools/sdk-standard-check/fixtures/partial-sdk/check.expected.json` — stable expected required findings.

**Create Skill:**

- `skills/web-model-sdk-standard/SKILL.md` — narrow governance workflow entry point.
- `skills/web-model-sdk-standard/agents/openai.yaml` — UI metadata generated by the Skill initializer.
- `skills/web-model-sdk-standard/references/audit.md` — evidence-first audit flow.
- `skills/web-model-sdk-standard/references/scaffold.md` — new SDK template flow.
- `skills/web-model-sdk-standard/references/demo.md` — Demo migration flow.
- `skills/web-model-sdk-standard/references/portal.md` — portal registry and Workflow boundary flow.

**Modify existing files:**

- `package.json` — add `sdk:check` and `sdk:check:test` scripts.
- `.github/workflows/ci.yml` — run checker unit tests and the complete fixture audit.
- `docs/superpowers/README.md` — add the accepted standard design to the reading order.
- `reports/sdk-standard/README.md` — explain generated report storage and portal consumption.

---

### Task 1: Add Versioned Standard Source and Templates

**Files:** all files under `standards/v1/` listed above.

- [ ] **Step 1: Write the standard-source contract test**

Create `tools/sdk-standard-check/standard-files.test.ts` with:

```ts
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const requiredFiles = [
  "standards/v1/README.md",
  "standards/v1/README.en.md",
  "standards/v1/sdk-contract.md",
  "standards/v1/demo-contract.md",
  "standards/v1/portal-contract.md",
  "standards/v1/docs-release-contract.md",
  "standards/v1/examples-contract.md",
  "standards/v1/performance-contract.md",
  "standards/v1/ui-tokens.json",
  "standards/v1/sdk-manifest.schema.json",
  "standards/v1/rules.yaml",
  "standards/v1/templates/sdk-manifest.yaml",
  "standards/v1/templates/README.zh-CN.md",
  "standards/v1/templates/README.en.md",
  "standards/v1/templates/demo-checklist.md",
  "standards/v1/templates/release-checklist.md",
];

describe("v1 standard source", () => {
  it("contains every required artifact", () => {
    for (const file of requiredFiles) expect(existsSync(file), file).toBe(true);
  });

  it("declares the same version in rules and schema", () => {
    const rules = readFileSync("standards/v1/rules.yaml", "utf8");
    const schema = JSON.parse(readFileSync("standards/v1/sdk-manifest.schema.json", "utf8"));
    expect(rules).toContain('standardVersion: "1.0.0"');
    expect(schema.$id).toContain("web-model-sdk-standard/v1");
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run `pnpm test -- tools/sdk-standard-check/standard-files.test.ts`.
Expected: FAIL because `standards/v1` has not been created.

- [ ] **Step 3: Create the normative Markdown documents**

Each document must include the concrete required/recommended/Labs vocabulary
and link to its sibling documents. `README.md` is Chinese-first and must link
to `README.en.md`; the English file links back. The documents must cover the
runtime lifecycle, fixed Demo semantic regions, portal versus SDK versus
Workflow ownership, Chinese-default docs and releases, example conditions,
and the timing field list from the accepted design. Do not add a second
normative rule list outside `rules.yaml`.

- [ ] **Step 4: Add the machine-readable UI tokens**

Write `standards/v1/ui-tokens.json` with `$schema`, `version: "1.0.0"`, and
the following token groups: `color.page`, `color.panel`, `color.text`,
`color.border`, `color.action`, `color.success`, `color.warning`,
`color.error`, `color.experimental`; `space.1` through `space.6` using a
4px base; `radius.sm: "4px"`, `radius.md: "8px"`; and `focus.ring`.
Include state labels for `idle`, `downloading`, `loading`, `ready`, `running`,
`success`, `error`, and `unsupported`.

- [ ] **Step 5: Add the JSON Schema, rules, and templates**

The schema must validate `schemaVersion`, identity, package, demo links,
runtime backends, model assets/checksums, timing field names, examples,
documentation locales, and verification environments. `rules.yaml` must define
at least one detector for each prefix used in the design and mark rules as
`required`, `recommended`, or `labs`.

The manifest template must contain valid example values for a document model,
including `package`, `repository`, `demo`, `docs`, `runtime`, `model`,
`performance`, `cache`, `examples`, and `verification`. Checklist templates
must use checkboxes and concrete evidence paths.

- [ ] **Step 6: Re-run the test and commit the standard source**

Run `pnpm test -- tools/sdk-standard-check/standard-files.test.ts`.
Expected: PASS with 2 tests. Commit with:
`git add standards tools/sdk-standard-check/standard-files.test.ts && git commit -m "feat: add v1 sdk standard source"`.

### Task 2: Build Repository Discovery and Manifest Validation

**Files:** `tools/sdk-standard-check/src/types.mjs`, `files.mjs`,
`manifest.mjs`, `discover.mjs`, `tools/sdk-standard-check/checker.test.ts`.

- [ ] **Step 1: Write failing discovery tests**

Add tests that call `scanRepository` with the complete and partial fixtures
and assert that package name, README locales, Demo markers, examples, release
workflow, and manifest fields are detected. Add a malformed manifest test that
returns a `CONFIG_INVALID` finding without throwing.

```ts
it("discovers evidence from a complete local SDK", async () => {
  const report = await scanRepository("tools/sdk-standard-check/fixtures/complete-sdk");
  expect(report.evidence.packageName).toBe("web-sdk-fixture");
  expect(report.evidence.locales).toEqual(expect.arrayContaining(["zh-CN", "en"]));
  expect(report.findings.some((item) => item.id === "DOC-001" && item.status === "pass")).toBe(true);
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run `pnpm test -- tools/sdk-standard-check/checker.test.ts`.
Expected: FAIL because `scanRepository` and the fixtures do not exist.

- [ ] **Step 3: Implement safe file and repository helpers**

Implement `readTextIfExists`, `readJsonIfExists`, `listFiles`, locale
discovery under `docs/`, root README discovery, package parsing, and git remote
parsing from `.git/config`. Ignore `node_modules`, build output, caches, and
`.git/objects`. Return evidence paths relative to the scanned repository.

- [ ] **Step 4: Implement manifest parsing**

Load `sdk-manifest.yaml` when present, parse with the existing `yaml` package,
validate required fields with `zod`, and return structured errors. Manifest
validation must check semver, URLs, SHA-256 length/hex, backend enum values,
timing field names, and example surface enum values. Missing manifests are
reported as inferred evidence rather than a process error.

- [ ] **Step 5: Implement evidence discovery**

`discover.mjs` must detect: npm package metadata and scripts; bilingual
README/docs; Demo entry and stable semantic markers; cache cleanup and timing
terms; model metadata fields; `examples/vanilla`, `examples/react`, and
conditional example directories; CI/release workflows; `CHANGELOG.md`; and
homepage/demo/repository links. Every evidence item stores a relative path and
the matched key or text fragment.

- [ ] **Step 6: Re-run discovery tests and commit**

Run `pnpm test -- tools/sdk-standard-check/checker.test.ts`.
Expected: PASS for complete, partial, and malformed fixtures. Commit with:
`git add tools/sdk-standard-check/src tools/sdk-standard-check/checker.test.ts && git commit -m "feat: add sdk repository discovery"`.

### Task 3: Implement Rules, Reports, and CLI Exit Codes

**Files:** `tools/sdk-standard-check/src/rules.mjs`, `report.mjs`,
`tools/sdk-standard-check/cli.mjs`, `tools/sdk-standard-check/checker.test.ts`.

- [ ] **Step 1: Add failing rule and renderer assertions**

Assert that the complete fixture has no required failures, the partial fixture
contains stable IDs `DOC-001`, `DEMO-004`, and `RELEASE-002`, and a multi-repo
scan renders one summary per repository. Assert JSON parses and Markdown
contains the repository name, status, finding ID, evidence path, and
remediation.

- [ ] **Step 2: Implement rule evaluation**

Load `rules.yaml`, map each detector name to a function, and create findings
with `{ id, level, status, path, message, remediation }`. Required failures
set summary status to `partial`; a report with zero required failures is
`compliant` even when recommended or Labs findings exist. Do not fail a
conditional example rule when the manifest explicitly declares the surface
unsupported.

- [ ] **Step 3: Implement deterministic renderers**

`report.mjs` must expose `summarize`, `renderTable`, `renderJson`, and
`renderMarkdown`. Sort repositories by path and findings by rule ID so output
is stable across machines. JSON output is the canonical artifact; table and
Markdown are presentation formats of the same object.

- [ ] **Step 4: Implement the CLI**

Parse repeated `--repo` arguments, `--standard` (default `v1`), `--format`
(`table|json|markdown`, default `table`), `--out`, and `--network`. Resolve
standard files relative to the portal repository, reject missing paths with
exit code 2, write `--out` atomically, and return exit code 1 only for required
failures. Network checks remain opt-in and are skipped by default.

- [ ] **Step 5: Verify the CLI behavior**

Run:

```powershell
pnpm sdk:check -- --repo tools/sdk-standard-check/fixtures/complete-sdk --format table
pnpm sdk:check -- --repo tools/sdk-standard-check/fixtures/partial-sdk --format json --out $env:TEMP\sdk-partial.json
```

Expected: the first command exits 0 and prints `compliant`; the second exits 1,
writes valid JSON, and contains the three expected finding IDs. Commit with:
`git add tools/sdk-standard-check/src tools/sdk-standard-check/cli.mjs tools/sdk-standard-check/checker.test.ts && git commit -m "feat: add sdk standard checker cli"`.

### Task 4: Add Fixtures, Package Scripts, and CI Gates

**Files:** fixture files listed in the File Map, `package.json`,
`.github/workflows/ci.yml`.

- [ ] **Step 1: Create the complete and partial fixtures**

The complete fixture must contain only small text files and a valid manifest;
its Demo HTML includes `lang="zh-CN"`, a language toggle, `data-sdk-cache-clear`,
`data-sdk-timing`, `data-sdk-model-info`, `data-sdk-runtime-info`, and an
`idle` state. The partial fixture intentionally omits the English docs, cache
clear marker, release workflow, and timing marker. Keep expected findings in
`check.expected.json` so tests do not depend on prose ordering.

- [ ] **Step 2: Add root scripts**

Modify `package.json` scripts to include:

```json
"sdk:check": "node tools/sdk-standard-check/cli.mjs",
"sdk:check:test": "vitest run tools/sdk-standard-check"
```

- [ ] **Step 3: Add CI commands**

After dependency installation, run `pnpm sdk:check:test` and then
`pnpm sdk:check -- --repo tools/sdk-standard-check/fixtures/complete-sdk --format table`.
Keep the existing portal unit, build, and e2e commands unchanged.

- [ ] **Step 4: Run the repository checks and commit**

Run `pnpm sdk:check:test`, `pnpm test`, and `pnpm check`.
Expected: checker tests, existing Vitest suites, and Astro type checks pass.
Commit with:
`git add tools/sdk-standard-check/fixtures package.json .github/workflows/ci.yml && git commit -m "ci: gate portal with sdk standard checker"`.

### Task 5: Add AGENTS.md and Contributor Routing

**Files:** `AGENTS.md`, `docs/superpowers/README.md`.

- [ ] **Step 1: Write the routing contract test**

Extend `tools/sdk-standard-check/standard-files.test.ts` to assert that
`AGENTS.md` contains the standard read path, the pre/post checker commands,
the three-layer boundary terms, and the rule that portal code must not copy a
single SDK runtime.

- [ ] **Step 2: Create `AGENTS.md`**

Write a concise document with sections `Scope`, `Read Order`, `Layer
Classification`, `Required Workflow`, `Editing Rules`, and `Verification`.
The required workflow is: read `standards/v1/README.md`; classify the change;
run `pnpm sdk:check -- --repo <path>` before edits; use a template or update
the schema/rules first for new requirements; rerun the checker and the relevant
portal checks after edits; preserve evidence in reports.

- [ ] **Step 3: Update planning documentation**

Add the new accepted standard design and this implementation plan to the
reading order in `docs/superpowers/README.md`, keeping the existing portal
boundary decision authoritative for cross-layer changes.

- [ ] **Step 4: Run the routing test and commit**

Run `pnpm test -- tools/sdk-standard-check/standard-files.test.ts`.
Expected: all standard-source and AGENTS assertions pass. Commit with:
`git add AGENTS.md docs/superpowers/README.md tools/sdk-standard-check/standard-files.test.ts && git commit -m "docs: route agents through sdk standard"`.

### Task 6: Create and Validate the `web-model-sdk-standard` Skill

**Files:** `skills/web-model-sdk-standard/SKILL.md`,
`skills/web-model-sdk-standard/agents/openai.yaml`, and four reference files.

- [ ] **Step 1: Initialize the Skill directory**

Run the bundled initializer with the repository-local destination:

```powershell
python C:\Users\chenm\.codex\plugins\cache\openai-api-curated\superpowers\11c74d6b\skills\skill-creator\scripts\init_skill.py web-model-sdk-standard --path skills --resources references
```

Replace generated scaffold text using `apply_patch`; retain the generated
`agents/openai.yaml` structure and set its display name to `Web Model SDK
Standard` and its default prompt to `Audit or scaffold a browser model SDK using this repository's v1 standard.`

- [ ] **Step 2: Write the Skill entry point**

`SKILL.md` must state the trigger (creating, auditing, migrating, or reviewing
a browser model SDK tied to this portal), require reading `standards/v1`, route
to one of `scaffold`, `audit`, `migrate`, or `portal`, and require the local
checker before and after mutations. It must explicitly say that it does not
modify remote GitHub state or duplicate model inference in the portal.

- [ ] **Step 3: Write focused references**

`audit.md` defines evidence collection and report review; `scaffold.md`
defines template copying and initial manifest validation; `demo.md` defines
the shared semantic regions, bilingual default, timing/model/runtime panels,
and cache cleanup; `portal.md` defines registry links, categories, reports,
and the Workflow trigger. Each reference links back to the exact
`standards/v1` file it uses.

- [ ] **Step 4: Validate the Skill**

Run:

```powershell
python C:\Users\chenm\.codex\plugins\cache\openai-api-curated\superpowers\11c74d6b\skills\skill-creator\scripts\quick_validate.py skills/web-model-sdk-standard
pnpm test -- tools/sdk-standard-check/standard-files.test.ts
```

Expected: the Skill validator reports no frontmatter or unfinished-scaffold
errors, and the repository test confirms every referenced file exists. Commit
with:
`git add skills tools/sdk-standard-check/standard-files.test.ts && git commit -m "feat: add sdk standard governance skill"`.

### Task 7: Add Audit Usage Documentation and Sample Reports

**Files:** `standards/v1/README.md`, `standards/v1/README.en.md`,
`reports/sdk-standard/README.md`, and `docs/superpowers/README.md`.

- [ ] **Step 1: Document the local audit workflow**

Add copyable commands for auditing both sibling SDK paths, interpreting exit
codes, selecting table/JSON/Markdown output, and distinguishing required,
recommended, and Labs findings. State that reports are evidence snapshots and
must include standard version and scan date.

- [ ] **Step 2: Document report handling**

Create `reports/sdk-standard/README.md` explaining that generated reports are
optional portal inputs, should be named by stable SDK ID, and must not contain
secrets or uploaded user data. Include the exact JSON fields consumed by a
future portal compliance badge.

- [ ] **Step 3: Run docs checks and commit**

Run `pnpm test -- tools/sdk-standard-check` and `pnpm check`.
Expected: all checker tests and Astro checks pass. Commit with:
`git add standards/v1/README.md standards/v1/README.en.md reports/sdk-standard/README.md docs/superpowers/README.md && git commit -m "docs: explain sdk standard audits"`.

### Task 8: Full Verification and Handoff

**Files:** no additional implementation files; modify only the file that a
failed verification identifies.

- [ ] **Step 1: Run focused checker verification**

```powershell
pnpm sdk:check:test
pnpm sdk:check -- --repo tools/sdk-standard-check/fixtures/complete-sdk --format table
pnpm sdk:check -- --repo tools/sdk-standard-check/fixtures/partial-sdk --format json --out $env:TEMP\sdk-partial.json
```

Expected: tests pass; complete fixture exits 0; partial fixture exits 1 and
the JSON contains `DOC-001`, `DEMO-004`, and `RELEASE-002`.

- [ ] **Step 2: Run the existing portal gates**

```powershell
pnpm test
pnpm check
pnpm build
pnpm test:e2e
```

Expected: existing registry, Astro build, and Playwright suites pass without
changes to portal runtime behavior.

- [ ] **Step 3: Review the final diff and repository state**

Run `git diff --check`, `git status --short`, and
`git log --oneline --decorate -10`. Confirm that only intended governance
files are committed and that generated `.superpowers/` visual-session files
remain untracked or ignored.

- [ ] **Step 4: Commit any verification-only fixes**

Use a focused commit message such as `fix: correct sdk standard rule evidence`
and rerun the affected command before reporting the result.

## Plan Self-Review

- Standard requirements map to Task 1 and are validated by the source contract
  test.
- Offline scanning, findings, deterministic reports, CLI flags, and exit codes
  map to Tasks 2 and 3.
- CI enforcement and reproducible fixtures map to Task 4.
- Agent routing and the Skill map to Tasks 5 and 6.
- Audit documentation and report consumption map to Task 7.
- Existing portal behavior and all final verification commands map to Task 8.
- No task depends on a remote GitHub mutation, a new UI framework, or a
  cross-SDK Workflow implementation.
