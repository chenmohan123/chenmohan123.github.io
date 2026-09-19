# ReID / DeepSORT 可行性阶段回执

日期：2026-09-19。分层：单 SDK 调研；门户仅记录路线。建议下一阶段在同一个 `web-sdk-pp-tracking` 内实现接收外部外观向量的 DeepSORT 思路独立策略，ReID 模型随后按需接入；不拆为多个算法包。

完整双语报告、固定来源、一次性探针、原始参考/浏览器向量、耗时及复算工具保存在 Tracking SDK 的 `reports/2026-09-19-reid-feasibility/`。本机位置为 `C:/Users/chenm/.codex/worktrees/tracking-algorithms/web-sdk-PP-Tracking`，分支 `codex/tracking-algorithms`；本轮仅本地归档，没有新增远程可用链接。

## 本轮结果

- Paddle PPLCNet ReID 官方配置输出 512 维；权重 checkpoint 身份、完整预处理和独立分发依据仍需补齐。本轮未下载或转换该权重。
- 原版 DeepSORT 代码 GPL-3.0，沿用论文驱动的独立实现路线，不复制上游跟踪/Kalman 代码。
- Intel person-reidentification-retail-0288 模型清单明确 Apache-2.0，输出 256 维。它是技术探针，不是 Paddle 模型。转换并展开 MVN 后 ONNX 为 991,822 字节，SHA-256 `50ec57f754c2e277a309607ef2b27f3ce67fe89dd637bf156c9be0b7bb6362e4`。
- 八个合成张量对齐原始 OpenVINO：Python ORT 8/8 通过，Chromium 153 / ORT Web 1.27.0 的 WASM 与 WebGPU 均 6/8；全黑、全白失败，最大余弦距离约 0.03885 / 0.002741，阈值为 `1e-5`。因此模型不进入稳定或发布清单；无真实行人精度结论。
- i5-10400F / RTX 5060 Ti 上，WASM / WebGPU 单目标暖运行中位数约 19.135 / 20.185 ms；16 个目标串行约 291.000 / 214.380 ms。只含模型运行和 GPU 回读，不含图像、检测、裁剪或跟踪。未验证手机、Worker、批推理、视频、摄像头或 NPU。

## 下一步

先明确外部向量的模型/预处理身份、维度、归一化、严格缺失值策略、有界图库和事务更新，再独立实现 DeepSORT 关联层；用合成外观测试机制，用带合法图像与身份真值的同输入序列验证质量。现有 `MOT17Labels.zip` 不含图像，不能用它证明 ReID 效果。

纯外部向量算法可沿用标准 1.2.0；同包开始提供模型加载前，先扩展标准对算法/模型混合能力的声明与验证。这与[七算法设计](../../../docs/superpowers/specs/2026-09-19-pp-tracking-multi-algorithm-design.md)及独立 SDK 优先的原规划一致。模型未来仍采用 ModelScope 默认、Hugging Face 可选。

现有本地版本保持 `0.2.0-alpha.0` 两算法候选，线上 npm / HTTPS Demo / 门户生产条目保持 `0.1.0`；本轮研究不增加可选算法或 GPU 承诺。BoT-SORT、JDE、FairMOT、CenterTrack 保持后续目标，Workflow 暂缓。

## 本轮验证

SDK 前后静态检查各 17 项 required 通过、0 失败，报告为门户 `reports/sdk-standard/tracking-reid-before-20260919.json` 和 `tracking-reid-after-20260919.json`。现有 SDK 78 项测试、类型检查、构建和真实 tarball 双格式消费通过；runtime 构建哈希仍为 `a448208bc967aeebbb880fd84595f13bd93758888b6d975890f23dbbbb6046f9`。门户检查/21 页构建通过，保留七项既有提示。Playwright 确认 4204 Demo 可访问且仅显示两种已有算法。归档原始向量复算通过，但模型的 WASM/WebGPU 边界输入验收仍失败。
