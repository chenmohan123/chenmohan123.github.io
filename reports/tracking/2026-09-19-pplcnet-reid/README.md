# PPLCNet ReID 本地研究回执

日期：2026-09-19。分层：单 SDK 研究；门户仅更新规划。**PPLCNet ReID FP32 转换与 Python/WASM/WebGPU 数值验证已通过，可继续推进同包可选特征提取模块。** 预处理契约和分发说明仍需完成，当前没有把它声明为稳定或接入线上。

完整双语报告与原始证据位于 Tracking SDK 工作树 `C:/Users/chenm/.codex/worktrees/tracking-algorithms/web-sdk-PP-Tracking/reports/2026-09-19-pplcnet-reid/`，分支 `codex/tracking-algorithms`。当前本地版本仍为 `0.2.0-alpha.0` 三算法候选，线上仍为 `0.1.0`；本轮未修改生产 manifest、运行时、Demo、门户 registry，也未执行远程操作。

SDK 本地研究提交：`b29b0f1`（评测：完成 PPLCNet ReID FP32 转换与双后端验证）。

## 结论与证据边界

- 固定 PaddleDetection `b25522a0f4bde8c80603f3ba5e3472059972e3b5`。README/配置两条官方权重链接实际相同，checkpoint SHA-256 为 `abce7d12af14b5b5c10c287ba01517470db3247ee06e3beeaa5ffc1c76628758`。
- FP32 ONNX 为33,704,835字节（32.14 MiB），opset17，`[1,3,192,64] → [1,512]`，SHA-256 `24d347f47405bb1bd24fd582783507edbcb16571d2e845d0528b0ad7856336e4`。全部146个推理状态张量加载完整，不使用额外训练分类头。未复制或导入上游跟踪/Kalman实现。
- 代码根许可与模型/预处理文件头为 Apache-2.0；本轮读取文件未包含 checkpoint 独立模型卡与完整训练数据条款。没有将代码许可自动等同所有权重/数据条件，也没有据此宣称权重禁止商用；模型分发说明待补齐。
- 对原始 Paddle 2.6.2 的32组输入（8边界/纹理、24真实裁剪），Python ORT、浏览器WASM、WebGPU均32/32通过；最大绝对差分别约 `1.55e-6`、`2.35e-6`、`2.44e-6`，预先门槛为`1e-3`且余弦距离`1e-5`。旧OMZ全黑/全白失败不因该模型通过而消失。
- Windows11/i5-10400F/RTX5060Ti、Chromium153、ORT Web1.27.0下，最终探针单目标暖运行中位数WASM33.925ms、WebGPU5.932ms；16目标串行550.300ms/97.730ms。从ORT实际GPUDevice回读硬件身份，显式禁止GPU静默降级，包含输出回读，不含检测、图像预处理或跟踪；不是完整视频帧率。最初探针的原始记录也保留，未跨轮挑选最佳耗时。
- 固定MOT17两个训练序列各6帧，共120个实际裁剪、25个图库身份、95次查询。正常RGB第一名正确87/95（91.58%），正常BGR85/95，上游转置BGR75/95。模型特征能区分部分真实身份，但这是同摄像头小样本，未计算IDF1/MOTA，没有证明真实跟踪提升。
- 上游部署预处理会转置裁剪并反转RGB为BGR；本轮对该事实做了逐值确认。正常RGB虽有更高Rank-1，距离0.2下的拒真/认假并不同时优于正常BGR，因此不能直接确定最终颜色顺序或阈值。浏览器Canvas与OpenCV裁剪/缩放尚未逐像素验收。

## 下一阶段

1. 固定正常朝向、颜色、裁剪边界、插值和归一化契约，用独立样本确认通道及阈值，核对浏览器图像预处理；补齐分发模型卡与来源说明。
2. 模型加载接入前先演进标准1.2.0的算法/模型混合声明，然后在同一个SDK增加按需特征提取模块；关联仍CPU，模型WASM/WebGPU分别报告。ByteTrack调用者无需加载模型或ORT。
3. 在相同真实检测输入上评测三种策略的ID指标和全链路成本，再决定稳定与发布。ModelScope默认、Hugging Face可选的方向保持一致。

这是[七算法路线](../../../docs/superpowers/specs/2026-09-19-pp-tracking-multi-algorithm-design.md)的继续推进，没有变成门户编排。BoT-SORT、JDE、FairMOT、CenterTrack、视频/摄像头及Workflow仍待后续阶段。

## 本地验证

SDK完整verify通过104/104单测、类型检查、全部构建、三算法真实包消费和12组浏览器检查；原始向量、全部查询及性能统计独立复算通过。runtime及22,522字节tarball哈希与本轮开始相同，说明研究资产未混入发行包。

标准[before](../../sdk-standard/tracking-pplcnet-reid-before.json)/[after](../../sdk-standard/tracking-pplcnet-reid-after.json)各17项required通过、0失败。门户99/99测试，Astro检查0errors/0warnings、7条既有hints，21页构建成功；日志归档为 `portal-test.log` / `portal-build.log`。没有新增远程合规或发布声明。
