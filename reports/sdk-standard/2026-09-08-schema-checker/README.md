# 标准检查器修复与发布准备

核验日期：2026-09-08。分层：门户标准检查工具；单 SDK 发布准备另见
[npm 核对报告](../2026-09-08-checker-schema/npm-readiness.md)。

## 检查器修复

此前清单校验仅手动覆盖部分字段：`examples.vanilla.status: runnable`、
`runtime.backends: [invented-backend]` 等非法声明会通过；`model.assets: {}`
会触发类型异常。现在直接执行 `standards/v1/sdk-manifest.schema.json` 的完整
Draft 2020-12 schema，保留既有 HTTP 地址、必需耗时和缓存能力检查。

无效清单返回包含 JSON Pointer 的 `CONFIG-001`，并阻止无效声明获得
`META-001` 等规则通过。YAML 损坏或嵌套类型错误返回 CLI 退出码 `1`，
后续仓库继续扫描。所选标准自身 schema 缺失或损坏仍作为检查器异常，
不伪装成目标仓库问题。未新增或放宽标准条款。

新增回归先在旧实现复现漏检与类型异常；最终 22 项清单回归全部通过。
其中多仓库断言按名称识别报告，以适配检查器既有的仓库名排序行为。

## 四库静态复查

保留 [修改前报告](before.json) 与 [修改后报告](after.json)。

| 仓库 | 扫描时 main 提交 | 本地 required 失败 | recommended 失败 | 远程 required 未核验 |
| --- | --- | ---: | ---: | ---: |
| Detection | `5adeb3963a61f722d7570139beec7631df6cc351` | 0 | 0 | 4 |
| OCRv6 | `9cc1f8d9da54164a77bcb9ea781cedebddb6139e` | 0 | 0 | 4 |
| DocLayoutV3 | `53cbbfb3cfa350abdd505765ca36540708fdd213` | 0 | 0 | 4 |
| LCNet | `0e404877890ab79442f3db43b44aaf726b81e131` | 0 | 0 | 4 |

四库原有 manifest 均通过完整 schema，无需为了本次扫描修改声明。
报告状态为 `locally-compliant`。这是静态声明与文件证据核验，不代表重新
完成所有推理、浏览器、网络或远程治理验收。既有运行验证见已合并的
[Detection PR #25](https://github.com/chenmohan123/web-sdk-PP-Detection/pull/25)
与 [OCR PR #18](https://github.com/chenmohan123/web-sdk-PP-OCRv6/pull/18)。

## 门户验证

| 命令 | 结果 |
| --- | --- |
| `pnpm install --frozen-lockfile --ignore-scripts` | 通过；仅新增固定 Ajv 依赖，无无关依赖升级 |
| `pnpm sdk:check:test` | 3 个文件、42 项通过 |
| `pnpm test` | 6 个文件、50 项通过 |
| `pnpm build` | 通过；Astro 0 错误、0 警告、3 个既有 Zod 弃用提示，生成 9 页 |
| `pnpm test:e2e` | 5 项 Chromium 浏览器冒烟通过 |
| 四库 `pnpm sdk:check` | 每库 18 项本地 required 通过、4 项远程 skip |

独立只读代码审查未发现本轮阻塞问题；额外在内存中替换 139 个字段的
7 类边界值，共 973 次清单校验均未抛异常，并确认 JSON Pointer 转义、
附加契约与无效清单的 `META-001` 失败行为。

本机 pnpm 11.21.0；依赖安装关闭生命周期脚本，执行测试与构建使用宿主机
权限。远程 CI 采用 pnpm 10，尚未对本轮分支运行远程工作流。

## 发布准备边界

Detection 0.1.1 与 OCRv6 0.1.8 后存在向后兼容的 runtime/API 增量，准备
0.2.0 候选。DocLayoutV3 1.2.0、LCNet 0.2.0 的公开包已包含对应 SDK
修复，无需重发。公开版本、tarball 完整性、来源提交和发布门禁已只读核对。

OCRv6 当前缺少 `GOV-002` 要求的发布标签保护；正式发布前需创建仅禁止
`v*` 标签更新/删除、无 bypass 的 Ruleset，并刷新远程证据。候选请求体见
[ocr-release-tag-ruleset.json](ocr-release-tag-ruleset.json)。本轮未应用该请求体。

本轮准备不创建发布标签，也不上传 npm 或创建 GitHub Release。候选包的
本地验证结果由各 SDK 发布准备文档记录；公开示例继续引用已存在的 npm
版本，待新版正式发布后另行核验并切换。

### 已完成的候选验证

两库均在本地 `codex/prepare-npm-0-2-0` 分支保留候选变更；本轮尚未提交
SDK 候选或执行远程写入。门户检查器已保存为本地提交 `bf371e1`。

| 候选 | SDK 单测 | Demo 浏览器回归 | 实际 tarball 消费验证 |
| --- | ---: | ---: | --- |
| Detection 0.2.0 | 132 项通过 | 35 项通过 | 独立安装、类型检查、构建、main/Worker WASM、模型身份缓存、取消与重复释放通过 |
| OCRv6 0.2.0 | 119 项通过 | 33 项通过 | 3 个独立工程安装/类型检查/构建、6 组工程与来源组合、main/Worker 缓存/计时/资源路径/取消/释放通过 |

Detection 完整发布校验还通过 4 项 package smoke 和 6 项浏览器运行/缓存
测试。OCR 的包资产校验、SDK/Demo 构建、发布元数据校验均通过；其候选
tarball SHA-512 与打包记录一致，28 个内嵌 SDK 源文件与当前工作区一致。

候选验证发现并修复了 OCR 模型、清单、字典响应体读取期间取消的错误
分类：现在统一返回 `ABORTED`，字典取消仍回收已创建会话。四项针对性
回归已覆盖主动取消与真实下载失败；具体红绿证据保存在 OCR 候选报告中。
最终包已重新构建、打包并完成上述消费验证。

本次没有重跑物理 GPU 或移动设备矩阵；这些环境仍沿用已有带日期证据。
Detection 记录位于 `web-sdk-PP-Detection/docs/reviews/2026-09-08-npm-0.2.0.md`，
OCR 记录位于 `web-sdk-PP-OCRv6/reports/release/0.2.0-candidate/`。
