# PP-Tracking 外部向量 DeepSORT 设计

日期：2026-09-19。用户已确认继续推进；层级为单 SDK。本轮仅本地实现和验证，不包含远程发布。

## 目标与边界

在同一 `web-sdk-pp-tracking` 包新增 `algorithm: 'deepsort'`。ByteTrack 保持默认，OC-SORT 保留。运行时仍是无生产依赖的框架无关 CPU/main 算法。版本保留未发布 `0.2.0-alpha.0`，不得覆盖线上 `0.1.0` 的状态描述。

只接收调用者的检测与外观特征；不加载 ReID 模型，不生成裁剪、视频或摄像头流水线，不增加 GPU 控件。第一轮 OMZ 探针边界输入失败的原始证据保持不变，不宣称真实 ReID/MOT 精度提升。

## 公共契约

```ts
export interface FeatureSpace { id: string; dimension: number }
// TrackerOptions 新增：
featureSpace?: FeatureSpace;
maxCosineDistance?: number;
gallerySize?: number;
// Detection 新增：
embedding?: readonly number[] | Float32Array;
// TrackingFrame 新增：
featureSpaceId?: string;
```

DeepSORT 必须显式传入 `featureSpace`。其对象只接受 id、dimension；id 是 1..256 字符、首尾无空白的非空字符串，调用者应绑定权重 SHA256、预处理版本和输出定义，SDK 只比较标识，不能证明特征真实性。dimension 是 1..2048 的整数。实例复制配置，不保留可变引用。

`maxCosineDistance` 默认 0.2，范围 [0,2]；`gallerySize` 默认 30，整数范围 [1,100]。`maxTracks * gallerySize * dimension <= 4_000_000`，限制图库标量总容量。DeepSORT 不接受 ByteTrack 的 lowScoreThreshold/lowMatchIouThreshold，也不接受 OC-SORT 专用参数；其他算法不接受三个 DeepSORT 专用参数。未知参数和显式 undefined 沿用严格拒绝。

DeepSORT 每帧（含空帧）必须携带匹配的 featureSpaceId，每个 detection（含低于门限而被过滤的框）都必须携带指定长度的有限、非零范数向量。仅接受普通数组或 Float32Array；稳健缩放后归一化并复制，不修改或持有用户输入。缺失、错维、NaN/Infinity、零范数或空间不符为 INVALID_INPUT，整帧不推进时钟、ID、滤波器或图库。其他算法继续忽略可选外观字段，合法旧输入和输出保持一致。

## 匹配与生命周期

依据 DeepSORT 论文 https://arxiv.org/abs/1703.07402 的概念独立实现，不读取、复制、翻译上游 DeepSORT、SORT、Paddle 或 OC-SORT 跟踪/Kalman 源码。

1. 使用本项目八维 cx/cy/w/h、秒级时间 Kalman。外观关联运动门控是四维观测平方 Mahalanobis 距离 <= 9.487729036781154（95% 卡方门限），观测协方差是预测 P 的左上 4x4 加 4I，与现有 correct 一致。
2. 每条已确认轨迹保存最多 gallerySize 个归一化向量，使用检测与图库最小余弦距离；合格边同时满足类别、运动门控、余弦门限。与已有 assign 一致，优先最大可行匹配数再最小距离，确定性平局。
3. 已确认轨迹按 lastSeenMs 从新到旧分组级联，同组联合匹配，未分配高分检测进入下一组。高分及新轨迹门限沿用当前选项。
4. 外观阶段后，未确认轨迹和进入本帧时为 tracked 的未匹配轨迹做类别与 IoU 补配；已经 lost 的轨迹不能通过 IoU 绕过外观门限。补配不再套外观/运动门限，这是论文式有限后备路径，必须说明。
5. 成功匹配和创建轨迹时更新图库，超限删除最旧向量；失配不更新。tentative 失配删除、lost 超时/长间隔、reset、dispose 沿用契约并释放图库。事务副本覆盖向量与配置，实例互不影响。

与论文的差异须写明：width/height 状态而非 aspect-ratio/height，按毫秒年龄分组而非固定帧年龄，既有 Kalman 噪声模型、门限和状态生命周期；不保证官方逐值复现或任何外部向量质量。

## Demo 与文档

沿用现有紧凑 Detection 风格新增第三算法。内置样例使用独立原创合成向量，并在样例名称/信息中明确“合成外观向量”，不暗示来源于图片。算法切换重置当前结果；语言切换不重置。展示当前生效参数，结果报告包含算法、实际参数、特征空间和序列。另提供“导出输入序列”紧凑 JSON，仅包含可重放的 frames 和可选 featureSpace；其 UTF-8 大小不超过5 MiB，使用和导入准备相同的序列化函数。输入准备提交前也检查该规范化紧凑序列的大小，超限失败保持旧状态，避免合法导入的数据无法再导出并重导入。结果报告包含轨迹和格式化空白，可能超过导入上限，不将其作为大序列重放入口。Float32Array 序列化为普通数组。

JSON 保留已有 `{ frames: TrackingFrame[] }` 输入；带外观的导入还接受 `{ featureSpace: { id, dimension }, frames: TrackingFrame[] }`。未带顶层 featureSpace 时，仅在 DeepSORT 下所有帧有相同 featureSpaceId、有效且同维向量时推导配置；空检测序列没有可推导维度则需显式顶层 featureSpace。不要替用户导入的框捏造 embedding。导入准备在临时 tracker 上逐帧校验全部数据，再提交新配置与序列；失败保留原序列、配置与结果。5 MiB/3000 帧/100 框限制沿用，图库配置也须合法。非 DeepSORT 可使用无向量旧序列；无法切到 DeepSORT 时明确错误且原状态不变。

维护 README、API、算法、快速开始、隐私、兼容、性能、排错与验收清单的中英等价说明；manifest 声明第三算法，保留标准 1.2.0 的 algorithm 分支。门户只更新路线和验收记录，不改生产 registry 或复制 runtime。

## 验收

- 先失败后实现：空间/向量严格校验（含过滤项）、稳健归一化、外观消歧、最近邻图库/淘汰、运动/类别门控、级联新鲜度、有限 IoU 补配、状态回滚/释放/隔离/取消。
- 旧 ByteTrack/OC-SORT 测试通过；打包 ESM/CJS/TS 消费第三策略，运行时导出白名单仍为工厂和错误类。
- Demo 导入失败原子性、三算法、实际参数导出、seek/reset、双语及桌面 390px 布局验证；不把桌面窄屏写成手机实测。
- 完整 verify、标准修改前后检查、独立代码审查及带日期证据。本地预览可访问，不执行远程写操作。
