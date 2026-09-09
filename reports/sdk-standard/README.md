# SDK Standard Reports

## 最新验收

- [2026-09-09 四个线上 Demo 真实网络验收](2026-09-09-real-network/README.md)：
  ModelScope 与 Hugging Face 共 8 组，包含 GPU 推理、取消重试、缓存复用、
  复现脚本、截图以及 DocLayoutV3 PR #47 的 CI/Pages 记录。

## 标准检查报告

### 历史审计与整改

以下目录保留各次检查时的原始结论。旧报告中的“未整改”“未发布”只描述当时状态，
后续进展见对应交付记录与上方最新验收，不应直接作为当前待办。

- [2026-09-07 发布流程与 GPU 后续检查](2026-09-07-followup/README.md)：早期问题发现及验证边界。
- [2026-09-07 至 09-08 示例与缓存整改](2026-09-07-examples-cache/README.md)：整改前后记录、PR/Pages 交付和浏览器证据。
- [2026-09-08 运行时与耗时整改](2026-09-08-runtime-performance/README.md)：耗时、实际后端和连续媒体整改交付。

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
