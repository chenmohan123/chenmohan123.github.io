---
name: web-model-sdk-standard
description: Audit, scaffold, migrate, or review browser model SDK repositories against the versioned standards/v1 contract in the portal repository.
---

# Web Model SDK Standard

Use this Skill when a task creates or changes a `web-sdk-*` repository, its
single-model Demo, examples, documentation/release metadata, or the portal's
SDK registry. It is not a general frontend skill and it does not implement
model inference or remote GitHub mutations.

## Required Context

Read `standards/v1/README.md` first, then the contract matching the requested
surface. Use `standards/v1/rules.yaml`, `sdk-manifest.schema.json`,
`ui-tokens.json`, and templates as the source of truth. Classify the work as
one of these layers before editing:

- `scaffold`: start a new SDK from the manifest, bilingual README, Demo, and release templates; read [scaffold.md](references/scaffold.md).
- `audit`: inspect an existing local SDK and explain evidence-backed findings; read [audit.md](references/audit.md).
- `migrate`: fix selected findings in a target SDK after the user has approved scope; read [demo.md](references/demo.md) for Demo changes.
- `portal`: update registry metadata, categories, links, or compliance summaries without copying SDK runtime code; read [portal.md](references/portal.md).

## Workflow

1. Run `pnpm sdk:check -- --repo <path> --format table` before edits.
2. Preserve the report's rule ID, level, status, evidence path, and remediation.
3. Use the smallest template or code change that satisfies the selected scope.
4. Run the checker again and run the target repository's documented tests/build.
5. Report required failures separately from recommended and Labs findings.

The local checker is read-only against target SDK paths. Network checks and
GitHub/npm changes require explicit user scope and are never implied by this
Skill. A portal page links to an independent SDK Demo; it does not duplicate
that Demo's inference implementation.
