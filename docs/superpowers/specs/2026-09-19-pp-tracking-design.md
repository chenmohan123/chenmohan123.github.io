# 独立 PP-Tracking SDK 首版设计

日期：2026-09-19。依据用户已确认的独立 SDK 路线及继续推进指令。

## 范围与来源

实现 `web-sdk-pp-tracking`，仓库目录 `F:/git/00_chenmohan/github/web-sdk-PP-Tracking`。
这是单 SDK 工作；门户仅扩展标准，不连接检测 SDK、不新增 Workflow。
首版为 TypeScript CPU 主线程算法，无模型、无推理依赖、无下载或缓存按钮。
Worker 留待实测有必要时增加，首版只声明 `main`，不提供空实现。

采用 ByteTrack 论文的高/低分两阶段关联思想，独立编写恒速 Kalman、
带未匹配选项的最小代价分配及状态机。不得翻译或复制前次评估发现来源
义务不清晰的 ByteTrack/DeepSORT/Paddle Kalman 或 SORT/OC-SORT 实现。
生产代码依据数学定义、论文机制和本设计编写，Apache-2.0 仅声明本项目
代码许可；NOTICE 记录论文、算法差异和评估来源，不声称官方移植或逐值兼容。
来源评估见 `reports/tracking/2026-09-18-feasibility/README.md`。

## API 和状态

公开 `createTracker(options?)`，返回 `update(frame, { signal }?)`、
`reset()`、`dispose()`；更新同步，AbortSignal 只能在计算开始前取消。
输入 `TrackingFrame` 为 `timestampMs`、`imageSize: {width,height}` 和
`detections: {box:{x,y,width,height},score,classId}[]`。坐标为图像像素的
轴对齐框；类别为非负安全整数，分数在 [0,1]，尺寸正且所有数值有限。
框须在图像范围内；不自动裁剪。时间戳为非负有限数，严格递增；seek
或图像尺寸变化必须 reset。所有校验在状态修改前完成，失败不得推进时钟或 ID。

结果返回 `generation`、`timestampMs`、`tracks`、`removed`、`runtime`、
`timings`。轨迹含 `id`、`classId`、`box`、`state`、`observed`、
`score: number|null`、`ageMs`、`hits`、`missedMs`；状态为 tentative、
tracked、lost。`removed` 为仅本次移除的轨迹，state=removed。
预测轨迹 `observed=false, score=null`，不得把历史置信度当成本帧检测。
ID 为实例私有安全整数，同代次内不复用；reset 后代次+1，ID从1重新开始。
不同实例互不影响；dispose 幂等，此后 update/reset 抛稳定错误。
返回对象和输入对象均不与内部可变状态共享。

默认阈值：lowScoreThreshold=0.1、highScoreThreshold=0.5、
newTrackThreshold=0.6；high>=low且new>=high。默认 minHits=2，
matchIouThreshold=0.3、lowMatchIouThreshold=0.2、maxLostMs=1000、
largeGapMs=2000、maxDetections=100、maxTracks=200。
数量上限为正安全整数且不超过500；minHits为1至100的整数。
时间限制须为有限正数，largeGapMs>=maxLostMs。

所有阶段严格隔离类别。先用 tracked/lost 与高分框关联，再用未匹配的
tracked 与低分框关联；lost 不以低分框恢复。再将 tentative 与剩余高分框
关联；未匹配 tentative 当帧移除。剩余高分框达到 new 阈值时创建 tentative，
连续命中达到 minHits 后 tracked（minHits=1立即 tracked）。
无匹配 tracked 转 lost；lost 超过 maxLostMs 在匹配前移除。单次时间间隔
超过 largeGapMs 时先移除旧轨迹再处理新观测；不通过补空帧循环推进。
容量满时跳过新建，结果报告 `droppedDetections`，不得驱逐有效轨迹。
关联必须是确定性的全局最小代价匹配，门限内才可匹配，允许双方未匹配。
测试须覆盖贪心错误和先全局分配再过滤导致有效匹配丢失的反例。

运动状态为 [cx,cy,w,h,vx,vy,vw,vh]，dt以秒计。独立实现标准线性
Kalman predict/update，协方差初值、过程和观测噪声须写入算法文档。
输出宽高保持正数，数值失败以稳定错误报告，不污染已提交状态。
不做外观 ReID、不保证交叉或掉头时身份正确，不把轨迹 ID 当真实身份。

## 标准扩展

规范升至1.2.0，继续接受1.0.0/1.1.0模型manifest。
新增仅1.2.0可用的 `kind: algorithm`；缺省及 `kind: model` 保持模型规则。
算法manifest必须有 algorithm（id、version、family、source、license、
input、output、stateful），禁止 model/cache 字段；模型禁止 algorithm。
旧版本不得借kind逃避模型检查。runtime继续报告实际后端与执行模式。
算法性能要求 validationMs、predictionMs、associationMs、updateMs、totalMs；
不要求模型下载或缓存耗时。Demo使用 data-sdk-algorithm-info 和
data-sdk-state-reset，保留runtime/timing标记。规则应明确模型/算法适用性，
不适用项以skip及理由记录；无效清单不得触发算法豁免。
算法输入、来源、许可、状态生命周期和复位为必填契约。

## Demo 和文档

延续 PP-Detection：浅色背景、紧凑品牌栏、左侧输入/参数控制、右侧可视化
结果、耗时和运行信息折叠；中文默认、可切英文，390px无横向滚动。
提供原创合成检测框序列（直行、低分恢复、短遮挡、交叉掉头），SVG绘制
框和ID/轨迹，播放、暂停、单步、重新开始、JSON导入、导出本轮结果。
导入只读本地文件，限制5MiB、3000帧、每帧100框；完整验证后原子替换。
选择示例、重播、seek均reset。播放用记录的timestamp，与浏览器帧率分离。
输入和预测视觉可区分，切语言不清空状态。呈现算法限制，但不塞入操作长文。
不做模型目录、检测/摄像头前置流程；不伪装真实视频测评。

双语README及quick-start、API、compatibility、troubleshooting、
privacy/deployment、performance；Vanilla可运行示例及React Demo参考。
打包只包括构建产物、类型、README、LICENSE、NOTICE，无React运行依赖。
提供CI、Pages与发布workflow，但本轮本地实现不声称npm或Demo已经发布。

## 验收

先扩标准再实现产品。创建空SDK目录即运行sdk:check，保留before/after报告。
单测覆盖数学参考、全局关联、低分恢复、遮挡/超时、类别隔离、实例隔离、
reset/dispose、无效输入原子性、输出引用隔离、阈值边界和数量上限。
用独立 NumPy 公式参考核对数值；可用先前机制输入评估行为差异，不能把
官方输出逐值相等设为目标。真实序列暂未有明确授权样本，首版如实只报告
合成机制验证，不声称MOT精度。桌面Chromium验证Demo、Vanilla、导入导出、
中英文、空态、重播和390px布局，记录版本/日期/操作/限制。
执行typecheck、test、build、check:package、build:demo、浏览器测试及门户
checker/tests/build。交付本地可审查版本；远程发布须有明确发布范围。
