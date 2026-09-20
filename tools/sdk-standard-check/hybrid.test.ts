import { afterEach, describe, expect, it } from "vitest";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import YAML from "yaml";
import { scanRepository } from "./src/check.mjs";
import { validateManifest } from "./src/manifest.mjs";

const complete = "tools/sdk-standard-check/fixtures/complete-sdk";
const modelFixture = () => YAML.parse(readFileSync(`${complete}/sdk-manifest.yaml`, "utf8"));
const algorithm = {
  id: "tracking",
  version: "0.1.0",
  family: "multi-object-tracking",
  source: "独立实现；论文与差异见 NOTICE",
  license: "Apache-2.0",
  input: "docs/zh-CN/api.md#tracking-frame",
  output: "docs/zh-CN/api.md#tracking-result",
  stateful: true,
};
const cpuRuntime = {
  backends: ["cpu"],
  executionModes: ["main"],
  actualBackendReported: true,
  runtimeVersion: "tracking@0.1.0",
};
const wasmRuntime = {
  backends: ["wasm"],
  executionModes: ["worker"],
  actualBackendReported: true,
  runtimeVersion: "onnxruntime-web@1.0.0",
};
const algorithmPerformance = {
  timings: ["validationMs", "predictionMs", "associationMs", "updateMs", "totalMs"],
  coldStartDefined: true,
  warmRunDefined: true,
};
const modelPerformance = {
  timings: ["modelDownloadMs", "modelCacheReadMs", "integrityMs", "sessionMs", "inferenceMs", "totalMs"],
  coldStartDefined: true,
  warmRunDefined: true,
};

function hybrid() {
  const fixture = modelFixture();
  return {
    ...fixture,
    schemaVersion: "1.3.0",
    kind: "hybrid",
    algorithm: structuredClone(algorithm),
    runtime: {
      backends: ["cpu", "wasm"],
      executionModes: ["main", "worker"],
      actualBackendReported: true,
      runtimeVersion: "tracking-with-reid@0.1.0",
    },
    performance: {
      timings: [...algorithmPerformance.timings.slice(0, -1), ...modelPerformance.timings],
      coldStartDefined: true,
      warmRunDefined: true,
    },
    modules: {
      algorithm: { entry: ".", runtime: structuredClone(cpuRuntime), performance: structuredClone(algorithmPerformance) },
      model: { entry: "./reid", optional: true, runtime: structuredClone(wasmRuntime), performance: structuredClone(modelPerformance) },
    },
    verification: {
      environments: [
        { browser: "Chrome 151", os: "Windows 11", device: "Fixture Device", testedAt: "2026-09-21", module: "algorithm", backend: "cpu", runtimeVersion: "tracking@0.1.0" },
        { browser: "Chrome 151", os: "Windows 11", device: "Fixture Device", testedAt: "2026-09-21", module: "model", backend: "wasm", runtimeVersion: "onnxruntime-web@1.0.0" },
      ],
    },
  };
}

const demo = `<!doctype html><html lang="zh-CN"><body>
  <button>中文 / English</button>
  <button data-sdk-cache-clear="current">清理当前模型缓存</button>
  <button data-sdk-cache-clear="all">清理全部缓存</button>
  <button data-sdk-state-reset>复位</button>
  <section data-sdk-algorithm-info></section>
  <section data-sdk-model-info></section>
  <section data-sdk-runtime-info></section>
  <section data-sdk-timing></section>
</body></html>`;

const roots: string[] = [];
function repository(value = hybrid(), html = demo, exportsValue: unknown = { ".": "./dist/index.js", "./reid": "./dist/reid.js" }) {
  const root = mkdtempSync(path.join(tmpdir(), "sdk-hybrid-"));
  roots.push(root);
  cpSync(complete, root, { recursive: true });
  writeFileSync(path.join(root, "sdk-manifest.yaml"), YAML.stringify(value));
  writeFileSync(path.join(root, "apps/demo/index.html"), html);
  mkdirSync(path.join(root, "dist"), { recursive: true });
  writeFileSync(path.join(root, "dist/index.js"), "export const createTracker = () => ({});\n");
  writeFileSync(path.join(root, "dist/reid.js"), "export const createExtractor = () => ({});\n");
  writeFileSync(path.join(root, "dist/reid.d.ts"), "export declare const createExtractor: () => object;\n");
  const packageJson = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
  if (exportsValue === false) delete packageJson.exports;
  else packageJson.exports = exportsValue;
  writeFileSync(path.join(root, "package.json"), JSON.stringify(packageJson, null, 2));
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    expect(path.dirname(path.resolve(root))).toBe(path.resolve(tmpdir()));
    expect(path.basename(root)).toMatch(/^sdk-hybrid-/);
    rmSync(root, { recursive: true, force: true });
  }
});

describe("算法与可选模型混合 SDK 契约", () => {
  it("混合脚手架模板通过完整清单校验", () => {
    const template = "standards/v1/templates/sdk-manifest.hybrid.yaml";
    expect(existsSync(template)).toBe(true);
    const value = YAML.parse(readFileSync(template, "utf8"));
    expect(value.kind).toBe("hybrid");
    expect(validateManifest(value)).toEqual([]);
  });

  it("接受 1.3.0 混合清单并同时通过算法、模型和混合规则", async () => {
    const value = hybrid();
    expect(validateManifest(value)).toEqual([]);

    const report = await scanRepository(repository(value));
    expect(report.standardVersion).toBe("1.3.0");
    expect(report.findings.filter((finding: { level: string; status: string }) => finding.level === "required" && finding.status === "fail")).toEqual([]);
    for (const id of ["ALGORITHM-001", "MODEL-001", "CACHE-001", "DEMO-004", "DEMO-005", "DEMO-006", "HYBRID-001"]) {
      expect(report.findings).toContainEqual(expect.objectContaining({ id, status: "pass" }));
    }
  });

  it.each(["1.0.0", "1.1.0", "1.2.0"])("拒绝 %s 声明 hybrid", (schemaVersion) => {
    expect(validateManifest({ ...hybrid(), schemaVersion })).toContainEqual(expect.stringContaining("/schemaVersion"));
  });

  it.each(["algorithm", "model", "cache", "modules"])("拒绝缺少混合分支 %s", (field) => {
    const value = hybrid();
    delete value[field];
    expect(validateManifest(value)).toContainEqual(expect.stringContaining(`/${field}`));
  });

  it("拒绝可选模型被声明为必选或占用默认入口", () => {
    const requiredModel = hybrid();
    requiredModel.modules.model.optional = false;
    expect(validateManifest(requiredModel)).toContainEqual(expect.stringContaining("/modules/model/optional"));

    const sharedEntry = hybrid();
    sharedEntry.modules.model.entry = sharedEntry.modules.algorithm.entry;
    expect(validateManifest(sharedEntry)).toContainEqual(expect.stringContaining("/modules/model/entry"));
  });

  it.each([
    ["算法模块声明模型后端", "algorithm", ["webgpu"]],
    ["模型模块声明 CPU 后端", "model", ["cpu"]],
  ])("拒绝%s", (_label, module, backends) => {
    const value = hybrid();
    value.modules[module].runtime.backends = backends;
    expect(validateManifest(value)).toContainEqual(expect.stringContaining(`/modules/${module}/runtime/backends`));
  });

  it.each(["algorithm", "model"])("拒绝 %s 模块不报告实际后端", (module) => {
    const value = hybrid();
    value.modules[module].runtime.actualBackendReported = false;
    expect(validateManifest(value)).toContainEqual(expect.stringContaining(`/modules/${module}/runtime/actualBackendReported`));
  });

  it.each([
    ["algorithm", "associationMs"],
    ["model", "inferenceMs"],
  ])("拒绝 %s 模块缺少 %s", (module, timing) => {
    const value = hybrid();
    value.modules[module].performance.timings = value.modules[module].performance.timings.filter((name: string) => name !== timing);
    expect(validateManifest(value)).toContainEqual(expect.stringContaining(`/modules/${module}/performance/timings`));
  });

  it("拒绝顶层 runtime 或 performance 与模块并集不一致", () => {
    const runtimeMismatch = hybrid();
    runtimeMismatch.runtime.backends = ["cpu"];
    expect(validateManifest(runtimeMismatch)).toContainEqual(expect.stringContaining("/runtime/backends"));

    const performanceMismatch = hybrid();
    performanceMismatch.performance.timings = algorithmPerformance.timings;
    expect(validateManifest(performanceMismatch)).toContainEqual(expect.stringContaining("/performance/timings"));
  });

  it("混合类型不放松模型变体与来源校验", () => {
    const multiSource = YAML.parse(readFileSync("tools/sdk-standard-check/fixtures/multi-source-sdk/sdk-manifest.yaml", "utf8"));
    const value = hybrid();
    value.model = multiSource.model;
    value.model.variants[0].sources[0].revision = "main";
    expect(validateManifest(value)).toContainEqual(expect.stringContaining("/model/variants/0/sources/0/revision"));
  });

  it.each(["algorithm", "model"])("拒绝缺少 %s 模块日期证据", (module) => {
    const value = hybrid();
    value.verification.environments = value.verification.environments.filter((environment: { module: string }) => environment.module !== module);
    expect(validateManifest(value)).toContainEqual(expect.stringContaining("/verification/environments"));
  });

  it("拒绝模块证据缺少验证日期", () => {
    const value = hybrid();
    delete value.verification.environments[0].testedAt;
    expect(validateManifest(value)).toContainEqual(expect.stringContaining("/verification/environments/0/testedAt"));
  });

  it.each([
    ["未声明 package.exports", false],
    ["exports 缺少模型子入口", { ".": "./dist/index.js" }],
    ["exports 模型子入口为空", { ".": "./dist/index.js", "./reid": null }],
    ["exports 模型子入口目标不存在", { ".": "./dist/index.js", "./reid": "./dist/missing.js" }],
    ["exports 只有类型目标可用", { ".": "./dist/index.js", "./reid": { types: "./dist/reid.d.ts", import: "./dist/missing.js" } }],
  ])("%s 时 HYBRID-001 失败", async (_label, exportsValue) => {
    const report = await scanRepository(repository(hybrid(), demo, exportsValue));
    expect(report.findings).toContainEqual(expect.objectContaining({ id: "HYBRID-001", status: "fail" }));
  });

  it.each(["data-sdk-algorithm-info", "data-sdk-model-info"])("缺少 %s 时 DEMO-005 失败", async (marker) => {
    const report = await scanRepository(repository(hybrid(), demo.replace(marker, "data-unrelated")));
    expect(report.findings).toContainEqual(expect.objectContaining({ id: "DEMO-005", status: "fail" }));
  });

  it("损坏清单不会以 hybrid 身份获得任一类型豁免", async () => {
    const value = hybrid();
    value.modules.model.optional = false;
    const report = await scanRepository(repository(value));
    expect(report.findings).toContainEqual(expect.objectContaining({ id: "CONFIG-001", status: "fail" }));
    for (const id of ["ALGORITHM-001", "MODEL-001", "CACHE-001", "HYBRID-001"]) {
      expect(report.findings).toContainEqual(expect.objectContaining({ id, status: "fail" }));
    }
  });
});
