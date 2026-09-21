# DeepSORT 外部向量阶段回执

日期：2026-09-19。分层：单 SDK。本阶段在同一个 `web-sdk-pp-tracking` 中实现第三种策略，接收调用者提供的外观向量；ByteTrack 继续默认。版本保持本地 `0.2.0-alpha.0`，线上 npm、HTTPS Demo 与门户生产条目仍为 `0.1.0`。

SDK 工作树：`C:/Users/chenm/.codex/worktrees/tracking-algorithms/web-sdk-PP-Tracking`，分支 `codex/tracking-algorithms`。没有执行新的远程发布。设计和实现边界见[专门设计](../../../docs/superpowers/specs/2026-09-19-pp-tracking-deepsort-design.md)与[实施计划](../../../docs/superpowers/plans/2026-09-19-pp-tracking-deepsort.md)。

## 接口与算法

- `algorithm: 'deepsort'` 要求固定 `featureSpace: { id, dimension }`；每帧带相同的 `featureSpaceId`，每条检测带 `embedding`。
- 向量维度、有限值、非零范数和特征空间均严格校验，包括随后被分数过滤的检测。内部复制并稳健归一化，失败整帧回滚。
- 基于论文概念独立实现最近邻余弦图库、四维运动门控、新鲜轨迹优先的匹配级联，以及仅用于未确认和本帧开始仍 tracked 轨迹的 IoU 后备。
- 图库容量和总标量容量有上限；失效轨迹、reset、dispose 清理状态。框架无关、无生产依赖、CPU/main。
- 本项目使用八维 cx/cy/w/h、秒级 Kalman 和毫秒分组级联；不是上游逐值移植。相似外观、遮挡和相机运动仍可能产生 ID 切换。

## 验证结果

核心提交 `28cb83a` 已通过独立规格和质量审查。聚焦测试先得到 14 项预期失败，再实现到最终 19/19 通过；首次完整单元回归为 95/95。Demo 与文档提交 `fc3adeb` 后，完整 `npm run verify` 退出0：102/102 单测、三算法真实 tarball 的 ESM/CJS/TypeScript 消费、核心/Demo/Vanilla/React 构建及11组 Chromium 交互全部通过。SDK 完整中英回执位于 `reports/2026-09-19-deepsort/README.md`。

任务审查发现切换示例会意外应用参数草稿，已在 `5b7c714` 修复为沿用已生效配置；RED 实测 `0.9 !== 0.2`，修复后 Demo 类型检查/构建及11组浏览器交互通过，范围复审通过。旧完整日志保留，本次追加修复日志；不是抹去失败后重新声明全程无错。

最终整体审查发现合法高维输入的格式化报告可能超过5MiB，已在 `4833dbf` 增加有界紧凑“导出输入序列”，与结果报告区分。准备与下载共用UTF-8大小检查；新增512维1000帧实际下载重导入、临界字节数和失败原子性测试。最终Demo聚焦14/14、浏览器12组、类型检查/构建和三算法包消费通过；最终范围复审确认问题解决，无新增重要问题，**可本地交付**。新包22,522字节，SHA256 `2a8c4aa4be4ee02698835aae18d45e27a83497676ac6cf1c4b06d13634cb7c0f`，旧包记录保持原样。

最终4204独立预览基于4833dbf构建：三算法可选择，DeepSORT交叉样例3帧后两条确认轨迹，pageErrors为空；1440px截图复核及390px中英文无横向溢出。390px仅是桌面视口，不是手机测试。所有浏览器证据限 Windows11 / Intel i5-10400F / Chromium153.0.8010.12 / CPU main。

修改前、修改后与补丁后最终标准检查均为17项 required通过、0失败，分别见 [before](../../sdk-standard/tracking-deepsort-before-20260919.json)、[after](../../sdk-standard/tracking-deepsort-after-20260919.json)、[final](../../sdk-standard/tracking-deepsort-final-20260919.json)。仅声明 locally-compliant，不代表新版本远程发布。门户 `build` 通过：Astro 检查59文件，0 errors、0 warnings、7条既有 hints，21页静态构建成功。既有 hints 来源是历史评测脚本和 registry 的弃用 API。

最终补丁后另存 [acceptance 检查](../../sdk-standard/tracking-deepsort-acceptance-20260919.json)，同为17项required通过、0失败。全部审查回执在 SDK `reports/2026-09-19-deepsort/review/`，最终截图在 `preview-acceptance/`。

## 证据边界与后续

本次合成外观向量用于验证关联机制；不能证明模型识别质量或真实视频 ID 指标提升。已有 ByteTrack/OC-SORT 的 MOT17 同输入评测保持原样，不把本次合成结果合入历史质量表。

后续先核验 Paddle PPLCNet ReID 的具体 checkpoint、权重许可、预处理和 Python/浏览器数值，再以包含真实图像与身份真值的数据完成同输入评测。此前 OMZ 0288 的全黑/全白浏览器失败证据保留，尚未接入。模型加载前先演进算法/模型混合标准，未来仍以 ModelScope 为默认、Hugging Face 可选。

BoT-SORT、JDE、FairMOT、CenterTrack 仍是后续路线，视频/摄像头及门户 Workflow 不属于本次实现。
