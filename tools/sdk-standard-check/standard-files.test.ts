import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const requiredFiles = [
  "standards/v1/README.md",
  "standards/v1/README.en.md",
  "standards/v1/sdk-contract.md",
  "standards/v1/demo-contract.md",
  "standards/v1/portal-contract.md",
  "standards/v1/docs-release-contract.md",
  "standards/v1/examples-contract.md",
  "standards/v1/performance-contract.md",
  "standards/v1/ui-tokens.json",
  "standards/v1/sdk-manifest.schema.json",
  "standards/v1/rules.yaml",
  "standards/v1/templates/sdk-manifest.yaml",
  "standards/v1/templates/README.zh-CN.md",
  "standards/v1/templates/README.en.md",
  "standards/v1/templates/demo-checklist.md",
  "standards/v1/templates/release-checklist.md",
];

describe("v1 standard source", () => {
  it("contains every required artifact", () => {
    for (const file of requiredFiles) expect(existsSync(file), file).toBe(true);
  });

  it("declares the same version in rules and schema", () => {
    const rules = readFileSync("standards/v1/rules.yaml", "utf8");
    const schema = JSON.parse(readFileSync("standards/v1/sdk-manifest.schema.json", "utf8"));
    expect(rules).toContain('standardVersion: "1.0.0"');
    expect(schema.$id).toContain("web-model-sdk-standard/v1");
  });

  it("routes agents through the standard and preserves the layer boundary", () => {
    const agents = readFileSync("AGENTS.md", "utf8");
    expect(agents).toContain("standards/v1/README.md");
    expect(agents).toContain("pnpm sdk:check -- --repo <path>");
    expect(agents).toContain("single SDK");
    expect(agents).toContain("Workflow");
    expect(agents).toContain("must not copy a single SDK runtime");
  });
});
