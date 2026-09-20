# 标准 1.3.0 审查回执

日期：2026-09-21。基线3d73f81，实现13955b3，修复50d32bd。分层：门户标准；不涉及生产registry或远程状态。

新增hybrid同时满足模型与算法声明、缓存、各模块后端/耗时、顶层并集、带日期验证及两类Demo标记。静态检查要求明确的package.exports运行时目标存在；旧model1.0/1.1/1.2及algorithm1.2保持兼容。

初审发现两项Important：声明文件或目录可误判成运行时入口；DEMO-005证据键导致路径回退。实现方补充六个失败测试，再修复为忽略types条件、拒绝.d.ts/.d.mts/.d.cts及目录、使用stat.isFile，并把实际Demo文件归入demoTimingMarkers证据键。

原审查代理`/root/hybrid_standard_review`对13955b3..50d32bd修复范围复审：两项均ADDRESSED，没有新破坏，规格与代码质量通过。未重跑无变化的全套测试。

## 验证

- 首轮checker RED：21失败、73通过，预期缺少hybrid支持。
- 首轮GREEN：98/98；同提交全仓单元测试130/130。
- 修复RED：新增六项全部捕获缺口；修复GREEN：hybrid35/35。
- 共享checker/algorithm聚焦回归40/40。
- 门户构建：21页，0errors/0warnings、7条既有hints；修复后的Astro check仍为0errors/0warnings、7hints。

本目录保留红绿原始日志和构建日志。首次全仓130项结果来自实现任务的实际运行及任务报告；修复后只运行覆盖改动的专项和共享回归，没有把首轮测试数改写成修复后的全套执行。

静态通过不证明JS可实际导入、模型源可达、hash对应远端实物或浏览器推理；默认入口无ORT/权重请求和候选模块实际推理由SDK阶段另行验收。正式模型分发依旧是独立门槛。
