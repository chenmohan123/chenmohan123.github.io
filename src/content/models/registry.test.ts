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

  it('rejects a stable backend without a backend name', () => {
    expect(() => modelSchema.parse({ runtime: { backends: [{ status: 'stable' }] } })).toThrow();
  });
});
