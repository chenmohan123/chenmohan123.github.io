# Performance and Timing Contract

Model SDKs expose stable timing names with documented cold/warm semantics:

```text
modelDownloadMs
modelCacheReadMs
integrityMs
sessionMs
decodeMs
preprocessMs
inferenceMs
postprocessMs
totalMs
```

The Demo distinguishes model download, cache hit, model loading/session
creation, CPU/WASM, GPU/WebGPU, and NPU (only when verified) execution. The
result reports requested backend, actual backend, execution mode (`main` or
`worker`), runtime version, and test environment. A cold run includes network
or cache acquisition and a warm run reuses the loaded session; do not compare
the two without labeling them.

Recommended evidence includes peak memory, cache bytes, model precision,
batch size, browser/device, and test date. These measurements are observations
for the stated matrix, not universal benchmarks.

## 纯算法耗时（1.2.0）

算法结果和 Demo 必须提供 validationMs（输入校验）、predictionMs（状态预测）、
associationMs（观测关联）、updateMs（状态更新）、totalMs（本次计算总耗时），
单位为毫秒。不执行的阶段以 0 表示并说明原因，不虚构模型下载或缓存耗时。
各阶段边界和 totalMs 的计时范围必须文档化，不能以阶段相加冒充实测总耗时。

cold 指新算法实例首次处理；warm 指复用同一实例的已有状态。
记录初始化/复位边界、输入规模、状态规模、设备、浏览器、runtime 和测试日期，
不能把有状态计算不同输入规模的耗时直接比较为加速比。
仍报告实际后端及 main/worker 模式，不以特性检测推断兼容性或精度。

## 混合模块耗时（1.3.0）

混合 SDK 的 `modules.algorithm.performance` 使用五个算法耗时字段，
`modules.model.performance` 使用模型下载、缓存读取、完整性、会话、推理和
totalMs 字段。顶层 timings 是两个模块字段的并集；每层 totalMs 都由该层外围
时钟独立测量，不能用阶段相加或把模型时间重复计入算法时间。

结果按模块报告请求/实际后端、执行模式、runtime 版本、输入规模、设备和测试
日期。未调用可选模型时，模型模块应明确为未执行，而不是伪造零耗时推理。
整体端到端时间可另行记录，但必须与两个模块的 totalMs 区分。
