# 2026-09-19 门户纯算法发布候选验证

本地分支基于 `9db2871a8339cc585b5cac6bd24190a72429ae38`，仅准备 PP-Tracking 第八条记录。生产合并等待独立 SDK 的 npm、Release、HTTPS Demo 和治理证据，不声明已上线。

先扩 `standards/v1/portal-contract.md`，再实现模型/算法互斥 schema：缺省模型继续要求 assets 非空且禁止 algorithm；算法 assets=[]，完整 algorithm 元数据必填。保留原七款模型；新增 CPU / JavaScript、多目标跟踪、来源与状态详情；门户无跟踪 runtime。

## 测试证据

所有 pnpm 命令均带 `--config.verify-deps-before-run=false --config.manage-package-manager-versions=false`。

- RED：`pnpm ... test src/lib/registry/schema.test.ts`，4 项中 2 失败：CPU 算法不能解析、模型 algorithm 被静默丢弃。符合新增契约预期。
- GREEN：`pnpm ... test src/lib/registry src/content/models/registry.test.ts src/components/registry/ModelDirectory.test.tsx`，4 文件 20 项通过。
- `pnpm ... test`：12 文件 99 项全部通过，含 checker/schema 回归。
- `pnpm ... build`：Astro check 0 errors、0 warnings、7 hints；21 页面构建成功。hints 为已有历史报告脚本类型提示及原 z.string().url() 弃用提示，未扩大本轮范围。
- `pnpm ... test:e2e`：16 项全过，覆盖原七款模型与新增算法；1280px/390px 的 CPU 筛选、任务分类、详情来源/状态/无权重、准确远程链接和无横向溢出。环境存在既有 NO_COLOR/FORCE_COLOR 提示，不影响结果。
- SDK 修改前后 `pnpm ... sdk:check -- --repo F:/git/00_chenmohan/github/web-sdk-PP-Tracking --format json --out <报告路径>` 均退出 0；[修改前](../../sdk-standard/pp-tracking-2026-09-19-release-before.json)、[修改后](../../sdk-standard/pp-tracking-2026-09-19-release-after.json)：required 17 pass / 0 fail / 7 skip，recommended 3 pass，仅 locally-compliant。

浏览器复用 production preview：`ASTRO_PREVIEW_BACKGROUND=0 node node_modules/astro/bin/astro.mjs preview --host 127.0.0.1 --port 4321`，并使用已安装的 Playwright Chromium（`PLAYWRIGHT_BROWSERS_PATH=F:/git/00_chenmohan/github/web-sdk-PP-Detection/.tmp/dependencies-compatible-browsers`）。没有为本任务修改 dev 服务或依赖。

已目检以下截图，内容非空、布局无交叠；390px 只代表桌面窄视口：

- [1280px 目录](tracking-directory-1280.png)
- [390px 目录](tracking-directory-390.png)
- [1280px 详情](tracking-detail-1280.png)
- [390px 详情](tracking-detail-390.png)

Pages workflow 的 pages/id-token 写权限移至 deploy job，部署串行、不取消正在进行的部署，保留原构建命令。两份路线已同步至候选及真实 MOT17 训练集证据，Workflow 继续暂缓。
