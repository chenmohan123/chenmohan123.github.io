import type { ModelData } from './types';

export const taskDisplayNames: Partial<Record<ModelData['task'], string>> = {
  'rotated-detection': '旋转框检测',
  'pose-estimation': '人体姿态',
  'instance-segmentation': '实例分割',
};
