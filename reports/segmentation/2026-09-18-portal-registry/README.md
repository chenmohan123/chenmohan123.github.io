# PP-Segmentation 门户登记

日期：2026-09-18。范围：门户目录、分类、详情链接与当前规划。独立 SDK 和 Demo 的实现不变，Workflow 继续暂缓。

## 登记依据

新增 `web-sdk-pp-segmentation@0.1.0`，门户共6个SDK、52项模型资产。PP-YOLOE_seg_s 640 FP32 的模型身份、36,265,193字节、SHA-256、默认 ModelScope 固定地址均与 SDK 清单一致；保留单帧图片、CPU/GPU和桌面验证边界。详见 [metadata.json](metadata.json)。

正式 npm 元数据的 integrity 与已发布回执一致；GitHub `v0.1.0` 为正式非草稿版本，标签提交仍为 `dfbc72056e8c8cf748a7697778f5d14a921b5302`；独立 HTTPS Demo 返回200。SDK 的[固定发布证据](https://github.com/chenmohan123/web-sdk-PP-Segmentation/tree/89b350d30305ecbc275780e455d1c115a250570f/reports/2026-09-18-release-readiness)包含双源、数值、浏览器和发布回读。本轮没有重新执行分割推理。

## 检查结果

- 门户 `pnpm test`：66项通过，包括实例分割筛选与既有SDK回归。
- `pnpm build`：Astro类型检查0错误，16个静态页面构建成功；7条既有提示来自历史评估脚本和Zod弃用API。
- `pnpm test:e2e`：12项通过，覆盖1280px和390px的分类、包名搜索、详情、独立GitHub/npm/Demo链接、分类路由及页面宽度；两种宽度截图已检查，无横向溢出。
- SDK标准检查[前](standard-before.json)和[后](standard-after.json)均为required失败0、远程检查跳过4，推荐项`EXAMPLE-003`为既有Vite复用React示例的静态发现限制。报告保留规则、证据路径和补救措施；不把本地静态检查视为远程兼容验证。
- 首次浏览器检查有5项失败，浏览器报告`504 Outdated Optimize Dep`与React依赖不一致；原因是生产构建与开发服务共用Vite缓存。构建结束后重启开发服务，未改产品代码即12项全部通过。运行构建和开发验收应顺序执行。

复现时，pnpm命令附加 `--config.verify-deps-before-run=false --config.manage-package-manager-versions=false`。浏览器测试使用`tests/portal.spec.ts`；截图生成于忽略目录`test-results/segmentation-1280.png`和`segmentation-390.png`。

## 后续路线

当前规划更新为：2D稳定维护，TinyPose及分割首版已交付，下一步评估PP-YOLOE-R/FCOSR FP32的旋转框任务。该项仅为可行性评估，不提前登记为可用SDK；分割精度变体和媒体扩展保留后续处理。
