import type { ChangeProofReport, ChangedFile, FileGroup, GitDiffSnapshot, VerificationRun } from "./types.js";

const FILE_GROUPS: FileGroup[] = ["source", "test", "docs", "config", "generated", "asset", "other"];

export function createReport(snapshot: GitDiffSnapshot, verification?: VerificationRun): ChangeProofReport {
  const files = allFiles(snapshot);
  const byGroup = Object.fromEntries(FILE_GROUPS.map((group) => [group, 0])) as Record<FileGroup, number>;
  let riskCount = 0;
  let highRiskCount = 0;

  for (const file of files) {
    byGroup[file.group] += 1;
    riskCount += file.risks.length;
    highRiskCount += file.risks.filter((risk) => risk.level === "high").length;
  }

  return {
    generatedAt: new Date().toISOString(),
    repoPath: snapshot.repoPath,
    base: snapshot.base,
    snapshot,
    verification,
    summary: {
      totalFiles: files.length,
      byGroup,
      riskCount,
      highRiskCount,
      hasTestsChanged: files.some((file) => file.group === "test"),
      hasSourceChanged: files.some((file) => file.group === "source")
    },
    notVerified: buildNotVerifiedNotes(files, verification)
  };
}

export function renderMarkdown(report: ChangeProofReport): string {
  const files = allFiles(report.snapshot);
  const riskyFiles = files.filter((file) => file.risks.length > 0);
  const lines: string[] = [];

  lines.push("# Change Proof Report");
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Repository: \`${report.repoPath}\``);
  lines.push(`Scope: \`${report.base ? `git diff ${report.base}` : "git diff HEAD + untracked files"}\``);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Changed files: ${report.summary.totalFiles}`);
  lines.push(`- Risk signals: ${report.summary.riskCount}`);
  lines.push(`- High-risk signals: ${report.summary.highRiskCount}`);
  lines.push(`- Source files changed: ${yesNo(report.summary.hasSourceChanged)}`);
  lines.push(`- Test files changed: ${yesNo(report.summary.hasTestsChanged)}`);
  lines.push("");
  lines.push("### Files By Group");
  lines.push("");
  lines.push("| Group | Count |");
  lines.push("| --- | ---: |");
  for (const [group, count] of Object.entries(report.summary.byGroup)) {
    lines.push(`| ${group} | ${count} |`);
  }
  lines.push("");

  lines.push("## Changed Files");
  lines.push("");
  if (files.length === 0) {
    lines.push("No changed files were detected.");
  } else {
    lines.push("| File | Status | Group | Risk signals |");
    lines.push("| --- | --- | --- | --- |");
    for (const file of files) {
      const riskLabels = file.risks.length > 0 ? file.risks.map((risk) => `${risk.level}:${risk.id}`).join(", ") : "-";
      lines.push(`| \`${escapePipe(file.path)}\` | ${file.kind} | ${file.group} | ${escapePipe(riskLabels)} |`);
    }
  }
  lines.push("");

  lines.push("## Risk Signals");
  lines.push("");
  if (riskyFiles.length === 0) {
    lines.push("No configured risk signals were detected from changed paths.");
  } else {
    lines.push("| File | Risk | Level | Why it matters | Next check |");
    lines.push("| --- | --- | --- | --- | --- |");
    for (const file of riskyFiles) {
      for (const risk of file.risks) {
        lines.push(
          `| \`${escapePipe(file.path)}\` | ${escapePipe(risk.label)} | ${risk.level} | ${escapePipe(risk.reason)} | ${escapePipe(risk.nextCheck)} |`
        );
      }
    }
  }
  lines.push("");

  if (report.snapshot.gitWarnings.length > 0) {
    lines.push("## Git Warnings");
    lines.push("");
    for (const warning of report.snapshot.gitWarnings) {
      lines.push(`- ${warning}`);
    }
    lines.push("");
  }

  lines.push("## Verification");
  lines.push("");
  lines.push(renderVerification(report.verification));
  lines.push("");
  lines.push("## Not Verified");
  lines.push("");
  for (const note of report.notVerified) {
    lines.push(`- ${note}`);
  }
  lines.push("");

  if (report.snapshot.stat.trim()) {
    lines.push("## Raw Diff Stat");
    lines.push("");
    lines.push("```text");
    lines.push(report.snapshot.stat.trim());
    lines.push("```");
    lines.push("");
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

export function renderConsoleSummary(report: ChangeProofReport, markdownPath: string, jsonPath?: string): string {
  const verificationStatus = report.verification ? (report.verification.passed ? "PASS" : "FAIL") : "NOT_RUN";
  const outputs = [`report=${markdownPath}`];

  if (jsonPath) {
    outputs.push(`json=${jsonPath}`);
  }

  return [
    `Change Proof: files=${report.summary.totalFiles} risks=${report.summary.riskCount} high=${report.summary.highRiskCount} verification=${verificationStatus}`,
    `Wrote ${outputs.join(" ")}`
  ].join("\n");
}

function renderVerification(verification?: VerificationRun): string {
  if (!verification) {
    return [
      "Status: NOT RUN",
      "",
      "No verification command was provided. This report only contains static git/path analysis."
    ].join("\n");
  }

  const lines: string[] = [];
  lines.push(`Status: ${verification.passed ? "PASS" : "FAIL"}`);
  lines.push(`Command: \`${verification.command}\``);
  lines.push(`Exit code: ${verification.exitCode === null ? "unknown" : verification.exitCode}`);
  lines.push(`Duration: ${verification.durationMs}ms`);

  const combinedOutput = tailLines([verification.stdout, verification.stderr].filter(Boolean).join("\n"), 40);
  if (combinedOutput.trim()) {
    lines.push("");
    lines.push("```text");
    lines.push(combinedOutput.trimEnd());
    lines.push("```");
  }

  if (verification.error) {
    lines.push("");
    lines.push(`Execution error: ${verification.error}`);
  }

  return lines.join("\n");
}

function buildNotVerifiedNotes(files: ChangedFile[], verification?: VerificationRun): string[] {
  const notes: string[] = [];
  const highRiskFiles = files.filter((file) => file.risks.some((risk) => risk.level === "high"));

  if (!verification) {
    notes.push("No dynamic verification command was run.");
  } else if (!verification.passed) {
    notes.push("The provided verification command failed, so this change is not verified as passing.");
  }

  if (files.some((file) => file.group === "source") && !files.some((file) => file.group === "test")) {
    notes.push("Source files changed, but no test files were detected in the changed file set.");
  }

  if (highRiskFiles.length > 0) {
    notes.push("High-risk paths were detected. The report lists required follow-up checks, but it does not prove those domain checks passed.");
  }

  if (files.some((file) => file.group === "config")) {
    notes.push("Configuration or workflow changes may require environment-specific validation outside this local report.");
  }

  if (notes.length === 0) {
    notes.push("No additional unverified areas were inferred from the configured rules.");
  }

  return notes;
}

function allFiles(snapshot: GitDiffSnapshot): ChangedFile[] {
  return [...snapshot.changedFiles, ...snapshot.untrackedFiles];
}

function yesNo(value: boolean): string {
  return value ? "yes" : "no";
}

function tailLines(text: string, maxLines: number): string {
  const lines = text.split(/\r?\n/);

  if (lines.length <= maxLines) {
    return text;
  }

  return [`... output truncated to last ${maxLines} lines ...`, ...lines.slice(-maxLines)].join("\n");
}

function escapePipe(value: string): string {
  return value.replace(/\|/g, "\\|");
}
