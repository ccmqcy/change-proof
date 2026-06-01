#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { collectGitDiff, runVerificationCommand } from "./git.js";
import { createReport, renderConsoleSummary, renderMarkdown } from "./report.js";
import type { ReportOptions } from "./types.js";

interface ParsedArgs {
  command?: string;
  help: boolean;
  version: boolean;
  options: ReportOptions;
}

const VERSION = "0.1.1";

export function main(argv = process.argv.slice(2)): number {
  const parsed = parseArgs(argv);

  if (parsed.version) {
    console.log(VERSION);
    return 0;
  }

  if (parsed.help || !parsed.command) {
    console.log(helpText());
    return 0;
  }

  if (parsed.command !== "report") {
    console.error(`Unknown command: ${parsed.command}`);
    console.error("Run `change-proof --help` for usage.");
    return 1;
  }

  try {
    const snapshot = collectGitDiff(parsed.options.repoPath, parsed.options.base);
    const verification = parsed.options.testCommand
      ? runVerificationCommand(parsed.options.repoPath, parsed.options.testCommand)
      : undefined;
    const report = createReport(snapshot, verification);
    const markdown = renderMarkdown(report);

    writeTextFile(parsed.options.outputPath, markdown);

    if (parsed.options.jsonPath) {
      writeTextFile(parsed.options.jsonPath, `${JSON.stringify(report, null, 2)}\n`);
    }

    console.log(renderConsoleSummary(report, parsed.options.outputPath, parsed.options.jsonPath));

    if (parsed.options.failOnTestFailure && verification && !verification.passed) {
      return 1;
    }

    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Change Proof failed: ${message}`);
    return 1;
  }
}

export function parseArgs(argv: string[]): ParsedArgs {
  const options: ReportOptions = {
    repoPath: process.cwd(),
    outputPath: "change-proof-report.md",
    failOnTestFailure: false
  };

  let command: string | undefined;
  let help = false;
  let version = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (!arg) {
      continue;
    }

    if (arg === "-h" || arg === "--help") {
      help = true;
      continue;
    }

    if (arg === "-v" || arg === "--version") {
      version = true;
      continue;
    }

    if (!command && !arg.startsWith("-")) {
      command = arg;
      continue;
    }

    switch (arg) {
      case "--repo":
      case "-C":
        options.repoPath = requireValue(argv, ++index, arg);
        break;
      case "--base":
        options.base = requireValue(argv, ++index, arg);
        break;
      case "--output":
      case "-o":
        options.outputPath = requireValue(argv, ++index, arg);
        break;
      case "--json":
        options.jsonPath = requireValue(argv, ++index, arg);
        break;
      case "--test":
        options.testCommand = requireValue(argv, ++index, arg);
        break;
      case "--fail-on-test-failure":
        options.failOnTestFailure = true;
        break;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  options.repoPath = resolve(options.repoPath);
  options.outputPath = resolve(options.outputPath);
  options.jsonPath = options.jsonPath ? resolve(options.jsonPath) : undefined;

  return { command, help, version, options };
}

function requireValue(argv: string[], index: number, flag: string): string {
  const value = argv[index];

  if (!value || value.startsWith("-")) {
    throw new Error(`Missing value for ${flag}`);
  }

  return value;
}

function writeTextFile(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
}

function helpText(): string {
  return `Change Proof ${VERSION}

Usage:
  change-proof report [options]

Options:
  -C, --repo <path>              Git repository to inspect. Defaults to current directory.
      --base <revision>          Diff against a specific base revision.
  -o, --output <path>            Markdown report path. Defaults to change-proof-report.md.
      --json <path>              Also write a JSON report.
      --test <command>           Run a verification command and include its output.
      --fail-on-test-failure     Exit with code 1 when the verification command fails.
  -h, --help                     Show help.
  -v, --version                  Show version.

Examples:
  change-proof report
  change-proof report --test "npm test" --json change-proof-report.json
  change-proof report -C ../my-repo --base origin/main --output reports/change-proof.md
`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  process.exitCode = main();
}
