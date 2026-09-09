# OCRv6、Detection 示例与缓存整改

> 归档说明（2026-09-09）：本目录保留当次整改计划、原始证据和交付结果；文中的 npm 版本及待办描述属于历史状态。
> 后续见[运行时与耗时整改](../2026-09-08-runtime-performance/README.md)、
> [npm 发布记录](../2026-09-08-npm-published/README.md)和
> [2026-09-09 线上真实网络验收](../2026-09-09-real-network/README.md)。

任务开始日期：2026-09-07；最终验证：2026-09-08（Asia/Shanghai）。层级：单 SDK。标准版本：1.1.0。

本轮承接用户已确认的优先整改范围，并沿用分别 PR、合并 main、发布 Pages 的授权。历史审计保留在 `../2026-09-07-followup/`，不改写旧结论。

## 验收计划

- [x] 修改前运行两库 `pnpm sdk:check`，保存 `ocr-before.json` 与 `detection-before.json`。
- [x] OCRv6：在 `packages/sdk/src/cache/`、`model/model-manager.ts`、`factory.ts` 修复清理与在途写入的协调、实际模型身份和持久缓存容量。先用延迟下载测试复现“清理后恢复旧缓存”，再验证当前范围、全部范围、清理后新请求和异常恢复。
- [x] OCRv6：在 `apps/demo/src/` 接入清理互斥、取消等待、会话释放和容量刷新；用浏览器验证清理后的结果与状态。补齐 `examples/` 独立依赖、固定当前已发布版本、真实初始化与推理，并纠正 manifest 的示例状态。
- [x] Detection：在 `packages/sdk/src/model/` 修复迟到缓存写入；补充不同模型范围、并发清理和后续新写入测试。在 `apps/demo/src/` 提供当前模型/全 SDK 两种清理及真实容量，并协调任务与会话生命周期。
- [x] Detection：补齐 `examples/` 的当前模型清单、固定已发布版本、安装运行说明和异步初始化释放。独立复制安装构建；测试要实际进入初始化与推理，不以字符串匹配替代。
- [x] 分别运行 SDK 测试、类型检查、构建、示例消费者验证、Demo 浏览器验证及修改后标准检查；新增缺陷先修复再进入合并。
- [x] 独立审查两个仓库的最终 diff。审查重点：公共 API 兼容；缓存清理只影响所属 SDK/模型；在途请求不得恢复旧缓存；卸载后的实例释放；示例使用已发布 API；默认 ModelScope 且可选 Hugging Face。
- [x] 分别创建中文 PR、等待必需 CI、正常合并 main，核对 main CI、Pages 部署提交与线上界面。

## 范围与证据要求

本轮不扩展到历史审计中的耗时统计、实际后端报告、完整视频会话性能和检查器漏检。若清理生命周期需要修正同一处媒体停止行为，应记录对应回归证据。

用户文档、注释、提交和回复使用中文；既有英文说明按双语契约保持等价。SDK 保持无框架依赖，门户不包含 SDK 推理逻辑。此次没有 npm 发布计划，不修改已发布标签。

运行命令使用进程级 `pnpm_config_verify_deps_before_run=false` 复用现有依赖。`gh` 复用宿主机登录且保持认证状态。需要 runner 时只使用 `F:\github-runner`。

检查器的本地通过不能证明缓存/示例行为正确，也不能证明远程治理合规；最终结论以对应测试与 GitHub API 的有日期证据为准。

## 交付结果

| SDK | PR | main 合并提交 | Pages |
| --- | --- | --- | --- |
| OCRv6 | [#17](https://github.com/chenmohan123/web-sdk-PP-OCRv6/pull/17) | `3ee2050c23461826214301613a187560aaf07cf9` | [Demo](https://chenmohan123.github.io/web-sdk-PP-OCRv6/) |
| Detection | [#24](https://github.com/chenmohan123/web-sdk-PP-Detection/pull/24) | `c92e7e9baeba93b38c0d51aa4b5cee4d17a76c51` | [Demo](https://chenmohan123.github.io/web-sdk-PP-Detection/) |

两个 PR 均在必需 CI 通过后正常 squash 合并，main CI 和 Pages 部署成功，部署提交与合并提交一致。原始记录见 [delivery.json](delivery.json)。本地两库已同步 main 且工作区干净；本轮自建 4296/4297 测试服务已停止，没有运行 runner、发布 npm 或移动旧标签。门户本轮和历史报告作为本地证据保留，没有一并提交其他文件。

## 验证证据

- 两库完整 `pnpm verify` 通过：OCR SDK 90 项、Demo/示例单元 12 项；Detection SDK 127 项。SDK/Demo 类型、构建、浏览器及独立消费者验证详见两库随 PR 提交的验收文档。
- 两库修改后标准检查无 required 失败：`ocr-after.json`、`detection-after.json`。远程治理 skip 和原审计边界仍保留，不声称全部标准已远程合规。
- [四个线上 Demo UI](four-demo-ui-smoke.json) 均通过：默认 ModelScope、仅另选 Hugging Face、两种缓存动作、容量展示、中英文切换、390px 无横向溢出、无页面未处理异常；Detection/DocLayoutV3/LCNet 各四张现有缩略图均加载完成，OCR 使用示例按钮入口。截图为同目录四个 `PP-*-390.png`。
- [OCR 线上 GPU 与缓存](ocr-live-cache.json)：真实 WebGPU 两轮各识别 146 行，缓存 31,039,890 字节/2 条，两种清理后 entries/bytes 均归零。ONNX 传输使用 SHA-256 一致的仓库官方 Small 字节，保留真实线上 SDK、清单、字典和 ORT 推理；不作精度或 ModelScope ONNX 网络验证结论。
- [Detection 线上 GPU 与缓存](detection-live-cache.json)：真实线上 ModelScope 清单和模型、实际 WebGPU 推理通过，两轮包含 person；缓存 23,243,834 字节/1 条，current/all 清理后均归零，第二轮会话与缓存重建成功。
- Detection 旧框像素回归先失败再通过，差异通道从清理后的 495,121 降到 0：`detection-overlay-review-before.json`、`detection-overlay-review.json`。正式回归已经纳入 PR。

审查结论、缓存并发保证、公开 npm API 的版本边界以及未纳入本轮的历史项目见 [review-tracking.md](review-tracking.md)。本轮已确认的示例与缓存范围完成；历史耗时统计、实际后端报告、完整视频性能和检查器问题继续留待后续。
