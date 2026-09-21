# Tracking ReID 双源与公开入口实施计划

> 使用 superpowers:subagent-driven-development 执行独立任务并做任务审查和最终审查。当前用户已确认继续上一阶段提出的模型来源、许可和公开入口/Demo接入，不重复方案审批。

**目标：** 将已验证 ReID 候选接入同一 SDK 的公开子入口和本地 Demo，并完成真实双源下载验收。

**架构：** 根包继续三算法 CPU/main；可选 `web-sdk-pp-tracking/reid` 在load才加载ORT。ModelScope默认、Hugging Face可选。Demo保留框/向量流程，另提供图像及调用者检测框逐帧输入，模型提取后调用现有DeepSORT；不复制检测器或实现门户Workflow。

**技术栈：** TypeScript、React/Vite、ORT Web1.27.0、Vitest、Playwright、ModelScope/HF SDK。

**设计依据：** `../specs/2026-09-20-tracking-reid-module-design.md`及1.3混合标准。此次是已批准设计的分发与集成阶段。

## 全局约束

- P=`C:/Users/chenm/.codex/worktrees/segmentation-portal/chenmohan123.github.io`，基线7b65629；S=`C:/Users/chenm/.codex/worktrees/tracking-algorithms/web-sdk-PP-Tracking`，基线a065020。复用隔离工作树；原用户文件不动。
- 中文文档/提交/注释；英文镜像等价；手工apply_patch。pnpm统一两配置`--config.verify-deps-before-run=false --config.manage-package-manager-versions=false`。
- 本次继续推进涵盖向用户的ModelScope/HF仓库分发此固定转换模型；不涵盖GitHub push/PR/merge、npm发布或线上Demo部署。凭据只通过现有宿主缓存使用，不输出、嵌入脚本或改登录。
- 固定33704835 bytes、SHA24d347f47405bb1bd24fd582783507edbcb16571d2e845d0528b0ad7856336e4、FP32/opset17。数值和预处理不变，不读或翻译上游tracking/matching/Kalman代码。
- 明示采用官方仓库整体Apache-2.0作为该官方链接权重的转换分发依据，保留许可及署名、训练披露缺口；不能声称额外获得checkpoint专属授权。模型参数数目用null，8419792仅标作含BN状态元素。
- 模型不进入npm/git；两源按实际commit固定revision和下载URL，必须回读bytes/SHA。保持0.2.0-alpha.0本地候选，不声称稳定版本或线上已更新。

### Task 1: 分发材料与真实来源（主代理）

**文件：** S/models/pplcnet-reid/0.1.0/{README.md,README.en.md,LICENSE,NOTICE,model.json,sources.json}；S/scripts/distribute-reid.py；S/reports/2026-09-21-reid-distribution/。临时目录.tmp/reid-distribution包含模型及环境。

- [ ] 核对官方固定README/LICENSE、人体checkpoint链接和文件身份。来源抓取保留URL/status/hash，404不冒称不存在任何声明。
- [ ] 写可审阅双语模型卡，准备包含ONNX、LICENSE、NOTICE、model.json的上传白名单；精确字节/hash验证后上传用户chenmohan/web-sdk-pp-tracking两个模型仓库，不覆盖其他版本。
- [ ] 从真实仓库回读commit，匿名固定URL下载验证模型，生成sources.json(两条ReIdSource)、分发回执及来源证据。未成功源不得伪填或静默替换。

### Task 2: 同包公开ReID入口（实施代理）

**文件：** S/src/reid/{sources.ts,index.ts,types.ts,model.ts}；S/scripts/{build.mjs,check-package.mjs}；S/tests/reid-sources.test.ts；package.json/pnpm-lock.yaml、AGENTS.md。不得修改父线程models、manifest、docs和Demo。

**接口：** `getReIdModelSource(kind: 'modelscope'|'huggingface' = 'modelscope'): ReIdSource`返回防修改快照。`createReIdExtractor({modelId:'pplcnet-reid-fp32',backend:'wasm'})`默认ModelScope；source允许两个字符串或现有显式ReIdSource。modelBytes与source仍互斥，未知source拒绝。真实值来自Task1 sources.json，不造revision；允许先完成测试/构建，集成时读取最终文件。

- [ ] 先写行为红测：默认选择MS、HF显式、未知失败、修改返回快照不污染注册、两个源同模型身份、本地bytes互斥和现有自定义source保持。`expect(getReIdModelSource().kind).toBe('modelscope')`。
- [ ] 实现来源解析；公开`./reid`独立ESM/CJS/types，默认入口无静态ORT。ORT1.27.0 optional peer+dev，root调用者无需安装ORT。build只让模型子入口external动态import ORT。
- [ ] 实际npm pack消费根包及ReID两种格式和类型；确保无模型/原图/凭据，未装peer时root工作、子入口import/工厂/dispose无需ORT；root无新增运行时导出。若测试脚本需类型peer，在consumer仅显式链接测试依赖，不把它当root必装。公共类型不依赖ORT类型。
- [ ] 仅跑新增与受影响测试、typecheck/build/check:package，记录红绿并提交自己文件。不得远程或改其他代理文件。任务报告写P本计划工作区task-2-report.md。

### Task 3: 当前模型Demo与hybrid清单（实施代理）

**文件：** S/demo/src/{App.tsx,ReIdWorkspace.tsx,reid-controller.ts,...}、demo配置、tests/reid-demo.test.ts、sdk-manifest.yaml；公开入口Task2后开始。不改父线程models/docs/reports或根runtime。

**交互：** 默认保留原框/向量工作台，选择“图像+检测框”才惰性导入ReID组件。图像文件≤20MiB、解码≤8192/16777216像素；浏览器解码sRGB/RGBA非预乘，不承诺透明源文件逐字节。文本输入一帧检测数组[{box:{x,y,width,height},score,classId}]，不自动猜框或调用检测器。点击“提取并跟踪”按成功帧递增timestamp；换图保留轨迹、重置/模型来源后端切换复位。结果图像和轨迹相邻，不扩张页面长说明。

- [ ] 控制器先红测：失败/取消不推进时间或tracker，源后端切换取消并释放/复位，重复开始禁用，清理等待释放后清缓存并复位，语言切换只改文字。图像对象URL释放，异步解码竞态丢弃旧结果；失效任务不能改新状态。
- [ ] 显式来源MS默认/HF可选，后端CPU(WASM)/GPU(WebGPU)；跟踪后端始终CPU。模型load进度、错误码、耗时分层、cache估算/清理、取消和状态可见。未选择模型模式无ORT/ONNX请求。真实图片预览及结果叠加，无输入时无破图。
- [ ] 使用原CSS与tokens，390px中英文不溢出。模型信息/算法/runtime/timing/cache/state reset标记有效；一模型时“清理模型”即当前/全部此SDK模型，不清其他SDK。
- [ ] 模型资产与双源填实际数据；manifest改1.3/hybrid，modules根cpu/main、./reid wasm/webgpu/main，顶层并集与日期记录；模型parameterCount=null，cache-storage。先不声称已线上发布。
- [ ] 聚焦unit/typecheck/build及浏览器交互（真实模型验收由主代理）；提交任务文件并提供task-3-report.md。

### Task 4: 发布候选验证与交付（主代理）

**文件：** S/tests/reid-distribution-browser.mjs、双语README/docs/NOTICE、reports/2026-09-21-reid-distribution；P/reports/tracking/2026-09-21-reid-distribution与路线。

- [ ] 真实匿名双源各下载并SHA，浏览器MS+HF分别WASM/WebGPU使用固定RGBA核对参考向量；来源未混用缓存，默认框模式无引擎/模型请求。Demo用测试生成图像与人工框验证逐帧流程及取消/清理/语言/390px，不分发MOT图。
- [ ] S完整verify、模型专属browser、P标准after/相关checker与构建。历史归档固定源码哈希只针对历史commit，不改旧证据凑当前通过。
- [ ] 双语文档更新公开子入口、本地候选与线上0.1.0边界、optional peer安装、独立backend/计时、许可范围与可复现双源证据。原工作区用户文件不动。
- [ ] 任务审查与最终整体审查，问题修复复审；明确stage和中文本地commit。完整模型发布到双源，SDK/npm/Demo本次仍本地候选，真实MOT指标及视频调度后续。
