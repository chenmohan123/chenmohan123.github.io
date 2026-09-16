import assert from "node:assert/strict";

const fp32Sha = "1065a342456dfddf91d3220d2ec929640fa253d17562804cae5dbe7772c22653";
const annotationSha = "d398fc9b09d97135e9b92d28d170681ed50bcd3a5518f16f559e6e379adc1b79";
const imageSetSha = "1a36e342e8b8f00a4709d60f9f90d783ec61b179f89d64f041192d350281a99c";

/** 新精度与当轮同后端FP32绑定，首发FP32行继续保留历史批次数据。 */
export function tinyPrecisionRun(asset, row, reference, raw, backend, round, sdkSha256) {
  assert(["fp32", "fp16"].includes(asset.precision), "不是本轮发布精度");
  assert(["wasm", "webgpu"].includes(backend) && [1, 2, 3].includes(round), "无效后端或轮次");
  assert.equal(row.precision, asset.precision);
  assert.equal(reference.precision, "fp32", "缺少FP32对照");
  for (const value of [row, reference]) {
    assert.equal(value.backend, backend, "对照后端不匹配");
    assert.equal(value.round, round, "对照轮次不匹配");
    assert.equal(value.qualityGatePassed, true, "质量未达门槛");
    assert.equal(value.artifacts.sdk.sha256, sdkSha256);
    assert.equal(value.artifacts.annotations.sha256, annotationSha);
    assert.equal(value.artifacts.imageSetSha256, imageSetSha);
    assert(Number.isFinite(value.metrics.metrics.AP) && value.metrics.metrics.AP >= 0 && value.metrics.metrics.AP <= 1, "AP单位或数值错误");
  }
  assert.equal(reference.artifacts.model.sha256, fp32Sha, "FP32对照模型错误");
  assert.equal(reference.artifacts.model.bytes, 4511117);
  assert.equal(raw.status, "passed");
  assert.deepEqual(raw.artifacts, row.artifacts, "原始证据与汇总身份不同");
  assert.equal(raw.artifacts.model.sha256, asset.sha256);
  assert.equal(raw.artifacts.model.bytes, asset.bytes);
  assert.equal(raw.model.id, "ppyolo-tiny-320");
  assert.equal(raw.model.variantId, asset.precision);
  assert.equal(raw.model.precision, asset.precision);
  assert.equal(raw.runtime.precision, asset.precision);
  assert.equal(raw.runtime.backend, backend);
  assert.equal(raw.runtime.requestedBackend, backend);
  assert.equal(raw.runtime.mode, "main");
  assert.deepEqual(raw.runtime.fallbacks, []);
  if (backend === "webgpu") assert.equal(raw.environment.gpu.physical, true);
  assert.equal(raw.images.length, 64);
  assert.equal(new Set(raw.images.map((image) => image.imageId)).size, 64);
  const times = raw.images.map((image) => image.timings.inferenceMs);
  assert(times.every((time) => Number.isFinite(time) && time >= 0), "原始耗时无效");
  const warm = times.slice(1).sort((a, b) => a - b)[31];
  assert.equal(row.warmInferenceMedianMs, warm, "汇总耗时与原始证据不同");
  const delta = (row.metrics.metrics.AP - reference.metrics.metrics.AP) * 100;
  assert(Number.isFinite(row.apDeltaPoints) && Math.abs(delta - row.apDeltaPoints) < 1e-9, "AP差值与本轮对照不符");
  assert(delta >= -0.5, "AP未达发布门槛");
  const retention = row.retention.fraction;
  assert(Number.isFinite(retention) && retention >= 0.95 && retention <= 1, "保留率未达发布门槛");
  return {
    backend, round, bytes: asset.bytes, sha256: asset.sha256,
    apPoints: row.metrics.metrics.AP * 100,
    apDeltaPoints: row.apDeltaPoints, retention, warmInferenceMs: warm,
  };
}
