import type { ModelData } from './types';

export const taskDisplayNames: Partial<Record<ModelData['task'], string>> = {
  'rotated-detection': '旋转框检测',
  'pose-estimation': '人体姿态',
  'instance-segmentation': '实例分割',
  'multi-object-tracking': '多目标跟踪',
};

export const backendDisplayNames = { cpu: 'CPU / JavaScript', wasm: 'wasm', webgpu: 'webgpu', webnn: 'webnn' };
