import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { scanRepository } from "./src/check.mjs";
import { summarize, renderJson, renderMarkdown, renderTable } from "./src/report.mjs";

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

  it("marks complete fixtures compliant and partial fixtures with stable required IDs", async () => {
    const completeReport = await scanRepository(complete);
    const partialReport = await scanRepository(partial);
    expect(summarize(completeReport).status).toBe("compliant");
    expect(summarize(partialReport).status).toBe("partial");
    const expected = JSON.parse(readFileSync(`${partial}/check.expected.json`, "utf8"));
    expect(partialReport.findings.filter((finding: { level: string; status: string }) => finding.level === "required" && finding.status === "fail").map((finding: { id: string }) => finding.id).sort()).toEqual([...expected.requiredFindingIds].sort());
  });

  it("renders deterministic JSON, Markdown, and table output", async () => {
    const report = await scanRepository(partial);
    const json = JSON.parse(renderJson([report]));
    expect(json.repositories[0].repository).toBe("partial-sdk");
    expect(renderMarkdown([report])).toContain("DOC-001");
    expect(renderMarkdown([report])).toContain("Remediation");
    expect(renderTable([report])).toContain("partial-sdk");
  });
});
