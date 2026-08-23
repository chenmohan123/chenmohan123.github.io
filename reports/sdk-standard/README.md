# SDK Standard Reports

This directory may contain generated evidence snapshots from the local SDK
checker. Reports are optional portal inputs; they are not the normative source
of rules. Name a report by the stable SDK ID, for example
`pp-doclayoutv3.json`.

Generate JSON, Markdown, or table output with:

```powershell
pnpm sdk:check -- --repo ..\web-sdk-PP-DocLayoutV3 --format json --out reports\sdk-standard\pp-doclayoutv3.json
```

The JSON artifact includes `standardVersion`, `repository`, `summary`, and
`findings`. Each finding preserves `id`, `level`, `status`, `path`, `message`,
and `remediation`; a future portal badge can consume `summary.status` and the
required pass/fail/skip/unknown counts without parsing prose.
`locally-compliant` means the offline checks passed while remote governance
rules remain skipped or unknown; only dated remote evidence can support a
`compliant` badge.

Reports must include a scan date when committed by a CI job, contain no user
files, secrets, access tokens, or uploaded model inputs, and be regenerated when
the standard version or target SDK changes.
