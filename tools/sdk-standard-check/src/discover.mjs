import path from "node:path";
import { listFiles, readJsonIfExists, readTextIfExists, isMarkdown, isDemoFile } from "./files.mjs";

function addEvidence(evidence, key, filePath) {
  evidence.evidenceByKey[key] ??= [];
  if (!evidence.evidenceByKey[key].includes(filePath)) evidence.evidenceByKey[key].push(filePath);
  if (!evidence.paths.includes(filePath)) evidence.paths.push(filePath);
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

  const demoFile = files.find((file) => /^apps\/demo\/(?:index\.html|src\/main\.[jt]sx?|package\.json)$/i.test(file)) ?? files.find((file) => /^demo\/index\.html$/i.test(file));
  evidence.demoEntry = Boolean(demoFile);
  if (demoFile) addEvidence(evidence, "demoEntry", demoFile);
  for (const { file, text } of allText.filter(({ file }) => isDemoFile(file))) {
    if (/zh-CN|中文|lang\s*=\s*["']zh/i.test(text)) { evidence.demoChineseDefault = true; addEvidence(evidence, "demoChineseDefault", file); }
    if (/English|中文|language|语言|i18n/i.test(text)) { evidence.demoLanguageToggle = true; addEvidence(evidence, "demoLanguageToggle", file); }
    if (/data-sdk-cache-clear|clear(?:Model)?Cache|清理缓存/i.test(text)) { evidence.cacheClear = true; addEvidence(evidence, "cacheClear", file); }
    if (/data-sdk-(?:timing|model-info|runtime-info)|modelDownloadMs|inferenceMs|耗时/i.test(text)) { evidence.timingMarkers = true; addEvidence(evidence, "timingMarkers", file); }
  }

  if (manifest.value?.model?.assets?.length || /model(?:\s|_|-)info|precision|sha256|参数量|精度/i.test(joined)) { evidence.modelInformation = true; addEvidence(evidence, "modelInformation", manifest.path ?? markdown[0] ?? "README.md"); }
  if (manifest.value?.runtime || /actualBackend|requestedBackend|executionMode|WebGPU|WASM|后端/i.test(joined)) { evidence.runtimeInformation = true; addEvidence(evidence, "runtimeInformation", manifest.path ?? markdown[0] ?? "README.md"); }
  if (manifest.value?.performance?.timings?.length || /modelDownloadMs|modelCacheReadMs|inferenceMs|postprocessMs|totalMs|加载耗时|推理耗时/i.test(joined)) { evidence.performanceTimings = true; addEvidence(evidence, "performanceTimings", manifest.path ?? markdown[0] ?? "README.md"); }
  if (manifest.value?.cache || /clear(?:Model)?Cache|Cache Storage|IndexedDB|缓存/i.test(joined)) { evidence.cacheContract = true; addEvidence(evidence, "cacheContract", manifest.path ?? markdown[0] ?? "README.md"); }
  if (/https?:\/\/github\.com|https?:\/\/.*npmjs\.com|https?:\/\/.*github\.io/i.test(joined) || packageJson?.repository) { evidence.publicLinks = true; addEvidence(evidence, "publicLinks", "README.md"); }
  if (files.some((file) => /^\.github\/workflows\/ci\.(?:yml|yaml)$/i.test(file))) { evidence.ciWorkflow = true; addEvidence(evidence, "ciWorkflow", files.find((file) => /^\.github\/workflows\/ci\.(?:yml|yaml)$/i.test(file))); }
  if (files.some((file) => /^\.github\/workflows\/(?:release|publish)\.(?:yml|yaml)$/i.test(file))) { evidence.releaseWorkflow = true; addEvidence(evidence, "releaseWorkflow", files.find((file) => /^\.github\/workflows\/(?:release|publish)\.(?:yml|yaml)$/i.test(file))); }
  if (files.some((file) => /(^|\/)ui-tokens\.json$/i.test(file)) || /ui-tokens|--sdk-color|--color-action/i.test(joined)) { evidence.uiTokens = true; addEvidence(evidence, "uiTokens", "standards/v1/ui-tokens.json"); }
  for (const surface of ["vanilla", "react", "vue", "cdn", "vite", "wechat-web-view"]) {
    const match = files.find((file) => new RegExp(`^examples/${surface}(?:/|$)`, "i").test(file));
    if (match) { evidence.examples.push(surface === "wechat-web-view" ? "wechatWebView" : surface); addEvidence(evidence, `example.${surface}`, match); }
  }
  evidence.locales = [...new Set(evidence.locales)];
  evidence.paths.sort();
  return evidence;
}
