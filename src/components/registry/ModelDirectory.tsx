import { useMemo, useState } from 'react';
import { ArrowUpRight, Search } from 'lucide-react';
import { filterModels, type ModelFilters } from '../../lib/registry/query';
import type { ModelData } from '../../lib/registry/types';
import './model-directory.css';

const initialFilters: ModelFilters = { query: '', brand: 'all', task: 'all', status: 'all', backend: 'all' };
const statusLabels: Record<ModelData['status'], string> = {
  available: '可用', beta: 'Beta', 'in-development': '开发中', research: '调研中', 'not-applicable': '暂不适用',
};

export default function ModelDirectory({ models }: { models: ModelData[] }) {
  const [filters, setFilters] = useState(initialFilters);
  const visible = useMemo(() => filterModels(models, filters), [models, filters]);
  const set = <K extends keyof ModelFilters>(key: K, value: ModelFilters[K]) => setFilters((current) => ({ ...current, [key]: value }));

  return <section aria-label="模型目录">
    <div className="directory-toolbar">
      <label className="search-control">
        <Search size={17} aria-hidden="true" /><span className="sr-only">搜索模型</span>
        <input type="search" value={filters.query} onChange={(event) => set('query', event.target.value)} placeholder="搜索模型或 npm 包" />
      </label>
      <select aria-label="品牌" value={filters.brand} onChange={(event) => set('brand', event.target.value)}><option value="all">全部品牌</option><option value="baidu">百度</option><option value="deepseek">DeepSeek</option><option value="zhipu">智谱</option><option value="self-developed">自研</option></select>
      <select aria-label="任务" value={filters.task} onChange={(event) => set('task', event.target.value as ModelFilters['task'])}><option value="all">全部任务</option><option value="document-layout">文档版面</option><option value="ocr">OCR</option><option value="detection">检测</option><option value="asr">ASR</option><option value="tts">TTS</option><option value="image-correction">图像矫正</option><option value="vision-language">视觉语言</option></select>
      <select aria-label="状态" value={filters.status} onChange={(event) => set('status', event.target.value as ModelFilters['status'])}><option value="all">全部状态</option><option value="available">可用</option><option value="beta">Beta</option><option value="in-development">开发中</option><option value="research">调研中</option><option value="not-applicable">暂不适用</option></select>
      <select aria-label="后端" value={filters.backend} onChange={(event) => set('backend', event.target.value as ModelFilters['backend'])}><option value="all">全部后端</option><option value="webgpu">WebGPU</option><option value="wasm">WASM</option><option value="webnn">WebNN Labs</option></select>
    </div>
    <p className="result-count" aria-live="polite">{visible.length} 个条目</p>
    {visible.length === 0 ? <div className="empty-state">没有符合条件的模型</div> : <div className="model-grid">{visible.map((model) => <article className="model-card" key={model.id}>
      <div className="card-heading"><div><p>{model.brand} · {model.task}</p><h2><a href={`/models/${model.id}/`}>{model.name}</a></h2></div><span className={`status status-${model.status}`}>{statusLabels[model.status]}</span></div>
      <p>{model.summary}</p>
      <div className="backend-list">{model.runtime.backends.map((backend) => <span key={backend.name}>{backend.name} · {backend.status}</span>)}</div>
      <a className="card-link" href={`/models/${model.id}/`}>查看 SDK <ArrowUpRight size={15} aria-hidden="true" /></a>
    </article>)}</div>}
  </section>;
}
