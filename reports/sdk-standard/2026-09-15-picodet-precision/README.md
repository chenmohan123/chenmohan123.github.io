# PicoDet 精度扩展门户验证

2026-09-15：Detection 新增 14 个已发布稳定资产，当前 13 个规格、37 个变体。门户仍登记四个独立 SDK，链接各自 Demo。新增资产逐项匹配 Detection 本轮 published-jobs 与 1.0.1 清单的 ModelScope URL、bytes 和 SHA-256。默认 L-320 / FP32 / ModelScope，npm 保持 0.4.0。XS 两个未达标 W8A32 未登记。

51 项单元/标准测试、构建和 6 项浏览器页面测试通过，包含新增资产、第四个项目与 390px 视口检查。验证日志摘要见 validation.json；没有把本次桌面证据扩展成手机或 NPU 兼容声明。

Detection [PR #71](https://github.com/chenmohan123/web-sdk-PP-Detection/pull/71) 已合并，正式 HTTPS Demo 的 [Pages 部署 #34953535988](https://github.com/chenmohan123/web-sdk-PP-Detection/actions/runs/34953535988) 成功，源提交为 `025e207ff0a6a3a4e07f0a4c5b02834969b199ce`。

- `sdk-production.json`：Windows 11、Chromium 153.0.8010.12，14 个新增变体 × CPU/GPU 共 28 组正式 UI 检测全部通过；清单字节与部署提交一致，导出结果的模型、精度、来源 revision/SHA 与实际后端一致，无 SDK 后端回退或页面异常。默认选项及两个来源检查通过。
- `sdk-legacy-manifests.json`：八个历史清单地址全部返回 200，内容与原有提交字节一致。
- `validation.json`：记录上述文件的大小、SHA-256 和部署关联，保留本地门户验证日志。

门户合并后核验自身的正式 Pages 提交、四项目入口、37 个 Detection 资产及 390px 布局，结果保存在本轮工作树 `.tmp/picodet-precision/production/verification.json`，不将尚未执行的门户线上检查写为通过。
