import { describe, expect, it } from "vitest";
import { summarizeVariant } from "./build.mjs";

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
