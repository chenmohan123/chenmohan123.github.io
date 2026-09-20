# Tracking 混合标准与可选 ReID 模块实施计划

> 面向执行代理：使用 superpowers:subagent-driven-development 按任务执行，保留失败测试、实现、审查和验证证据。

**目标：** 实施标准 1.3.0，并完成同包 ReID 源码模块的本地候选闭环，不提前发布权重或公开模型入口。

**架构：** 门户只维护标准；Tracking 的框关联与图像特征提取分离。根包继续三算法 CPU/main；候选模块按既定子入口结构实现、单独构建至忽略目录，用真实模型字节完成 WASM/WebGPU 验收。正式 exports、模型分发清单及 Demo 随可核实双源材料一并启用。

**技术栈：** TypeScript、Vitest、JSON Schema/Ajv、ONNX Runtime Web 1.27.0、Playwright Chromium。

**设计：** `docs/superpowers/specs/2026-09-20-tracking-reid-module-design.md`；`standards/v1/proposals/algorithm-model-hybrid.md`。

## 全局约束

- 门户 P：`C:/Users/chenm/.codex/worktrees/segmentation-portal/chenmohan123.github.io`；SDK S：`C:/Users/chenm/.codex/worktrees/tracking-algorithms/web-sdk-PP-Tracking`。复用已有隔离工作树，基线分别 `8b80ea8`、`4bbd3d5`。
- 中文代码注释、文档和提交；已有英文镜像保持等价；手工编辑使用 apply_patch。
- 所有 pnpm 命令加 `--config.verify-deps-before-run=false --config.manage-package-manager-versions=false`。
- 不读取/复制上游跟踪、matching 或 Kalman 实现；允许使用本项目已验证的预处理规则。
- 不执行远程 push/PR/merge、npm 发布、模型上传或门户生产 registry 修改。
- 先完成标准，再写生产模块。模型 SHA 为 `24d347f47405bb1bd24fd582783507edbcb16571d2e845d0528b0ad7856336e4`，bytes 为 33704835，输入 crops float32[1,3,192,64]、输出 save_infer_model/scale_0.tmp_0 float32[1,512]。
- 已解码 sRGB 非预乘 RGBA8，宽高各≤8192，总像素≤16777216。完整图内浮点 xywh，score∈[0,1]、classId非负安全整数。默认 maxDetections=32，上限64。复制输入后异步处理，禁止共享/分离缓冲。
- 同实例最多一次 load/extract，BUSY；取消等待当前 run 后丢弃整帧；dispose 立即禁止新调用并等待当前操作再释放。错误和失败不返回部分向量。
- featureSpace绑定上述完整SHA、`rgba8-white-upright-rgb-halfpixel-f64-imagenet-f32-v1`、`l2-f32-v1`，512维，不超过现有Tracker的256字符限制。
- 标准before/after必须运行；候选模型模块单独验收，核心algorithm清单的通过不能证明候选模块已满足模型分发/Demo发布门槛。

## 范围裁定

模型源尚未上传，不能造 URL/revision，也不能让已经公开导出的模型功能仍以纯 algorithm 清单绕过模型门槛。因此本轮提交可复用源码 `src/reid/`、候选构建/测试/文档，**暂不加入 package.exports 和发行 dist**。浏览器使用候选真实构建产物验证；下一阶段具备真实源后启用公开 `web-sdk-pp-tracking/reid`。本地字节工厂与远程来源接口均实现，远程路径通过受控HTTP/CacheStorage验证，正式hub可用性不冒称通过。该裁定是设计分阶段接入的具体化，不新增标准豁免。

### Task 1: 标准 1.3.0 的混合声明

**文件：** P 的 `standards/v1/{README.md,README.en.md,sdk-contract.md,demo-contract.md,performance-contract.md,docs-release-contract.md,rules.yaml,sdk-manifest.schema.json}`、`templates/sdk-manifest.hybrid.yaml`、`proposals/algorithm-model-hybrid.md`；`tools/sdk-standard-check/src/{manifest.mjs,discover.mjs,rules.mjs,types.mjs}`、新 `hybrid.test.ts` 及必要既有测试。

**输入/输出：** 消费已批准提案；产出完整 validateManifest/scanRepository 对hybrid的支持，保持旧model及algorithm结果兼容。

- [ ] 编写实际checker临时仓库测试，最小成功场景 `const value={...modelFixture,schemaVersion:'1.3.0',kind:'hybrid',algorithm:algorithmFixture.algorithm,modules:{algorithm:{entry:'.',runtime:cpuRuntime,performance:algorithmPerformance},model:{entry:'./reid',optional:true,runtime:wasmRuntime,performance:modelPerformance}}}; expect(validateManifest(value)).toEqual([]);` 顶层是两模块并集；验证旧版本/缺任一分支/同入口/不存在exports/false optional/错误后端/缺timing/缺模块日期/破损清单/无两类Demo标记均失败。
- [ ] 运行 `pnpm ... sdk:check:test` 记录预期失败至 `.tmp/reid-module-standard-red.log`。
- [ ] 实施schema、规则、checker、模板和契约。hybrid同时适用算法/模型规则，新增HYBRID-001，顶层并集检查，exports入口存在；模型只wasm/webgpu、算法cpu，actualBackendReported必须true；验证模块证据日期及runtime字段；schemaVersion1.3允许model/algorithm，旧版hybrid拒绝。
- [ ] 跑checker全套；更新中英文入口和提案实施状态，保留日期历史。只提交本任务文件，中文提交。报告包含红绿命令、退出码、测试数和限制。

### Task 2: ReID 模块源码及生命周期

**文件：** S 新 `src/reid/{index.ts,types.ts,errors.ts,model.ts,preprocess.ts,assets.ts,ort.ts,extractor.ts}`，`tests/reid-*.test.ts`，`scripts/build-reid-candidate.mjs`；package仅增加候选脚本与开发期ORT依赖，禁止增加生产exports/dist条目。根src/index.ts与三算法不变。

**接口：** `createReIdExtractor(options: ReIdOptions): ReIdExtractor`，`ReIdOptions={modelId:'pplcnet-reid-fp32',backend:'wasm'|'webgpu',maxDetections?:number} & ({modelBytes:ArrayBuffer;source?:never}|{source:ReIdSource;modelBytes?:never})`。ReIdSource含kind(modelscope/huggingface)、repository、revision(40–64hex)、path、downloadUrl(https)、bytes、sha256，bytes/hash必须对应固定模型；不内置虚构hub。`load({signal?,onProgress?}?) => Promise<ReIdLoadResult>`；`extract({image,detections},{signal?}?) => Promise<ReIdResult>`；`dispose()=>Promise<void>`；只读featureSpace。`clearReIdCache()=>Promise<void>`、`estimateReIdCache()=>Promise<{bytes:number,entries:number}>`仅触及本SDK命名空间。

**返回：** load有runtime/timings/source/cache状态；extract有featureSpace、按输入顺序绑定embedding的Detection[]、runtime与timings。runtime有requestedBackend/actualBackend/main/runtimeVersion/ortVersion，WebGPU实际设备身份可附；load与extract分开total。耗时涵盖验证复制/输入Tensor构造/输出回读释放，decodeMs=0；WASM一线程basic、GPU禁止CPU EP fallback。

- [ ] 按行为先写失败测试：红像素手算、非方形方向/分数框/透明白底、非法尺寸/共享buffer、错误hash在session前拒绝、load幂等、BUSY、取消各阶段、dispose等待、全帧校验先于推理、输入异步复制、非有限/零向量、顺序绑定、cache错hash不使用、不换源、失败后可重试。真实ORT仅在浏览器跑，unit在最底层ORT依赖替身控制run/session等待，生产不暴露测试后门。
- [ ] `pnpm ... test -- tests/reid-*.test.ts` 或显式文件运行保留红证据；实现分文件模块。错误码含INVALID_INPUT/INVALID_MANIFEST/UNSUPPORTED_BACKEND/DOWNLOAD_FAILED/INTEGRITY_FAILED/OUT_OF_MEMORY/SESSION_FAILED/INFERENCE_FAILED/ABORTED/BUSY/NOT_LOADED/DISPOSED；失败安全原因不泄漏URL凭据。
- [ ] 资产流必须有bytes硬上限，网络错误/取消清理reader；缓存命中仍SHA，错误缓存删除并报完整性错误，缓存不可用可显式报告未缓存但不虚构命中；本地bytes不持久化。模型字节在工厂同步复制，extract复制图像和metadata；释放持有的模型字节/session/Tensor。
- [ ] 候选构建产出`.tmp/reid-module/dist/reid.js`及类型，动态import ORT在load才发生；脚本使用esbuild并将ORT external，浏览器由集成脚本打包/映射。根包无新增强制依赖、网络或模型。
- [ ] 单测、typecheck、候选build通过，中文提交；报告精确接口、测试、资源边界。不得更新manifest或宣称已发布。

### Task 3: 真实浏览器、包边界与文档验收

**文件：** S `tests/reid-browser.mjs`、双语 `docs/{zh-CN,en}/reid-candidate.md`、根README中英候选说明、`reports/2026-09-21-reid-module/`；P `reports/tracking/2026-09-21-reid-module/`、after标准回执和路线进度。

**输入：** Task2精确API及候选产物，固定模型和上轮RGBA fixtures；原始参考从上轮 `python-result.json.gz`读取，不能用自身输出充当期望。

- [ ] 浏览器验收脚本先在缺模块时失败；使用localhost，不上传数据。测试34组raw RGBA对Paddle已存向量的归一化cosine/maxAbs门槛，两后端各运行；GPU禁CPUfallback且回读实际adapter；重复相同真实帧送DeepSORT保持ID（只做接口一致性，不宣称真实时间序列质量）。
- [ ] 本机真实CacheStorage/HTTP截获受控source，校验下载、命中、只清理自己cache、错误字节、取消后下一次extract成功；原始前端无ORT/ONNX网络请求，候选仅load后加载ORT。
- [ ] 跑S完整verify及候选browser，记录环境、hash、timing口径和局限；P全套test/build与sdk:check after。保留核心包实际消费与无候选发行代码证据，不能扩大core checker结果。
- [ ] 更新双语文档、标准/模块回执、审查与路线。本地源码模块完成，公开入口、hub分发、Demo模型控件和真实跟踪质量仍后续；独立审查无阻塞后中文提交，保持原工作区用户文件。
