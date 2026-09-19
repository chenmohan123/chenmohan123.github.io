# PP-Tracking 真实序列评测与首版发布设计

用户已确认本轮顺序：真实视频序列评测、处理影响使用的问题、发布0.1.0、门户登记第八个SDK。授权包含GitHub仓库/PR合并、npm、Release、HTTPS Demo与Trusted Publishing；服务端要求的本人验证仍由用户完成。

## 范围与工作区

SDK：`F:/git/00_chenmohan/github/web-sdk-PP-Tracking`，当前8d4a554；门户沿用隔离工作树 `C:/Users/chenm/.codex/worktrees/segmentation-portal/chenmohan123.github.io`，当前4d79c02。保留原门户用户文件和旧分支；本轮建立codex/tracking-first-release本地分支。SDK独立消费检测框，不接入Detection运行时，不创建Workflow。门户只登记元数据。

## 真实序列与评测口径

采用MOT17官方无图像压缩包 `https://motchallenge.net/data/MOT17Labels.zip`，10107022字节，SHA256 `0aa79322e91583369f42f17c4d79a0b145380d8732487bba59272048dc82b2b9`。固定七段FRCNN训练序列02/04/05/09/10/11/13，共5316帧；不按结果挑选片段，不下载或发布视频图片。

官方原数据页提供公开下载，FAQ明确允许在训练集比较算法设置并要求引用MOT16和相应序列论文。当前站点已静态归档，保留实际页面及可读历史FAQ的URL、检索日期与摘要。未找到覆盖全部素材的统一再分发许可时，不杜撰CC许可证或把数据归入Apache-2.0；仅在本地按公开基准用途评测，公开代码、来源/文件哈希和汇总指标，原检测框、GT及逐轨输出保留忽略目录。若此依据不足以覆盖选中数据的评测用途，先解决来源问题或替换有明确评测授权的数据。

固定默认参数运行，不用这些训练序列调参。另做lowScoreThreshold=highScoreThreshold的机制消融，其他参数相同；这是同实现的消融对照，不是官方ByteTrack精度排名。MOT时间按seqinfo原fps，像素坐标通过明确的MOT转SDK适配，越界检测框裁到图像内、空框剔除并统计；GT按官方评分处理，不能用GT选择输入。每帧只将observed且state=tracked的结果写MOT输出，预测lost与未确认tentative不充当检测。

用固定提交的MIT TrackEval官方MOTChallenge预处理和Identity/CLEAR指标，记录IDF1、IDSW、MOTA、FP/FN、每序列及合计，不用自造ID变化计数冒充IDSW。记录SDK/输入/评分器hash、固定参数、执行环境、CPU时间、最大输入/轨迹数和容量丢弃数。原始数据、输出及评分日志可本地复跑，汇总报告不得声称MOT17测试集/排行榜成绩或完整端到端速度。至少一个完整真实序列再在桌面Chromium运行，核对与Node非耗时输出相同。

发布门槛：全帧无异常、无非有限框/重复ID/容量丢弃，来源/评分定义明确，真实问题与限制记录完整；指标只代表固定公开检测器和这些训练序列，不设事后挑选的准确率门槛或宣称高精度。发现功能错误则定向修复并复测相关证据；真实交叉/机位运动等固有限制如实记录。

## 发布及门户

SDK保持0.1.0，更新双语指南、Demo链接、CHANGELOG、验证环境和发布清单，保留原合成测量历史。发布工作流先验证tag与包版本，再验证/构建/发布；首次npm引导发布和后续OIDC不能重复发布同版本。Trusted Publisher固定仓库 `chenmohan123/web-sdk-PP-Tracking`、`release.yml`、`npm`环境；首版是否具备provenance以实际回执为准。

GitHub仓库公开，默认main，PR与最新CI门禁、会话解决、防强推/删分支、v*不可变标签、无常驻管理员bypass；Pages Actions+HTTPS，部署只给必要权限、串行且绑定提交。本机gh复用APPDATA/GitHub CLI并恢复原GH_CONFIG_DIR。npm本人验证只通过安全页面，不索取验证码或密码。

门户先在standards/v1/portal-contract.md补充算法目录契约，再修改registry schema/UI：缺省kind保持model，算法kind=algorithm，task=multi-object-tracking，CPU/JavaScript真实后端，assets空数组且algorithm来源/版本/家族/状态字段必填；模型仍要求非空assets，不得伪造0字节ONNX。展示算法信息与无需权重状态；目录筛选/详情/比较不复制runtime。PP-Tracking公开链接核验通过后才合并正式条目。

## 验证与交付

SDK修改前后sdk:check；新的数据适配/评分边界使用有意义的定向测试，完整SDK verify在最终发布候选上执行一次。门户schema/查询/详情/列表测试及生产构建浏览器回归，保留七SDK兼容。发布前独立代码审查；发布后GitHub/npm/HTTPS Demo及治理API回读，线上Demo中英文与回放冒烟，npm tarball实际消费验证。完成后同步规划与日期化证据；仅遇到本人安全验证或真实外部阻塞才请求用户参与。
