# PP-Detection 选型整理与门户验收

2026-09-15。本轮同步最初规划与当前发布状态，将13个规格、37个稳定变体的体积、质量和CPU/GPU热推理数据汇编为[门户选型页](https://chenmohan123.github.io/models/pp-detection/compare/)及[完整文档](../../../docs/zh-CN/pp-detection-selection.md)。SDK/npm维持0.4.0，默认PicoDet-L-320 / FP32 / ModelScope。

## 证据范围

- 原始SDK证据固定于提交 `025e207ff0a6a3a4e07f0a4c5b02834969b199ce`；[sources.json](sources.json)记录30份来源的不可变链接、字节数与SHA-256，并绑定生成结果。
- 37个稳定变体与当前门户资产、固定manifest逐项匹配模型摘要、大小、精度和ModelScope来源。XS-320/416两个W8A32继续保留labs。
- 74份后端汇总均有三轮AP、热推理与检测保留率。AP采用0–100单位、显示三轮范围；固定64图、716标注，不代表全量COCO成绩。
- 2026-09-12批次沿用SDK0.3.1、第三轮63图推理中位数及原报告保留率汇总；2026-09-14/15批次使用SDK0.4.0、三轮推理中位数和三轮最小保留率。各批次SDK摘要不同，分组呈现，不形成跨批次速度排名。
- 本轮复用已发布模型评测，没有新增推理、手机、NPU或内存验证。文件缩小不推导运行速度或内存同比改善。门户只展示数据和链接，没有引入SDK推理代码。

## 本地验收

| 检查 | 结果 | 证据 |
| --- | --- | --- |
| 单元、目录与标准测试 | 58/58 | [tests.log](tests.log) |
| Astro检查与生产构建 | 通过；0错误、0警告、6项既有提示；12个页面 | [build.log](build.log) |
| 门户浏览器测试 | 8/8 | [browser.log](browser.log) |
| 生产构建本地预览 | 7项检查通过、无页面异常 | [local-smoke.json](local-smoke.json) |
| 未改动SDK的静态标准检查 | required通过18、失败0、远程检查跳过4 | [standard.json](standard.json) |
| 固定来源再生成核对 | 37个变体、74组汇总、30份来源一致 | [validation.json](validation.json) |

生产构建本地预览使用Windows上的Chromium151，验证详情与文档入口、默认37项、PicoDet W8A32筛选7项且排除XS实验量化、CPU/GPU数值同步切换、三批次口径、390px整页无溢出且表格区域可横向滚动、四个项目入口。已检查[桌面截图](desktop.png)、[窄屏首屏](mobile-top.png)和[窄屏表格入口](mobile-table.png)。这与模型推理评测中的Chromium153环境不同。

浏览器测试发现并修复了首次页面加载时控件可能先于React事件绑定被操作的问题：服务端与客户端初次渲染均禁用筛选控件，交互就绪后启用；静态数据表正常显示。测试同时使用精确数量断言，避免将37项误判为7项。

独立只读审查复算74组后端汇总，并抽查原始gzip与运行身份；未发现阻塞合并问题。小体积、CPU速度与质量建议都有对应批次数据依据。

## 复核命令

在门户仓库运行（SDK路径指向包含固定提交的本地检出）：

```powershell
node tools/detection-comparison/build.mjs --sdk <SDK路径> --check
pnpm test
pnpm build
pnpm test:e2e
pnpm sdk:check -- --repo <SDK路径> --format json
git diff --check
```

本机复用已有依赖目录时，pnpm附加 `--config.verify-deps-before-run=false --config.manage-package-manager-versions=false`；浏览器使用已有Playwright缓存。日志与本地预览记录的字节摘要见 `validation.json`。静态标准检查不证明远程治理或实际模型推理。

## 发布与后续

本报告固定记录提交前的本地验收。按现有授权通过PR及其最新提交的CI后合并；正式Pages部署必须绑定合并提交，并重新核验HTTPS选型入口、筛选、窄屏和四项目目录。部署与线上结果记录在对应PR及Actions，避免为追加部署记录循环触发发布。

下一阶段回到PP-YOLO、FCOS、SSD等具体2D候选，先核对配置、权重、许可、导出链和实际收益；本轮未开始新架构移植。
