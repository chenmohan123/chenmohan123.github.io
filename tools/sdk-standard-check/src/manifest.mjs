import path from "node:path";
import fs from "node:fs/promises";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import YAML from "yaml";

const defaultStandardRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../standards/v1");
const validators = new Map();

function schemaValidator(standardRoot = defaultStandardRoot) {
  const schemaPath = path.resolve(standardRoot, "sdk-manifest.schema.json");
  let validate = validators.get(schemaPath);
  if (!validate) {
    const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
    const ajv = new Ajv2020({ allErrors: true, strict: true });
    addFormats(ajv);
    validate = ajv.compile(schema);
    validators.set(schemaPath, validate);
  }
  return validate;
}

function pointerSegment(value) {
  return String(value).replaceAll("~", "~0").replaceAll("/", "~1");
}

function describeSchemaError(error) {
  const property = error.params.missingProperty ?? error.params.additionalProperty;
  const field = `${error.instancePath}${property === undefined ? "" : `/${pointerSegment(property)}`}` || "/";
  const descriptions = {
    required: "缺少必填字段",
    additionalProperties: "不允许此字段",
    type: `类型必须为 ${error.params.type}`,
    enum: `必须是 ${JSON.stringify(error.params.allowedValues)} 中的值`,
    const: `必须为 ${JSON.stringify(error.params.allowedValue)}`,
    format: `必须符合 ${error.params.format} 格式`,
    pattern: "不符合标准规定的格式",
    minLength: `长度不能小于 ${error.params.limit}`,
    minItems: `至少包含 ${error.params.limit} 项`,
    minimum: `数值不能小于 ${error.params.limit}`,
  };
  return `${field}：${descriptions[error.keyword] ?? `不符合 ${error.keyword} 约束`}`;
}

function isHttpUrlWithHost(value) {
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && Boolean(url.hostname);
  } catch {
    return false;
  }
}

export async function loadManifest(root, options = {}) {
  const candidates = ["sdk-manifest.yaml", "sdk-manifest.yml", "standards/sdk-manifest.yaml"];
  for (const relativePath of candidates) {
    let source;
    try {
      source = await fs.readFile(path.join(root, relativePath), "utf8");
    } catch (error) {
      if (error?.code === "ENOENT") continue;
      return { declared: true, path: relativePath, value: null, errors: [`无法读取清单：${error.message}`] };
    }
    let value;
    try {
      value = YAML.parse(source);
    } catch (error) {
      return { declared: true, path: relativePath, value: null, errors: [`YAML 解析失败：${error.message}`] };
    }
    // 标准自身损坏应上报检查器错误，不伪装成被扫描仓库的清单问题。
    return { declared: true, path: relativePath, value, errors: validateManifest(value, options) };
  }
  return { declared: false, path: undefined, value: null, errors: [] };
}

export function validateManifest(value, options = {}) {
  const validate = schemaValidator(options.standardRoot);
  if (!validate(value)) return validate.errors.map(describeSchemaError);

  // 完整 schema 确认类型后，保留既有契约的 HTTP、必需耗时和缓存能力检查。
  const errors = [];
  if (!isHttpUrlWithHost(value.repository)) errors.push("/repository：必须是含主机的 HTTP(S) 地址");
  for (const [index, asset] of value.model.assets.entries()) {
    if (!isHttpUrlWithHost(asset.url)) errors.push(`/model/assets/${index}/url：必须是含主机的 HTTP(S) 地址`);
  }
  for (const [variantIndex, variant] of (value.model.variants ?? []).entries()) {
    for (const [sourceIndex, source] of variant.sources.entries()) {
      if (!isHttpUrlWithHost(source.downloadUrl)) errors.push(`/model/variants/${variantIndex}/sources/${sourceIndex}/downloadUrl：必须是含主机的 HTTP(S) 地址`);
    }
  }
  const timingSet = new Set(value.performance.timings);
  for (const field of ["modelDownloadMs", "modelCacheReadMs", "integrityMs", "sessionMs", "inferenceMs", "totalMs"]) {
    if (!timingSet.has(field)) errors.push(`/performance/timings：缺少 ${field}`);
  }
  for (const field of ["versionedKeys", "clearCurrent", "clearAll", "estimate"]) {
    if (value.cache[field] !== true) errors.push(`/cache/${field}：必须声明为 true`);
  }
  return errors;
}
