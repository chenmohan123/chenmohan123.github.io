# Release Checklist

- [ ] Chinese README is the default and links to equivalent English README/docs.
- [ ] npm package name/version, GitHub repository, and live Demo links work.
- [ ] `pnpm verify` (or documented equivalent) passes.
- [ ] CI workflow runs tests, typecheck, lint, build, and model/checksum validation.
- [ ] GitHub About description, Homepage/Demo URL, and topics are configured.
- [ ] Changelog contains the release entry.
- [ ] GitHub Release uses an existing immutable tag and states model source, license, assets, backends, and limitations.
- [ ] Model assets use versioned immutable URLs and SHA-256 checksums.
- [ ] Compatibility entries include browser, OS, device, backend, runtime, and test date.
- [ ] `pnpm sdk:check -- --repo . --format table` has no required failures.
