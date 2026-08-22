import { describe, expect, it } from "vitest";
import { scanRepository } from "./src/check.mjs";

const complete = "tools/sdk-standard-check/fixtures/complete-sdk";
const partial = "tools/sdk-standard-check/fixtures/partial-sdk";

describe("SDK repository discovery", () => {
  it("discovers evidence from a complete local SDK", async () => {
    const report = await scanRepository(complete);
    expect(report.evidence.packageName).toBe("web-sdk-fixture");
    expect(report.evidence.locales).toEqual(expect.arrayContaining(["zh-CN", "en"]));
    expect(report.evidence.demoEntry).toBe(true);
    expect(report.evidence.examples).toEqual(expect.arrayContaining(["vanilla", "react"]));
    expect(report.evidence.releaseWorkflow).toBe(true);
    expect(report.evidence.manifestDeclared).toBe(true);
  });

  it("keeps evidence paths relative to the scanned repository", async () => {
    const report = await scanRepository(complete);
    expect(report.evidence.paths.every((path: string) => !path.includes(complete))).toBe(true);
    expect(report.evidence.paths).toContain("README.md");
  });

  it("reports missing evidence without throwing for an old SDK", async () => {
    const report = await scanRepository(partial);
    expect(report.evidence.packageName).toBe("web-sdk-partial");
    expect(report.evidence.manifestDeclared).toBe(false);
    expect(report.evidence.demoEntry).toBe(true);
    expect(report.evidence.releaseWorkflow).toBe(false);
  });

  it("returns a configuration finding for malformed manifests", async () => {
    const report = await scanRepository("tools/sdk-standard-check/fixtures/malformed-sdk");
    expect(report.errors).toHaveLength(0);
    expect(report.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "CONFIG-001", status: "fail" }),
    ]));
  });
});
