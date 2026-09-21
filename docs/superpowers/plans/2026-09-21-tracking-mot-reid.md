# 三算法真实画面评测实施计划

> 执行技能：superpowers:subagent-driven-development。用户已确认继续真实序列评测。

## 依据与目标

依据 `../specs/2026-09-20-tracking-reid-module-design.md` 的第五项验收：对同一真实检测序列比较 ByteTrack、OC-SORT、DeepSORT + PPLCNet ReID 的 IDF1、IDSW、MOTA 与完整成本，再判断发布范围。

单 SDK 工作目录：`C:/Users/chenm/.codex/worktrees/tracking-algorithms/web-sdk-PP-Tracking`，基线 `e42cdd6`。门户目录为本计划所在仓库，基线 `784970d`。本轮只做本地评测、报告和提交；不涉及远程发布、门户编排或生产算法调参。

## 全局约束

- 中文文档、注释、提交；已有英文镜像保持等价。手工编辑使用 apply_patch。
- 保持 runtime、模型、默认阈值不变；禁止读取或翻译上游跟踪、匹配及 Kalman/SORT 实现。
- 固定 MOT17 七段 FRCNN 训练序列全部 5316 帧，复用 `scripts/evaluation/mot17/lock.json`、adapter、官方 TrackEval 固定提交和 Python 依赖。GT 仅评分器可读，不能进入特征提取、跟踪或选参。
- 图片来自同一官方 MOT17.zip，固定此前读取的 ETag/大小，按条目 CRC32 与 SHA256 记录。仅本地使用，不归档原图、完整GT和检测数据。
- 所有算法使用当前同一构建和同一适配检测序列；保留全部检测行顺序、空帧和时间戳。ReID 以检测框裁剪，不预筛分数、不使用 GT 框。
- WebGPU 真实 SDK 提取全量特征，按每批最多64个检测分块，全部成功后整帧一次跟踪；严禁丢弃余下检测。模型未执行的算法不伪造模型耗时。
- 三算法 Node 冻结输入重复两次验证 MOT/非耗时结果确定性。真实浏览器提取同时运行三算法；浏览器输出与 Node 对齐。GPU 与 WASM 在预先固定的 MOT17-02 前30帧做特征与跟踪补充比较，不把该子集写成全量CPU模型评测。
- 模型加载、图片获取、解码、特征提取、关联、外围帧总耗时分别记录；外围总耗时独立计时。预计算特征后的 Node 关联耗时不能称作视频端到端。检测器、渲染和评分均明确不计入。
- 输出只写新的本仓库 `.tmp` 子目录；拒绝已有目标、路径逃逸、未知模式。归档报告附输入/脚本/构建/模型身份、评分证据、环境与复跑方式。
- 不按结果调参或选择有利序列；训练集观测不能称排行榜、官方复现或跨设备兼容。pnpm 使用仓库约定两个配置参数。

## Task 1：真实画面评测工具

在 SDK `scripts/evaluation/mot17-reid/` 新建独立工具，可复用旧评测模块，不改变旧默认评测行为。主线程并行准备 `S/.tmp/mot17-reid-media/data/<sequence>/img1/<frame:06d>.jpg` 和 media.lock.json。

工具接收 `--input`（旧 labels 解包目录）、`--images`（上述 data）、`--model`（固定模型本体）、`--python`、`--trackeval`、`--out`（全新 .tmp 目录）；模型 SHA/字节必须校验，输入 label 身份以旧 summary.inputHashes 或固定 zip 解包身份验证；不得任意接收无锁输入并称为固定数据。图片按 media.lock.json 逐项核验。

使用 Playwright Chromium、实际 SDK `dist/reid/index.js` 和 `dist/index.js`；构建离线 harness、localhost服务、ORT本地资源可复用现有 probe 的模式。保存逐帧特征到本地，控制内存；每帧特征带固定 featureSpaceId，校验数量、维度、有限值和输入对应关系。允许按序列完成检查点以便长任务恢复，但恢复须校验输入/源码/构建/模型身份，不能静默覆盖混用输出。若不实现恢复，采用每序列独立新输出再合并。

Node 三算法共同公共参数来自旧 lock；DeepSORT 不传低分专属参数，保留其 maxCosineDistance=.2、gallerySize=30。浏览器真实提取时相同顺序分别运行三种跟踪器；保存MOT与剔除timing的JSONL，可逐帧输出/哈希，不能把所有图片同时读入内存。完整跑完后调用原 evaluator.score API 官方合计，不平均百分比。

以TDD增加有意义的行为测试：65个检测仍逐项保序且整帧一次update；特征失败不能更新部分帧；0检测帧保留；错误模型/图片hash拒绝；非法输出目录拒绝；公共参数没有错误分支字段；特征行错位/数量不匹配拒绝。提供先RED后GREEN证据，针对性测试后运行仓库必需 typecheck/test/build/check:package，一次即可。

交付双语复跑说明及脚本。主线程负责正式数据执行，工具不可写成已有评测结论。中文本地提交；实施报告写入本计划 scratch 的 task-1-report.md。独立任务审查通过后进入正式评测。

## 正式执行（主线程）

取得7段完整图片；固定数据身份；正式运行工具并核对容量丢弃为0、全帧覆盖、真实后端、重复确定性、浏览器对齐和 TrackEval 合计。小规模预检只检查可运行与成本，不查看评分来选择正式范围。运行时定期反馈完成帧数和剩余步骤。所有原始媒体/向量/逐帧输出留在 .tmp。

## Task 2：归档与发布判断

仅消费完成的实际结果，建立 `reports/2026-09-21-mot-reid/` 双语报告、protocol、公开精简summary、SHA证据锁和校验脚本。更新SDK双语performance/compatibility、候选状态，以及门户路线中的下一步；不得改线上版本/生产manifest状态。

清楚报告三算法总计与逐段 IDF1/IDSW/MOTA/FP/FN、Node关联和浏览器完整成本边界。较少换ID不自动等于总体更好。发布建议区分默认稳定策略与显式可选实验策略，记录未覆盖场景，不因不利结果调参。原始数据不分发。

主线程在任务审查和最终整体审查后执行门户sdk:check after、相关文档检查和证据锁验证；本地中文提交并确认两工作树干净。已有旧scratch保留，不能重试此前被拒绝的删除。最终向用户汇报数字、实际成本、发布建议和下一步，不发布远程。
