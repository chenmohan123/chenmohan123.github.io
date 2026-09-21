# 算法与可选模型同包声明提案

提案日期：2026-09-20。实施日期：2026-09-21。状态：**已在标准 1.3.0 生效**。
schema、rules、checker 和模板已经支持 hybrid；生产 manifest 仍须在真实模型分发、
导出文件和带日期模块证据齐备后启用，不能仅凭本提案声称合规。

## 适用场景和取舍

Tracking核心是独立算法，但DeepSORT可由可选模型提取外观向量。推荐同包独立子路径导入，核心入口保持不加载模型/推理引擎。所有算法拆成不同SDK会重复生命周期和框类型；把模型强塞进纯algorithm清单会绕过资产与缓存规则，均不采用。门户只索引能力和证据，不能承载模型runtime；不启动Workflow。

## 1.3.0 声明

本次实施同步更新 README 中英入口、sdk/runtime/demo/performance/docs 契约、rules.yaml、schema、检查器、模板和回归测试：

- schemaVersion新增1.3.0，kind新增hybrid，仅1.3.0可声明hybrid。1.0/1.1/1.2模型和1.2算法清单保持原判定，1.3也允许独立model/algorithm。算法禁止model/cache，模型禁止algorithm，hybrid同时要求algorithm、model、cache和modules。
- `modules.algorithm`字段：非空`entry`、`runtime`、`performance`，并复用现有运行信息和耗时约束；默认入口`.`。`modules.model`字段同上，entry使用非默认子路径，例如`./reid`；另必填`optional: true`。首版一份算法描述加一个模型族足够，不引入任意DAG或Workflow。
- 顶层runtime/performance保留为兼容摘要；checker核对与模块并集一致。每个实际结果报告本模块请求/实际后端与执行模式，不能把GPU模型特征提取描述为GPU关联；totalMs分层计量，整体用外围时钟单独计量。
- hybrid需同时满足ALGORITHM-001、MODEL-001、CACHE-001、DEMO-004、DEMO-006。DEMO-005要求两类信息标记；模型清理与跟踪复位是不同动作，但完整清理须取消提取并复位依赖它的关联状态。
- 模型资产、版本、许可、精度、hash、来源、缓存、取消/释放、兼容性证据沿用模型标准，不因“optional”豁免。variants/sources的不可变revision和显式来源失败语义保持不变。研究阶段的本地文件/ArrayBuffer验证证据不能替代公开分发来源。
- 新增HYBRID-001 required：结构和版本符合、modules入口在package.exports实际存在、模型入口不为默认、两模块runtime与timing符合各自约束。静态扫描只证明声明；无模型调用场景不加载ORT/权重仍须包消费和浏览器网络证据。
- `verification.environments`增加可选`module`枚举algorithm/model，hybrid必须对每模块提供至少一项日期证据；纯model/algorithm旧条目不受影响。禁止用特性探测替代实际模型执行。
- 模型源仍要求实物可获取并校验；首次本地候选可以使用调用者的明确字节资源做验收，但不应以file URL或虚构hub revision通过“可分发”检查。正式hybrid manifest随真实分发材料准备完成后启用。

## 必须先失败再通过的检查器用例

旧三种版本model、旧1.2algorithm通过；旧版本hybrid、hybrid缺algorithm/model/cache/modules任一项、optional=false、模块入口缺失或相同、模型误写cpu后端、无实际后端字段、算法耗时缺项、模型耗时缺项、顶层摘要与模块并集不一致、变体来源字段错误、缺模块日期证据均失败。损坏清单不能通过appliesTo豁免必需项。

模板使用真实占位说明而非生产地址；生产清单只在模型源准备好后填入实际revision/hash。文档和研究设计可先完成；生产模型代码或Demo开始接入之前，必须完成上述标准实现和回归检查。
