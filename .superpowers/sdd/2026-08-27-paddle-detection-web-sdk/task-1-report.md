# Task 1 实现报告：模型变体与多来源契约

## 结果

状态：DONE

已扩展 v1 manifest schema、手写校验器、模板和中英文规范文档。旧版
`model.assets` 仍为必填字段，新字段全部为向后兼容的可选声明。

## 实现内容

- `model.defaultVariant` 和 `model.defaultSource`。
- `model.variants[]`：`id`、`precision`、`quantization`、`opset`、`bytes`、
  `parameterCount`、`backends`、`sources`。
- `sources[]`：`kind`、`repository`、固定非空 `revision`、`path`、HTTP(S)
  `downloadUrl`、正整数 `bytes`、64 位十六进制 `sha256`。
- 来源枚举：`git-lfs`、`huggingface`、`modelscope`、`custom`。
- 变体后端枚举：`wasm`、`webgpu`；precision 保留扩展字符串能力。
- 文档明确显式来源失败不自动换源，`auto` 才可按清单尝试，并说明 Git LFS
  pointer 不是模型本体。
- 新增包含两个变体和四类来源的 multi-source fixture。

## TDD 与验证

先加入 multi-source fixture 加载断言运行 focused 测试，旧校验器因只检查
旧字段而通过；随后补充负向断言，覆盖空 revision、非 HTTP(S) 地址和非法
后端，校验器实现后通过。

- focused：`pnpm sdk:check:test -- --run tools/sdk-standard-check/standard-files.test.ts`
  结果：15 tests passed。
- full：`pnpm test`，结果：5 files / 22 tests passed。
- schema JSON 解析：通过（`schema ok`）。
- `git diff --check`：通过；仅有 Git 的 LF/CRLF 提示，无空白错误。

## 文件清单

- `standards/v1/sdk-manifest.schema.json`
- `standards/v1/README.md`
- `standards/v1/README.en.md`
- `standards/v1/sdk-contract.md`
- `standards/v1/templates/sdk-manifest.yaml`
- `tools/sdk-standard-check/src/manifest.mjs`
- `tools/sdk-standard-check/standard-files.test.ts`
- `tools/sdk-standard-check/fixtures/multi-source-sdk/sdk-manifest.yaml`

## 自审

- 未修改 SDK runtime、远程仓库或模型文件。
- fixture 中 URL、bytes 和 SHA-256 为测试占位值，仅用于结构校验，没有冒充
  真实模型证据。
- schema 与手写校验器均保留旧 manifest 的 `assets` 要求；新增变体字段不会
  破坏 v1.0.0/v1.1.0 旧清单。

## 审查修复记录

- 为 `model.variants` 增加数组类型守卫，非法对象或字符串只返回校验错误，不再抛出 TypeError。
- revision 统一要求 40 至 64 位十六进制不可变 revision，拒绝 `main`、`latest` 等浮动引用，并同步 schema、文档和 fixture。
- `quantization` 在 schema 与手写校验器中均为必填，允许字符串或 `null`，并增加缺失字段负测。
- URL 改为 URL 解析并要求 HTTP(S) 协议和 hostname；schema 增加等价格式约束，拒绝 `https://` 和其他无主机地址。

审查修复验证：`pnpm sdk:check:test -- --run tools/sdk-standard-check/standard-files.test.ts`
通过（16 tests）；`pnpm test` 通过（23 tests）；schema JSON 解析和
`git diff --check` 通过。
