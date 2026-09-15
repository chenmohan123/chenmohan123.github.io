import { describe, expect, it } from "vitest";
import { summarizeVariant, tinyRun } from "./build.mjs";

const asset = { id: "fixture-fp16", precision: "fp16", bytes: 40, sha256: "a".repeat(64) };
const runs = () => ["wasm", "webgpu"].flatMap((backend) => [1, 2, 3].map((round) => ({
  backend, round, bytes: 40, sha256: asset.sha256,
  apPoints: 40 + round / 10, apDeltaPoints: -0.2, retention: 0.98,
  warmInferenceMs: [900, 100, 20][round - 1],
})));

describe("选型数据汇总", () => {
  it("分别保留三轮质量范围和原报告耗时轮次，不能把第三轮当成三轮中位数", () => {
    const single = summarizeVariant(asset, runs(), [3]);
    const repeated = summarizeVariant(asset, runs(), [1, 2, 3]);
    expect(single.wasm.apRange).toEqual([40.1, 40.3]);
    expect(single.wasm.warmInferenceMs).toBe(20);
    expect(repeated.wasm.warmInferenceMs).toBe(100);
    expect(single.webgpu.minimumRetention).toBe(0.98);
  });

  it("拒绝缺轮、重复轮和权重身份不匹配，避免把其他模型数据并入稳定资产", () => {
    expect(() => summarizeVariant(asset, runs().slice(1), [3])).toThrow(/轮次/);
    expect(() => summarizeVariant(asset, [...runs(), runs()[0]], [3])).toThrow(/轮次/);
    const wrong = runs(); wrong[0].sha256 = "b".repeat(64);
    expect(() => summarizeVariant(asset, wrong, [3])).toThrow(/权重/);
  });

  it("拒绝未达质量门槛、非有限值及非法 AP 单位", () => {
    const failed = runs(); failed[0].retention = 0.94;
    expect(() => summarizeVariant(asset, failed, [3])).toThrow(/门槛/);
    const invalid = runs(); invalid[0].warmInferenceMs = NaN;
    expect(() => summarizeVariant(asset, invalid, [3])).toThrow(/数值/);
    const scale = runs(); scale[0].apPoints = 101;
    expect(() => summarizeVariant(asset, scale, [3])).toThrow(/数值/);
  });
});


describe("Tiny FP32原始证据", () => {
  const fixture = () => ({
    status: "passed",
    artifacts: { model: asset, sdk: { sha256: "sdk" }, annotations: { sha256: "d398fc9b09d97135e9b92d28d170681ed50bcd3a5518f16f559e6e379adc1b79" }, imageSetSha256: "1a36e342e8b8f00a4709d60f9f90d783ec61b179f89d64f041192d350281a99c" },
    runtime: { backend: "wasm", requestedBackend: "wasm", mode: "main", precision: "fp32", fallbacks: [] as string[] },
    images: Array.from({ length: 64 }, (_, imageId) => ({ imageId, timings: { inferenceMs: imageId === 0 ? 900 : 47 } })),
  });
  const summary = { rounds: [{ round: 1, AP: 22.6, warmInferenceMs: 47, pythonComparison: { matchedCount: 184, referenceCount: 208 } }] };
  it("使用排除首图的真实耗时，自身FP32基线不受其他比较匹配率影响", () => {
    const result = tinyRun(asset, summary, fixture(), "wasm", 1, "sdk");
    expect(result.warmInferenceMs).toBe(47);
    expect(result.retention).toBe(1);
    expect(result.apDeltaPoints).toBe(0);
  });
  it("拒绝错模型、错后端、回退、重复图片与汇总耗时漂移", () => {
    const wrongModel = fixture(); wrongModel.artifacts.model = { ...asset, sha256: "other" };
    expect(() => tinyRun(asset, summary, wrongModel, "wasm", 1, "sdk")).toThrow();
    const fallback = fixture(); fallback.runtime.fallbacks = ["wasm"];
    expect(() => tinyRun(asset, summary, fallback, "wasm", 1, "sdk")).toThrow();
    expect(() => tinyRun(asset, summary, fixture(), "webgpu", 1, "sdk")).toThrow();
    const duplicate = fixture(); duplicate.images[1].imageId = 0;
    expect(() => tinyRun(asset, summary, duplicate, "wasm", 1, "sdk")).toThrow();
    expect(() => tinyRun(asset, { rounds: [{ round: 1, AP: 22.6, warmInferenceMs: 900 }] }, fixture(), "wasm", 1, "sdk")).toThrow();
    expect(() => tinyRun(asset, summary, fixture(), "wasm", 2, "sdk")).toThrow(/轮次/);
  });
});
