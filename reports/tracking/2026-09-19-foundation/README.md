# 独立跟踪SDK本地验收与标准回归（2026-09-19）

本轮完成纯算法标准1.2.0及独立 `web-sdk-PP-Tracking` 本地首版。SDK仍未发布npm、Release或在线Demo，因此门户在线目录继续保留7个已发布SDK，Workflow继续暂缓。本目录只归档标准兼容与门户回归证据，不包含跟踪运行时。

## 7个既有SDK的新旧标准差异

[原始报告](standard-regression.json)于2026-09-19T00:32:22.867Z生成，原字节保留每条规则的级别、状态、证据和修复建议。旧标准提交 `df2863ec22e73790f35fcf57c673a55afd4a1be0`，新标准/检查器提交 `063e8c215b1791d43d3ee704bcb83006ddc43611`。原JSON只记录baseline短SHA，新标准完整SHA在本说明补充，不改写旧测量字段。

| SDK | 固定提交 | 既有规则状态变化 | 旧/新required失败 |
| --- | --- | --- | --- |
| Detection | fede55916770922943178acf1de6684708573d04 | 0 | 0 / 0 |
| DocLayoutV3 | 3aedb7b35af49a1c207fd4f846211366a9d09973 | 0 | 0 / 0 |
| LCNet_x1_0_doc_ori | 0e404877890ab79442f3db43b44aaf726b81e131 | 0 | 0 / 0 |
| OCRv6 | 746a44d0dc59b2b21496dc6853cea56adeb1b17b | 0 | 0 / 0 |
| RotatedDetection | b54ae15ca124fd111cac6e683409fdbb88a14e13 | 0 | 0 / 0 |
| Segmentation | 89b350d30305ecbc275780e455d1c115a250570f | 0 | 0 / 0 |
| TinyPose | 70fe7e5a2377be64cd86efc8b306f03121b6f5c9 | 0 | 0 / 0 |

新增算法专用规则对旧模型SDK为不适用skip，不偷换成pass；远程治理/托管required依然skip，不能由本地扫描宣称全面compliant。检查对象是提交的git archive快照，不包含用户未提交内容。原Detection工作目录有受限临时目录会导致EPERM，本轮未改权限；采用提交快照避免扫描非交付临时内容。

原脚本在[provenance/](provenance/)。正式复跑入口基于报告里的固定提交生成临时快照，使用新旧固定检查器，不自动改写历史报告。先安装门户锁定依赖，确保Git和Python3可用，再在门户根目录执行：

```powershell
node reports/tracking/2026-09-19-foundation/verify-standard-regression.mjs verify
node reports/tracking/2026-09-19-foundation/verify-standard-regression.mjs rerun --repo-root F:/git/00_chenmohan/github --out .tmp/tracking-standard-regression-replay.json
pnpm --config.verify-deps-before-run=false --config.manage-package-manager-versions=false sdk:check -- --repo F:/git/00_chenmohan/github/web-sdk-PP-Tracking --format json --out reports/sdk-standard/pp-tracking-after.json
```

`verify`固定原JSON SHA256为 `3c20f94d6e7f099cfc4e14d1848c120ae259249bfd47237ee1394de86af712d4`，重新推导7个SDK的差异和失败列表。`rerun`还从Git提交重新导出并比较每条规则id/level/status，新报告保留新执行时间与新证据路径，不覆盖原报告。源码仓库位置由 `--repo-root` 指定，临时快照在系统临时目录；快照在任务结束后保留供检查。Windows系统tar无法正确解包TinyPose的既有中文截图名，入口改用Python标准库zipfile解包git archive ZIP；这不是原始报告扫描失败。

## 门户和SDK证据

- [portal-test.log](portal-test.log)：Task1完整原始日志，11文件93测试通过。
- [portal-build.log](portal-build.log)：Task1完整原始构建日志，18页，0错误、0警告、7个既有hint。
- [portal-task-4-build.log](portal-task-4-build.log)：归档入口和路线更新后的实际构建，18页，56个诊断文件，0错误、0警告、仍为7个既有hint。
- [portal-validation-summary.json](portal-validation-summary.json)：既有执行结构化摘要；14 e2e基于生产preview通过，原日志在主代理会话93634a，未伪造本地日志。默认dev启动超时仍是已知环境现象。
- [Tracking after标准报告](../../sdk-standard/pp-tracking-after.json)：归档/文档修改后的实际本地扫描，保留远程skip。
- SDK验收：独立仓库 `F:/git/00_chenmohan/github/web-sdk-PP-Tracking/reports/2026-09-19-desktop/README.md`，原始129次公开API更新、10/50/100框各600个warm样本、29单测/9浏览器组/实际包/全部构建日志及源码来源说明。

性能核心提交为518f94a，ESM SHA256为 `fdd721bf78b7dc2ea3c554619418c914041971e37a2274ef3851e251997d4935`。Chromium151.0.7922.34对应性能，Chromium153.0.8010.12对应完整Demo交互，两者没有混为一次验证。390px是桌面视口；不存在真实手机或真实视频MOT精度结论。独立Apache-2.0实现避免分发前期存在来源义务疑点的参考代码，但不宣称上游逐值等价。

本轮只更新本地证据、兼容说明与两份总路线。待独立整分支审查后交付本地Demo；正式发布、远程治理核验和真实授权序列质量需另行安排。
