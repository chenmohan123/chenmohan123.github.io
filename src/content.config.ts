import { defineCollection } from 'astro:content';
import { yamlDirectory } from './content/loaders/yaml-directory';
import { modelSchema } from './lib/registry/schema';

export { modelSchema } from './lib/registry/schema';

const models = defineCollection({
  loader: yamlDirectory({ base: './src/content/models' }),
  schema: modelSchema,
});

export const collections = { models };
