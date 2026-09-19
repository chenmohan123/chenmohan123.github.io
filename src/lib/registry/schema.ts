import { z } from 'zod';

export const backendStatusSchema = z.enum(['stable', 'fallback', 'experimental']);

export const modelSchema = z.object({
  kind: z.enum(['model', 'algorithm']).default('model'),
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  brand: z.string().regex(/^[a-z0-9-]+$/),
  task: z.enum(['ocr', 'document-layout', 'detection', 'rotated-detection', 'pose-estimation', 'instance-segmentation', 'multi-object-tracking', 'asr', 'tts', 'image-correction', 'vision-language']),
  status: z.enum(['available', 'beta', 'in-development', 'research', 'not-applicable']),
  summary: z.string().min(20),
  repository: z.string().url(),
  license: z.string().min(1),
  package: z.object({ name: z.string().min(1), version: z.string().regex(/^\d+\.\d+\.\d+$/) }),
  demo: z.object({ url: z.string().url(), localProcessing: z.boolean() }),
  runtime: z.object({
    backends: z.array(z.object({ name: z.enum(['webgpu', 'wasm', 'webnn', 'cpu']), status: backendStatusSchema })).min(1),
    capabilities: z.array(z.string()).default([]),
    verifiedEnvironments: z.array(z.object({ browser: z.string(), os: z.string(), device: z.string(), testedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })).default([]),
  }),
  io: z.object({ input: z.array(z.string()).min(1), output: z.array(z.string()).min(1) }),
  assets: z.array(z.object({ id: z.string(), precision: z.string(), bytes: z.number().int().positive(), url: z.string().url(), sha256: z.string().regex(/^[a-f0-9]{64}$/) })),
  algorithm: z.object({ id: z.string().trim().min(1), version: z.string().trim().min(1), family: z.string().trim().min(1), source: z.string().trim().min(1), license: z.string().trim().min(1), input: z.string().trim().min(1), output: z.string().trim().min(1), stateful: z.boolean() }).strict().optional(),
  limitations: z.array(z.string()).default([]),
}).superRefine((entry, context) => {
  if (entry.kind === 'algorithm') {
    if (!entry.algorithm) context.addIssue({ code: 'custom', path: ['algorithm'], message: '算法必须声明来源及完整元数据' });
    if (entry.assets.length !== 0) context.addIssue({ code: 'custom', path: ['assets'], message: '算法不得声明模型权重' });
  } else {
    if (entry.algorithm) context.addIssue({ code: 'custom', path: ['algorithm'], message: '模型不得携带算法元数据' });
    if (entry.assets.length === 0) context.addIssue({ code: 'custom', path: ['assets'], message: '模型必须声明非空资产' });
  }
});
