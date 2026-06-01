import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { createChangedFile } from "./classify.js";
import type { ChangedFile, GitDiffSnapshot, VerificationRun } from "./types.js";

interface CommandResult {
  stdout: string;
  stderr: string;
  status: number | null;
  error?: string;
}

export function collectGitDiff(repoPath: string, base?: string): GitDiffSnapshot {
  const resolvedRepoPath = resolve(repoPath);
  const warnings: string[] = [];

  if (!existsSync(resolvedRepoPath)) {
    throw new Error(`Repository path does not exist: ${resolvedRepoPath}`);
  }

  const insideWorkTree = runGit(resolvedRepoPath, ["rev-parse", "--is-inside-work-tree"]);
  if (insideWorkTree.status !== 0 || insideWorkTree.stdout.trim() !== "true") {
    throw new Error(`Not a git repository: ${resolvedRepoPath}`);
  }

  const diffArgs = base ? ["diff", base, "--"] : ["diff", "HEAD", "--"];
  const statResult = runGit(resolvedRepoPath, [...diffArgs.slice(0, -1), "--stat", "--"]);
  const nameStatusResult = runGit(resolvedRepoPath, [...diffArgs.slice(0, -1), "--name-status", "--"]);

  let stat = statResult.stdout.trim();
  let changedFiles = parseNameStatus(nameStatusResult.stdout);

  if (!base && (statResult.status !== 0 || nameStatusResult.status !== 0)) {
    warnings.push("Could not diff against HEAD. Falling back to git status for changed files.");
    stat = "";
    changedFiles = [];
  } else {
    if (statResult.stderr.trim()) {
      warnings.push(statResult.stderr.trim());
    }
    if (nameStatusResult.stderr.trim()) {
      warnings.push(nameStatusResult.stderr.trim());
    }
  }

  const statusResult = runGit(resolvedRepoPath, ["status", "--porcelain=v1"]);
  if (statusResult.status !== 0) {
    warnings.push(statusResult.stderr.trim() || "Could not read git status.");
  }

  const untrackedFiles = parseUntrackedStatus(statusResult.stdout);
  const knownPaths = new Set(changedFiles.map((file) => file.path));
  const uniqueUntracked = untrackedFiles.filter((file) => !knownPaths.has(file.path));

  return {
    repoPath: resolvedRepoPath,
    base,
    stat,
    changedFiles,
    untrackedFiles: uniqueUntracked,
    gitWarnings: warnings.filter(Boolean)
  };
}

export function runVerificationCommand(repoPath: string, command: string): VerificationRun {
  const started = Date.now();
  const result = spawnSync(command, {
    cwd: resolve(repoPath),
    encoding: "utf8",
    shell: true,
    maxBuffer: 1024 * 1024 * 10
  });

  const exitCode = typeof result.status === "number" ? result.status : null;
  return {
    command,
    exitCode,
    passed: exitCode === 0,
    durationMs: Date.now() - started,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error?.message
  };
}

function runGit(cwd: string, args: string[]): CommandResult {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 10
  });

  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    status: typeof result.status === "number" ? result.status : null,
    error: result.error?.message
  };
}

function parseNameStatus(output: string): ChangedFile[] {
  return output
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => {
      const columns = line.split(/\t+/);
      const status = columns[0] ?? "";

      if (status.startsWith("R") || status.startsWith("C")) {
        return createChangedFile(columns[2] ?? columns[1] ?? "", status, columns[1]);
      }

      return createChangedFile(columns[1] ?? "", status);
    })
    .filter((file) => file.path.length > 0);
}

function parseUntrackedStatus(output: string): ChangedFile[] {
  return output
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.startsWith("?? "))
    .map((line) => createChangedFile(line.slice(3), "??"));
}
