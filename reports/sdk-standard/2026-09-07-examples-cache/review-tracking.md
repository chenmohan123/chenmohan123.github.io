# 审查结论与验证边界

本轮开始于 2026-09-07，跨日后的验证应以证据中的实际 `verifiedAt` 为准。

- 已核对公开 npm OCRv6 0.1.8、Detection 0.1.1 可访问；固定版本的示例不得使用未发布的 API。
- 发布前 UI 探针：OCRv6 缺缓存容量展示，Detection 缺两种缓存动作；DocLayoutV3、LCNet 的来源选择、双语控件、390px 布局和四张缩略图已通过。
- Detection 清理后的旧检测框已复现：画布与原图有 495,121 个差异通道，清理后仍为 495,121。修复无结果时的重绘后为 0，正式回归 `apps/demo/tests/cache-overlay.spec.ts` 同时覆盖 current/all 两个动作。失败清理会显示错误且允许重试，未伪报清理成功。
- Detection 已补共享自定义缓存引用计数、auto 来源在加载开始时捕获失效代次，以及同存储 scope 内全部活动内存副本的容量汇总；对应延迟操作与真实缓存测试通过。
- OCRv6 私有会话队列 `ensure` 的直接并发复用路径仍是后续观察项，未复现为实际 Demo 用户路径的缺陷。本轮 Demo 清理会先等待 active run，再 dispose；没有将该观察计为已修复问题。
- 两库新增缓存能力仅进入源码及 Pages，没有发布 npm。示例固定公开 OCRv6 0.1.8、Detection 0.1.1，并分别验证其已有 API；两库 API 文档已标明版本边界。
- 主任务独立复跑两库完整 `pnpm verify`，均通过；Detection 额外像素回归通过。完整日志位于门户 `.tmp/ocr-examples-cache-final-verify.log`、`.tmp/detection-examples-cache-final-verify.log`。
- 候选 Demo 均完成非 fallback GPU adapter 的真实 WebGPU 推理，两种清理后 IndexedDB entries/bytes 均为 0，第二轮推理可重建缓存。证据为 `ocr-candidate-cache.json`、`detection-candidate-cache.json`。

缓存并发保证限定同一 JavaScript 执行环境，不泛化至不同标签页或 Worker。OCR 的 GPU 测试将 ONNX 传输替换为 SHA-256 匹配的仓库官方 Small 模型字节，实际 SDK、清单、字典和 ORT 推理保持真实；不作为模型精度或 ModelScope ONNX 网络可用性证据。Detection GPU 使用实际线上 ModelScope 模型传输。

历史耗时统计、实际后端报告、完整视频会话性能及检查器漏检继续保留在上一轮审计。本轮只闭环已确认的示例与缓存范围，不声称所有历史问题已清零。最终 PR、部署 SHA 和线上复查结果见同目录 README 与交付记录。
