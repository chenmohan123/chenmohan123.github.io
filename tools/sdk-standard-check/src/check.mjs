import path from "node:path";
import { exists } from "./files.mjs";
import { loadManifest } from "./manifest.mjs";
import { discoverRepository } from "./discover.mjs";
import { evaluateRules, loadRuleSet } from "./rules.mjs";

export async function scanRepository(repositoryPath, options = {}) {
  const root = path.resolve(repositoryPath);
  if (!(await exists(root))) throw new Error(`Repository path does not exist: ${repositoryPath}`);
  const manifest = await loadManifest(root, { standardRoot: options.standardRoot });
  const evidence = await discoverRepository(root, manifest);
  const ruleSet = await loadRuleSet(options.standardRoot);
  const configFindings = manifest.errors.map((message) => ({
    id: "CONFIG-001",
    level: "required",
    status: "fail",
    path: manifest.path,
    message: `清单校验失败：${message}`,
    remediation: "依据所选标准的 sdk-manifest.schema.json 修复 sdk-manifest.yaml 中对应字段。",
  }));
  const findings = [...configFindings, ...(await evaluateRules(evidence, manifest.errors.length ? null : manifest.value, options.standardRoot, ruleSet))];
  return {
    repository: path.basename(root),
    standardVersion: ruleSet.standardVersion,
    evidence,
    manifest: manifest.value,
    findings,
    errors: [],
  };
}
