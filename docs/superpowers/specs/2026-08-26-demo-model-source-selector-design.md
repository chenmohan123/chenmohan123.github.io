# 三个 Demo 的模型来源选择设计

## 目标

不修改三个 SDK 的公开 runtime 契约，在三个 Demo 增加统一的模型来源下拉框。用户可以选择 SDK 默认来源、Hugging Face 或 ModelScope；默认值为 SDK 默认来源。Demo 只向现有 SDK 传入可兼容的 manifest URL，模型下载、缓存和完整性校验仍由 SDK 负责。

## 范围与能力矩阵

| Demo | SDK 默认 | Hugging Face | ModelScope |
| --- | --- | --- | --- |
| PP-DocLayoutV3 | 可用 | 只有存在浏览器可用 ONNX manifest 时可用 | 只有存在浏览器可用 ONNX manifest 时可用 |
| PP-LCNet_x1_0_doc_ori | 可用 | 使用官方 ONNX manifest | 只有存在浏览器可用 ONNX manifest 时可用 |
| PP-OCRv6 | 可用 | 使用固定 revision 的官方 ONNX manifest | 只有存在浏览器可用 ONNX manifest 时可用 |

如果某个来源没有经过本仓库 manifest 契约验证的 ONNX 资产，选项必须置灰并显示限制说明；不得把 safetensors、仓库首页或未经校验的可变链接当作可用来源。

## 交互与数据流

1. Demo 初始来源为 `default`，该值不传 `model`，因此 SDK 使用自身 `DEFAULT_MANIFEST_URL`。
2. 用户切换到 `huggingface` 或 `modelscope` 后，Demo 解析本地来源映射，得到该来源的 manifest URL。
3. 切换来源时销毁当前 SDK 实例，清空结果、计时和错误状态；下一次运行时把 manifest URL 作为现有自定义模型参数传入 SDK。
4. SDK 的下载进度、缓存命中、SHA-256 校验、会话初始化和错误码继续原样映射到 Demo 状态区域。
5. 来源选择显示当前来源名称和 manifest URL（必要时使用可展开的辅助信息），模型信息区域显示实际 `manifestUrl` 或 SDK 默认标记。

## 组件边界

- 每个 Demo 增加一个小型、纯数据的来源配置模块，定义 `default`、`huggingface`、`modelscope` 三个稳定键、显示文案、manifest URL 和 `available` 状态。
- React Demo 在 `App.tsx` 中使用受控 `<select>`；Vanilla Demo 在 `render.ts` 生成 `<select>`，在 `main.ts` 监听变化。
- 来源配置不进入 SDK package，不复制推理逻辑，也不改变 SDK manifest schema。
- 自定义 manifest 功能保持现状；来源下拉框只提供预置选项。

## 错误处理

- 来源 manifest 获取失败显示 SDK 原有 `MODEL_DOWNLOAD_FAILED` 或 `INVALID_MANIFEST`，并保留来源名称。
- 来源切换不会静默回退到另一个来源；只有选择 `default` 才使用 SDK 自带默认行为。
- ModelScope/Hugging Face 资产必须使用 HTTPS、固定 revision（若上游支持）和清单中的真实字节数、SHA-256。

## 测试验收

- 单元测试验证来源配置默认值、可用性和 manifest URL 映射。
- Demo 端到端测试验证初始选项为 SDK 默认、切换来源会更新选择并在下一次 SDK 初始化时使用对应 URL、不可用来源被禁用。
- 三套 Demo 继续通过现有类型检查、单元测试、构建和移动端无横向溢出测试。
- 运行 `pnpm sdk:check -- --repo <path>` 审计三个 SDK；来源选择只属于 Demo，不改变 SDK 合规契约。

## 限制

本设计不承诺任何官方仓库都提供可直接用于浏览器的 ONNX 文件。ModelScope 或 PP-DocLayoutV3 只有在补齐并验证兼容 manifest 后才启用对应选项；否则 UI 明确显示“暂不可用”。
