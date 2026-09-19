# Portal and Workflow Contract

The portal is a registry and guide. It owns SDK/model records, search,
categories, comparisons, links, licenses, verification summaries, and
combination recipes. A single-SDK page links to the independent GitHub
repository, npm package, and standalone Demo.

The portal does not copy single-model runtime code or replace an SDK's Demo.
Workflow pages may describe a composition and link to a future Playground.
Actual multi-SDK execution belongs in a separately designed Workflow surface
or website with explicit input/output types, worker ownership, cancellation,
backpressure, and disposal.

The Workflow trigger is satisfied only when at least two SDKs expose compatible
public contracts and a documented use case demonstrates value over separate
Demo links. Until then, add registry records and recipes rather than nodes.

Portal UI may be denser than a Demo, but both consume the same status labels,
model/runtime fields, brand bar semantics, links, and [UI tokens](ui-tokens.json).

## 纯算法目录记录（1.2.0）

门户记录的 `kind` 缺省为 `model`，兼容已有模型；模型必须保留非空
`assets`，禁止 `algorithm`。`kind: algorithm` 必须使用空 `assets: []`，
并声明 `algorithm.id/version/family/source/license/input/output/stateful`，
前七项为非空字符串，stateful 为布尔值。不得为算法伪造权重、大小或校验和。
算法来源必须说明论文或代码来源及独立实现关系，不把自研实现标为官方移植。

算法可使用 `cpu` 后端、多目标跟踪使用 `multi-object-tracking` 分类。
目录和详情展示 CPU / JavaScript、无需模型权重、算法来源和状态语义，
筛选结果及分类页继续链接独立 SDK。门户不得导入跟踪 runtime。
带日期验证仍只覆盖明确环境；待发布记录必须标明 npm/Release/Demo 待远程核验，
门户生产合并须等待目标链接实际可用。
