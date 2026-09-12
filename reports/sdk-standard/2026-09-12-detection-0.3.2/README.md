# Detection 0.3.2 发布准备

日期：2026-09-12。用户已授权发布 npm、Demo 和门户。SDK 发布 PR：https://github.com/chenmohan123/web-sdk-PP-Detection/pull/52

- SDK 发布提交：9192e96。完整 `node scripts/verify-release.mjs --release v0.3.2` 通过：193 项 SDK 单测、29 项发布契约、5 项文档、12 项示例契约、6 项基准契约、14 项 parity、4 项打包验证，以及格式、lint、类型、构建。
- 模型版本保持 PicoDet 1.0.2、PP-YOLOE 0.1.1；六个稳定资产的字节和摘要没有修改。发布检查器也继续校验根目录历史 FP32 1.0.1 清单。
- 门户全部 50 项测试、5 项浏览器检查、9 页构建通过；Astro 0 错误、0 警告、6 个提示（3 个既有 Zod 弃用及 3 个归档验证脚本类型提示）。
- 修改前后规范检查见 before.json 和 after.json。18 项 required 通过、0 失败、4 项远程检查跳过；远程保护配置另存 governance.json。
- SDK 原检出旧临时 pytest 目录不可读，使用干净发布检出执行检查。门户首次测试误扫描临时 SDK，产生不同 Vitest 环境的失败；显式排除 `.tmp` 后门户自身全部测试通过。远程 CI 没有这个临时检出。
- 下载实现和上一阶段模型回归保持[原始证据](../2026-09-12-detection-download/README.md)。本报告不把发布前检查写成线上已更新；发布完成后的 npm、部署、取消和真实推理记录将归档至 SDK GitHub Release 附件。
