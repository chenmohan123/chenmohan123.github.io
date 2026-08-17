import type { BackendName, ModelData, ModelStatus } from './types';

export interface ModelFilters {
  query: string;
  brand: string | 'all';
  task: ModelData['task'] | 'all';
  status: ModelStatus | 'all';
  backend: BackendName | 'all';
}

export function filterModels(models: ModelData[], filters: ModelFilters): ModelData[] {
  const query = filters.query.trim().toLocaleLowerCase();
  return models.filter((model) => {
    const haystack = `${model.name} ${model.summary} ${model.package.name}`.toLocaleLowerCase();
    return (!query || haystack.includes(query))
      && (filters.brand === 'all' || model.brand === filters.brand)
      && (filters.task === 'all' || model.task === filters.task)
      && (filters.status === 'all' || model.status === filters.status)
      && (filters.backend === 'all' || model.runtime.backends.some((item) => item.name === filters.backend));
  });
}

export function groupCounts(models: ModelData[], key: 'brand' | 'task' | 'status'): Record<string, number> {
  return models.reduce<Record<string, number>>((counts, model) => {
    counts[model[key]] = (counts[model[key]] ?? 0) + 1;
    return counts;
  }, {});
}
