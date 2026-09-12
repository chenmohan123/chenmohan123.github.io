# 任务 2 报告：SDK 文档与六变体示例

## 状态

已完成。未提交、未推送、未发布，未修改 `packages/sdk/src` 或下载测试。执行期间读取到的 runtime/test 改动来自任务 1，本任务只读取其公开类型以记录维护版下载配置边界。

## 实现

### 当前文档

- 更新根 `README.md`、`README.en.md`，将当前范围统一为 PicoDet 1.0.2、PP-YOLOE 0.1.1，各含 FP32、FP16、W8A32 stable 变体，默认 PicoDet、ModelScope、FP32。
- 更新 `docs/zh-CN` 与 `docs/en` 的 quick-start、models、api、troubleshooting；补充固定 Hub 清单、`precision: "int8"` 对应 W8A32、显式来源不静默换源、取消与释放流程。
- 同步当前兼容性、性能、转换说明，以及 `models/README.md`、两款模型目录 README、`packages/sdk/README.md` 中仍存在的 FP32-only、默认 Hugging Face、旧内置清单描述。
- 保留带日期 release/review/report 的历史原义，并明确旧 1.0.1/0.1.0、labs/blocked 记录不描述当前六变体。
- 明确小米 15 实测只覆盖原 FP32；FP16/W8A32 当前证据仅为 2026-09-12 桌面 WASM/WebGPU 固定 64 图三轮验证。
- 将 `download.timeoutMs`、`download.idleTimeoutMs`、`download.maxRetries` 单列为当前工作区维护版能力，明确尚未随 npm 0.3.1 发布。

### 可运行六变体示例

新增 `examples/model-variants/`：

- `package.json` 固定公开包 `web-sdk-pp-detection@0.3.1`，不引用 workspace 或内部源码。
- 模型可选 PicoDet-L-320 1.0.2、PP-YOLOE+ S 640 0.1.1；来源只提供 ModelScope/Hugging Face；精度提供 FP32/FP16/W8A32。
- 默认值为 PicoDet、ModelScope、FP32；W8A32 映射为 SDK 的 `precision: "int8"`。
- ModelScope manifest revision 固定为 `88d23d254e9cc2c98874ae8bd8a7c092612e65f6`，Hugging Face 固定为 `16e7920650777479820b9301dec90a59b0d5833c`。
- 支持文件选择、下载进度、结构化错误、取消、页面离开取消、最终 `dispose()`，并在画布绘制检测框及输出实际模型/运行时/耗时。
- 不传未发布的 `download` 选项。

### 检查适配

- `scripts/check-doc-parity.test.mjs` 改为验证当前两模型六变体、默认来源、W8A32 映射和移动证据边界。
- `scripts/examples-contract.test.mjs` 纳入 `model-variants`，校验公开 0.3.1、固定 revision、两个模型路径、W8A32 映射和释放流程。
- `examples/tests/examples.test.ts` 纳入新示例的仓库外复制、安装与真实构建。
- `pnpm-lock.yaml` 与 `pnpm-workspace.yaml` 同步公开 0.3.1 示例依赖；pnpm 供应链检查通过。

## 验证

| 命令 | 结果 |
| --- | --- |
| `pnpm docs:test` | 通过，5/5；双语清单、错误码与 TypeScript 文档片段均通过 |
| `pnpm examples:check` | 通过，13/13；含六变体固定清单专用契约 |
| `pnpm --filter @ppdetection/example-model-variants build` | 通过；TypeScript `--noEmit` 与 Vite 生产构建成功 |
| `pnpm --filter @ppdetection/examples-tests test` | 通过，16/16；仓库外安装公开依赖并构建全部消费者 |
| `pnpm build` | 通过；当前工作区 SDK ESM、IIFE、worker 与 DTS 构建成功 |
| `pnpm sdk:check -- --repo ..\web-sdk-PP-Detection --format table` | `locally-compliant`；required failed 0、recommended failed 0、remote required skipped 4 |
| 定向 `prettier --check` | 本轮全部修改文件通过 |
| `git diff --check` | 通过 |
| 四个固定 Hub manifest URL | ModelScope 两份与 Hugging Face 两份均返回 HTTP 200；字节分别为 7144、7298、7405、7561 |

全仓 `pnpm format:check` 会扫描到既有无权限目录 `.tmp/release-0.3.0-pytest` 并以 EPERM 退出；随后对本轮全部修改文件执行定向 Prettier 检查，结果通过。

## 浏览器验收

在 SDK 仓库根目录执行：

```powershell
pnpm --filter @ppdetection/example-model-variants dev --host 127.0.0.1
```

打开 Vite 输出的本地 URL，选择图片后逐项切换两模型、两来源和三精度。共 12 个“模型 × 来源 × 精度”加载组合，对应六个模型变体的两个 Hub 分发入口；重点确认状态进度、画布框、结果中的 `model.variantId/source.kind`，以及下载中点击“取消”后显示“已取消并释放模型”。

## 风险与限制

- 本任务未执行真实浏览器模型推理；生产构建和仓库外消费者构建已通过，交互与远程模型下载仍需按上面的方式验收。
- 四份 manifest 已验证可访问，未重新下载六个 ONNX 文件；运行时仍会按 manifest 的 bytes 与 SHA-256 校验模型。
- FP16/W8A32 不具有小米 15 或其他移动端证据，文档没有扩大该兼容承诺。
- 当前工作区的下载恢复实现尚未发布；公开 npm 0.3.1 示例刻意不依赖它。
