import { readFileSync, readdirSync } from 'node:fs';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import { modelSchema } from './schema';

const model = parse(readFileSync('src/content/models/pp-doclayoutv3.yaml', 'utf8'));
const tracking = { ...model, kind: 'algorithm', task: 'multi-object-tracking', assets: [],
  runtime: { backends: [{ name: 'cpu', status: 'stable' }] },
  algorithm: { id: 'pp-tracking', version: '0.1.0', family: 'ByteTrack 机制', source: '独立实现；https://arxiv.org/abs/2110.06864', license: 'Apache-2.0', input: 'TrackingFrame', output: 'TrackingResult', stateful: true } };

describe('模型与算法互斥契约', () => {
  it('继续接受原有七款模型', () => {
    const records = readdirSync('src/content/models').filter(file => file.endsWith('.yaml') && file !== 'pp-tracking.yaml');
    expect(records).toHaveLength(7);
    for (const file of records) expect(modelSchema.safeParse(parse(readFileSync(`src/content/models/${file}`, 'utf8'))).success).toBe(true);
  });
  it('接受完整无权重 CPU 算法', () => expect(modelSchema.safeParse(tracking).success).toBe(true));
  it('拒绝缺来源、缺元数据及携带模型权重的算法', () => {
    expect(modelSchema.safeParse({ ...tracking, algorithm: { ...tracking.algorithm, source: '' } }).success).toBe(false);
    expect(modelSchema.safeParse({ ...tracking, algorithm: undefined }).success).toBe(false);
    expect(modelSchema.safeParse({ ...tracking, assets: [model.assets[0]] }).success).toBe(false);
  });
  it('拒绝模型缺资产、模型携带算法及未知类型', () => {
    expect(modelSchema.safeParse({ ...model, assets: [] }).success).toBe(false);
    expect(modelSchema.safeParse({ ...model, algorithm: tracking.algorithm }).success).toBe(false);
    expect(modelSchema.safeParse({ ...tracking, kind: 'unknown' }).success).toBe(false);
  });
});
