import fs from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";

const defaultStandardRoot = path.resolve(process.cwd(), "standards/v1");

export async function loadRules(standardRoot = defaultStandardRoot) {
  const source = await fs.readFile(path.join(standardRoot, "rules.yaml"), "utf8");
  const parsed = YAML.parse(source);
  if (!parsed || parsed.standardVersion !== "1.0.0" || !Array.isArray(parsed.rules)) throw new Error("Invalid rules.yaml");
  return parsed.rules;
}

function result(id, level, status, message, remediation, pathValue, evidence) {
  return { id, level, status, message, remediation, path: pathValue, evidence };
}

const detectors = {
  manifestPresent: (evidence, manifest) => evidence.manifestDeclared && !manifest?.errors?.length,
  packageMetadata: (evidence) => Boolean(evidence.packageName && evidence.packageVersion),
  bilingualReadme: (evidence) => evidence.evidenceByKey["readme.zhCN"]?.length > 0 && evidence.evidenceByKey["readme.en"]?.length > 0,
  bilingualDocs: (evidence) => evidence.evidenceByKey["docs.zhCN"]?.length > 0 && evidence.evidenceByKey["docs.en"]?.length > 0,
  publicLinks: (evidence) => evidence.publicLinks,
  demoEntry: (evidence) => evidence.demoEntry,
  demoChineseDefault: (evidence) => evidence.demoChineseDefault,
  demoLanguageToggle: (evidence) => evidence.demoLanguageToggle,
  demoCacheClear: (evidence) => evidence.cacheClear,
  demoTimingMarkers: (evidence) => evidence.timingMarkers,
  modelInformation: (evidence, manifest) => Boolean(manifest?.model?.assets?.length) && evidence.modelInformation,
  runtimeInformation: (evidence, manifest) => Boolean(manifest?.runtime?.actualBackendReported) && evidence.runtimeInformation,
  performanceTimings: (evidence, manifest) => Boolean(manifest?.performance?.timings?.length) && evidence.performanceTimings,
  cacheContract: (evidence, manifest) => Boolean(manifest?.cache?.versionedKeys && manifest.cache.clearCurrent && manifest.cache.clearAll && manifest.cache.estimate) && evidence.cacheContract,
  vanillaExample: (evidence) => evidence.examples.includes("vanilla"),
  reactExample: (evidence) => evidence.examples.includes("react"),
  declaredExamples: (evidence, manifest) => {
    if (!manifest?.examples) return false;
    return Object.entries(manifest.examples).every(([surface, value]) => value?.status === "unsupported" || value?.status === "planned" || evidence.examples.includes(surface));
  },
  ciWorkflow: (evidence) => evidence.ciWorkflow,
  releaseWorkflow: (evidence) => evidence.releaseWorkflow,
  changelog: (evidence) => evidence.changelog,
  uiTokens: (evidence) => evidence.uiTokens,
  labsDisclosure: (evidence, manifest) => {
    const experimental = manifest?.runtime?.backends?.some((backend) => ["webnn", "npu"].includes(backend));
    return !experimental || /labs|experimental|实验/i.test(JSON.stringify(manifest));
  },
};

export async function evaluateRules(evidence, manifest, standardRoot = defaultStandardRoot) {
  const rules = await loadRules(standardRoot);
  return rules.map((rule) => {
    if (rule.level === "labs") return result(rule.id, rule.level, "skip", rule.message, rule.remediation, undefined, "Labs rule is informational");
    const detector = detectors[rule.detector];
    if (!detector) return result(rule.id, rule.level, "fail", `Unknown detector ${rule.detector}`, "Add the detector implementation before using this rule.");
    let passed = false;
    try { passed = Boolean(detector(evidence, manifest)); } catch { passed = false; }
    const evidencePaths = evidence.evidenceByKey[rule.detector] ?? evidence.paths.slice(0, 1);
    return result(rule.id, rule.level, passed ? "pass" : "fail", rule.message, rule.remediation, evidencePaths[0], passed ? evidencePaths.join(", ") : undefined);
  });
}
