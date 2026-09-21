# PP-Tracking 外部向量 DeepSORT 实施计划

> 执行要求：使用 superpowers:subagent-driven-development 或 superpowers:executing-plans 逐任务实施，完成后审查。

**目标：** 同包提供第三种可用关联算法及可验证的 Demo。

**架构：** 公共类型扩展可选外观字段，工厂选择策略；独立 deepsort 数学辅助模块处理特征与图库，沿用事务更新和独立 Kalman。Demo 单独准备和校验导入数据，不承担模型推理。

**技术：** TypeScript、Vitest、React/Vite、Playwright，运行时无生产依赖。

**规格：** `../specs/2026-09-19-pp-tracking-deepsort-design.md`。

**完成状态：** 两项任务及最终审查修复已完成，2026-09-19 可本地交付。SDK 核心28cb83a、Demo fc3adeb、草稿修复5b7c714、有界导出修复4833dbf。完整verify通过；最终Demo14项、浏览器12组、包消费和本地标准检查通过。下方清单保留原实施步骤，实际结果见[阶段回执](../../../reports/tracking/2026-09-19-deepsort/README.md)。本轮没有远程发布。

## 全局约束

- SDK 工作树 S：`C:/Users/chenm/.codex/worktrees/tracking-algorithms/web-sdk-PP-Tracking`，基线 `1982e87`。
- 门户工作树 P：`C:/Users/chenm/.codex/worktrees/segmentation-portal/chenmohan123.github.io`，基线 `1ee5ea9`。
- 中文回复、注释、提交；公开英文镜像保持等价。手工编辑 apply_patch，git add 指定路径。
- 无生产依赖；CPU/main；默认 ByteTrack；本地版本仍为 0.2.0-alpha.0；无远程 GitHub/npm/模型写操作。
- 禁止读取、复制、翻译上游跟踪/Kalman 源码；依据规格中的论文概念与现有独立实现。
- pnpm 必须带 `--config.verify-deps-before-run=false --config.manage-package-manager-versions=false`。
- 原始研究与 MOT17 证据不改写，不宣称实际 ReID 质量提升或官方逐值兼容。
- 每任务先测试失败再实现，仅协调者派审查，代理不得再派代理。

### Task 1: 核心契约与 DeepSORT 关联

**文件：** 修改 S/src/types.ts、src/index.ts、src/tracker.ts、src/kalman.ts；新增 src/deepsort.ts、tests/deepsort.test.ts，扩充 tests/kalman.test.ts。必要时新增聚焦 options 模块，禁止无关重构。

**接口：** 产出 FeatureSpace、TrackerAlgorithm 的 deepsort 成员、Detection.embedding、TrackingFrame.featureSpaceId 及规格三个选项。入口仍为 createTracker(options): Tracker；deepsort 辅助不做运行时公共导出。

- [ ] 写失败测试，从最小可用及严格输入开始：

```ts
const tracker = createTracker({ algorithm: 'deepsort', featureSpace: { id: 'synthetic-v1', dimension: 2 }, minHits: 1 });
const frame = { timestampMs: 0, imageSize: { width: 200, height: 100 }, featureSpaceId: 'synthetic-v1', detections: [{ box: { x: 10, y: 10, width: 20, height: 40 }, score: 0.9, classId: 0, embedding: [1, 0] }] };
expect(tracker.update(frame).algorithm).toBe('deepsort');
expect(() => tracker.update({ ...frame, timestampMs: 100, featureSpaceId: 'other' })).toThrow();
expect(tracker.update({ ...frame, timestampMs: 100 }).tracks[0].id).toBe(1);
```

- [ ] 在 S 运行 `npm test -- --run tests/deepsort.test.ts tests/kalman.test.ts`，记录因未实现算法失败的输出。
- [ ] 按规格实现严格选项、归一化（先除最大绝对分量，再计算范数）、有限图库与运动门控。运动平方距离用创新向量与 (P4x4+4I) 的逆矩阵；有限性失败使用 NUMERICAL_FAILURE，不提交状态。
- [ ] 实现已确认轨迹按 lastSeenMs 降序的同组关联，similarity=1-minCosineDistance，合格边带类别/运动/外观门限；仅 tentative 和本帧开始 tracked 的未匹配项做 IoU 补配。
- [ ] 用具体行为测试：相同位置相反向量交换输入顺序保持 ID；lost 重现相反向量不能 IoU 恢复；同向量远位移被运动门控；新鲜组优先；图库旧样本仍可匹配及容量淘汰后不能匹配。避免只断言无异常。
- [ ] 覆盖 array/Float32Array 深复制，超大/极小有限值，低分项非法也拒绝，缺失/零/错维/NaN/Infinity，选项误用，空帧，取消、reset/dispose、实例隔离与失败后同时间重试。
- [ ] 运行 `npm run typecheck`、`npm test` 和 `npm run build`，自审差异，指定文件本地中文提交。
- [ ] 写任务报告（协调者传入路径），包含 RED/GREEN 命令、输出摘要、具体断言和风险；返回提交号。

### Task 2: Demo、打包与双语文档

**文件：** S/demo/src/{App.tsx,data.ts,playback.ts}，必要时聚焦的导入准备模块；tests/demo.test.ts、tests/browser.mjs、scripts/check-package.mjs；README.md/README.en.md、CHANGELOG.md、NOTICE、sdk-manifest.yaml；docs/zh-CN 与 docs/en 的 API、algorithm、quick-start、troubleshooting、privacy-deployment、performance、compatibility、demo-checklist、release-checklist。只更改实际受影响内容。

**接口：** 消费 Task 1 的 featureSpace {id,dimension}、frame.featureSpaceId、detection.embedding、maxCosineDistance/gallerySize。产出第三策略 Demo、可原子导入的准备函数、包三方式消费。

- [ ] 阅读 Task 1 类型和规格，先给导入/切换新增失败测试：有向量包装对象保留身份和维度，非法末帧导入失败仍保留此前 session 的结果和时间，旧无向量序列可供 ByteTrack 使用。
- [ ] 运行 `npm test -- --run tests/demo.test.ts` 并记录预期失败。
- [ ] 数据层兼容既有 `{ frames }` 包装对象和可选的顶层 featureSpace，保留外观字段并深复制；DeepSORT 导入在临时 tracker 完整验证，成功才 configure/setFrames。可新增 prepareSequence(value, algorithm, currentOptions) 聚焦函数，其命名与实际签名在报告里固定。
- [ ] 为原创内置样例提供确定性合成向量；算法控件新增简短名称 DeepSORT，样例信息明确标注合成外观向量，并注明当前特征空间。切换导入无向量序列到 DeepSORT 失败时保留旧配置和结果；严禁填假向量到用户数据。
- [ ] 导出有效参数和可重新导入序列（带 featureSpace）；验证 seek/reset/语言切换，使用当前紧凑布局与 UI tokens。
- [ ] 扩展 check-package 的 ESM/CJS/TS 实际 DeepSORT 调用，公共运行时导出仍只有 createTracker/TrackingError。
- [ ] 扩展浏览器测试：第三策略运行、导出身份和生效参数、合法包装导入、非法输入保留状态、seek、双语和 390px 无溢出；保留原有测试覆盖。
- [ ] 更新清单、NOTICE 与双语文档，写明论文来源、严格特征契约、图库上限、算法差异、IoU 后备范围、CPU 关联与模型推理区分、合成证据及本地未发布状态。版本保持 0.2.0-alpha.0。
- [ ] 运行 `npm run verify`，记录结果与浏览器截图路径，自审差异，指定文件本地中文提交。
- [ ] 写完整任务报告及短返回，交协调者审查。

## 协调者收尾

整体审查补充（2026-09-19）：合法高维输入经格式化结果报告导出会超过5 MiB。按专门设计新增有界紧凑“导出输入序列”，准备和下载共用UTF-8大小检查，结果报告单独保留；增加512D/1000帧真实下载重导入与大小临界回归。此修复独立记录RED/GREEN，不覆盖原完整验证证据。

- [ ] 每任务一次规格和质量审查，有问题按技能修复复审；最终全分支审查。
- [ ] 更新 P 多算法设计及两份路线当前段落，仅记录本地第三算法和未完成的模型/真实外观验收。
- [ ] 在 S 归档新的日期证据和整分支审查结果，在 P 记录 sdk:check after 报告；不修改旧评测。
- [ ] 检查 4204 预览服务并在桌面确认第三策略；交付本地 URL。
- [ ] 本地中文提交并检查两个工作树；不 push/PR/merge/publish，不删除其他任务 scratch。
