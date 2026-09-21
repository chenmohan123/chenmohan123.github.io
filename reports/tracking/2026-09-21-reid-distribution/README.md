# Tracking ReID双源与本地工作台回执

日期：2026-09-21。分层为单SDK；门户仅同步路线和验收记录，生产registry仍为已发布0.1.0，未接入Workflow或复制推理代码。

## 本阶段结果

Tracking本地0.2.0-alpha.0已公开同包`./reid`入口（ESM/CJS/types），根CPU/main算法与可选WASM/WebGPU模型分开加载。ORT1.27.0为optional peer，实际无ORT的根调用者消费通过。默认ModelScope、Hugging Face可选，显式来源失败不静默切换。

固定PPLCNet人体FP32模型33,704,835字节，SHA256 `24d347f47405bb1bd24fd582783507edbcb16571d2e845d0528b0ad7856336e4`。已真实上传`chenmohan/web-sdk-pp-tracking`：MS revision `dc3d9f7a97be4033e654525f0e9d3fbd5eaf7c9b`，HF `02c299b5b5618315fc754002b7ea7c95c95e8a82`。两源匿名完整下载/hash回读通过，上传模型卡、LICENSE/NOTICE与元数据；模型不进Git/npm。

采用固定官方仓库整体Apache-2.0作为官方明确链接checkpoint转换分发依据，保留署名、Market1501训练披露以及未找到checkpoint专属声明/完整训练过程的边界。模型参数数目null；8,419,792仅作含BN状态元素。上游固定README、独立ReID文档和LICENSE的URL/status/hash已归档；不把未找到材料写成禁止或额外授权。

新Demo模式接收本地图片与调用者人体框，模型提取后调用DeepSORT，保留默认框/向量工作台。图像20MiB、每维8192、总像素16777216，单帧32框；同尺寸换图保留轨迹，成功帧才推进100ms，取消/失败不推进。模型/关联后端与耗时分别展示，复位与缓存清理分开，清理等待释放且保留其他SDK缓存。没有检测器或视频/摄像头假入口。

## 验证

- 模型真实MS/HF×WASM/WebGPU四组合各独立冷下载通过；首个真实RGBA裁剪对独立Paddle参考，最大绝对差分别2.459e-7与2.536e-7，余弦与单位范数通过；NVIDIA Blackwell为非fallback。
- Vite生产Demo实际MS/WASM、HF/WebGPU完成连续帧，验证换图ID、语言保留、非法输入不推进、取消下载、切换来源后端复位、清理与其他缓存保留。390px中英无横向溢出，默认/仅进入图像模式无引擎权重请求。
- SDK完整verify：164项单测、12组原有浏览器检查、两个包入口实际ESM/CJS/NodeNext消费、核心/Demo/Vanilla/React构建通过。ORT惰性chunk有Vite500kB提示，默认路径不加载。
- [标准before](../../sdk-standard/tracking-reid-distribution-before-20260921.json)17 required通过；[after](../../sdk-standard/tracking-reid-distribution-after-20260921.json)21通过、0失败、4远程skip，为hybrid本地合规。
- [门户构建](portal-build.log)21页，0errors/0warnings/7既有hints。门户只改文档，无标准或产品代码变化，不重复此前完整标准矩阵。
- SDK `reports/2026-09-21-reid-distribution/`保存双语报告、原始向量/机器日志/截图/包身份与hash锁。离线`verify_archive.mjs --current`复算四向量，并核对源码LF/dist/实际tarball通过。

环境：Windows11 10.0.26200、i5-10400F、RTX5060Ti驱动32.0.16.1692、Chromium153.0.8010.12、ORT1.27.0、Node24.16.0。本轮不扩展手机、Safari/Firefox、Worker或NPU声明。人工图片及重复帧只作接口验证，不证明真实MOT精度或端到端FPS。

## 范围判断与下一阶段

1. 当前确认涵盖已提出的真实模型双源分发和本地SDK接入；GitHub/npm/线上Demo留后续发布阶段。若范围理解需调整，代价是撤回模型新增版本或调整发布安排。
2. 使用官方整体许可作为其明确链接权重的分发依据，并明示独立声明和训练披露缺口；若出现额外条款，须重新复核分发材料。
3. 参数数目填null，避免把含BN状态元素冒称可训练参数；后续独立统计后再更新。

与最初七算法路线一致：同SDK按输入能力逐步接入，不把未来算法登记为已实现。下一阶段固定相同检测序列，对ByteTrack、OC-SORT和带PPLCNet的DeepSORT测量IDF1/IDSW/MOTA及完整成本，再作0.2发布判断。视频/摄像头帧调度、BoT-SORT、JDE、FairMOT、CenterTrack继续后置，门户整合暂缓。
