import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ModelDirectory from './ModelDirectory';
import type { ModelData } from '../../lib/registry/types';

const common = { brand: 'baidu', status: 'available', repository: 'https://example.com', license: 'Apache-2.0', package: { name: 'example', version: '1.0.0' }, demo: { url: 'https://example.com/demo', localProcessing: true }, runtime: { backends: [{ name: 'webgpu', status: 'stable' }], capabilities: [], verifiedEnvironments: [] }, io: { input: ['Blob'], output: ['JSON'] }, assets: [{ id: 'fp16', precision: 'fp16', bytes: 1, url: 'https://example.com/model', sha256: 'a'.repeat(64) }], limitations: [] } as const;
const models = [
  { ...common, id: 'layout', name: 'PP-DocLayoutV3', task: 'document-layout', summary: 'Document layout analysis in the browser.' },
  { ...common, id: 'ocr', name: 'PP-OCRv6', task: 'ocr', status: 'research', summary: 'OCR model roadmap entry for the browser.' },
  { ...common, id: 'pp-tinypose', name: 'PP-TinyPose', task: 'pose-estimation', summary: '在浏览器本地估计单人人体姿态并输出 17 个 COCO 关键点。' },
  { ...common, id: 'pp-segmentation', name: 'PP-Segmentation', task: 'instance-segmentation', summary: '在浏览器本地完成图片实例分割，返回独立的对象掩码。' },
  { ...common, id: 'pp-rotated-detection', name: 'PP-RotatedDetection', task: 'rotated-detection', summary: '在浏览器本地完成单帧遥感旋转框检测并返回原图四点框。' },
] as unknown as ModelData[];

describe('ModelDirectory', () => {
  it('旋转框检测分类只展示独立 SDK 并提供详情入口', () => {
    render(<ModelDirectory models={models} />);
    expect(screen.getByRole('option', { name: '旋转框检测' })).toHaveValue('rotated-detection');
    fireEvent.change(screen.getByRole('combobox', { name: '任务' }), { target: { value: 'rotated-detection' } });
    expect(screen.getByText('1 个条目')).toBeVisible();
    expect(screen.getByText('baidu · 旋转框检测')).toBeVisible();
    expect(screen.getByRole('link', { name: 'PP-RotatedDetection' })).toHaveAttribute('href', '/models/pp-rotated-detection/');
    expect(screen.queryByText('PP-Segmentation')).not.toBeInTheDocument();
  });

  it('实例分割分类只展示分割模型并提供独立 SDK 详情入口', () => {
    render(<ModelDirectory models={models} />);
    fireEvent.change(screen.getByRole('combobox', { name: '任务' }), { target: { value: 'instance-segmentation' } });
    expect(screen.getByText('1 个条目')).toBeVisible();
    expect(screen.getByText('baidu · 实例分割')).toBeVisible();
    expect(screen.getByRole('link', { name: 'PP-Segmentation' })).toHaveAttribute('href', '/models/pp-segmentation/');
    expect(screen.queryByText('PP-TinyPose')).not.toBeInTheDocument();
  });

  it('人体姿态分类只展示 TinyPose 并提供详情入口', () => {
    render(<ModelDirectory models={models} />);
    expect(screen.getByRole('option', { name: '人体姿态' })).toHaveValue('pose-estimation');
    fireEvent.change(screen.getByRole('combobox', { name: '任务' }), { target: { value: 'pose-estimation' } });
    expect(screen.getByText('1 个条目')).toBeVisible();
    expect(screen.getByText('baidu · 人体姿态')).toBeVisible();
    expect(screen.getByRole('link', { name: 'PP-TinyPose' })).toHaveAttribute('href', '/models/pp-tinypose/');
    expect(screen.queryByText('PP-DocLayoutV3')).not.toBeInTheDocument();
  });

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
