# Tracking 四算法公开接入设计

日期：2026-09-22。层级：单 SDK。用户已确认推进上一阶段提出的公开 API、四算法 Demo 和运动数据导入导出。本批在已有隔离工作树进行，版本准备为 `0.2.0-rc.1`；完成本地实现、验收和提交，远程发布另行执行。

## API 与兼容性

包根继续使用 `createTracker`，新增 `algorithm: 'botsort'` 分支；通过独立 `src/factory.ts` 分派到既有引擎和 BoT-SORT 核心，避免循环依赖。根运行时导出仍只有工厂与错误类，不引入 ORT。候选的数学、状态和外观参数默认值不改。

保留原 `TrackerOptions` 与 `Tracker` 三算法调用签名；`TrackerAlgorithm` 增加 botsort，原选项中的 algorithm 使用三算法子集。新增 `BoTSortTrackerOptions = BoTSortOptions & { algorithm: 'botsort' }`、`AnyTrackerOptions`，工厂提供候选、原有与联合选项的重载。明确 botsort 返回 `BoTSortTracker`，update 必需 `frameId`/`motion`，不能让 TypeScript 静默允许缺失运动信息。根导出完整 BoT-SORT 类型；版本统一为 rc.1。

运动帧沿用核心已验收契约：initial、identity、estimated、unavailable，严格绑定前后成功帧，错误不提交状态。只允许显式 identity 失败策略；不开外观时拒绝向量。文档明确是 BoT-SORT 风格独立实现、外部估计矩阵，不是自动相机估计。

## Demo 与数据

延续当前品牌栏、左侧控制、中央结果和折叠详情布局。算法下拉增加 BoT-SORT；低分参数与运动失败策略、可选外观门控参数仅在适用时显示，采用共享 token，不新增说明面板挤压画面。

内置样例显式提供帧身份和运动，新增原创合成相机平移场景；identity 样例也明确标注合成来源。外观启用时采用已有合成特征空间，不能冒充模型提取。外部导入缺运动时拒绝，不编造恒等矩阵。JSON 保留 frameId、motion、source/confidence/reason、特征空间与向量。导出输入采用版本化包装，保留算法和生效选项，重新导入可重现运动失败策略与外观参数；旧 frames 包装兼容。未知版本/算法不静默降级。

切算法/示例/应用参数/导入先临时实例完整验证，成功才替换会话；失败保留原序列、参数和结果。seek 从首帧 reset 顺序重算，暂停继续沿用上一成功帧，语言切换不改状态。导出结果包含实际算法、版本、运动回执与生效参数，不混入未应用草稿。显示简短运动状态；完整数据留给导出与折叠详情。

## 验收与范围

先失败测试，再实现；公开根 API 与 ESM/CJS/NodeNext 实际 tarball 消费验证四算法和缺运动类型错误。单测覆盖导入导出往返、末帧非法矩阵、错误 from、失败策略与外观、seek/reset和旧格式兼容。桌面浏览器测试选择/播放/暂停/语言/参数/导入导出/非法输入保留状态及390px布局，原12组流程保留。

固定旧矩阵/向量通过新根入口回放七段5316帧，与上一核心MOT逐字对齐，浏览器完整05对齐Node；不重新评测或调参09，不重复图像估计/ReID。更新双语文档、manifest、changelog、本地发布说明、规范前后报告及门户规划。门户不新增 Workflow。自动图像估计、视频/摄像头、手机和远程发布不在本批。
