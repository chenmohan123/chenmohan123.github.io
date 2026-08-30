import path from "node:path";
import fs from "node:fs/promises";
import YAML from "yaml";

const semver = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const sha256 = /^[a-fA-F0-9]{64}$/;
const sourceKinds = new Set(["git-lfs", "huggingface", "modelscope", "custom"]);
const backends = new Set(["wasm", "webgpu"]);
const immutableRevision = /^[a-fA-F0-9]{40,64}$/;

function isHttpUrlWithHost(value) {
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && Boolean(url.hostname);
  } catch {
    return false;
  }
}

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
  if (!["1.0.0", "1.1.0"].includes(value.schemaVersion)) errors.push("schemaVersion must be 1.0.0 or 1.1.0");
  if (typeof value.id !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(value.id)) errors.push("id must be kebab-case");
  if (typeof value.summary !== "string" || value.summary.length < 20) errors.push("summary must contain at least 20 characters");
  if (!value.package || typeof value.package !== "object") errors.push("package must be an object");
  else {
    if (typeof value.package.name !== "string" || value.package.name.length === 0) errors.push("package.name is required");
    if (typeof value.package.version !== "string" || !semver.test(value.package.version)) errors.push("package.version must be semver");
  }
  if (typeof value.repository !== "string" || !isHttpUrlWithHost(value.repository)) errors.push("repository must be an http URL");
  if (!value.demo || value.demo.defaultLanguage !== "zh-CN" || typeof value.demo.url !== "string") errors.push("demo must declare a URL and zh-CN defaultLanguage");
  if (!value.docs || typeof value.docs.zhCN !== "string" || typeof value.docs.en !== "string") errors.push("docs.zhCN and docs.en are required");
  if (!value.runtime || !Array.isArray(value.runtime.backends) || value.runtime.backends.length === 0 || !Array.isArray(value.runtime.executionModes)) errors.push("runtime backends and executionModes are required");
  if (!value.model || !Array.isArray(value.model.assets) || value.model.assets.length === 0) errors.push("model assets are required");
  for (const asset of value.model?.assets ?? []) {
    if (!Number.isInteger(asset.bytes) || asset.bytes <= 0) errors.push(`asset ${asset.id ?? "unknown"} bytes must be positive`);
    if (typeof asset.sha256 !== "string" || !sha256.test(asset.sha256)) errors.push(`asset ${asset.id ?? "unknown"} sha256 must be 64 hex characters`);
    if (typeof asset.url !== "string" || !/^https?:\/\//.test(asset.url)) errors.push(`asset ${asset.id ?? "unknown"} url must be an http URL`);
  }
  if (value.model && typeof value.model === "object") {
    if (value.model.defaultVariant !== undefined && (typeof value.model.defaultVariant !== "string" || value.model.defaultVariant.length === 0)) errors.push("model.defaultVariant must be a non-empty string");
    if (value.model.defaultSource !== undefined && !sourceKinds.has(value.model.defaultSource)) errors.push("model.defaultSource must be a supported source kind");
    if (value.model.variants !== undefined && !Array.isArray(value.model.variants)) errors.push("model.variants must be an array");
    for (const variant of Array.isArray(value.model.variants) ? value.model.variants : []) {
      const label = variant?.id ?? "unknown";
      if (!variant || typeof variant !== "object") { errors.push("model variant must be an object"); continue; }
      if (typeof variant.id !== "string" || variant.id.length === 0) errors.push("model variant id is required");
      if (typeof variant.precision !== "string" || variant.precision.length === 0) errors.push(`variant ${label} precision is required`);
      if (!("quantization" in variant) || (variant.quantization !== null && typeof variant.quantization !== "string")) errors.push(`variant ${label} quantization must be a string or null`);
      if (!Number.isInteger(variant.opset) || variant.opset < 1) errors.push(`variant ${label} opset must be positive`);
      if (!Number.isInteger(variant.bytes) || variant.bytes <= 0) errors.push(`variant ${label} bytes must be positive`);
      if (variant.parameterCount !== null && (!Number.isInteger(variant.parameterCount) || variant.parameterCount < 0)) errors.push(`variant ${label} parameterCount must be non-negative`);
      if (!Array.isArray(variant.backends) || variant.backends.length === 0 || variant.backends.some((backend) => !backends.has(backend))) errors.push(`variant ${label} backends must use wasm or webgpu`);
      if (!Array.isArray(variant.sources) || variant.sources.length === 0) { errors.push(`variant ${label} sources are required`); continue; }
      for (const source of variant.sources) {
        const sourceLabel = `${label}/${source?.kind ?? "unknown"}`;
        if (!sourceKinds.has(source?.kind)) errors.push(`source ${sourceLabel} kind is unsupported`);
        if (typeof source?.repository !== "string" || source.repository.length === 0) errors.push(`source ${sourceLabel} repository is required`);
        if (typeof source?.revision !== "string" || !immutableRevision.test(source.revision)) errors.push(`source ${sourceLabel} revision must be a 40-64 character immutable hex revision`);
        if (typeof source?.path !== "string" || source.path.length === 0) errors.push(`source ${sourceLabel} path is required`);
        if (typeof source?.downloadUrl !== "string" || !isHttpUrlWithHost(source.downloadUrl)) errors.push(`source ${sourceLabel} downloadUrl must be an HTTP(S) URL with a host`);
        if (!Number.isInteger(source?.bytes) || source.bytes <= 0) errors.push(`source ${sourceLabel} bytes must be positive`);
        if (typeof source?.sha256 !== "string" || !sha256.test(source.sha256)) errors.push(`source ${sourceLabel} sha256 must be 64 hex characters`);
      }
    }
  }
  const timingSet = new Set(value.performance?.timings ?? []);
  for (const field of ["modelDownloadMs", "modelCacheReadMs", "integrityMs", "sessionMs", "inferenceMs", "totalMs"]) if (!timingSet.has(field)) errors.push(`performance.timings missing ${field}`);
  if (!value.cache || value.cache.versionedKeys !== true || value.cache.clearCurrent !== true || value.cache.clearAll !== true || value.cache.estimate !== true) errors.push("cache must declare versioned keys, estimate, and both cleanup actions");
  if (!value.examples?.vanilla || !value.examples?.react) errors.push("examples.vanilla and examples.react are required");
  if (!value.verification || !Array.isArray(value.verification.environments)) errors.push("verification.environments is required");
  return errors;
}
