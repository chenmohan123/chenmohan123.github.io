# Release Checklist

- [ ] Chinese README is the default and links to equivalent English README/docs.
- [ ] npm package name/version, GitHub repository, and live Demo links work.
- [ ] `pnpm verify` (or documented equivalent) passes.
- [ ] CI workflow runs tests, typecheck, lint, build, and model/checksum validation.
- [ ] The active default-branch Ruleset requires pull requests, current CI checks, resolved conversations, and blocks deletion and force pushes.
- [ ] The active release-tag Ruleset prevents matching published tags from being updated or deleted.
- [ ] Ruleset bypass actors are absent or have a documented least-privilege reason.
- [ ] GitHub About description, Homepage/Demo URL, and topics are configured.
- [ ] Changelog contains the release entry.
- [ ] GitHub Release uses an existing immutable tag and states model source, license, assets, backends, and limitations.
- [ ] Model assets use versioned immutable URLs and SHA-256 checksums.
- [ ] Compatibility entries include browser, OS, device, backend, runtime, and test date.
- [ ] The live Demo is deployed over HTTPS from protected source by a reproducible workflow with a commit-linked deployment record.
- [ ] If GitHub Pages is used, Source is GitHub Actions and the deployment uses the `github-pages` environment, scoped Pages permissions, HTTPS, and concurrency control.
- [ ] GitHub API governance evidence records the repository, Ruleset/environment identifiers, observed values, and verification time without credentials.
- [ ] `pnpm sdk:check -- --repo . --format table` has no required failures.
