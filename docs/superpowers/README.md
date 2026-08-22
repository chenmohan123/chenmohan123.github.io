# Project Planning Source Of Truth

This directory keeps the planning and architecture documents that govern the
`chenmohan123.github.io` portal.

## Reading Order

1. `specs/2026-08-17-portal-and-sdk-boundaries.md` is the accepted decision for
   ownership boundaries and MVP scope.
2. `specs/2026-08-17-web-model-sdk-portal-design.md` is the broader architecture
   and runtime/Labs design.
3. `plans/2026-08-17-web-model-sdk-portal-mvp.md` is the implementation plan and
   historical task breakdown.
4. `plans/2026-08-17-web-model-sdk-portal-roadmap.md` is the accepted sequence
   for onboarding, CI, Labs, and future Workflow work.
5. `specs/2026-08-22-web-model-sdk-standard-design.md` defines the accepted
   governance foundation, UI semantics, checker, AGENTS, and Skill boundaries.
6. `plans/2026-08-22-web-model-sdk-standard-implementation.md` is the
   implementation plan for that foundation.

When these documents appear to conflict, the boundary decision is authoritative
for portal versus SDK ownership. Update the decision and design documents before
implementing a change that crosses the stated MVP boundary.

## Repository Boundary

The portal indexes and documents independent SDK repositories. It does not
duplicate their single-model runtime or standalone demos. Workflow/Playground
implementation begins only after multiple SDKs are ready for composition and a
separate workflow design has been accepted.
