import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import YAML from "yaml";
import { loadManifest, validateManifest } from "./src/manifest.mjs";

const requiredFiles = [
  "standards/v1/README.md",
  "standards/v1/README.en.md",
  "standards/v1/sdk-contract.md",
  "standards/v1/demo-contract.md",
  "standards/v1/portal-contract.md",
  "standards/v1/docs-release-contract.md",
  "standards/v1/repository-governance-contract.md",
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
  "skills/web-model-sdk-standard/SKILL.md",
  "skills/web-model-sdk-standard/agents/openai.yaml",
  "skills/web-model-sdk-standard/references/audit.md",
  "skills/web-model-sdk-standard/references/scaffold.md",
  "skills/web-model-sdk-standard/references/demo.md",
  "skills/web-model-sdk-standard/references/portal.md",
];

describe("v1 standard source", () => {
  it("contains every required artifact", () => {
    for (const file of requiredFiles) expect(existsSync(file), file).toBe(true);
  });

  it("declares v1.1 rules while accepting v1.0 manifests", () => {
    const rules = YAML.parse(readFileSync("standards/v1/rules.yaml", "utf8"));
    const schema = JSON.parse(readFileSync("standards/v1/sdk-manifest.schema.json", "utf8"));
    expect(rules.standardVersion).toBe("1.1.0");
    expect(schema.$id).toContain("web-model-sdk-standard/v1");
    expect(schema.properties.schemaVersion.enum).toEqual(["1.0.0", "1.1.0"]);
  });

  it("defines GitHub Rulesets and Pages as remotely verified governance rules", () => {
    const contract = readFileSync("standards/v1/repository-governance-contract.md", "utf8");
    const rules = YAML.parse(readFileSync("standards/v1/rules.yaml", "utf8"));
    const governanceRules = rules.rules.filter((rule: { id: string }) => /^(GOV|DEPLOY|PAGES)-/.test(rule.id));

    expect(contract).toContain("Default branch Ruleset");
    expect(contract).toContain("Release tag Ruleset");
    expect(contract).toContain("GitHub Pages");
    expect(contract).toContain("GitHub Actions");
    expect(governanceRules.map((rule: { id: string }) => rule.id)).toEqual([
      "GOV-001",
      "GOV-002",
      "DEPLOY-001",
      "PAGES-001",
    ]);
    expect(Object.fromEntries(governanceRules.map((rule: { id: string; verification?: string }) => [rule.id, rule.verification]))).toEqual({
      "GOV-001": "github-api",
      "GOV-002": "github-api",
      "DEPLOY-001": "remote-api",
      "PAGES-001": "github-api",
    });
  });

  it("routes agents through the standard and preserves the layer boundary", () => {
    const agents = readFileSync("AGENTS.md", "utf8");
    expect(agents).toContain("standards/v1/README.md");
    expect(agents).toContain("## Read Order");
    expect(agents).toContain("## Editing Rules");
    expect(agents).toContain("pnpm sdk:check -- --repo <path>");
    expect(agents).toContain("single SDK");
    expect(agents).toContain("Workflow");
    expect(agents).toContain("must not copy a single SDK runtime");
  });

  it("接受包含变体、精度和多来源的模型清单", async () => {
    const fixture = await loadManifest("tools/sdk-standard-check/fixtures/multi-source-sdk");
    expect(fixture.declared).toBe(true);
    expect(fixture.errors).toEqual([]);
    expect(fixture.value.model.defaultVariant).toBe("fp16");
    expect(fixture.value.model.defaultSource).toBe("huggingface");
    expect(fixture.value.model.variants).toHaveLength(2);
    expect(fixture.value.model.variants[0].sources).toHaveLength(4);
  });

  it("拒绝不完整的多来源模型变体字段", async () => {
    const fixture = await loadManifest("tools/sdk-standard-check/fixtures/multi-source-sdk");
    const invalid = structuredClone(fixture.value);
    invalid.model.variants[0].sources[0].revision = "";
    invalid.model.variants[0].sources[1].downloadUrl = "ftp://example.com/model.onnx";
    invalid.model.variants[1].backends = ["cpu"];

    expect(validateManifest(invalid)).toEqual(expect.arrayContaining([
      "source fp16/git-lfs revision must be fixed and non-empty",
      "source fp16/huggingface downloadUrl must be an HTTP(S) URL",
      "variant fp32 backends must use wasm or webgpu",
    ]));
  });
});
