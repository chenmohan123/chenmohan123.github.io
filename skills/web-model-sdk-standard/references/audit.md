# Audit Workflow

Read `standards/v1/README.md` and run the checker against a local path:

```powershell
pnpm sdk:check -- --repo <sdk-path> --format json --out reports/sdk-standard/<sdk-id>.json
```

Group findings by required, recommended, and Labs. For each finding inspect the
evidence path before deciding whether the detector is false-positive, the SDK
needs a migration, or the manifest should explicitly declare a surface
unsupported. Never turn inferred evidence into a compatibility claim without a
dated verification record. Re-run the checker after any approved change.
