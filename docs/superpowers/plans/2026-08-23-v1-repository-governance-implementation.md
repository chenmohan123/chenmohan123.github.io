# Web Model SDK Repository Governance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Rulesets and provider-neutral Demo deployment governance to standard v1 without auditing or changing SDK repositories.

**Architecture:** A new normative contract defines GitHub repository settings and conditional GitHub Pages requirements. Machine-readable rules carry a remote API verification method; the offline checker reports those rules as skipped and distinguishes local from full compliance.

**Tech Stack:** Markdown, YAML, JSON Schema, Node.js, Vitest

---

### Task 1: Contract And Rules

**Files:**
- Create: `standards/v1/repository-governance-contract.md`
- Modify: `standards/v1/README.md`
- Modify: `standards/v1/README.en.md`
- Modify: `standards/v1/docs-release-contract.md`
- Modify: `standards/v1/rules.yaml`
- Modify: `standards/v1/templates/release-checklist.md`

- [ ] Add source tests for the contract, v1.1 version, rule IDs, and verification method.
- [ ] Run the focused test and confirm it fails because the contract and rules are absent.
- [ ] Add the normative contract and four machine-readable rules.
- [ ] Link the contract from both standard entry points and the release contract.
- [ ] Add concrete Rulesets and deployment evidence to the release checklist.

### Task 2: Version Compatibility And Offline Semantics

**Files:**
- Modify: `standards/v1/sdk-manifest.schema.json`
- Modify: `standards/v1/templates/sdk-manifest.yaml`
- Modify: `tools/sdk-standard-check/src/manifest.mjs`
- Modify: `tools/sdk-standard-check/src/rules.mjs`
- Modify: `tools/sdk-standard-check/src/check.mjs`
- Modify: `tools/sdk-standard-check/src/report.mjs`
- Modify: `tools/sdk-standard-check/checker.test.ts`

- [ ] Add failing tests for 1.0/1.1 manifest compatibility, skipped remote rules, and local compliance status.
- [ ] Accept both manifest versions and report standard version 1.1.0.
- [ ] Skip `github-api` rules in offline scans with an explicit explanation.
- [ ] Count skipped required rules and return `locally-compliant` until remote evidence exists.

### Task 3: Verification

**Files:** no additional files unless verification identifies a defect.

- [ ] Run `pnpm sdk:check:test`.
- [ ] Run `pnpm test`.
- [ ] Run `pnpm check` and `pnpm build`.
- [ ] Run `git diff --check` and inspect the final diff for SDK or remote changes.
