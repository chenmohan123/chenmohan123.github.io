# Documentation and Release Contract

The root `README.md` is Chinese-first and links to a complete `README.en.md`.
Each public guide has `docs/zh-CN/` and `docs/en/` equivalents, with explicit
language links. At minimum provide quick start, API, compatibility,
troubleshooting, privacy/deployment, and performance guidance.

README and npm metadata expose install instructions, package name/version,
GitHub repository, and live Demo. A public repository has CI, a changelog, at
least one GitHub Release, and GitHub About description, Homepage/Demo URL, and
topics. Model release notes identify model source, license, default assets, runtime
backends, and known limitations.

Repository protection and live Demo delivery follow the
[repository governance and deployment contract](repository-governance-contract.md).
Rulesets and hosted deployment settings require dated remote evidence; workflow
files alone do not prove that those settings are active.

Do not claim universal browser or device support from feature detection alone.
Every compatibility entry records browser, OS, device, runtime/driver where
relevant, and test date.

## 纯算法文档与发布（1.2.0）

算法 SDK 保留上述双语文档、示例、发布和带日期验证要求。以算法来源、许可、
输入输出契约、状态生命周期和复位语义替代模型资产说明；同时记录算法版本、
家族、参数约束、后端、性能及已知限制。说明独立实现与参考来源的关系，
不得在缺少证据时声称官方移植、逐值兼容或真实数据精度。

算法发布说明列出来源/论文、代码许可、实现差异、状态和 API 变化，不编造
模型资产、模型校验和或缓存说明。尚未发布 npm/在线 Demo 时如实标明本地
状态；发布及治理规则仍须按适用范围留存远程证据。
