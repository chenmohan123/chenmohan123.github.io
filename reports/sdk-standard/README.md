# SDK Standard Reports

## 最新验收

- [2026-09-09 四个线上 Demo 真实网络验收](2026-09-09-real-network/README.md)：
  ModelScope 与 Hugging Face 共 8 组，包含 GPU 推理、取消重试、缓存复用、
  复现脚本、截图以及 DocLayoutV3 PR #47 的 CI/Pages 记录。

## 标准检查报告

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
