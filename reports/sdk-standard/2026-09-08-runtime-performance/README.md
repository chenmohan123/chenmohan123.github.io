# 运行时与耗时整改交付记录

> 归档说明（2026-09-09）：本目录是 2026-09-08 的整改交付快照，保留当时的版本、网络替换方式与验证结论。
> 后续真实模型站点传输、取消重试和缓存复用见
> [2026-09-09 线上验收](../2026-09-09-real-network/README.md)；后续版本发布见
> [npm 发布记录](../2026-09-08-npm-published/README.md)。

日期：2026-09-08（Asia/Shanghai）。层级：单 SDK；标准 v1.1.0。

本轮承接四个 Demo 持续整改，完成 OCR 与 Detection 的耗时、实际后端和连续媒体问题。此前四库的样式、模型来源、示例及缓存整改保持已交付状态。本轮分别 PR、正常合并 main、发布 Pages；未发布 npm、改版本或移动历史标签。

## 交付结果

| 仓库 | PR | 合并 main | main CI | Pages |
| --- | --- | --- | --- | --- |
| Detection | [#25](https://github.com/chenmohan123/web-sdk-PP-Detection/pull/25) | `5adeb3963a61f722d7570139beec7631df6cc351` | [通过](https://github.com/chenmohan123/web-sdk-PP-Detection/actions/runs/34178788473) | [通过](https://github.com/chenmohan123/web-sdk-PP-Detection/actions/runs/34178788530) |
| OCRv6 | [#18](https://github.com/chenmohan123/web-sdk-PP-OCRv6/pull/18) | `9cc1f8d9da54164a77bcb9ea781cedebddb6139e` | [通过](https://github.com/chenmohan123/web-sdk-PP-OCRv6/actions/runs/34179356388) | [通过](https://github.com/chenmohan123/web-sdk-PP-OCRv6/actions/runs/34179356377) |

PR 必需检查均成功后合并，无管理员绕过。两个 Pages 工作流的提交与对应合并提交一致。仓库保护、github-pages 环境、HTTPS 与工作流来源的只读快照保存在 [delivery.json](delivery.json)。

## 修复和验证

- Detection：完整初始化墙钟、真实模型获取来源、ORT 版本及环境快照；后端回退不改写旧结果；视频和摄像头按完整配置复用会话，修复切换媒体误停与过时配置；初始化总耗时包含 Demo 清单获取。
- Detection 独立审查发现既有 Worker 回退输入失效。实际 WorkerBridge 与原生缓冲区转移回归，修复前 DataCloneError，修复后 CPU 重试和后续检测均成功。
- OCR：当前调用与历史初始化分开，显式预加载、懒加载、中途加入初始化采用明确边界；修复空检测重复累计与入口解码遗漏；报告实际 DET/REC 后端，Demo 直接测量初始化及端到端墙钟。
- OCR 独立审查发现旧自定义组件缺少可选 loadState 会误报 warm。新增 7 项兼容回归，先 3 项失败，修复后全部通过，未知状态保持省略。
- Detection `pnpm verify`、Demo 类型与构建通过：132 项 SDK、14 项基准 parity、35 项 Demo 浏览器测试及其他契约检查。
- OCR `pnpm verify`、SDK/Demo 类型与构建通过：115 项 SDK、14 项 Demo/示例单元、33 项 Demo 浏览器测试；两库 PR 和 main CI 再次通过。
- 两库修改前后标准检查均为 required 18 通过、0 失败、4 远端跳过，recommended 3 通过。原始文件为 `detection-before.json`、`detection-after.json`、`ocr-before.json`、`ocr-after.json`。本地规则匹配不等于所有业务缺陷清零。

## GPU 与线上验收

环境：Windows、Chromium 151、NVIDIA Blackwell 非软件回退适配器、ORT 1.27.0。

- [Detection 本地 SDK](detection-sdk-gpu.json)：官方 PicoDet FP32，main/Worker，网络模型和缓存命中，各会话两次推理；每个会话检测到 12 个目标，包含 person。
- [OCR 本地 SDK](ocr-sdk-gpu.json)：官方 small DET/REC，main/Worker，懒加载与缓存预加载，各会话两次识别；八次均识别 146 行，实际组件均为 WebGPU，热运行加载四项为零。
- [Detection 线上](live-Detection.json)：真实已发布页面、SDK 和清单，连续两次 GPU 图片检测成功，来源从网络变为缓存，实际 ORT 与浏览器环境可见。
- [OCR 线上](live-OCRv6.json)：真实已发布页面、SDK 和清单，连续两次严格 GPU 识别成功，DET/REC 实际后端正确，第二轮显示热运行且初始化等待为 0.0ms。
- [四个 Demo 线上 UI](four-demo-ui-smoke.json)：全部通过。默认 ModelScope，仅可选择 ModelScope/Hugging Face；缓存控件、中英文切换、示例图片加载、390px 无横向溢出与无页面异常。两张受影响 Demo 的移动截图已人工复核，四张截图一并保存在本目录。

模型请求替换为经 SHA-256 校验的相同本地官方 ONNX 字节，以隔离大模型传输；运行真实 SDK、ORT 与 GPU。线上用例仍读取线上清单。这些结果不等于托管站大模型下载的可用性保证或跨设备性能基准。FP16、其他量化、NPU、移动硬件和微信未新增兼容承诺。Worker 失败回退采用可控故障，不冒充物理 GPU 故障。

## 收尾状态

四个 SDK 工作区均处于干净 main；两个本轮修改库已快进到合并提交。本轮自行启动的测试服务已关闭，未启动自托管 runner。门户保留本报告与两轮历史未跟踪报告，未混入 SDK 提交。

早期 `detection-preview-verification.json` 是隔离副本历史记录；最终验收以上述实际工作区、main CI、Pages 和线上证据为准。权限问题已恢复，不存在待确认的发布步骤。
