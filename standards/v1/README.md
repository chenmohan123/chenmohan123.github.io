# Web Model SDK Standard v1

中文是默认入口；[English](README.en.md) 提供等价英文说明。本文是所有
SDK、Demo、门户和 Workflow 任务的阅读入口，规范版本为 `1.0.0`。

## 阅读顺序

1. [SDK runtime 契约](sdk-contract.md)
2. [单 SDK Demo 契约](demo-contract.md)
3. [门户与 Workflow 边界](portal-contract.md)
4. [文档与发布](docs-release-contract.md)
5. [Examples](examples-contract.md)
6. [性能与耗时](performance-contract.md)
7. [规则清单](rules.yaml)、[manifest schema](sdk-manifest.schema.json) 和
   [UI tokens](ui-tokens.json)

## 分层原则

- 单 SDK 仓库负责当前模型的 runtime、npm 包、独立 Demo、文档、示例、
  基准和 GitHub Release。
- `chenmohan123.github.io` 负责目录、分类、比较、SDK 介绍页以及组合技和
  Workflow 的入口；单 SDK 介绍页跳转到对应仓库、npm 和 Demo。
- 多 SDK 编排只有在至少两个 SDK 有兼容的输入输出契约并存在明确用例后
  才实现；必要时可以拆成独立 Workflow 网站。

统一的是语义、状态、数据字段和视觉令牌，不是每个页面的像素级复制。
单 SDK Demo 是当前模型的工作台，门户是目录/检视器。

## 合规等级

- `required`：新 SDK 发布前必须通过。
- `recommended`：改进项，不阻塞首次发布。
- `labs`：实验能力，必须显示证据和限制，不能写成稳定兼容承诺。

## 本地检查

检查器只读扫描一个或多个本地 SDK，不要求 GitHub token 或网络：

```powershell
pnpm sdk:check -- --repo ..\web-sdk-PP-DocLayoutV3 --format table
pnpm sdk:check -- --repo ..\web-sdk-PP-LCNet_x1_0_doc_ori\.worktrees\implementation --format json --out reports\sdk-standard\lcnet.json
```

退出码：`0` 表示没有 required 失败，`1` 表示存在 required 失败，`2`
表示输入或配置无效，`3` 表示检查器异常。报告必须保留规则 ID、级别、
状态、证据路径和修复建议。

## 新建与迁移

从 [templates/sdk-manifest.yaml](templates/sdk-manifest.yaml)、双语 README
和两个 checklist 开始。React 是完整参考实现，Vanilla TypeScript 是
CDN/H5/web-view 的兼容基线；SDK runtime 不得依赖 UI 框架。Vue、CDN 和
微信示例按 manifest 声明的目标适配。

新增规则时先修改 `rules.yaml`、schema 或 token，再修改业务代码。旧 SDK
没有 manifest 时检查器可以推断证据，但会明确标记“声明缺失/证据推断”。
