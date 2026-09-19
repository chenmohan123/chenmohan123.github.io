# 独立 PP-Tracking SDK 首版实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development 或 superpowers:executing-plans，按任务执行和审查。

**Goal:** 交付可本地使用和验证的独立跟踪SDK及统一风格Demo。
**Architecture:** 先增加算法类标准，再用无依赖TypeScript实现两阶段关联和状态生命周期，React Demo消费同一公开API。
**Tech Stack:** TypeScript 5.9、Vitest、Vite、React、Playwright、Python/NumPy参考。
**Spec:** `docs/superpowers/specs/2026-09-19-pp-tracking-design.md`

## Global Constraints

- 门户根 `C:/Users/chenm/.codex/worktrees/segmentation-portal/chenmohan123.github.io`；SDK根 `F:/git/00_chenmohan/github/web-sdk-PP-Tracking`。
- 文档、注释、提交中文；公开文档有等价英文。手动编辑用apply_patch；明确文件add，禁git add .。
- pnpm始终加 `--config.verify-deps-before-run=false --config.manage-package-manager-versions=false`。
- 规范源是门户standards/v1；不修改原门户工作目录，不嵌入检测SDK或虚构权重/GPU/Worker。
- 生产runtime无依赖，Apache-2.0原创实现；不读/翻译上游Kalman/SORT源码实现算法。
- 本轮本地实现及证据，不新增远程仓库/发布，不改npm身份配置。
- 先标准后产品。每个任务遵守设计、只修改责任文件，独立验证提交；子代理不得派生子代理。

### Task 1: 纯算法标准与检查器

**Files:** standards/v1的README双语、schema、rules、runtime/demo/performance/docs契约、算法manifest模板和checklist；tools/sdk-standard-check的manifest/discover/rules和测试；skills/web-model-sdk-standard/references/scaffold.md。
**Interfaces:** 生产1.2.0 `kind: algorithm` 与设计定义的algorithm字段；新DEMO-006状态复位、ALGORITHM-001规则；模型与算法分支互斥，旧清单兼容。

- [ ] 加失败用例：有效算法、缺algorithm、带model/cache、旧版kind算法、伪造kind、缺算法timing、缺复位标记、旧模型缺assets仍失败。
```ts
expect((await scanRepository(algorithmRoot)).findings.filter(x=>x.level==='required'&&x.status==='fail')).toEqual([]);
// 将算法清单schemaVersion改为1.1.0后必须有CONFIG-001，不能获得模型规则豁免。
```
- [ ] 运行 `pnpm ... sdk:check:test` 确认新增回归会失败，再实现schema条件、适用规则、发现器和模板。不能让无效manifest跳过必需检查；skip需证据说明。
- [ ] 更新标准双语入口及对应契约，模型要求保留；算法cold/warm指新实例/复用状态，无模型耗时。
- [ ] 运行 `pnpm ... sdk:check:test`、`pnpm ... test`、`pnpm ... build`；提交 `扩展纯算法SDK标准并保持模型契约兼容`。

### Task 2: 独立跟踪核心与来源证据

**Files:** SDK新建AGENTS.md、package.json、tsconfig/vitest、scripts/build.mjs及check-package.mjs、src/{types,errors,kalman,assignment,tracker,index}.ts、tests/*.test.ts、tests/fixtures/math-reference.json及生成脚本、LICENSE、NOTICE、docs/zh-CN/algorithm.md与docs/en/algorithm.md。
**Interfaces:** createTracker/update/reset/dispose和全部字段/默认值严格依设计；runtime={requestedBackend:'cpu',actualBackend:'cpu',executionMode:'main',runtimeVersion:'web-sdk-pp-tracking@0.1.0'}；timings五项。

- [ ] SDK空目录先运行门户 `pnpm ... sdk:check -- --repo <SDK> --format json --out reports/sdk-standard/pp-tracking-before.json`，保留预期缺失。
- [ ] 初始化 `codex/tracking-foundation` 本地Git，先写数学/匹配/生命周期失败测试；不复制其他SDK的runtime。
```ts
const a=createTracker({minHits:1}), b=createTracker({minHits:1});
const frame={timestampMs:0,imageSize:{width:640,height:480},detections:[{box:{x:20,y:20,width:40,height:80},score:0.9,classId:0}]};
expect(a.update(frame).tracks[0].id).toBe(1);
expect(b.update(frame).tracks[0].id).toBe(1);
expect(()=>a.update(frame)).toThrow();
a.reset(); expect(a.update(frame).generation).toBe(1);
```
- [ ] 实现8维Kalman，文档定义F、H、P/Q/R与dt，使用小型矩阵运算/Joseph covariance保证数值；独立Python/NumPy参考至少预测、连续更新、不同dt。
- [ ] 实现确定性门限内全局分配（匈牙利或等价），低分不新建、类别隔离、tentative/tracked/lost/removed、时间上限/数目上限；校验和计算事务性提交，dispose幂等。
- [ ] 补充非法输入/配置、引用隔离、capacity、big-gap、score边界、lost不可低分复活、贪心反例、门限反例测试。跟踪ID只在该实例，移除事件只返回一次。
- [ ] 运行 `pnpm ... test`、`typecheck`、`build`、`check:package`；记录源码基础/限制和npm pack实际内容；提交核心。

### Task 3: 独立Demo、双语文档、示例及发布脚本

**Files:** SDK demo/{index.html,vite.config.ts,ui-tokens.json,src/*}、examples/vanilla与examples/react、README双语、docs双语六组指南、sdk-manifest.yaml、CHANGELOG、.github/workflows/{ci,pages,release}.yml、tests/browser.mjs及Demo数据测试。
**Interfaces:** 消费Task2实际公开API，不改核心契约；manifest按Task1模板。Demo输入JSON={frames:TrackingFrame[]}；文件5MiB、帧数3000、每帧100框上限。

- [ ] 阅读旋转Demo和PP-Detection样式文件作为布局参考，复用门户ui-tokens，不复制推理；实现原创合成序列与schema完整导入校验。
```ts
// 导入失败保留现有序列与结果；回放每步使用frame.timestampMs，seek先reset再顺序推进。
// 当前状态显示CPU / JavaScript / Main；丢失轨迹虚线，无权重/缓存/后端选择器。
```
- [ ] 实现品牌栏、紧凑控制、SVG结果/轨迹、播放暂停单步重播、文件导入、结果JSON下载、语言切换；结果优先显示，详情折叠，390px可用。
- [ ] 从标准模板创建manifest/README/checklist，文档明确低分检测保留、seek/reset和ID非身份；全部未发布链接标记为计划地址，安装使用本地包方式，不声称npm已存在。
- [ ] Vanilla示例真正调用构建包API，React引用Demo，构建两者；CI测试类型和打包及浏览器，Pages使用官方actions和最小权限；release要求先通过验证后以OIDC发布，首次发布尚待授权。
- [ ] 浏览器自动覆盖中文/英文、单步/播放暂停/重播、低分/遮挡、导入成功失败、导出、无横向滚动、Vanilla；运行unit、typecheck:demo、build:demo、test:browser及sdk:check；提交完整Demo与文档。

### Task 4: 桌面验收证据与交付复核

**Files:** SDK scripts/evaluation/*、reports/2026-09-19-desktop/*、docs兼容/性能指南、manifest.verification；门户reports/sdk-standard/pp-tracking-after.json与计划验收记录，以及docs/superpowers/plans/2026-09-13-pp-detection-multi-model-roadmap.md、2026-08-17-web-model-sdk-portal-roadmap.md中的当前跟踪进度。
**Interfaces:** 消费已完成SDK，不能用静态声明替代运行；证据区分机制正确性和浏览器性能，无移动端/MOT精度承诺。

- [ ] 可复现合成序列性能测量至少10、50、100框，注明浏览器/OS/CPU/日期及样本数、p50/p95；包含cold创建与warm更新，固定输入可重跑，无绝对性能断言。
- [ ] 记录真实浏览器主线程运行、两种语言、390px、Vanilla及导入导出，保留机器可读摘要和命令。截图放忽略目录，报告只列路径。
- [ ] 校验npm pack、无runtime依赖和源码来源；运行全部SDK tests/typechecks/builds/browser与门户sdk:check/tests/build。
- [ ] 更新verification只填实际测试的浏览器版本和设备，sdk:check远程skip如实保留；记录发布尚未执行及真实视频质量未测。
- [ ] 同步两份总路线的当前状态为实际完成的本地SDK/桌面证据，保留旧阶段历史说明，不把尚未发布的Tracking登记为可用门户条目；归档主代理的7个现有SDK新旧标准检查差异报告。
- [ ] 提交证据和兼容说明，独立整分支审查后交付本地Demo及可审查代码。
