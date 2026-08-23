#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { scanRepository } from "./src/check.mjs";
import { renderJson, renderMarkdown, renderTable } from "./src/report.mjs";

function parseArgs(argv) {
  const options = { repos: [], standard: "v1", format: "table", out: undefined, network: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--repo") options.repos.push(argv[++index]);
    else if (arg === "--standard") options.standard = argv[++index];
    else if (arg === "--format") options.format = argv[++index];
    else if (arg === "--out") options.out = argv[++index];
    else if (arg === "--network") options.network = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function usage() {
  return [
    "Usage: pnpm sdk:check -- --repo <path> [--repo <path>] [--standard v1] [--format table|json|markdown] [--out <file>] [--network]",
    "Exit codes: 0 no local required failures (remote rules may be skipped), 1 required failures, 2 invalid input/config, 3 checker error",
  ].join("\n");
}

async function writeAtomically(filePath, content) {
  const absolute = path.resolve(filePath);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  const temporary = `${absolute}.${process.pid}.tmp`;
  await fs.writeFile(temporary, content, "utf8");
  await fs.rename(temporary, absolute);
}

export async function run(argv = process.argv.slice(2)) {
  let options;
  try { options = parseArgs(argv); } catch (error) { console.error(error.message); console.error(usage()); return 2; }
  if (options.help) { console.log(usage()); return 0; }
  if (options.repos.length === 0) { console.error("At least one --repo is required"); console.error(usage()); return 2; }
  if (!["table", "json", "markdown"].includes(options.format)) { console.error(`Unsupported format: ${options.format}`); return 2; }
  const standardRoot = path.resolve(process.cwd(), "standards", options.standard);
  try {
    const reports = [];
    for (const repository of options.repos) reports.push(await scanRepository(repository, { standardRoot, network: options.network }));
    const output = options.format === "json" ? renderJson(reports) : options.format === "markdown" ? renderMarkdown(reports) : renderTable(reports);
    if (options.out) await writeAtomically(options.out, `${output}\n`);
    else console.log(output);
    return reports.some((report) => report.findings.some((finding) => finding.level === "required" && finding.status === "fail")) ? 1 : 0;
  } catch (error) {
    console.error(error.stack ?? error.message);
    return 3;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = await run();
