import type { CollectionEntry } from 'astro:content';

export type ModelEntry = CollectionEntry<'models'>;
export type ModelData = ModelEntry['data'];
export type BackendName = ModelData['runtime']['backends'][number]['name'];
export type ModelStatus = ModelData['status'];
