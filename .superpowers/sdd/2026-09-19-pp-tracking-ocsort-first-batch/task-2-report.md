# Task 2：Demo、候选版本和统一路线报告

日期：2026-09-19。范围：PP-Tracking 多算法第一批的 Demo、候选版本、当前双语指南、实际包消费和门户路线；未改 OC-SORT 核心、评测 CLI、门户 registry 或运行时代码，未执行远程写操作。

## 提交

- SDK：`978ef5628fc1f994580703e5551a00f8bb393c12`（`完善多算法候选演示与文档`）。
- 门户路线与设计：`f024d52f6caac46a0d4e30cecff8d9bb24c4cab0`（`更新跟踪多算法路线状态`）。

## 交付

- Demo 仅列出 ByteTrack 与 OC-SORT。切换会停止播放、以该算法有效默认值重建实例、清空帧结果并使未完成导入请求失效；读取文件期间算法选择禁用。语言切换保留当前运行状态。
- ByteTrack 仅显示低分参数；OC-SORT 显示高分/建轨/生命周期公共参数及 `ocmWeight`、`ocmDeltaMs`、`ocmHistoryLength`、`oruMaxReplaySteps`。表单只传当前算法有效字段；导出包含候选 SDK 版本、实际算法与已应用 options，不混入未应用草稿。
- `package.json`、manifest、runtime 和当前双语 README/API/快速开始/算法/兼容性/性能/排错文档同步为本地 `0.2.0-alpha.0` 候选。线上 npm、GitHub Release 与 HTTPS Demo 仍为 `0.1.0`；安装指引只保留线上 0.1.0 和本地 tarball，不引用不存在的远程 alpha。
- `scripts/check-package.mjs` 在实际 tarball 中用 ESM、CJS 和 TypeScript 分别消费 ByteTrack 与 OC-SORT；无生产依赖和发行文件白名单检查保持。
- 修正 `reports/2026-09-19-ocsort/来源与设计记录.md` 的“历史或缺失”残留文字。
- 门户两份当前路线和多算法设计进度区分已发布的 ByteTrack 0.1.0 与本地 OC-SORT 候选，并列出 ByteTrack、OC-SORT、DeepSORT、BoT-SORT、JDE、FairMOT、CenterTrack 七种路线的依赖、顺序和状态；生产目录不提前显示候选或未来方案。

## 命令与证据

- 修改前：`pnpm --config.verify-deps-before-run=false --config.manage-package-manager-versions=false sdk:check -- --repo <S> --format json --out reports/2026-09-19-ocsort/verification/task-2-sdk-check-before.json`，`requiredPassed=17`、`requiredFailed=0`、`locally-compliant`。
- 修改后同命令输出至 `task-2-sdk-check-after.json`，结果仍为 `requiredPassed=17`、`requiredFailed=0`、`locally-compliant`。
- TDD 红阶段：`pnpm --config.verify-deps-before-run=false --config.manage-package-manager-versions=false run test:browser` 在缺少 `#algorithm` 时失败，见 `task-2-browser-red.txt`。随后浏览器验证通过，见 `task-2-browser-green.txt` 与 `browser.json`：两算法实际播放/导入/导出、逐条 `result.algorithm`、播放中切换停止、参数互斥、未应用草稿、异步导入禁用、语言、seek、390px 与 Vanilla 均通过，且 `pageErrors=[]`。截图位于 SDK `.tmp/browser/`。
- 首次完整 verify 暴露旧测试仍断言 runtime `0.1.0`；定向修正后 `tests/tracker.test.ts` 16 项通过，见 `task-2-runtime-version-targeted.txt`。最终 `pnpm --config.verify-deps-before-run=false --config.manage-package-manager-versions=false run verify` 退出码 0，见 `task-2-verify.txt`：8 文件 67 项测试、实际 tarball 双格式与类型消费、Demo/Vanilla/React 构建和浏览器验收均通过。
- 删除参数区冗余操作说明及英文镜像后，未重跑完整 verify；`typecheck:demo` 与 `build:demo` 均通过，见 `task-2-copy-removal-typecheck.txt`、`task-2-copy-removal-build.txt`。

## 当前边界与关注项

`0.2.0-alpha.0` 是本地候选，不能据此宣称线上或 npm 已提供 OC-SORT。固定 MOT17 指标属于 ByteTrack 0.1.0 历史证据；两算法同输入的真实序列对比、独立发布判断，以及后续 ReID/图像模型路线仍由后续任务完成。OC-SORT 的八维、毫秒时间戳实现只对应论文机制，不承诺官方七维固定帧间隔实现或真实 MOT 指标兼容。
