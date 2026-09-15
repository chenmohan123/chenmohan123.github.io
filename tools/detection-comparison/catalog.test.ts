import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import data from '../../src/data/pp-detection-comparison.json';
import receipt from '../../reports/sdk-standard/2026-09-15-detection-selection/sources.json';

describe('选型表与发布目录的一致性', () => {
  it('每份稳定权重恰好对应一行，排除未发布候选，防止目录更新后展示错误权重数据', () => {
    const catalog = parse(readFileSync('src/content/models/pp-detection.yaml', 'utf8'));
    const identity = (row: { id: string; bytes: number; sha256: string }) => ({ id: row.id, bytes: row.bytes, sha256: row.sha256 });
    expect(data.rows.map(identity)).toEqual(catalog.assets.map(identity));
    expect(new Set(data.rows.map((r) => r.id)).size).toBe(catalog.assets.length);
    expect(data.excluded.every((r) => !data.rows.some((row) => row.id === r.id))).toBe(true);
  });
  it('生成文件摘要与汇编记录一致，保留每组真实计时轮次', () => {
    const bytes = readFileSync(receipt.output.path);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(receipt.output.sha256);
    for (const row of data.rows) {
      const group = data.groups.find((g) => g.id === row.group)!;
      expect(row.wasm.timingRounds).toEqual(group.timingRounds);
      expect(row.webgpu.timingRounds).toEqual(group.timingRounds);
    }
  });
});
