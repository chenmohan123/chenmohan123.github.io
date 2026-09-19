# Scaffold Workflow

Copy `standards/v1/templates/sdk-manifest.yaml`, `README.zh-CN.md`,
`README.en.md`, `demo-checklist.md`, and `release-checklist.md` into the new SDK
repository. Rename the manifest to `sdk-manifest.yaml`, replace example URLs,
assets, checksums, runtime backends, and verification environments, then add a
Vanilla baseline and React reference example. Keep the runtime framework-neutral.

Run the portal checker against the new local path before opening a release PR.
Do not publish npm or create a GitHub Release as part of scaffolding unless the
user explicitly requests that external operation.

## 纯算法脚手架

纯算法选择 `standards/v1/templates/sdk-manifest.algorithm.yaml`，复制为
`sdk-manifest.yaml`；模型继续使用原模型模板。按标准 1.2.0 填写 algorithm
的来源、许可、输入输出和 stateful，删除模型下载/缓存 UI 的假设。
沿用双语 README 和公共 checklist，其中模型专属项不适用；算法专属项必须
验证。状态生命周期、复位、Demo 标记和计时语义均以 standards/v1 契约为准。
运行本地检查器，保留所有不适用项的 skip 理由与清单证据；无效清单不能
获得算法豁免。仅声明实际已实现的执行模式，不预先添加 Worker 空实现。
