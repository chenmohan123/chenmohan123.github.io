# PP-Tracking 首版发布实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: 使用superpowers:subagent-driven-development执行本轮任务及独立审查。主代理负责远程发布，子代理不得再派代理。

**Goal:** 以真实序列证据发布独立PP-Tracking 0.1.0并登记门户。
**Architecture:** 本地MOT17公开检测框进入现有SDK，固定TrackEval评分；SDK原子状态及CPU/main接口保持；门户增加算法目录类型，仅发布后登记。
**Tech Stack:** TypeScript/Node、Python/TrackEval、Playwright、Astro、GitHub Actions、npm OIDC。
**Spec:** `docs/superpowers/specs/2026-09-19-pp-tracking-release-design.md`

## Global Constraints

- SDK根 `F:/git/00_chenmohan/github/web-sdk-PP-Tracking`；门户根 `C:/Users/chenm/.codex/worktrees/segmentation-portal/chenmohan123.github.io`。原门户用户工作区不动。
- 文档、回复、注释、提交中文，公开指南保留等价英文；手动编辑apply_patch，明确文件git add，禁git add .。
- pnpm必须附 `--config.verify-deps-before-run=false --config.manage-package-manager-versions=false`。
- 用户已确认真实评测及首次发布/门户登记，旧AGENTS本地限定在本次明确授权内失效；子代理只做本地，远程由主代理处理。
- 不复制来源不明Kalman/SORT实现；TrackEval只作为离线MIT评分工具，不进生产依赖。
- 原MOT检测/GT、逐轨输出、媒体放.tmp；公开来源哈希和汇总，无数据许可扩张。保留既有历史证据。
- 每项完成有实测证据与审查；不重复未变化的大套测试。sdk:check前后报告写各任务不同路径。

### Task 1: 真实检测序列评测与复现

**Files:** SDK `scripts/evaluation/mot17/*`、`tests/mot17-adapter.test.*`、`reports/2026-09-19-mot17/*`、`docs/zh-CN/performance.md`、`docs/en/performance.md`、compatibility双语、NOTICE评测来源说明。
**Interfaces:** 现有createTracker的TrackingFrame与TrackingResult；输入官方MOT17Labels.zip，七段FRCNN默认与低分消融；输出summary.json和双语解读，输入/输出/评分器完整摘要。

- [ ] 固定数据包身份、官方训练用途和引用依据、TrackEval MIT源码commit与依赖；保留来源快照于.tmp及JSON摘要，拒绝错误hash。不得读旧Kalman源码。
- [ ] 用小型原创输入验证适配：MOT帧号/fps到timestamp、越界框裁剪和空框剔除、低分保留、observed+tracked导出、GT不进入SDK。示例断言：`expect(frame.timestampMs).toBe(1000 / fps); expect(result.detections[0].box.x).toBe(0)`；无效文件不得静默截断。
- [ ] 实现下载/适配/运行/评分的可复跑CLI，默认输出新.tmp目录，固定归档禁止覆盖；用官方MotChallenge2DBox预处理+Identity/CLEAR计算标准指标。评分器用原创完美匹配/换ID/漏检小fixture核对定义。
- [ ] 跑全部5316帧默认与low=high消融，记录每段及合计IDF1/IDSW/MOTA/FP/FN、运行耗时、容量、原始输出hash；确定性复核同输入同配置非timing输出相同。
- [ ] Chromium至少一完整真实序列非耗时输出对齐，记录具体版本/CPU/main/日期；不展示未经许可的媒体。
- [ ] 写真实失败模式和发布建议，运行新增相关测试+必要类型/构建以及前后checker；中文提交，给主代理报告。不做远程发布。

### Task 2: 发布候选与纯算法门户支持

**Files:** 门户 `standards/v1/portal-contract.md`、`src/lib/registry/{schema,types,labels,query}.ts`及相关测试、`src/pages/models/[slug].astro`、目录筛选、`src/content/models/pp-tracking.yaml`；SDK `AGENTS.md`、README双语、docs双语发布/兼容/性能指南、`sdk-manifest.yaml`、CHANGELOG、`.github/workflows/*`、Demo公开链接文案。
**Interfaces:** 消费Task1已审查summary；门户kind互斥模型与算法，CPU后端、multi-object-tracking分类、algorithm元数据；PP-Tracking条目仅本地待发布验证，远程合并由主代理控制。

- [ ] 先扩标准：模型继续要求assets非空；算法assets=[]且algorithm必填，不接收假模型权重。schema测试覆盖旧7模型、正确算法、缺来源/算法带权重拒绝、模型缺资产拒绝。示例：`expect(modelSchema.safeParse({...tracking, assets:[modelAsset]}).success).toBe(false)`。
- [ ] 实现目录/详情/筛选算法展示，CPU/JavaScript清楚，保留现有视觉令牌。单SDK详情不导入任何runtime。支持390px布局。
- [ ] 更新发布候选双语文档与Demo远程链接、真实评测限制、版本0.1.0；旧本地验收报告保持历史原样。AGENTS远程规则改成明确授权下可执行，不给未来无限授权。
- [ ] 发布工作流统一npm环境，先验证tag版本。支持首次手工npm已存在相同版本时安全核对并跳过重复发布，不能吞掉不一致或真正发布错误；未来版本走OIDC。Pages和CI最小权限，按实际线上/离线边界写说明。
- [ ] 最终候选完整SDK verify一次；门户checker/相关tests/build与浏览器目录/详情/CPU过滤/390px，保存报告；更新两份路线至待发布候选。两仓分别提交，独立审查后交主代理。

### Task 3: 首次发布、线上核验与门户合并

**Files:** SDK `reports/2026-09-19-release/*`、双语发布清单；门户路线、发布证据与最终SDK条目。
**Interfaces:** 已通过审查的SDK候选，GitHub仓库/main/Rulesets/v0.1.0、npm web-sdk-pp-tracking@0.1.0、Pages URL、Trusted Publisher仓库/release.yml/npm。

- [ ] 主代理核验远程不存在冲突，创建SDK仓库，建立main基线并通过PR/CI引入审查候选；绑定并API回读默认分支与标签规则、npm/github-pages环境、Pages。
- [ ] 首次npm发布使用宿主登录；遇服务端要求本人安全验证时立即给当前有效链接并继续独立准备工作。不输出token/OTP，不重复已完成的登录。
- [ ] 配置Trusted Publishing并回读；发布不可变v0.1.0与GitHub Release，验证Actions、HTTPS Demo、npm dist/tarball实际API消费，保存不含凭据的回执。
- [ ] 仅公开链接及部署回读通过后推送门户PR，包含此前未合并算法标准基础和本轮算法目录，核对main差异/CI后合并；attach_artifact挂载全部PR。
- [ ] 生产门户第八条、筛选/详情、Demo回放与中英文、远程治理通过；报告真实评测指标与范围，关闭计划并保留工作树/历史分支。
