import { afterEach, describe, expect, it } from "vitest";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import YAML from "yaml";
import { validateManifest } from "./src/manifest.mjs";
import { scanRepository } from "./src/check.mjs";

const complete = "tools/sdk-standard-check/fixtures/complete-sdk";
const model = () => YAML.parse(readFileSync(`${complete}/sdk-manifest.yaml`, "utf8"));
const algorithm = () => {
  const value = model();
  value.schemaVersion = "1.2.0";
  value.kind = "algorithm";
  delete value.model;
  delete value.cache;
  value.algorithm = {
    id: "tracking", version: "0.1.0", family: "multi-object-tracking",
    source: "独立实现；论文与差异见 NOTICE", license: "Apache-2.0",
    input: "docs/zh-CN/api.md#tracking-frame", output: "docs/zh-CN/api.md#tracking-result", stateful: true,
  };
  value.runtime = { backends: ["cpu"], executionModes: ["main"], actualBackendReported: true, runtimeVersion: "tracking@0.1.0" };
  value.performance.timings = ["validationMs", "predictionMs", "associationMs", "updateMs", "totalMs"];
  return value;
};
const demo = '<html lang="zh-CN"><button>中文 / English</button><section data-sdk-algorithm-info></section><section data-sdk-runtime-info></section><section data-sdk-timing></section><button data-sdk-state-reset>复位</button></html>';
const roots: string[] = [];
function repository(value: ReturnType<typeof algorithm>, html = demo) {
  const root = mkdtempSync(path.join(tmpdir(), "sdk-algorithm-"));
  roots.push(root);
  cpSync(complete, root, { recursive: true });
  writeFileSync(path.join(root, "sdk-manifest.yaml"), YAML.stringify(value));
  writeFileSync(path.join(root, "apps/demo/index.html"), html);
  return root;
}
afterEach(() => {
  for (const root of roots.splice(0)) {
    expect(path.dirname(path.resolve(root))).toBe(path.resolve(tmpdir()));
    expect(path.basename(root)).toMatch(/^sdk-algorithm-/);
    rmSync(root, { recursive: true, force: true });
  }
});

describe("纯算法 SDK 契约", () => {
  it("合法算法无模型与缓存也通过，模型专属规则有跳过理由和证据", async () => {
    const report = await scanRepository(repository(algorithm()));
    expect(report.findings.filter((x: { level: string; status: string }) => x.level === "required" && x.status === "fail")).toEqual([]);
    for (const id of ["DEMO-004", "MODEL-001", "CACHE-001"]) {
      expect(report.findings).toContainEqual(expect.objectContaining({ id, status: "skip", path: "sdk-manifest.yaml", evidence: expect.stringContaining("algorithm") }));
    }
    for (const id of ["ALGORITHM-001", "DEMO-005", "DEMO-006", "PERF-001"]) {
      expect(report.findings).toContainEqual(expect.objectContaining({ id, status: "pass" }));
    }
  });

  it.each(["id", "version", "family", "source", "license", "input", "output", "stateful"])("拒绝缺少算法字段 %s", (field) => {
    const value = algorithm();
    delete value.algorithm[field];
    expect(validateManifest(value)).toContainEqual(expect.stringContaining(`/algorithm/${field}`));
  });

  it.each(["缺少 algorithm", "携带 model", "携带 cache", "旧版 1.0.0", "旧版 1.1.0", "伪造 kind", "无效 stateful", "缺少算法 timing"])("%s 不得获得模型豁免", async (scenario) => {
    const value = algorithm();
    if (scenario === "缺少 algorithm") delete value.algorithm;
    if (scenario === "携带 model") value.model = model().model;
    if (scenario === "携带 cache") value.cache = model().cache;
    if (scenario.startsWith("旧版")) value.schemaVersion = scenario.slice(3);
    if (scenario === "伪造 kind") value.kind = "Algorithm";
    if (scenario === "无效 stateful") value.algorithm.stateful = "true";
    if (scenario === "缺少算法 timing") value.performance.timings = ["validationMs", "predictionMs", "associationMs", "totalMs", "totalMs"];
    const report = await scanRepository(repository(value));
    expect(report.findings).toContainEqual(expect.objectContaining({ id: "CONFIG-001", status: "fail" }));
    for (const id of ["MODEL-001", "CACHE-001", "ALGORITHM-001"]) {
      expect(report.findings).toContainEqual(expect.objectContaining({ id, status: "fail" }));
    }
  });

  it.each(["data-sdk-state-reset", "data-sdk-algorithm-info", "data-sdk-runtime-info", "data-sdk-timing"])("缺少 %s 标记会失败，说明文字不能代替标记", async (marker) => {
    const report = await scanRepository(repository(algorithm(), demo.replace(marker, "data-unrelated") + "validationMs totalMs 耗时"));
    expect(report.findings).toContainEqual(expect.objectContaining({ id: marker === "data-sdk-state-reset" ? "DEMO-006" : "DEMO-005", status: "fail" }));
  });

  it.each(["1.0.0", "1.1.0", "1.2.0", "1.3.0"])("%s 模型保留 assets 必填及算法分支互斥", (schemaVersion) => {
    const value = { ...model(), schemaVersion, kind: "model" };
    expect(validateManifest(value)).toEqual([]);
    value.algorithm = algorithm().algorithm;
    expect(validateManifest(value).length).toBeGreaterThan(0);
    delete value.algorithm;
    delete value.model.assets;
    expect(validateManifest(value)).toContainEqual(expect.stringContaining("/model/assets"));
  });

  it("1.3.0 继续允许独立算法清单", () => {
    expect(validateManifest({ ...algorithm(), schemaVersion: "1.3.0" })).toEqual([]);
  });

  it("算法脚手架模板通过完整清单校验", () => {
    const value = YAML.parse(readFileSync("standards/v1/templates/sdk-manifest.algorithm.yaml", "utf8"));
    expect(value.kind).toBe("algorithm");
    expect(validateManifest(value)).toEqual([]);
  });
});
