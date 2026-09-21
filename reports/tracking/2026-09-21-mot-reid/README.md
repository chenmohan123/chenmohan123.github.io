# Tracking三算法真实画面评测回执

日期：2026-09-21。分层为单SDK实测及门户文档；门户生产registry、npm和线上Demo仍为0.1.0，没有复制运行时或实施Workflow，没有远程发布。

SDK实测提交：0194ea5f9c32dda786b9e4b0bb7394ac0e51c23e，本地0.2.0-alpha.0；归档提交为f02c9ca1b82089fc968b1e9ef06f684d036c1b06。完整双语报告、协议、逐段指标、官方metrics/summary/identity、约1.26MB压缩逐帧计时、SHA证据锁与校验器保存在SDK的 `reports/2026-09-21-mot-reid/`。原始媒体、完整检测/GT、向量和逐帧轨迹不提交。

固定MOT17七段FRCNN训练序列全部5316帧、67639检测；真实WebGPU提取全部检测特征，CPU/main运行三算法。三算法浏览器与两次Node冻结输入结果完全一致，容量丢弃0；官方TrackEval七段合计如下，不平均逐段百分比。

| 算法 | IDF1 | IDSW | MOTA | FP | FN |
| --- | --- | --- | --- | --- | --- |
| ByteTrack | 48.2922% | 1101 | 44.4010% | 4169 | 57166 |
| OC-SORT | 48.4107% | 881 | 39.5434% | 6751 | 60259 |
| DeepSORT + PPLCNet | 45.4637% | 1030 | 44.7608% | 3373 | 57629 |

DeepSORT组合IDF1低2.8285个百分点，IDSW少71、MOTA高0.3598个百分点、FP少796、FN多463，不支持替换默认。OC-SORT减少IDSW但MOTA/FP/FN不利，仍仅显式可选。三套完整配置的关联机制与低分策略不同，没有禁用外观消融，不能将差异单独归因ReID或断言其普遍无效；没有据结果选序列或调参。

Node第一次跟踪累计ByteTrack/OC-SORT/DeepSORT为8679.482/9387.251/31180.492ms，只含冻结特征后的跟踪。浏览器DeepSORT本地图片fetch→解码→ReID→关联外围独立累计613470.900ms，p50/p95为100.900/247.700ms；cold7帧为676.100/796.400ms，warm5309帧为100.700/247.200ms。7次外围模型加载另计9005.000ms。不含检测器、视频流水线、渲染、评分、IPC或落盘，不能称为视频端到端FPS；阶段中位数没有拼成总耗时。

环境为Windows11 10.0.26200、i5-10400F、RTX5060Ti驱动32.0.16.1692、Chromium153.0.8010.12、Playwright1.63.0、Node24.16.0、ORT1.27.0。预先固定02前30帧433检测的WASM/WebGPU最大向量差3.5763e-7、三算法结果一致，只是子集补充，不是全量WASM或跨设备验证。

工具阶段已有9项聚焦测试、173项单测和typecheck/build/package通过，正式七段浏览器、两次Node和官方评分完成；归档重新校验126个正式原始输出hash，补充48个子集hash及14份旧ByteTrack/OC-SORT MOT/指标一致。SDK离线verify复算计时和指标公式，不把hash核验冒充重新跑TrackEval。门户本轮build为0errors/0warnings/7既有hints、21页；7 hints来自旧报告脚本类型和Zod弃用，与本轮文档无关。[标准after](../../sdk-standard/tracking-mot-reid-after-20260921.json)为21 required通过、0失败、4远程skip，recommended3通过，仅表示locally-compliant。

真实评测门槛完成，建议进入0.2本地发布候选收口：ByteTrack默认，OC-SORT/DeepSORT显式可选，人体ReID标记实验能力。下一步确定候选版本、变更日志和发布预检，再取得本版本发布授权。视频/摄像头、真实手机、Safari/Firefox、Worker/NPU、跨摄像头和Workflow继续后置；训练集单机观察不是官方测试集排名或普遍精度/兼容承诺。历史报告、透明PNG和旧OMZ反例保留。
