# Web Model SDK Repository Governance Design

**Date:** 2026-08-23
**Status:** Approved for implementation
**Applies to:** Web Model SDK repositories and the portal repository

## Goal

Extend the v1 standard with repository and Demo deployment governance without
changing either SDK runtime contract or requiring GitHub Pages as the hosting
provider.

## Decisions

- A default-branch Ruleset and a release-tag Ruleset are required for public
  GitHub repositories.
- A reproducible, HTTPS Demo deployment is required, but the hosting provider
  is not prescribed.
- GitHub Pages requirements apply only when the repository uses GitHub Pages.
- Rulesets and Pages settings require dated GitHub API evidence; another host
  may provide equivalent deployment API evidence. The offline `sdk:check`
  command keeps these rules visible but skips them, so an offline pass is
  `locally-compliant`, not fully `compliant`.
- Version 1.1.0 accepts both 1.0.0 and 1.1.0 SDK manifests because repository
  governance adds no runtime manifest fields.

## Boundaries

The normative text lives in `standards/v1`. The local checker does not access
GitHub and no SDK repository or remote setting is inspected or changed as part
of this work. A future authenticated governance checker will consume the same
rule IDs and record repository, rule or environment identifiers, observed
values, and verification time.
