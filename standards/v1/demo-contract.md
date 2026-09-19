# Single SDK Demo Contract

An SDK Demo focuses on one SDK/model or algorithm. It is not a catalog and does not embed
another SDK's inference implementation.

## Semantic regions

1. Brand bar: SDK/model name, package version, GitHub link, and language toggle.
2. Controls: input selection, backend/precision selection when supported,
   run/reset, and model-cache cleanup.
3. Status: `idle`, `downloading`, `loading`, `ready`, `running`, `success`,
   `error`, or `unsupported`; show a human-readable label and stable error code.
4. Workspace: current model's input, preview, and result.
5. Information: model metadata, requested/actual runtime, execution mode,
   timing breakdown, compatibility matrix, and limitations.

Chinese is the initial language. Switching to English changes UI copy only;
refreshing may restore Chinese unless the Demo documents persistence.

A model Demo exposes current-model cache usage, a current-model cleanup action, a
global cleanup action, and a privacy statement. It must not render broken image
previews for empty state. DOM markers such as `data-sdk-cache-clear`,
`data-sdk-model-info`, `data-sdk-runtime-info`, and `data-sdk-timing` make the
contract testable without prescribing a framework.

Use [ui-tokens.json](ui-tokens.json) for colors, spacing, radius, focus, and
status styles. Responsive layouts must not overflow on a 390px viewport.

## 纯算法 Demo（1.2.0）

上述模型名称、模型参数和缓存控件仅适用模型 SDK。纯算法 Demo 聚焦当前算法，
展示算法版本、家族、来源、许可、输入输出及状态限制；使用
`data-sdk-algorithm-info` 替代模型信息标记，并保留
`data-sdk-runtime-info`、`data-sdk-timing`。

提供 `data-sdk-state-reset` 控件并连接状态复位；重新开始、切换输入序列或
seek 时按算法契约复位。复位同时清理当前结果，不冒充缓存清理。
切换语言不得清空算法状态。无状态算法也提供清空结果的复位入口。
不展示模型下载、缓存按钮或虚构 loading/downloading 阶段；算法计算状态仍
使用适用的 idle、ready、running、success、error、unsupported 等语义。
五个算法耗时字段见性能契约。静态标记检查只证明声明存在，交互必须通过
浏览器验证。中文默认、隐私说明、可访问性和 390px 布局要求仍然适用。
