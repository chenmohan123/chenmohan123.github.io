# Tracking 外部运动矩阵核心设计

日期：2026-09-22。层级：单 SDK。本阶段由用户确认继续实现；三路径取舍沿用已批准的[可行性结论](../../../reports/tracking/2026-09-21-botsort-feasibility/README.md)。本地核心候选完成后再进入公开算法选择与版本发布，不进行远程写入。

## 交付和结构

SDK 新建 `src/botsort/`，候选工厂 `createBoTSortTracker(options?)` 可直接构建并消费，但暂不增加 package.exports 或正式 Demo 入口。生产根入口仍是已有三算法。候选报告算法 `botsort`、CPU/main、`web-sdk-pp-tracking@0.2.0-rc.0+botsort-core.1`，避免冒充已发布 RC 的实现。

提取现有跟踪器内部 `createTrackingCore` 和小型策略接口，共享检测校验、生命周期、Kalman、分配、低分续接和错误原子性。BoT-SORT 只提供帧契约、预测后补偿、门控相似度和 EMA 钩子；不复制整套跟踪引擎。内部扩展不经根入口导出，默认路径不导入候选模块或图像引擎。候选构建输出到忽略目录，包含 ESM/CJS 和 NodeNext 类型消费验证。

## 输入和生命周期

`BoTSortFrame` 在原 TrackingFrame 上增加非负安全整数 `frameId` 和必填 `motion`。图像尺寸为不超过 32768 的正整数；候选帧、motion 和选项拒绝未知字段，避免拼写错误静默失效。

motion 的 `from/to` 是 `{frameId, timestampMs}`。to 必须逐值等于当前帧；from 必须逐值等于本实例上一次成功处理帧，帧 ID 和时间均严格增加，可以跳帧但须提供覆盖整个间隔的矩阵。首次/reset 后仅接受 `{status:'initial',from:null,to}`。其余状态：

- `identity`：调用者明确无变换，不携带 matrix。
- `estimated`：必需 matrix、source、confidence，矩阵为原图零基坐标、前已处理帧到当前帧，行序 `[a,b,tx,c,d,ty]`；source 为 1–256 字符非空去边空白文本，confidence 为 [0,1] 有限数值，仅作为审计信息，不替调用者判断估计质量。
- `unavailable`：必需同样有效的 from/to 和 1–256 字符 reason。工厂 `motionFailure` 默认 `error`，只有显式 `identity` 才按恒等处理，结果仍保留 unavailable/reason，不改算法。

矩阵逐元素稠密有限，det>0，两个奇异值均在 [0.8,1.25]，极分解旋转绝对值≤15°，平移≤0.25原图对角线（数值边界容差 1e-10）。因此拒绝反射、奇异、强剪切、超范围运动；一般仿射可在该局部范围使用。帧头、时间与尺寸先校验，再校验完整motion；所有校验均在引擎过滤/推进轨迹前完成，不能因无轨迹跳过。大于 largeGapMs 的间隔、seek或尺寸变化要求 reset，不自动套用旧补偿；暂停未超过间隔则按实际前后帧继续。

所有输入/取消/数值失败均不推进时间、帧 ID、轨迹 ID、代次或 EMA。先复制并校验输入，在工作副本上完成结果，再提交；禁止调用者输入和返回值改变内部状态。reset 清空帧身份与轨迹，ID 重回1、generation+1；dispose 幂等，之后 update/reset 返回 DISPOSED。同步取消仅在开始前检查。

## 数学和外观

先原内核预测，再用 `J=diag(M,abs(M),M,abs(M))` 更新均值，中心加平移，`P'=J P Jᵀ`；精确恒等矩阵走原状态，不引入舍入差。宽高取原轴对齐框四角包络；输出仍可越出图像，裁边由渲染/下游处理，不把裁边反馈进滤波。对结果有限、正尺寸和非负方差做校验。矩阵的不确定性尚不建模；反复旋转包络可能增大，长旋转测试与文档须说明。

可选 `appearance` 内含固定 `featureSpace:{id,dimension}`，proximityIouThreshold 默认0.5（[0,1]）、maxCosineDistance 默认0.25（[0,2]）、emaAlpha 默认0.9（[0,1)，避免拒绝更新的1）。启用时每帧 featureSpaceId 相同，所有检测含有效向量并一次归一化；未启用时拒绝 featureSpaceId/embedding，避免声称使用了忽略的向量。高分关联（含 tentative）只有类别相同、raw IoU≥门限、cosine≤门限时取 `max(IoU,1-cosine/2)`，否则保持 IoU。低分仅续接 tracked，不使用也不更新外观；高分匹配更新一条归一化 EMA，初始轨迹以首向量初始化，最大2048维/500轨迹、无无限图库。

实现保留本项目秒级噪声/生命周期，与论文的带符号宽高、尺寸噪声、检测分数融合和离线插值不同。是 BoT-SORT 风格独立实现，不声称官方逐值复现。来源、许可证与不复制第三方跟踪代码约束沿用研究报告。

## 结果和耗时

结果复用原轨迹、代次和五阶段 timings，新增 frameId 与经复制的 motion 回执（含 `applied`，只有 estimated 为 true）。candidate wrapper 重测 totalMs，涵盖候选校验、内部计算与结果封装；validationMs 包含矩阵/特征校验，predictionMs 包含矩阵应用。图像估计、检测、ReID提取、传输和渲染均由调用者另外计时，不伪造0耗时模型。

## 验收和下一阶段

先写失败测试，覆盖首帧非法矩阵、关联身份/时间、跳帧、显式失败、reset/seek/尺寸、实例隔离/取消/错误原子性、平移连续ID、旋转包络/协方差/长序列、低分不污染EMA及门控反例。旧176测试和包消费保持通过。

固定七段5316帧复用旧运动矩阵和向量，验证CMC及CMC+外观的MOT轨迹逐字对齐探针，同时恒等候选对齐原ByteTrack。重新评分前逐份核验MOT哈希；浏览器完整05对齐Node，额外覆盖生命周期错误。调查09退步时冻结参数，仅以恒等、平移项和完整矩阵消融解释原因，探索结果不用于替换默认/调参。报告明确不是新图像估计/ReID速度测量。

完成标准前后、typecheck/test/build/check:package、候选ESM/CJS/类型消费、Demo旧流程回归、独立审查及本地提交。后续公开集成才扩工厂algorithm选项、版本、manifest、双语Demo与导入导出；视频、相机估计、手机和Workflow不在本批。
