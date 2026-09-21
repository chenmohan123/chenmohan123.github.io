import path from "node:path";
import { stat } from "node:fs/promises";
import { listFiles, readJsonIfExists, readTextIfExists, isMarkdown, isDemoFile } from "./files.mjs";

function addEvidence(evidence, key, filePath) {
  evidence.evidenceByKey[key] ??= [];
  if (!evidence.evidenceByKey[key].includes(filePath)) evidence.evidenceByKey[key].push(filePath);
  if (!evidence.paths.includes(filePath)) evidence.paths.push(filePath);
}

function exportValueForEntry(exportsValue, entry) {
  if (entry === "." && (typeof exportsValue === "string" || Array.isArray(exportsValue))) return exportsValue;
  if (!exportsValue || typeof exportsValue !== "object" || Array.isArray(exportsValue)) return undefined;
  const keys = Object.keys(exportsValue);
  if (entry === "." && !keys.some((key) => key.startsWith("."))) return exportsValue;
  return exportsValue[entry];
}

function exportTargets(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(exportTargets);
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([condition, target]) => condition === "types" ? [] : exportTargets(target));
  }
  return [];
}

async function hasExistingExport(root, exportsValue, entry) {
  const targets = exportTargets(exportValueForEntry(exportsValue, entry));
  if (targets.length === 0) return false;
  for (const target of targets) {
    if (!target.startsWith("./") || /\.d\.(?:ts|mts|cts)$/i.test(target)) return false;
    const resolved = path.resolve(root, target);
    if (resolved === root || !resolved.startsWith(`${root}${path.sep}`)) return false;
    try {
      if (!(await stat(resolved)).isFile()) return false;
    } catch {
      return false;
    }
  }
  return true;
}

export async function discoverRepository(root, manifest) {
  const files = await listFiles(root);
  const packageJson = await readJsonIfExists(root, "package.json");
  const markdown = files.filter(isMarkdown);
  const allText = [];
  for (const file of files) {
    if (!isMarkdown(file) && !isDemoFile(file) && file !== "package.json" && !file.startsWith(".github/")) continue;
    const text = await readTextIfExists(root, file);
    if (text !== undefined) allText.push({ file, text });
  }
  const joined = allText.map(({ text }) => text).join("\n");
  const evidence = {
    repository: path.basename(root),
    packageName: packageJson?.name,
    packageVersion: packageJson?.version,
    locales: [],
    manifestDeclared: manifest.declared,
    demoEntry: false,
    demoChineseDefault: false,
    demoLanguageToggle: false,
    cacheClear: false,
    timingMarkers: false,
    algorithmTimingMarkers: false,
    hybridTimingMarkers: false,
    demoStateReset: false,
    algorithmInformation: false,
    hybridContract: false,
    modelInformation: false,
    runtimeInformation: false,
    performanceTimings: false,
    cacheContract: false,
    releaseWorkflow: false,
    ciWorkflow: false,
    changelog: files.some((file) => /^CHANGELOG\.md$/i.test(file)),
    publicLinks: false,
    uiTokens: false,
    examples: [],
    paths: [],
    evidenceByKey: {},
  };

  if (files.includes("README.md")) { evidence.locales.push("zh-CN"); addEvidence(evidence, "readme.zhCN", "README.md"); }
  if (files.some((file) => /^README\.en\.md$/i.test(file))) { evidence.locales.push("en"); addEvidence(evidence, "readme.en", files.find((file) => /^README\.en\.md$/i.test(file))); }
  if (files.some((file) => file.startsWith("docs/zh-CN/"))) { evidence.locales.push("zh-CN"); addEvidence(evidence, "docs.zhCN", files.find((file) => file.startsWith("docs/zh-CN/"))); }
  if (files.some((file) => file.startsWith("docs/en/"))) { evidence.locales.push("en"); addEvidence(evidence, "docs.en", files.find((file) => file.startsWith("docs/en/"))); }

  if (manifest.path) addEvidence(evidence, "manifestPresent", manifest.path);
  const demoFile = files.find((file) => /^apps\/demo\/(?:index\.html|src\/main\.[jt]sx?|package\.json)$/i.test(file)) ?? files.find((file) => /^demo\/index\.html$/i.test(file));
  evidence.demoEntry = Boolean(demoFile);
  if (demoFile) addEvidence(evidence, "demoEntry", demoFile);
  for (const { file, text } of allText.filter(({ file }) => isDemoFile(file))) {
    if (/zh-CN|中文|lang\s*=\s*["']zh/i.test(text)) { evidence.demoChineseDefault = true; addEvidence(evidence, "demoChineseDefault", file); }
    if (/English|中文|language|语言|i18n/i.test(text)) { evidence.demoLanguageToggle = true; addEvidence(evidence, "demoLanguageToggle", file); }
    if (/data-sdk-cache-clear|clear(?:Model)?Cache|清理缓存/i.test(text)) { evidence.cacheClear = true; addEvidence(evidence, "cacheClear", file); }
    if (/data-sdk-(?:timing|model-info|runtime-info)|modelDownloadMs|inferenceMs|耗时/i.test(text)) { evidence.timingMarkers = true; addEvidence(evidence, "timingMarkers", file); }
    if (/data-sdk-state-reset\b/.test(text)) { evidence.demoStateReset = true; addEvidence(evidence, "demoStateReset", file); }
  }

  // 算法必须具备三个独立区域；允许不同组件文件分别提供标记。
  const algorithmMarkers = ["data-sdk-algorithm-info", "data-sdk-runtime-info", "data-sdk-timing"];
  const hybridMarkers = ["data-sdk-algorithm-info", "data-sdk-model-info", "data-sdk-runtime-info", "data-sdk-timing"];
  const demoTexts = allText.filter(({ file }) => isDemoFile(file));
  evidence.algorithmTimingMarkers = algorithmMarkers.every((marker) => demoTexts.some(({ text }) => new RegExp(`${marker}\\b`).test(text)));
  evidence.hybridTimingMarkers = hybridMarkers.every((marker) => demoTexts.some(({ text }) => new RegExp(`${marker}\\b`).test(text)));
  if (evidence.algorithmTimingMarkers) {
    for (const { file, text } of demoTexts) {
      if (algorithmMarkers.some((marker) => new RegExp(`${marker}\\b`).test(text))) addEvidence(evidence, "demoTimingMarkers", file);
    }
  }
  if (evidence.hybridTimingMarkers) {
    for (const { file, text } of demoTexts) {
      if (hybridMarkers.some((marker) => new RegExp(`${marker}\\b`).test(text))) addEvidence(evidence, "demoTimingMarkers", file);
    }
  }
  if (!manifest.errors.length && ["algorithm", "hybrid"].includes(manifest.value?.kind)) {
    evidence.algorithmInformation = true;
    addEvidence(evidence, "algorithmInformation", manifest.path);
  }

  if (!manifest.errors.length && manifest.value?.kind === "hybrid") {
    const entries = [manifest.value.modules.algorithm.entry, manifest.value.modules.model.entry];
    evidence.hybridContract = (await Promise.all(entries.map((entry) => hasExistingExport(root, packageJson?.exports, entry)))).every(Boolean);
    if (evidence.hybridContract) addEvidence(evidence, "hybridContract", "package.json");
  }

  if (manifest.value?.model?.assets?.length || /model(?:\s|_|-)info|precision|sha256|参数量|精度/i.test(joined)) { evidence.modelInformation = true; addEvidence(evidence, "modelInformation", manifest.path ?? markdown[0] ?? "README.md"); }
  if (manifest.value?.runtime || /actualBackend|requestedBackend|executionMode|WebGPU|WASM|后端/i.test(joined)) { evidence.runtimeInformation = true; addEvidence(evidence, "runtimeInformation", manifest.path ?? markdown[0] ?? "README.md"); }
  if (manifest.value?.performance?.timings?.length || /modelDownloadMs|modelCacheReadMs|inferenceMs|postprocessMs|totalMs|加载耗时|推理耗时/i.test(joined)) { evidence.performanceTimings = true; addEvidence(evidence, "performanceTimings", manifest.path ?? markdown[0] ?? "README.md"); }
  if (manifest.value?.cache || /clear(?:Model)?Cache|Cache Storage|IndexedDB|缓存/i.test(joined)) { evidence.cacheContract = true; addEvidence(evidence, "cacheContract", manifest.path ?? markdown[0] ?? "README.md"); }
  if (/https?:\/\/github\.com|https?:\/\/.*npmjs\.com|https?:\/\/.*github\.io/i.test(joined) || packageJson?.repository) { evidence.publicLinks = true; addEvidence(evidence, "publicLinks", "README.md"); }
  if (files.some((file) => /^\.github\/workflows\/ci\.(?:yml|yaml)$/i.test(file))) { evidence.ciWorkflow = true; addEvidence(evidence, "ciWorkflow", files.find((file) => /^\.github\/workflows\/ci\.(?:yml|yaml)$/i.test(file))); }
  if (files.some((file) => /^\.github\/workflows\/(?:release|publish)\.(?:yml|yaml)$/i.test(file))) { evidence.releaseWorkflow = true; addEvidence(evidence, "releaseWorkflow", files.find((file) => /^\.github\/workflows\/(?:release|publish)\.(?:yml|yaml)$/i.test(file))); }
  if (files.some((file) => /(^|\/)ui-tokens\.json$/i.test(file)) || /ui-tokens|--sdk-color|--color-action/i.test(joined)) { evidence.uiTokens = true; addEvidence(evidence, "uiTokens", "standards/v1/ui-tokens.json"); }
  const exampleDirectories = {
    vanilla: ["vanilla", "vanilla-vite"], react: ["react"], vue: ["vue"], cdn: ["cdn"],
    // 清单保持 `vite` 表面名称，同时兼容已有 SDK 使用的 `vanilla-vite` 目录。
    vite: ["vite", "vanilla-vite"], "wechat-web-view": ["wechat-web-view", "wechat-webview"],
  };
  for (const [surface, directories] of Object.entries(exampleDirectories)) {
    const match = files.find((file) => directories.some((directory) => new RegExp(`^examples/${directory}(?:/|$)`, "i").test(file)));
    if (match) {
      evidence.examples.push(surface === "wechat-web-view" ? "wechatWebView" : surface);
      addEvidence(evidence, `example.${surface}`, match);
      if (surface === "vanilla" || surface === "react") addEvidence(evidence, `${surface}Example`, match);
      addEvidence(evidence, "declaredExamples", match);
    }
  }
  evidence.locales = [...new Set(evidence.locales)];
  evidence.paths.sort();
  return evidence;
}
