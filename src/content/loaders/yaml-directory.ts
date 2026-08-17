import type { Loader } from 'astro/loaders';
import { readFile } from 'node:fs/promises';
import { basename, relative } from 'node:path';
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
        const siteRelativePath = relative(process.cwd(), filePath).replaceAll('\\', '/');
        const raw = parse(await readFile(filePath, 'utf8'));
        const data = await parseData({ id, data: raw, filePath: siteRelativePath });
        store.set({ id, data, filePath: siteRelativePath, digest: generateDigest(data) });
      }
    },
  };
}
