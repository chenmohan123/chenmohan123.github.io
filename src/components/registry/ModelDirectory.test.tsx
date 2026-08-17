import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ModelDirectory from './ModelDirectory';
import type { ModelData } from '../../lib/registry/types';

const common = { brand: 'baidu', status: 'available', repository: 'https://example.com', license: 'Apache-2.0', package: { name: 'example', version: '1.0.0' }, demo: { url: 'https://example.com/demo', localProcessing: true }, runtime: { backends: [{ name: 'webgpu', status: 'stable' }], capabilities: [], verifiedEnvironments: [] }, io: { input: ['Blob'], output: ['JSON'] }, assets: [{ id: 'fp16', precision: 'fp16', bytes: 1, url: 'https://example.com/model', sha256: 'a'.repeat(64) }], limitations: [] } as const;
const models = [
  { ...common, id: 'layout', name: 'PP-DocLayoutV3', task: 'document-layout', summary: 'Document layout analysis in the browser.' },
  { ...common, id: 'ocr', name: 'PP-OCRv6', task: 'ocr', status: 'research', summary: 'OCR model roadmap entry for the browser.' },
] as unknown as ModelData[];

describe('ModelDirectory', () => {
  it('filters model cards by search text', () => {
    render(<ModelDirectory models={models} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'DocLayout' } });
    expect(screen.getByText('PP-DocLayoutV3')).toBeVisible();
    expect(screen.queryByText('PP-OCRv6')).not.toBeInTheDocument();
  });

  it('shows an honest empty state', () => {
    render(<ModelDirectory models={models} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'not-a-model' } });
    expect(screen.getByText('没有符合条件的模型')).toBeVisible();
  });
});
