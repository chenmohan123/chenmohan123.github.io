import fs from "node:fs/promises";
import path from "node:path";

// 忽略依赖、构建、测试和 Python 环境生成的目录；这些目录不提供标准证据。
const ignoredDirectories = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  ".astro",
  ".pnpm-store",
  "coverage",
  "test-results",
  ".pytest_cache",
  "__pycache__",
  ".mypy_cache",
  ".ruff_cache",
  ".tox",
  ".nox",
  ".venv",
  "venv",
  "work",
]);

function isIgnoredDirectory(name) {
  return ignoredDirectories.has(name) || /^pytest-/i.test(name);
}

export async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readTextIfExists(root, relativePath) {
  const filePath = path.join(root, relativePath);
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return undefined;
    throw error;
  }
}

export async function readJsonIfExists(root, relativePath) {
  const text = await readTextIfExists(root, relativePath);
  if (text === undefined) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export async function listFiles(root) {
  /** @type {string[]} */
  const files = [];
  async function visit(directory) {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && isIgnoredDirectory(entry.name)) continue;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(absolute);
      else files.push(path.relative(root, absolute).replaceAll(path.sep, "/"));
    }
  }
  await visit(root);
  return files.sort();
}

export function isMarkdown(filePath) {
  return /\.(?:md|mdx)$/i.test(filePath);
}

export function isDemoFile(filePath) {
  return /(?:^|\/)(?:apps\/demo|demo|examples\/[^/]+)(?:\/|$)/i.test(filePath) && /\.(?:html|tsx?|jsx?|vue|css)$/i.test(filePath);
}

export function relativeEvidencePath(filePath) {
  return filePath.replaceAll("\\", "/");
}
