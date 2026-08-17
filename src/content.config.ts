import { defineCollection, z } from 'astro:content';
import { yamlDirectory } from './content/loaders/yaml-directory';

export const backendStatusSchema = z.enum(['stable', 'fallback', 'experimental']);

export const modelSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  brand: z.string().regex(/^[a-z0-9-]+$/),
  task: z.enum(['ocr', 'document-layout', 'detection', 'asr', 'tts', 'image-correction', 'vision-language']),
  status: z.enum(['available', 'beta', 'in-development', 'research', 'not-applicable']),
  summary: z.string().min(20),
  repository: z.string().url(),
  license: z.string().min(1),
  package: z.object({
    name: z.string().min(1),
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
  }),
  demo: z.object({ url: z.string().url(), localProcessing: z.boolean() }),
  runtime: z.object({
    backends: z.array(z.object({
      name: z.enum(['webgpu', 'wasm', 'webnn']),
      status: backendStatusSchema,
    })).min(1),
    capabilities: z.array(z.string()).default([]),
    verifiedEnvironments: z.array(z.object({
      browser: z.string(),
      os: z.string(),
      device: z.string(),
      testedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })).default([]),
  }),
  io: z.object({ input: z.array(z.string()).min(1), output: z.array(z.string()).min(1) }),
  assets: z.array(z.object({
    id: z.string(),
    precision: z.string(),
    bytes: z.number().int().positive(),
    url: z.string().url(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
  })).min(1),
  limitations: z.array(z.string()).default([]),
});

const models = defineCollection({
  loader: yamlDirectory({ base: './src/content/models' }),
  schema: modelSchema,
});

export const collections = { models };
