// 固定640×640候选的实验后处理，用于核对可行性，不是公开SDK接口。
function boxIou(a, b) {
  const inter = Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
  const area = box => Math.max(0, box[2] - box[0]) * Math.max(0, box[3] - box[1]);
  return inter / Math.max(1e-12, area(a) + area(b) - inter);
}

export function selectInstances([boxes, scores]) {
  const all = [];
  for (let label = 0; label < 80; label++) {
    let candidates = [];
    for (let i = 0; i < 8400; i++) {
      const score = scores[label * 8400 + i];
      if (score > 0.5) candidates.push({ label, index: i, score, box640: Array.from(boxes.subarray(i * 4, i * 4 + 4)) });
    }
    candidates.sort((a, b) => b.score - a.score);
    candidates = candidates.slice(0, 1000);
    while (candidates.length) {
      const first = candidates.shift();
      all.push(first);
      candidates = candidates.filter(row => boxIou(row.box640, first.box640) <= 0.7);
    }
  }
  return all.sort((a, b) => b.score - a.score).slice(0, 300);
}

function resizeLinear(input, sw, sh, width, height) {
  const out = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    const sy = Math.max(0, Math.min(sh - 1, (y + 0.5) * sh / height - 0.5));
    const y0 = Math.floor(sy), y1 = Math.min(y0 + 1, sh - 1), fy = sy - y0;
    for (let x = 0; x < width; x++) {
      const sx = Math.max(0, Math.min(sw - 1, (x + 0.5) * sw / width - 0.5));
      const x0 = Math.floor(sx), x1 = Math.min(x0 + 1, sw - 1), fx = sx - x0;
      const top = input[y0 * sw + x0] * (1 - fx) + input[y0 * sw + x1] * fx;
      const bottom = input[y1 * sw + x0] * (1 - fx) + input[y1 * sw + x1] * fx;
      out[y * width + x] = top * (1 - fy) + bottom * fy;
    }
  }
  return out;
}

export function recoverMasks(values, rows, width, height) {
  const coefficients = values[2], prototypes = values[3];
  const masks = [];
  for (const row of rows) {
    const probability = new Float32Array(160 * 160);
    for (let i = 0; i < probability.length; i++) {
      let sum = 0;
      for (let c = 0; c < 32; c++) sum += coefficients[c * 8400 + row.index] * prototypes[c * 25600 + i];
      probability[i] = 1 / (1 + Math.exp(-Math.max(-80, Math.min(80, sum))));
    }
    const crop = resizeLinear(probability, 160, 160, 640, 640);
    const [x1, y1, x2, y2] = row.box640;
    for (let y = 0; y < 640; y++) for (let x = 0; x < 640; x++) {
      if (x < x1 || x >= x2 || y < y1 || y >= y2) crop[y * 640 + x] = 0;
    }
    const restored = resizeLinear(crop, 640, 640, width, height);
    const mask = Uint8Array.from(restored, value => value > 0.5 ? 1 : 0);
    row.box = row.box640.map((value, i) => value * (i % 2 === 0 ? width : height) / 640);
    row.maskArea = mask.reduce((a, b) => a + b, 0);
    masks.push(mask);
  }
  return masks;
}
