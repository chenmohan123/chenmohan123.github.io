# Tracking 混合标准与 ReID 源码候选回执

日期：2026-09-21。分层：门户标准与单 SDK 模块；没有门户 Workflow 或生产 registry 变更。标准 1.3.0 已在本地实施，同包 ReID 源码候选已完成 RGBA → 特征 → DeepSORT 的浏览器闭环。

门户基线 `8b80ea8`，标准实现 `13955b3`、修复 `50d32bd`；SDK 基线 `4bbd3d5`。SDK 工作树为 `C:/Users/chenm/.codex/worktrees/tracking-algorithms/web-sdk-PP-Tracking`，完整双语报告位于该仓库 `reports/2026-09-21-reid-module/`。SDK 仍为本地 `0.2.0-alpha.0`、线上 `0.1.0`。本轮没有 GitHub/npm/模型源远程写操作。

SDK 模块提交 `6fc6e5a`，下载/取消修复 `5dcd2d4`，浏览器与文档归档 `51c4e2e`。

## 标准与模型模块

- 1.3.0 新增 hybrid：同时满足模型与算法契约，声明两个真实入口、分别报告后端/耗时/日期验证，顶层能力等于模块并集，保留模型分发、缓存和 Demo 要求。旧 model 1.0/1.1/1.2 与 algorithm 1.2 兼容。
- HYBRID-001 核查运行时导出文件，拒绝仅类型导出、声明文件、目录和缺失目标；它是静态检查，不能代替真实包消费、下载及推理证据。
- Tracking `src/reid/` 接受已解码 RGBA 与人体框，返回绑定检测的 512 维单位向量，featureSpace 固定模型 SHA、预处理和 L2 定义。load/extract/dispose、输入快照、整帧原子性、并发、取消、缓存和安全错误均有独立模块与测试。
- 模型特征提取选择 WASM/WebGPU；跟踪关联仍为 CPU/main。固定 FP32 模型 33,704,835 字节，SHA-256 `24d347f47405bb1bd24fd582783507edbcb16571d2e845d0528b0ad7856336e4`。
- 同包候选只构建到忽略目录，不加入发行 exports/dist。ModelScope/Hugging Face 真实来源尚未落实，不能虚构 revision 或用 algorithm 清单豁免；公开子入口、hybrid 生产 manifest 和 Demo 模型控件将随正式分发统一接入。

## 验证

本机 Windows 11/i5-10400F/RTX5060Ti、Chromium153、ORT Web1.27。WASM/WebGPU 各 34 组原始 Paddle 参考通过，归一化向量最大绝对误差分别 3.502e-7 / 4.396e-7；门槛仍为 1e-3 与余弦距离 1e-5。GPU 实际 NVIDIA/Blackwell、非 fallback，禁止 CPU EP 回退。两后端取消恢复及重复真实裁剪送 DeepSORT 保持 ID 均通过；重复帧不是实际跟踪质量评测。

受控 HTTPS 路由和真实 CacheStorage 验证下载、命中、错误内容拒绝、命名空间隔离及不换源。没有访问真实 hub，此证据不能替代双源上线验证。根包实际 ESM/CJS/类型消费通过，运行核心 SHA 与基线相同；候选未进入发行 tarball，也未增加生产依赖。

独立模块审查提出压缩传输 Content-Length 误判及缓存匹配期间取消未关闭 body，均已修复并复审通过。新增7项行为回归，生命周期37/37、类型及候选构建通过。最终模块再次通过68条向量、取消恢复及缓存检查，并使用真实本机HTTPS验证gzip传输、浏览器解压后的模型SHA和会话创建。首个路由模拟失败及确认工具差异的最小诊断保留在SDK报告，不把它归为模型数值失败。

SDK 完整 verify：138 项单测与 12 组现有 Demo 浏览器检查通过，类型与核心/Demo/Vanilla/React 构建通过。新增 34 项 ReID 单测保留红绿证据；审查后追加聚焦回归单独记载，不冒充再次完整执行。

SDK 已锁定27份原始证据；离线复算68条向量通过，Git暂存证据逐字节与12份源码LF身份核对通过。

标准初版 checker98/98、全门户130/130；标准修复 hybrid35/35、共享回归40/40。门户构建21页、0errors/0warnings及7条既有hints；修复后Astro check同样0/0/7。[标准审查回执](standard-review.md)与本目录原始日志记录范围，没有把针对性回归写成修复后的全套测试。

标准 [before](../../sdk-standard/tracking-reid-module-before-20260921.json)/[after](../../sdk-standard/tracking-reid-module-after-20260921.json) 各17项 required 通过、0失败，仅当前 algorithm 发行核心 locally-compliant。模型模块独立验收，尚不具备正式 hybrid 发布合规结论。

## 裁定与后续

1. 本轮完成源码候选和可重现本地构建，公开入口随真实来源启用，代价是本轮不会在 npm/Demo 获得新模型能力；避免伪造分发证据。
2. 实现与独立浏览器验收按文件拆分，由子代理实施/审查、主代理集成；代价是增加协调与审查记录，防止共享文件冲突。
3. 越界研究样本原框由生产入口拒绝，数值比较显式采用图内等价交集，代价是该行不能证明生产接口接受越界框。其余33组原框不变。

下一阶段核实权重许可采用依据与署名，落实 ModelScope 默认/Hugging Face 可选的真实不可变来源及下载验证，然后启用模型子入口、hybrid 清单和 Demo。真实检测同输入的三算法 IDF1/IDSW/MOTA 与完整成本仍需评测。视频/摄像头帧调度、BoT-SORT、JDE、FairMOT、CenterTrack 沿[七算法路线](../../../docs/superpowers/specs/2026-09-19-pp-tracking-multi-algorithm-design.md)继续，门户整合流程暂缓。
