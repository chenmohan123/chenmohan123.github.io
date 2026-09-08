import { afterEach, describe, expect, it } from "vitest";
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import YAML from "yaml";
import { validateManifest } from "./src/manifest.mjs";
import { scanRepository } from "./src/check.mjs";

const fixture = () => YAML.parse(readFileSync("tools/sdk-standard-check/fixtures/complete-sdk/sdk-manifest.yaml", "utf8"));
const temporaryRoots: string[] = [];
const temporaryRoot = () => {
  const root = mkdtempSync(path.join(tmpdir(), "sdk-schema-validation-"));
  temporaryRoots.push(root);
  return root;
};
afterEach(() => {
  // 仅清理本测试在系统临时目录中创建的根目录。
  for (const root of temporaryRoots.splice(0)) {
    expect(path.dirname(path.resolve(root))).toBe(path.resolve(tmpdir()));
    expect(path.basename(root)).toMatch(/^sdk-schema-validation-/);
    rmSync(root, { recursive: true, force: true });
  }
});

describe("清单完整 schema 校验", () => {
  it("扫描使用所选标准的 schema，标准损坏时不归咎于仓库", async () => {
    const standardRoot = temporaryRoot();
    copyFileSync("standards/v1/rules.yaml", path.join(standardRoot, "rules.yaml"));
    const schema = JSON.parse(readFileSync("standards/v1/sdk-manifest.schema.json", "utf8"));
    schema.properties.name.const = "自定义标准中的名称";
    writeFileSync(path.join(standardRoot, "sdk-manifest.schema.json"), JSON.stringify(schema));
    const report = await scanRepository("tools/sdk-standard-check/fixtures/complete-sdk", { standardRoot });
    expect(report.findings).toContainEqual(expect.objectContaining({ id: "CONFIG-001", message: expect.stringContaining("/name") }));
    const missingSchemaRoot = temporaryRoot();
    copyFileSync("standards/v1/rules.yaml", path.join(missingSchemaRoot, "rules.yaml"));
    await expect(scanRepository("tools/sdk-standard-check/fixtures/complete-sdk", { standardRoot: missingSchemaRoot })).rejects.toThrow();
  });
  it.each([
    ["非法示例状态", "examples.vanilla.status", "runnable"],
    ["非法运行后端", "runtime.backends", ["invented-backend"]],
    ["非法执行位置", "runtime.executionModes", ["server"]],
    ["非法缓存介质", "cache.storage", ["localstorage"]],
    ["非法框架", "demo.framework", "unknown"],
    ["非法耗时字段", "performance.timings", ["modelDownloadMs", "modelCacheReadMs", "integrityMs", "sessionMs", "inferenceMs", "totalMs", "inventedMs"]],
    ["非法验证日期", "verification.environments", [{ browser: "Chrome", os: "Windows", device: "test", testedAt: "2026-02-30" }]],
    ["非法 Demo 地址", "demo.url", "not a URL"],
    ["未知嵌套属性", "examples.vanilla.typo", true],
    ["空执行列表", "runtime.executionModes", []],
  ])("拒绝%s并给出字段位置", (_name, field, invalid) => {
    const value = fixture();
    const parts = (field as string).split(".");
    const parent = parts.slice(0, -1).reduce((object, key) => object[key], value);
    parent[parts.at(-1)!] = invalid;
    const errors = validateManifest(value);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.join("\n")).toContain(parts.slice(0, 2).join("/"));
  });

  it.each([
    ["model.assets", {}], ["model.assets", [null]], ["model.assets", [17]],
    ["runtime.backends", {}], ["performance.timings", {}], ["examples", []],
    ["verification.environments", [null]], ["package", []], ["model", null],
  ])("字段 %s 类型损坏返回诊断而不抛异常", (field, invalid) => {
    const value = fixture();
    const parts = (field as string).split(".");
    const parent = parts.slice(0, -1).reduce((object, key) => object[key], value);
    parent[parts.at(-1)!] = invalid;
    expect(() => validateManifest(value)).not.toThrow();
    expect(validateManifest(value).length).toBeGreaterThan(0);
  });

  it("YAML 中错误的资产数组返回 CONFIG-001 和 CLI 退出码 1", async () => {
    const root = temporaryRoot();
    const value = fixture();
    value.model.assets = [null];
    writeFileSync(path.join(root, "sdk-manifest.yaml"), YAML.stringify(value));
    const report = await scanRepository(root);
    expect(report.findings).toContainEqual(expect.objectContaining({ id: "CONFIG-001", status: "fail", path: "sdk-manifest.yaml", message: expect.stringContaining("model/assets/0") }));
    expect(report.findings.find((finding: { id: string }) => finding.id === "META-001")?.status).toBe("fail");
    const cli = spawnSync(process.execPath, ["tools/sdk-standard-check/cli.mjs", "--repo", root, "--format", "json"], { encoding: "utf8", windowsHide: true });
    expect(cli.status).toBe(1);
    expect(JSON.parse(cli.stdout).repositories[0].summary.requiredFailed).toBeGreaterThan(0);
    expect(cli.stderr).not.toContain("TypeError");
  });

  it("多个仓库中的损坏清单不会阻止后续仓库扫描", () => {
    const root = temporaryRoot();
    writeFileSync(path.join(root, "sdk-manifest.yaml"), "model: [\n");
    const cli = spawnSync(process.execPath, ["tools/sdk-standard-check/cli.mjs", "--repo", root, "--repo", "tools/sdk-standard-check/fixtures/complete-sdk", "--format", "json"], { encoding: "utf8", windowsHide: true });
    expect(cli.status).toBe(1);
    const report = JSON.parse(cli.stdout);
    expect(report.repositories).toHaveLength(2);
    const completeReport = report.repositories.find((repository: { repository: string }) => repository.repository === "complete-sdk");
    expect(completeReport.summary.requiredFailed).toBe(0);
    const malformedReport = report.repositories.find((repository: { repository: string }) => repository.repository === path.basename(root));
    expect(malformedReport.findings).toContainEqual(expect.objectContaining({ id: "CONFIG-001", message: expect.stringContaining("YAML 解析失败") }));
  });
});
