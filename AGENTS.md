# Web Model SDK Governance

## Scope

This portal is the control plane for the versioned Web Model SDK standard.
Read `standards/v1/README.md` before any task involving a single SDK, Demo,
portal, Workflow, examples, UI, release, or audit.

## Layer Classification

Classify changes as single SDK, portal, or Workflow before editing. A single
SDK owns its runtime and current-model Demo. The portal indexes, categorizes,
compares, and links independent SDKs. Workflow work connects multiple SDKs
only after compatible contracts and a real use case are documented. Portal
code must not copy a single SDK runtime.

## Required Workflow

Run `pnpm sdk:check -- --repo <path>` before and after changing an SDK. Use
templates for new manifests, README files, Demo checklists, and release notes.
If a new requirement is needed, update `standards/v1/rules.yaml`, the schema,
or the UI tokens before changing product code. Keep evidence paths and
remediation in reports.

## Verification

Run the checker plus the relevant package tests, portal checks, build, and
browser smoke tests. Do not claim compatibility beyond dated verification
evidence. Preserve unrelated user changes and do not perform remote GitHub
mutations without explicit scope.
