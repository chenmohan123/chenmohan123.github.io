# Tiny FP32 模型、Demo 与门户验收（2026-09-15）

SDK PR #73 已合并，提交 `8c392ea7ffc196c47fa5380f5d910e32618d7849` 的 CI 与 GitHub Pages 均通过。Tiny 320 FP32 0.1.0 已完成双源发布，SDK/npm 仍为 0.4.0，默认 PicoDet-L-320 / FP32 / ModelScope。

[正式 HTTPS Demo 验证](demo-production/verification.json)覆盖 ModelScope/Hugging Face 与 CPU/GPU 四组真实检测；每组均识别出 12 个目标，导出身份正确，页面无异常。SDK 分发证据记录双源固定 revision、完整回读、8 组合浏览器、Demo 86 项测试及 SDK 206 项单测。

门户登记 14 个规格、38 个稳定变体和四个独立评测批次，新增 PP-YOLO 系列筛选。Tiny 自身 FP32 作为基线，不将 Python 严格匹配率或相较 PicoDet 的 AP 差混入量化保留率。原 37 项数据逐项保持一致，门户 60 项单元测试、8 项浏览器测试、构建与生成器检查通过。

本轮证据不增加 Tiny 手机、NPU、峰值内存或全量 COCO 成绩声明。

门户 [PR #36](https://github.com/chenmohan123/chenmohan123.github.io/pull/36) 已合并，提交 `5faba8ba55d8e6aa9cb5e95470783e3eabcec94d` 的 [Pages](https://github.com/chenmohan123/chenmohan123.github.io/actions/runs/34987126033) 与 CI 均成功。[正式门户复核](portal-production-verification.json) 六项通过：38项资产/四批次、Tiny两后端数据、仅FP32、390px、详情与Demo链接及四项目入口，页面异常为0。
