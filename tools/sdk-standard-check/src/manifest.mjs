import path from "node:path";
import fs from "node:fs/promises";
import YAML from "yaml";

const semver = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const sha256 = /^[a-fA-F0-9]{64}$/;

export async function loadManifest(root) {
  const candidates = ["sdk-manifest.yaml", "sdk-manifest.yml", "standards/sdk-manifest.yaml"];
  for (const relativePath of candidates) {
    try {
      const source = await fs.readFile(path.join(root, relativePath), "utf8");
      let value;
      try {
        value = YAML.parse(source);
      } catch (error) {
        return { declared: true, path: relativePath, value: null, errors: [`YAML parse failed: ${error.message}`] };
      }
      return { declared: true, path: relativePath, value, errors: validateManifest(value) };
    } catch (error) {
      if (error?.code !== "ENOENT") return { declared: true, path: relativePath, value: null, errors: [error.message] };
    }
  }
  return { declared: false, path: undefined, value: null, errors: [] };
}

export function validateManifest(value) {
  /** @type {string[]} */
  const errors = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) return ["Manifest must be an object"];
  const required = ["schemaVersion", "id", "name", "summary", "package", "repository", "demo", "docs", "runtime", "model", "performance", "cache", "examples", "verification"];
  for (const key of required) if (!(key in value)) errors.push(`Missing ${key}`);
  if (value.schemaVersion !== "1.0.0") errors.push("schemaVersion must be 1.0.0");
  if (typeof value.id !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(value.id)) errors.push("id must be kebab-case");
  if (typeof value.summary !== "string" || value.summary.length < 20) errors.push("summary must contain at least 20 characters");
  if (!value.package || typeof value.package !== "object") errors.push("package must be an object");
  else {
    if (typeof value.package.name !== "string" || value.package.name.length === 0) errors.push("package.name is required");
    if (typeof value.package.version !== "string" || !semver.test(value.package.version)) errors.push("package.version must be semver");
  }
  if (typeof value.repository !== "string" || !/^https?:\/\//.test(value.repository)) errors.push("repository must be an http URL");
  if (!value.demo || value.demo.defaultLanguage !== "zh-CN" || typeof value.demo.url !== "string") errors.push("demo must declare a URL and zh-CN defaultLanguage");
  if (!value.docs || typeof value.docs.zhCN !== "string" || typeof value.docs.en !== "string") errors.push("docs.zhCN and docs.en are required");
  if (!value.runtime || !Array.isArray(value.runtime.backends) || value.runtime.backends.length === 0 || !Array.isArray(value.runtime.executionModes)) errors.push("runtime backends and executionModes are required");
  if (!value.model || !Array.isArray(value.model.assets) || value.model.assets.length === 0) errors.push("model assets are required");
  for (const asset of value.model?.assets ?? []) {
    if (!Number.isInteger(asset.bytes) || asset.bytes <= 0) errors.push(`asset ${asset.id ?? "unknown"} bytes must be positive`);
    if (typeof asset.sha256 !== "string" || !sha256.test(asset.sha256)) errors.push(`asset ${asset.id ?? "unknown"} sha256 must be 64 hex characters`);
    if (typeof asset.url !== "string" || !/^https?:\/\//.test(asset.url)) errors.push(`asset ${asset.id ?? "unknown"} url must be an http URL`);
  }
  const timingSet = new Set(value.performance?.timings ?? []);
  for (const field of ["modelDownloadMs", "modelCacheReadMs", "integrityMs", "sessionMs", "inferenceMs", "totalMs"]) if (!timingSet.has(field)) errors.push(`performance.timings missing ${field}`);
  if (!value.cache || value.cache.versionedKeys !== true || value.cache.clearCurrent !== true || value.cache.clearAll !== true || value.cache.estimate !== true) errors.push("cache must declare versioned keys, estimate, and both cleanup actions");
  if (!value.examples?.vanilla || !value.examples?.react) errors.push("examples.vanilla and examples.react are required");
  if (!value.verification || !Array.isArray(value.verification.environments)) errors.push("verification.environments is required");
  return errors;
}
