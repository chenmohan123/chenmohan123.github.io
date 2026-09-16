import { describe, expect, it } from "vitest";
import { tinyPrecisionRun } from "./tiny-precision.mjs";

const fixture = () => {
  const asset = { precision: "fp16", bytes: 2357376, sha256: "candidate" };
  const artifacts = {
    model: { bytes: asset.bytes, sha256: asset.sha256 },
    sdk: { sha256: "sdk" },
    annotations: { sha256: "d398fc9b09d97135e9b92d28d170681ed50bcd3a5518f16f559e6e379adc1b79" },
    imageSetSha256: "1a36e342e8b8f00a4709d60f9f90d783ec61b179f89d64f041192d350281a99c",
  };
  const row = {
    precision: "fp16", backend: "wasm", round: 2, artifacts,
    metrics: { metrics: { AP: 0.225 } }, apDeltaPoints: (0.225 - 0.226) * 100,
    retention: { fraction: 0.995 }, warmInferenceMedianMs: 53, qualityGatePassed: true,
  };
  const reference = {
    ...row, precision: "fp32", metrics: { metrics: { AP: 0.226 } },
    artifacts: { ...artifacts, model: { bytes: 4511117, sha256: "1065a342456dfddf91d3220d2ec929640fa253d17562804cae5dbe7772c22653" } },
  };
  const raw = {
    status: "passed", artifacts,
    model: { id: "ppyolo-tiny-320", variantId: "fp16", precision: "fp16" },
    runtime: { backend: "wasm", requestedBackend: "wasm", mode: "main", precision: "fp16", fallbacks: [] as string[] },
    images: Array.from({ length: 64 }, (_, imageId) => ({ imageId, timings: { inferenceMs: imageId === 0 ? 500 : 53 } })),
  };
  return { asset, row, reference, raw };
};

function run(f = fixture()) {
  return tinyPrecisionRun(f.asset, f.row, f.reference, f.raw, "wasm", 2, "sdk");
}

describe("Tiny精度批次的对照与原始证据", () => {
  it("采用本轮FP32质量对照，并从原始图片排除首图计算耗时", () => {
    expect(run()).toMatchObject({ backend: "wasm", round: 2, warmInferenceMs: 53, retention: 0.995, apPoints: 22.5 });
  });
  it("拒绝不同后端/轮次/模型的FP32对照，以及差值漂移", () => {
    for (const mutation of ["round", "backend", "model", "delta"]) {
      const f = fixture();
      if (mutation === "round") f.reference.round = 1;
      if (mutation === "backend") f.reference.backend = "webgpu";
      if (mutation === "model") f.reference.artifacts.model.sha256 = "other";
      if (mutation === "delta") f.row.apDeltaPoints = 0;
      expect(() => run(f)).toThrow();
    }
  });
  it("拒绝回退、非有限耗时、身份变化和未达标精度", () => {
    for (const mutation of ["fallback", "time", "identity", "gate", "precision", "retention"]) {
      const f = fixture();
      if (mutation === "fallback") f.raw.runtime.fallbacks = ["wasm"];
      if (mutation === "time") f.raw.images[1].timings.inferenceMs = NaN;
      if (mutation === "identity") f.asset.sha256 = "wrong";
      if (mutation === "gate") f.row.qualityGatePassed = false;
      if (mutation === "precision") f.asset.precision = "w8a32";
      if (mutation === "retention") f.row.retention.fraction = 0.94;
      expect(() => run(f)).toThrow();
    }
  });
});
