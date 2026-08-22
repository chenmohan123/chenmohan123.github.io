# Scaffold Workflow

Copy `standards/v1/templates/sdk-manifest.yaml`, `README.zh-CN.md`,
`README.en.md`, `demo-checklist.md`, and `release-checklist.md` into the new SDK
repository. Rename the manifest to `sdk-manifest.yaml`, replace example URLs,
assets, checksums, runtime backends, and verification environments, then add a
Vanilla baseline and React reference example. Keep the runtime framework-neutral.

Run the portal checker against the new local path before opening a release PR.
Do not publish npm or create a GitHub Release as part of scaffolding unless the
user explicitly requests that external operation.
