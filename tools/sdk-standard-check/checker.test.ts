import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import YAML from "yaml";
import { scanRepository } from "./src/check.mjs";
import { listFiles } from "./src/files.mjs";
import { validateManifest } from "./src/manifest.mjs";
import { summarize, renderJson, renderMarkdown, renderTable } from "./src/report.mjs";

const complete = "tools/sdk-standard-check/fixtures/complete-sdk";
const partial = "tools/sdk-standard-check/fixtures/partial-sdk";

describe("SDK repository discovery", () => {
  it("accepts both v1.0 manifests and the v1.1 manifest template", async () => {
    const oldReport = await scanRepository(complete);
    const newManifest = YAML.parse(readFileSync("standards/v1/templates/sdk-manifest.yaml", "utf8"));

    expect(oldReport.findings).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "CONFIG-001" }),
    ]));
    expect(validateManifest(newManifest)).toEqual([]);
  });

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

  it("ignores generated Python and test cache directories", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "sdk-standard-check-"));
    try {
      mkdirSync(path.join(root, ".pytest_cache"), { recursive: true });
      mkdirSync(path.join(root, "__pycache__"), { recursive: true });
      mkdirSync(path.join(root, "src"), { recursive: true });
      writeFileSync(path.join(root, ".pytest_cache", "state"), "cache");
      writeFileSync(path.join(root, "__pycache__", "module.pyc"), "cache");
      writeFileSync(path.join(root, "src", "index.ts"), "export {};");

      expect(await listFiles(root)).toEqual(["src/index.ts"]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
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
    expect(summarize(completeReport).status).toBe("locally-compliant");
    expect(summarize(partialReport).status).toBe("partial");
    const expected = JSON.parse(readFileSync(`${partial}/check.expected.json`, "utf8"));
    expect(partialReport.findings.filter((finding: { level: string; status: string }) => finding.level === "required" && finding.status === "fail").map((finding: { id: string }) => finding.id).sort()).toEqual([...expected.requiredFindingIds].sort());
  });

  it("keeps remote governance rules visible without evaluating GitHub settings offline", async () => {
    const report = await scanRepository(complete);
    const summary = summarize(report);
    const remoteFindings = report.findings.filter((finding: { id: string }) => /^(GOV|DEPLOY|PAGES)-/.test(finding.id));

    expect(report.standardVersion).toBe("1.1.0");
    expect(remoteFindings.map((finding: { id: string }) => finding.id)).toEqual([
      "GOV-001",
      "GOV-002",
      "DEPLOY-001",
      "PAGES-001",
    ]);
    expect(remoteFindings.every((finding: { status: string }) => finding.status === "skip")).toBe(true);
    expect(summary.requiredSkipped).toBe(4);
    expect(summary.status).toBe("locally-compliant");
  });

  it("does not call a repository compliant when required remote evidence is unknown", () => {
    const summary = summarize({
      findings: [
        { level: "required", status: "pass" },
        { level: "required", status: "unknown" },
        { level: "required", status: "not-applicable" },
      ],
    });

    expect(summary.requiredUnknown).toBe(1);
    expect(summary.requiredNotApplicable).toBe(1);
    expect(summary.status).toBe("locally-compliant");
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
