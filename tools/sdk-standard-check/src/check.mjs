import path from "node:path";
import { exists } from "./files.mjs";
import { loadManifest } from "./manifest.mjs";
import { discoverRepository } from "./discover.mjs";
import { evaluateRules } from "./rules.mjs";

export async function scanRepository(repositoryPath, options = {}) {
  const root = path.resolve(repositoryPath);
  if (!(await exists(root))) throw new Error(`Repository path does not exist: ${repositoryPath}`);
  const manifest = await loadManifest(root);
  const evidence = await discoverRepository(root, manifest);
  const configFindings = manifest.errors.map((message) => ({
    id: "CONFIG-001",
    level: "required",
    status: "fail",
    path: manifest.path,
    message: `Manifest validation failed: ${message}`,
    remediation: "Fix sdk-manifest.yaml using standards/v1/sdk-manifest.schema.json",
  }));
  const findings = [...configFindings, ...(await evaluateRules(evidence, manifest.value, options.standardRoot))];
  return {
    repository: path.basename(root),
    standardVersion: "1.0.0",
    evidence,
    manifest: manifest.value,
    findings,
    errors: [],
  };
}
