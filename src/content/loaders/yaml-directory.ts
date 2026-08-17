import type { Loader } from 'astro/loaders';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { glob } from 'tinyglobby';
import { parse } from 'yaml';

export function yamlDirectory({ base }: { base: string }): Loader {
  return {
    name: 'yaml-directory',
    load: async ({ store, parseData, generateDigest }) => {
      store.clear();
      const files = await glob('*.yaml', { cwd: base, absolute: true });
      for (const filePath of files.sort()) {
        const id = basename(filePath, '.yaml');
        const raw = parse(await readFile(filePath, 'utf8'));
        const data = await parseData({ id, data: raw, filePath });
        store.set({ id, data, filePath, digest: generateDigest(data) });
      }
    },
  };
}
