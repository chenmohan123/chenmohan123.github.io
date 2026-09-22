# Tracking 四算法公开接入实施计划

> 使用 superpowers:subagent-driven-development 执行独立实现任务；主代理负责文档、版本整合和验证。任务采用复选框，独立只读审查由主代理发起，不重复委托。

**目标：** 本地 rc.1 提供四算法工厂、运动序列 Demo 与可复现导入导出。
**设计：** [公开接入设计](../specs/2026-09-22-tracking-botsort-integration-design.md)。
**目录：** SDK 为 `C:/Users/chenm/.codex/worktrees/tracking-algorithms/web-sdk-PP-Tracking`；门户为本仓。两仓 `codex/botsort-integration`，基线分别 `d9cbac817b8aac8fdf02776b8a199d6627dd9040`、`2c3907b9647763b779d801af94519760a2ad6be8`。

## 全局约束

- 中文代码注释、文档与提交；英文镜像英文；手工编辑用 apply_patch。pnpm 带 `--config.verify-deps-before-run=false --config.manage-package-manager-versions=false`。
- 不改核心数学/默认算法，不复制第三方跟踪代码，不静态加载 ORT，不远程写入。历史报告保持原样，当前验证另建 `reports/2026-09-22-botsort-integration/`。
- 独立任务仅修改指定文件、不自行提交、不启动子代理；主代理统一审查和提交。

### Task 1: 公开工厂与严格类型

文件：`src/factory.ts`、`src/index.ts`、`src/types.ts`、`src/botsort/{index,types}.ts`、`src/tracker.ts`、`tests/botsort-public.test.ts`。生产版本字面量由主代理统一改 rc.1，任务本身可先保留 rc.0。

接口：新增 `BoTSortTrackerOptions`、`AnyTrackerOptions`，保留原 `TrackerOptions` 仅接受三算法；`TrackerAlgorithm` 为四算法。工厂重载 `(BoTSortTrackerOptions):BoTSortTracker`、`(TrackerOptions?):Tracker`、`(AnyTrackerOptions):Tracker|BoTSortTracker`。BoTSortResult 使用公共 RuntimeInfo，移除候选版本后缀。BoT-SORT 类型从根导出，不额外导出内部核心或直接工厂。

- [x] 先添加根入口失败测试，执行并保存 `.tmp/botsort-integration/public-red.log`。
```ts
const tracker = createTracker({ algorithm: 'botsort', minHits: 1 });
const frame = { frameId: 0, timestampMs: 0, imageSize: {width:640,height:360}, detections: [], motion: {status:'initial' as const, from:null, to:{frameId:0,timestampMs:0}} };
expect(tracker.update(frame).algorithm).toBe('botsort');
expect(() => tracker.update({...frame, frameId:1, timestampMs:100})).toThrow();
```
- [x] 实现无循环分派，拒绝未知算法/非法工厂输入；测试默认ByteTrack、显式三算法、BoT-SORT首帧/平移、错误不推进、可选外观。
- [x] typecheck 和相关新旧测试通过，记录需主代理更新的包消费/版本断言。不得修改 Demo、文档或发布脚本。

### Task 2: 四算法 Demo 与运动序列

文件：`demo/src/{data,playback}.ts`、`demo/src/App.tsx`、必要的`demo/src/style.css`、`tests/botsort-demo.test.ts`、`tests/botsort-demo-browser.mjs`。消费 Task 1 的公开重载与类型。主代理处理旧浏览器版本字面量；新页面标 rc.1、本地候选。

- [x] 写往返/失败原子性测试，保存失败日志后实现。
```ts
const prepared = await prepareSequence(JSON.parse(serialized), 'botsort', options);
const playback = new Playback(prepared.frames, prepared.options);
playback.seek(prepared.frames.length - 1);
expect(playback.results.at(-1)?.algorithm).toBe('botsort');
```
- [x] 保留现有函数旧调用兼容，新增运动字段深复制；版本化导出保留算法和生效选项，重新导入遵守它们。旧格式仍使用当前算法参数。不得为外部输入补造motion、不得丢弃非法字段来规避核心校验。
- [x] 新增合成平移样例和BoT-SORT选项、失败策略与可选外观参数；内置样例在切算法时正确恢复/去除不使用的向量，导入序列不得静默剥离。临时验证后替换，参数失败/末帧失败保留原状态；类型与旧样例兼容。
- [x] 浏览器新流程覆盖切换/完整播放、motion回执、导入导出往返、seek、非法from和矩阵保留原结果、语言与390px。使用已有浏览器测试基础设施，不添加生产依赖，不启用自动图像估计。

### Task 3: 版本、包消费、文档和整体验收

文件：`package.json`、`sdk-manifest.yaml`、运行时/现有测试版本字面量、`scripts/check-package.mjs`、中英文README/API/指南/checklist、`CHANGELOG.md`、新版本说明与研究报告、门户路线图和阶段回执。

- [x] 统一准备 rc.1，npm链接保留真实包入口且明确本地未发布；四算法实际打包消费与正/负NodeNext类型用例通过。
- [x] 新根入口七段回放对齐旧MOT，固定05浏览器对齐；脚本输出另存新目录，历史报告和原始证据不覆盖。
- [x] 完整SDK verify、新Demo浏览器、门户前后checker/test/build，双语示例实跑与相对链接验证；记录实际通过项和09限制。
- [x] 独立功能/最终审查，修复阻塞项；记录来源/输出哈希，明确文件暂存，两仓中文本地提交，不push/PR/发布。

2026-09-22 收口：SDK提交 `e6a749566a7f6cfb0564dcc2bfc1eecbd3436b51`；220单测、18浏览器组、实际包及固定序列对齐通过。门户136单测、21页面构建及标准检查通过。两轮独立审查无剩余阻塞，详情见[阶段回执](../../../reports/tracking/2026-09-22-botsort-integration/README.md)。
