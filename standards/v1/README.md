# Web Model SDK Standard v1

中文是默认入口；[English](README.en.md) 提供等价英文说明。本文是所有
SDK、Demo、门户和 Workflow 任务的阅读入口，规范版本为 `1.2.0`，
仍兼容 `1.0.0` / `1.1.0` 模型 SDK manifest；模型清单可以通过可选的 `variants` 和 `sources`
声明同一模型的精度、量化、后端和分发来源。

## 阅读顺序

1. [SDK runtime 契约](sdk-contract.md)
2. [单 SDK Demo 契约](demo-contract.md)
3. [门户与 Workflow 边界](portal-contract.md)
4. [文档与发布](docs-release-contract.md)
5. [仓库治理与部署](repository-governance-contract.md)
6. [Examples](examples-contract.md)
7. [性能与耗时](performance-contract.md)
8. [规则清单](rules.yaml)、[manifest schema](sdk-manifest.schema.json) 和
   [UI tokens](ui-tokens.json)

## 分层原则

- 单 SDK 仓库负责当前模型或算法的 runtime、npm 包、独立 Demo、文档、示例、
  基准和 GitHub Release。
- `chenmohan123.github.io` 负责目录、分类、比较、SDK 介绍页以及组合技和
  Workflow 的入口；单 SDK 介绍页跳转到对应仓库、npm 和 Demo。
- 多 SDK 编排只有在至少两个 SDK 有兼容的输入输出契约并存在明确用例后
  才实现；必要时可以拆成独立 Workflow 网站。

统一的是语义、状态、数据字段和视觉令牌，不是每个页面的像素级复制。
单 SDK Demo 是当前模型或算法的工作台，门户是目录/检视器。

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

清单使用所选标准目录内的完整 JSON Schema 校验，包括嵌套类型、枚举、
日期/URI 格式与未知字段。无效清单以 `CONFIG-001` 标出 JSON Pointer
字段路径，CLI 返回 `1`，并继续扫描其他仓库；不会因数组等字段类型
损坏而中断。标准自身的 schema 缺失或损坏属于检查器异常，返回 `3`。

Schema 通过只表示声明结构有效；本地规则只静态检查声明和文件证据，
不能证明模型下载、实际推理、浏览器兼容性或线上部署通过。相应结论
仍需附带有日期的运行验证和远程证据。

审计两个现有 SDK 时可使用：

```powershell
pnpm sdk:check -- --repo ..\web-sdk-PP-DocLayoutV3 --format markdown --out reports\sdk-standard\pp-doclayoutv3.md
pnpm sdk:check -- --repo ..\web-sdk-PP-LCNet_x1_0_doc_ori\.worktrees\implementation --format json --out reports\sdk-standard\pp-lcnet.json
```

`required` 失败会阻止合规状态；`recommended` 只表示改进项；`labs` 必须
有证据和限制。报告是带标准版本和扫描日期的证据快照，不包含用户文件或
密钥。

Rulesets、部署和 GitHub Pages 是远程状态，本地检查器只会将对应规则标为
`skip`。没有本地 required 失败表示 `locally-compliant`；只有通过只读
GitHub API 或托管商 API 核验所有适用的远程 required 规则后，才能称为 `compliant`。
GitHub Pages 不是强制托管商；选择 GitHub Pages 时才适用 `PAGES-001`。

## 新建与迁移

从 [templates/sdk-manifest.yaml](templates/sdk-manifest.yaml)、双语 README
和两个 checklist 开始。React 是完整参考实现，Vanilla TypeScript 是
CDN/H5/web-view 的兼容基线；SDK runtime 不得依赖 UI 框架。Vue、CDN 和
微信示例按 manifest 声明的目标适配。

新增规则时先修改 `rules.yaml`、schema 或 token，再修改业务代码。旧 SDK
没有 manifest 时检查器可以推断证据，但会明确标记“声明缺失/证据推断”。

### 模型变体与来源

`model.assets` 是旧版兼容字段，仍然必填。新 SDK 可额外声明
`model.defaultVariant`、`model.defaultSource` 和 `model.variants[]`。每个变体
固定声明 `id`、`precision`、`quantization`、ONNX `opset`、文件 `bytes`、
`parameterCount`、支持的 `backends`（`wasm`/`webgpu`）以及 `sources[]`。

来源必须声明 `kind`（`git-lfs`、`huggingface`、`modelscope` 或 `custom`）、
40 至 64 位十六进制不可变 `revision`、仓库和路径、含主机的 HTTP(S) `downloadUrl`、正整数 `bytes` 及
64 位十六进制 `sha256`。显式选择的来源失败时不得静默换源；只有 `auto`
策略可以按清单尝试。Git LFS pointer 文件不是浏览器可用的模型本体。

### 纯算法 SDK

仅 `1.2.0` 可声明 `kind: algorithm`。缺省 kind 或 `kind: model`
沿用模型规则，旧版不得通过算法 kind 绕过模型要求。算法与模型分支互斥：
算法必须声明 `algorithm`，禁止 `model` 和 `cache`；模型禁止 `algorithm`。
`algorithm` 必填 id、version、family、source、license、input、output（非空字符串）
及 stateful（布尔值）。input/output 描述输入输出契约或指向完整 API 文档；
source 记录论文、代码来源和实现差异，许可义务须独立核对。

算法使用 [算法清单模板](templates/sdk-manifest.algorithm.yaml) 和公共 checklist。
runtime 继续报告实际后端和执行模式，只声明已经实现的模式。
算法耗时为 validationMs、predictionMs、associationMs、updateMs、totalMs；
cold 指新实例，warm 指复用实例状态，不伪造模型下载和缓存耗时。
Demo 使用 data-sdk-algorithm-info、data-sdk-runtime-info、data-sdk-timing
和 data-sdk-state-reset。状态生命周期、复位、来源、许可、输入输出必须有文档。

规则的 appliesTo 声明模型或算法适用性；未声明表示两者适用。
MODEL-001、CACHE-001、DEMO-004 仅适用模型；ALGORITHM-001、DEMO-006
仅适用算法。不适用项保留 skip、清单证据路径及理由。
只有完整校验通过的清单可决定类型豁免；无效清单仍产生 CONFIG-001，
不能靠 algorithm 声明跳过模型必需规则。无清单的旧仓库沿用模型检查。
