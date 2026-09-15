import { useEffect, useState, type CSSProperties } from 'react';
import type comparison from '../../data/pp-detection-comparison.json';
import tokens from '../../../standards/v1/ui-tokens.json';
import './detection-comparison.css';

type Props = { data: typeof comparison };
const number = (value: number) => value.toFixed(2);
const apRange = (values: number[]) => number(values[0]) === number(values[1]) ? number(values[0]) : `${number(values[0])}–${number(values[1])}`;
const styles = {
  '--compare-panel': tokens.color.panel, '--compare-text': tokens.color.text,
  '--compare-muted': tokens.color.mutedText, '--compare-border': tokens.color.border,
  '--compare-action': tokens.color.action, '--compare-radius': tokens.radius.md,
  '--compare-gap': tokens.space[4], '--compare-padding': tokens.space[5],
  '--compare-focus': tokens.focus.ring,
} as CSSProperties;

export default function DetectionComparison({ data }: Props) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const [family, setFamily] = useState('all');
  const [precision, setPrecision] = useState('all');
  const [backend, setBackend] = useState<'wasm' | 'webgpu'>('wasm');
  const visible = data.rows.filter((row) => (family === 'all' || row.family === family) && (precision === 'all' || row.precision === precision));
  return <section className="detection-comparison" aria-label="Detection 模型对比" style={styles}>
    <div className="selection-tips">
      <article><span>小体积</span><h2>PicoDet-S 320 · W8A32</h2><p><strong>1.38 MB</strong>，当前稳定文件中最小。适合优先减少首次下载量。</p></article>
      <article><span>CPU 速度优先</span><h2>PicoDet-XS 320 · FP32</h2><p>本轮 PicoDet 批次热推理约 <strong>64 ms</strong>。再对比 S-320 的质量与耗时。</p></article>
      <article><span>识别质量优先</span><h2>PP-YOLOE+ M / L / X</h2><p>先比较 FP32。该批次 X 的子集 AP 更高，文件和 CPU 耗时也更大。</p></article>
    </div>
    <p className="selection-baseline">常规起点：PicoDet-L-320 / FP32 / ModelScope。文件变小不代表推理更快，模型选择以自己的图片实测为准。</p>
    <div className="comparison-controls" aria-busy={!ready}>
      <label>模型系列<select disabled={!ready} value={family} onChange={(e) => setFamily(e.target.value)}><option value="all">全部系列</option><option value="picodet">PicoDet</option><option value="ppyoloe">PP-YOLOE+</option></select></label>
      <label>模型精度<select disabled={!ready} value={precision} onChange={(e) => setPrecision(e.target.value)}><option value="all">全部精度</option><option value="fp32">FP32</option><option value="fp16">FP16</option><option value="w8a32">W8A32</option></select></label>
      <fieldset disabled={!ready}><legend>查看后端</legend>{(['wasm', 'webgpu'] as const).map((value) => <label key={value}><input type="radio" name="comparison-backend" value={value} checked={backend === value} onChange={() => setBackend(value)} />{value === 'wasm' ? 'CPU / WASM' : 'GPU / WebGPU'}</label>)}</fieldset>
    </div>
    <p role="status" className="comparison-count">{visible.length} 个稳定变体 · {backend === 'wasm' ? 'CPU / WASM' : 'GPU / WebGPU'}</p>
    <p className="comparison-method">各批次单独展示。AP 来自固定 64 图，热推理耗时不含下载和初始化；不同批次不作统一速度排名。</p>
    {data.groups.map((group) => {
      const rows = visible.filter((row) => row.group === group.id);
      if (!rows.length) return null;
      return <section className="comparison-batch" key={group.id} aria-labelledby={`batch-${group.id}`}>
        <div className="batch-title"><h2 id={`batch-${group.id}`}>{group.title}</h2><a href={group.report}>查看原始报告 ↗</a></div>
        <p className="batch-method">{group.date} · SDK {group.sdk} · {group.timingMethod}。检测保留率：{group.retentionMethod}。</p>
        <div className="comparison-scroll" role="region" aria-label={`${group.title}对比表，可横向滚动`} tabIndex={0}>
          <table><caption>{group.title} · {backend === 'wasm' ? 'CPU / WASM' : 'GPU / WebGPU'}</caption><thead><tr><th scope="col">模型</th><th scope="col">精度</th><th scope="col">文件 MB</th><th scope="col">子集 AP</th><th scope="col">热推理 ms</th><th scope="col">检测保留率</th></tr></thead>
            <tbody>{rows.map((row) => <tr key={row.id} data-variant={row.id}><th scope="row">{row.model}</th><td>{row.precision.toUpperCase()}</td><td>{number(row.bytes / 1e6)}</td><td>{apRange(row[backend].apRange)}</td><td>{number(row[backend].warmInferenceMs)}</td><td>{row.precision === 'fp32' ? '基线' : `${number(row[backend].minimumRetention * 100)}%`}</td></tr>)}</tbody>
          </table>
        </div>
      </section>;
    })}
    <details className="comparison-evidence"><summary>评测口径与环境</summary>
      <p>AP 为 COCO AP@[.50:.95]，范围显示三个真实轮次的最小值至最大值。固定 {data.dataset.images} 图、{data.dataset.annotations} 个标注，不是全量 COCO 成绩。</p>
      <p>检测保留率以同规格、同后端 FP32 为基线，按 score≥0.5、同类别 IoU≥0.5 一对一匹配。它表示保留多少 FP32 检测，不是对人工标注的召回率。早期批次沿用原报告汇总值，其余取三轮最小值。</p>
      <p>{data.environment.os}；{data.environment.cpu}；{data.environment.gpu}；{data.environment.browser}；ORT Web {data.environment.ort}；{data.environment.mode}。</p>
      <p>热推理复用会话、排除首图，只计模型 inference，不含预处理和结果绘制，不能直接换算摄像头 FPS。表中各批次使用不同 SDK 摘要；比较耗时请留在同一批次和后端。</p>
      <p>FP16 保留敏感算子的 FP32 计算；W8A32 仅压缩权重，激活和卷积仍为 FP32。没有峰值内存数据，未新增手机、NPU 或其他浏览器兼容声明。</p>
    </details>
    <p className="comparison-labs">PicoDet-XS-320 / 416 的 W8A32 检测保留率为 94.38% / 94.12%，未达到 95% 门槛，继续保留实验状态。</p>
  </section>;
}
