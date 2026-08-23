function sortedReports(reports) {
  return [...reports].sort((a, b) => a.repository.localeCompare(b.repository));
}

export function summarize(report) {
  const required = report.findings.filter((finding) => finding.level === "required");
  const recommended = report.findings.filter((finding) => finding.level === "recommended");
  const labs = report.findings.filter((finding) => finding.level === "labs");
  const requiredFailed = required.filter((finding) => finding.status === "fail").length;
  const requiredSkipped = required.filter((finding) => finding.status === "skip").length;
  const requiredUnknown = required.filter((finding) => finding.status === "unknown").length;
  const requiredNotApplicable = required.filter((finding) => finding.status === "not-applicable").length;
  return {
    requiredPassed: required.filter((finding) => finding.status === "pass").length,
    requiredFailed,
    requiredSkipped,
    requiredUnknown,
    requiredNotApplicable,
    recommendedPassed: recommended.filter((finding) => finding.status === "pass").length,
    recommendedFailed: recommended.filter((finding) => finding.status === "fail").length,
    labs: labs.length,
    status: requiredFailed > 0 ? "partial" : requiredSkipped + requiredUnknown > 0 ? "locally-compliant" : "compliant",
  };
}

function normalized(reports) {
  return sortedReports(reports).map((report) => ({
    standardVersion: report.standardVersion,
    repository: report.repository,
    summary: summarize(report),
    findings: [...report.findings].sort((a, b) => a.id.localeCompare(b.id)),
  }));
}

export function renderJson(reports) {
  const items = normalized(reports);
  return JSON.stringify({ standardVersion: items[0]?.standardVersion ?? "1.1.0", repositories: items }, null, 2);
}

export function renderMarkdown(reports) {
  return normalized(reports).map((report) => {
    const lines = [`# ${report.repository}`, ``, `Status: **${report.summary.status}**`, ``, `| Rule | Level | Status | Evidence | Remediation |`, `| --- | --- | --- | --- | --- |`];
    for (const finding of report.findings) lines.push(`| ${finding.id} | ${finding.level} | ${finding.status} | ${finding.path ?? "-"} | ${finding.remediation} |`);
    return lines.join("\n");
  }).join("\n\n");
}

export function renderTable(reports) {
  const rows = ["Repository | Status | Required failed | Required skipped | Required unknown | Recommended failed", "--- | --- | ---: | ---: | ---: | ---:"];
  for (const report of normalized(reports)) rows.push(`${report.repository} | ${report.summary.status} | ${report.summary.requiredFailed} | ${report.summary.requiredSkipped} | ${report.summary.requiredUnknown} | ${report.summary.recommendedFailed}`);
  return rows.join("\n");
}
