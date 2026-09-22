# Tracking 外部运动矩阵核心实施计划

> 执行方式：按 superpowers:executing-plans 在当前已有隔离工作树内执行，相关接口紧密耦合；数学模块可并行委托实现，结束使用 requesting-code-review 独立审查。清单以 `[ ]`/`[x]` 标记。

**目标：** 完成同包 BoT-SORT 风格 CPU 核心候选及固定输入桌面验收。
**架构：** 复用原跟踪引擎内部策略钩子，新增 `src/botsort/`，候选不经正式入口导出；原3算法保持兼容。
**技术：** TypeScript、Vitest、esbuild、Playwright、固定Python/TrackEval。
**设计：** [正式设计](../specs/2026-09-22-tracking-botsort-core-design.md)。

## 全局约束

- 分层为单SDK；默认入口CPU/main，禁止静态图像引擎/ORT依赖。当前工厂与Demo三算法不增加公开声明。
- 候选身份 `web-sdk-pp-tracking@0.2.0-rc.0+botsort-core.1`；仅本地构建/验证/提交，不远程发布。
- 中文文档、注释与提交，英文镜像英文；手工改动用apply_patch。先失败测试再代码，不读取第三方跟踪实现。
- pnpm命令均附 `--config.verify-deps-before-run=false --config.manage-package-manager-versions=false`。
- SDK目录 `C:/Users/chenm/.codex/worktrees/tracking-algorithms/web-sdk-PP-Tracking`；门户规划/checker在本仓。两个工作树分支均 `codex/botsort-core`。

## 任务1：运动契约与核心接入

文件：新增 SDK `src/botsort/{types,motion,index}.ts`、`src/tracking-strategy.ts`、`tests/botsort-{motion,core}.test.ts`；修改 `src/tracker.ts` 内部共享钩子，根 `src/index.ts` 不加候选导出。

接口：`BoTSortFrame`、`BoTSortOptions`、`BoTSortResult`、`BoTSortTracker`、`createBoTSortTracker`；数学 `compensateMotion(state:GaussianState,matrix:AffineMatrix):GaussianState`，`validateMotionMatrix(value:unknown,size:{width:number;height:number}):AffineMatrix`。内部 `createTrackingCore(options:TrackerOptions,strategy?:TrackingStrategy):Tracker` 提供 prepareFrame、transformPrediction、similarity、updateGallery、initializeGallery 和可选featureSpace。

- [x] 写失败测试并运行 `pnpm … test -- tests/botsort-core.test.ts tests/botsort-motion.test.ts`。关键字面预期：平移 `[1,0,50,0,1,0]` 将x50的20×80框保持ID1并移至x100；非法from不改变下一次正确帧输出；首帧estimated必须INVALID_INPUT；协方差缩放2对应方差4（数学函数不承担估计器输入边界）。

```ts
const tracker = createBoTSortTracker({ minHits: 1 });
tracker.update({ frameId: 0, timestampMs: 0, imageSize: {width:640,height:480}, detections: [], motion:{status:'initial',from:null,to:{frameId:0,timestampMs:0}} });
expect(() => tracker.update({frameId:2,timestampMs:100,imageSize:{width:640,height:480},detections:[],motion:{status:'identity',from:{frameId:1,timestampMs:0},to:{frameId:2,timestampMs:100}}})).toThrow();
```

- [x] 实现设计全部矩阵/状态检查；在原工作副本生命周期插入钩子，不复制引擎。result wrapper仅在内部成功后提交前帧身份；校验计时在core validation阶段，外层total时钟真实测量。
- [x] 写外观门控/EMA失败测试：近邻相同IoU时特征使ID对应交换，门控外不能远距离接回；低分错外观不污染EMA，featureSpace不符与零向量不推进状态。
- [x] 实现一条EMA与固定空间校验；三算法原测试+候选测试/typecheck通过，再独立审查接口与原子性。

## 任务2：候选消费与固定序列验收

文件：新增 `scripts/build-botsort-candidate.mjs`、`scripts/evaluation/botsort-core/{run.mjs,browser.mjs,score.py}` 与 `reports/2026-09-22-botsort-core/`；研究输出仅 `.tmp/botsort-core/`。

- [x] 构建候选ESM/CJS及声明，实际动态import/require和 `.mts/.cts` NodeNext 类型消费；根包 `pnpm … check:package` 保持通过。
- [x] 使用固定来源摘要核验输入/特征/矩阵，逐帧构造带from/to身份的motion，非estimated转换为显式unavailable+identity策略。无外观路径移除向量，外观路径保留固定特征身份。

```js
const motion = row.status === 'estimated'
  ? {status:'estimated',from,to,matrix:row.matrix,source:'固定ORB研究归档',confidence:row.support.inlierRatio}
  : {status:'unavailable',from,to,reason:row.status};
```

- [x] 七段CMC/CMC-ReID轨迹对齐旧探针、恒等候选对齐原ByteTrack；两次候选非耗时结果一致。评分前核对所有输出hash，复用固定官方TrackEval评分。
- [x] 09序列冻结参数仅做恒等/平移/完整矩阵消融，记录估计分布和丢失轨迹几何，避免把探索当新最优参数。
- [x] Chromium完整05 CPU候选回放对齐Node；首帧/错误/取消/reset/dispose实际消费检查，不执行模型推理或图像估计。

## 任务3：文档、标准和交付

文件：SDK `docs/zh-CN/botsort-candidate.md`、`docs/en/botsort-candidate.md`、研究报告与校验；门户两份roadmap、多算法设计和阶段回执。

- [x] 写双语可运行候选示例、状态/来源/算法差异与耗时范围；核验矩阵估计不确定性和旋转包络风险。
- [x] 执行SDK typecheck/test/build/check:package、候选浏览器及旧Demo浏览器流程；门户checker修改前后、test/build；所有日志/来源/摘要归档但不提交原图/GT/特征/真实轨迹。
- [x] 请求只读独立审查，修复阻塞项；报告实际结果、局部退步与后续公开集成门槛，校验链接与Git证据字节。
- [x] 两仓明确文件暂存、中文本地提交；保留原发布/历史报告与用户改动，不push/PR/npm/Demo写入。SDK提交与Git对象字节复核记录于[阶段回执](../../../reports/tracking/2026-09-22-botsort-core/README.md)。
