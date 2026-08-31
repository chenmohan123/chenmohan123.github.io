import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { modelSchema } from '../../lib/registry/schema';

describe('model registry', () => {
  it('accepts the PP-DocLayoutV3 catalog record', () => {
    const value = parse(readFileSync('src/content/models/pp-doclayoutv3.yaml', 'utf8'));
    const model = modelSchema.parse(value);
    expect(model.package.version).toBe('1.1.0');
    expect(model.assets[0].bytes).toBe(74279796);
    expect(model.demo.url).toBe('https://chenmohan123.github.io/web-sdk-PP-DocLayoutV3/');
  });

  it('accepts the published PaddleDetection PicoDet catalog record', () => {
    const value = parse(readFileSync('src/content/models/pp-detection.yaml', 'utf8'));
    const model = modelSchema.parse(value);
    expect(model.task).toBe('detection');
    expect(model.package).toEqual({ name: 'web-sdk-pp-detection', version: '0.1.1' });
    expect(model.repository).toBe('https://github.com/chenmohan123/web-sdk-PP-Detection');
    expect(model.demo.url).toBe('https://chenmohan123.github.io/web-sdk-PP-Detection/');
    expect(model.runtime.backends.map((backend) => backend.name)).toEqual(expect.arrayContaining(['wasm', 'webgpu']));
    expect(model.io.input).toEqual(expect.arrayContaining(['Blob', 'Canvas', 'ImageBitmap', 'VideoFrame']));
    expect(model.io.output).toEqual(expect.arrayContaining(['bounding boxes', 'labels', 'scores']));
    expect(model.assets[0].bytes).toBe(23243834);
    expect(model.assets[0].sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(model.limitations.join(' ')).toMatch(/微信/);
    expect(model.limitations.join(' ')).toMatch(/FP16|INT8|INT4|FP8/);
  });

  it('rejects a stable backend without a backend name', () => {
    expect(() => modelSchema.parse({ runtime: { backends: [{ status: 'stable' }] } })).toThrow();
  });
});
