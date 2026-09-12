# PP-Detection 下载恢复与六变体接入维护验证

日期：2026-09-12。SDK 基线 `2bf1bc2`，门户基线 `e30f186`。

本轮为已发布六个稳定模型补齐接入说明、示例和门户登记，并为 ONNX 权重下载增加可取消时限和有限同源重试。SDK/npm 版本仍为 0.3.1；新下载能力是本地未发布维护改动。模型资产、清单版本及已发布字节没有修改。

## 实现范围

- 可选 `download` 参数：每次请求总时限默认 180 秒，无新增字节时限默认 30 秒，最多重试 2 次；时限可用 0 关闭，重试范围 0 至 5。
- 仅网络/流错误、内部超时和 HTTP 408/429/500/502/503/504 重试同一固定 URL，等待可取消；完整性错误、用户取消、错误 206 和其他 HTTP 不重试。
- 每次从 0 重新下载，进度附带 `attempt/maxAttempts`；只有完整字节与 SHA-256 校验通过才进入缓存。下载耗时包含重试与等待。清单 JSON 加载流程不变。
- 门户登记 PicoDet 1.0.2、PP-YOLOE 0.1.1 的 FP32、FP16、W8A32，保留 npm 0.3.1；`int8` 表示 W8A32。长报告 URL 在窄屏自动换行。

## 验证证据

| 验证 | 结果 | 证据 |
| --- | --- | --- |
| 修改前 SDK 规范 | 通过 | [before.json](before.json) |
| 修改后 SDK 规范 | 18 项 required 通过、0 失败；4 项远程治理检查跳过 | [after.json](after.json) |
| 修改前下载/管理器测试 | 31 项通过 | 实施记录 |
| SDK 单元测试 | 20 文件、193 项通过 | [下载实现报告](download-implementation.md) |
| SDK 类型、lint、构建、变更文件格式 | 通过 | [下载实现报告](download-implementation.md) |
| 下载代码独立审查 | 需求与质量通过，无需修问题 | [下载审查](download-review.md) |
| 真实 HTTP 下载恢复 | 12 项通过 | [结果](browser-download.json)、[可重运行脚本](verify-browser.mjs) |
| 真实公开模型回归 | 两模型 W8A32 × WASM/WebGPU，4 项通过 | [记录](real-model/verification.json) |
| 模型登记与清单比对 | 六资产 bytes、sha256、precision、固定 URL 和 stable 状态一致 | [比对记录](model-cross-check.json) |
| 门户单元测试 | 50 项通过 | `pnpm test` |
| 门户类型与构建 | 0 错误、0 警告，3 个既有 Zod 弃用提示；9 个静态页面 | `pnpm build` |
| 门户浏览器 | 5 项通过，含六变体和 390px 无溢出检查 | `pnpm test:e2e`、[页面记录](portal-browser.json) |
| 发布契约 | 29 项通过 | `pnpm release:test` |
| 文档与代码段 | 5 项通过，含中英文入口及 TypeScript 代码段编译 | `pnpm docs:test` |
| 示例契约 | 12 项通过 | `pnpm examples:check` |
| 六变体示例生产构建 | 类型检查及 Vite 构建通过，依赖公开 npm 0.3.1 | `pnpm --filter @ppdetection/example-model-variants build` |
| 独立消费者构建 | 16 项通过，包括原样复制、安装公开依赖和构建 | [文档实施报告](docs-implementation.md) |
| 六变体示例真实运行 | 六变体均完成推理，默认项、取消后重开及窄屏通过 | [ModelScope 首轮](example-browser.json)、[Hugging Face 补测](example-browser-huggingface.json)、[验证脚本](verify-example.mjs) |

真实 HTTP 验证使用 Chromium 153.0.8010.12、原生 fetch/ReadableStream 和本地服务器，无请求拦截。覆盖挂起响应头、空闲流、持续慢流、HTTP 重试耗尽、空闲后恢复、连接中断后恢复、请求取消、退避取消、SHA 错误、错误 206、403，以及完整恢复后缓存回读。短时限用于快速触发相同行为，不是产品默认值。

真实模型回归使用本地生产构建 Demo，从 ModelScope 固定公开地址获取模型，未替换请求或推理代码。PicoDet 两后端均检出 12 个目标，PP-YOLOE 均检出 14 个；版本、变体、摘要、来源和实际后端匹配，无回退、无页面脚本错误。Windows 11、Chromium 153、物理 NVIDIA GPU；详见逐项 JSON。未重复进行模型转换、上传或历史 36 组 COCO 评测。

截图：[门户桌面](portal-desktop.png)、[门户窄屏](portal-mobile.png)、[Demo 桌面](real-model/desktop.png)、[Demo 窄屏](real-model/mobile-layout.png)。窄屏截图不表示手机实测；小米 15 的历史证据仅覆盖 FP32，新精度的移动端范围保持原声明。

新示例使用公开 npm 0.3.1，首次默认选择 PicoDet、ModelScope、FP32。ModelScope 上 PicoDet FP32/FP16 均成功，各检出 12 个目标；第三组 PicoDet W8A32 遇到慢连接，300 秒后测试超时，完整保留首轮失败报告。随后明确选择 Hugging Face 补测其余四组：PicoDet W8A32 检出 12 个目标，PP-YOLOE FP32/FP16 各 15 个、W8A32 为 14 个。六组均为实际 WebGPU，模型版本、变体、精度和来源摘要匹配；两轮均验证取消后可再次运行，补测没有覆盖首轮记录。这是手动指定另一来源的验证，新示例没有静默换源。截图：[示例桌面](example-desktop.png)、[示例窄屏](example-mobile.png)。

## 重运行与环境记录

在门户执行 `node reports/sdk-standard/2026-09-12-detection-download/verify-browser.mjs`，要求同级 SDK 仓库已有依赖。SDK 浏览器运行时设置 `PLAYWRIGHT_BROWSERS_PATH=../web-sdk-PP-Detection/.tmp/dependencies-compatible-browsers`；门户使用宿主默认 Playwright 1234 浏览器目录。

门户首次构建遇到 Windows 缓存文件 rename 权限，宿主权限重跑成功。首次门户浏览器检查误用 SDK 的另一版本浏览器目录，改为匹配的宿主目录后通过。首次窄屏检查发现长 URL 导致内容最小宽度溢出，添加详情文本换行后通过；保留 [修复前截图](portal-mobile-before.png)。这些环境或验收失败没有被计为通过。

下载实现已保存为本地提交 `fc9d914`，六变体文档和公开包接入示例已保存为本地提交 `d37f9af`。提交前变更文件格式检查通过，下载运行时及对应测试相对 `fc9d914` 无后续变化，SDK 工作树干净。本轮未推送、未创建远程 PR、未修改 npm 版本或执行发布。

最终 [集成复核](integration-review.md) 已完成。示例契约在集成时移除冗余的源码字符串断言，最终为 12 项；实现者报告的 13 项对应集成前状态。最终样式修正后另外通过 [单项浏览器复核](example-final-smoke.json)，检查初始/取消后的画布隐藏、真实 W8A32 推理与窄屏布局。
