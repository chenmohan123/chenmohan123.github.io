import { describe, expect, it } from 'vitest';
import { filterModels, groupCounts } from './query';
import type { ModelData } from './types';

const common = {
  brand: 'baidu', status: 'available', repository: 'https://example.com', license: 'Apache-2.0',
  package: { name: 'example', version: '1.0.0' },
  demo: { url: 'https://example.com/demo', localProcessing: true },
  runtime: { backends: [{ name: 'webgpu', status: 'stable' }], capabilities: [], verifiedEnvironments: [] },
  io: { input: ['Blob'], output: ['JSON'] },
  assets: [{ id: 'fp16', precision: 'fp16', bytes: 1, url: 'https://example.com/model', sha256: 'a'.repeat(64) }],
  limitations: [],
} as const;

const models = [
  { ...common, id: 'layout', name: 'PP-DocLayoutV3', task: 'document-layout', summary: 'Document layout analysis in the browser.' },
  { ...common, id: 'ocr', name: 'PP-OCRv6', task: 'ocr', status: 'research', summary: 'OCR model roadmap entry for the browser.' },
] as unknown as ModelData[];

describe('filterModels', () => {
  it('combines text, task, status, and backend filters', () => {
    expect(filterModels(models, { query: 'layout', task: 'document-layout', status: 'available', backend: 'webgpu', brand: 'all' }).map((model) => model.id)).toEqual(['layout']);
  });

  it('returns all models for empty filters', () => {
    expect(filterModels(models, { query: '', task: 'all', status: 'all', backend: 'all', brand: 'all' })).toHaveLength(2);
  });
});

it('counts values for filter controls', () => {
  expect(groupCounts(models, 'task')).toEqual({ 'document-layout': 1, ocr: 1 });
});
