# Tracking 浏览器运动估计实验阶段回执

日期：2026-09-23。层级：单 SDK 实验能力。SDK 工作树：`C:/Users/chenm/.codex/worktrees/tracking-motion`。

## 交付

- 新增独立 `web-sdk-pp-tracking/motion` 子入口；包根、ReID 子入口和 BoT-SORT API 保持原边界。
- 支持相邻 `ImageData`/`VideoFrame`，提供纯平移、稀疏光流和特征匹配；结构错误抛出独立错误，质量失败返回不含矩阵的显式回执。
- 新增 `/motion.html`，中文默认、英文切换、三算法对比、状态复位、JSON 导出和 390px 桌面视口验证。
- 新增固定 seed 合成脚本和 SDK 双语报告；无网络、外部图像或模型权重。

## 证据与裁定

SDK 原始指标位于 `reports/2026-09-23-motion-estimation/metrics.json`。Node 合成基准的 640×360 p95：纯平移约 15.5 ms、稀疏光流约 71.8 ms、特征匹配约 191.1 ms；对应成功率为 41.7%、33.3%、41.7%。低纹理、重复纹理和超范围运动均显式失败，失败结果不带矩阵。这支持保留纯平移为快速基线，但不足以把三算法自动接入 BoT-SORT。

线上 npm `next`、GitHub Release 和 Demo 仍是 `0.2.0-rc.1`，稳定 `latest` 仍是 `0.1.0`。本地 `0.2.0-rc.2` 不代表发布。手机、Worker、GPU/NPU、Safari、Firefox、视频、摄像头和 Workflow 未验证或不在本阶段。

## 验证

SDK checker before（基线）报告为 `reports/sdk-standard/2026-09-23-motion-before.json`，有 20 项 required 通过、1 项混合导出规则失败；after 报告为 `reports/sdk-standard/2026-09-23-motion-after.json`，required 规则 21 项通过、0 项失败，4 项远程规则按离线检查跳过。SDK 和门户验证结果汇总于本目录 `report.json`。若未来考虑自动接入，必须先扩充真实合法帧、仿射场景、浏览器实际耗时和跟踪框误差证据，再提交独立设计。
