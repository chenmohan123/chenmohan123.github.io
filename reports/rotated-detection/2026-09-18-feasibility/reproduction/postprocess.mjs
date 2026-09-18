// 可行性实验：四点框遵循固定上游点序，多边形交集由polygon-clipping实现。
export function corners([x, y, w, h, angle], [sy, sx] = [1, 1]) {
  const c = Math.cos(angle) / 2, s = Math.sin(angle) / 2;
  const wx = c * w, wy = s * w, hx = -s * h, hy = c * h;
  return [[(x + wx + hx) / sx, (y + wy + hy) / sy], [(x - wx + hx) / sx, (y - wy + hy) / sy],
    [(x - wx - hx) / sx, (y - wy - hy) / sy], [(x + wx - hx) / sx, (y + wy - hy) / sy]];
}

function area(points) {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    sum += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(sum) / 2;
}

export function polygonIoU(a, b) {
  const areaA = area(a), areaB = area(b);
  if (!areaA || !areaB) return 0;
  const result = globalThis.polygonClipping.intersection([a], [b]);
  let intersection = 0;
  for (const polygon of result) intersection += area(polygon[0]) - polygon.slice(1).reduce((sum, ring) => sum + area(ring), 0);
  return intersection / (areaA + areaB - intersection);
}

export function select(scores, boxes, scaleFactor, options = {}) {
  const { scoreThreshold = .1, iouThreshold = .1, topK = 2000, classCount = 15 } = options;
  const scoreLimit = Math.fround(scoreThreshold);
  const count = boxes.length / 5, rows = [];
  for (let classId = 0; classId < classCount; classId++) {
    const candidates = [];
    for (let index = 0; index < count; index++) {
      const score = scores[classId * count + index];
      if (score > scoreLimit) candidates.push({ index, classId, score });
    }
    candidates.sort((a, b) => b.score - a.score || a.index - b.index);
    const kept = [];
    for (const item of candidates.slice(0, topK)) {
      item.rbox = Array.from(boxes.subarray(item.index * 5, item.index * 5 + 5));
      item.polygon = corners(item.rbox, scaleFactor);
      if (kept.some(previous => polygonIoU(item.polygon, previous.polygon) > iouThreshold)) continue;
      kept.push(item);
    }
    rows.push(...kept);
  }
  return rows;
}
