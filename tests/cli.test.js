import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const cliPath = join(process.cwd(), "dist", "cli.js");
const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

test("CLI prints a plain version", () => {
  const result = spawnSync(process.execPath, [cliPath, "--version"], {
    encoding: "utf8"
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), packageJson.version);
});

test("CLI generates reports for a real git diff", () => {
  const workspace = mkdtempSync(join(tmpdir(), "change-proof-cli-"));

  try {
    const repo = join(workspace, "repo");
    const reportPath = join(workspace, "change-proof-report.md");
    const jsonPath = join(workspace, "change-proof-report.json");

    execFileSync("git", ["init", repo], { stdio: "ignore" });
    execFileSync("git", ["-C", repo, "config", "user.email", "change-proof@example.local"]);
    execFileSync("git", ["-C", repo, "config", "user.name", "Change Proof Test"]);
    execFileSync("git", ["-C", repo, "branch", "-M", "main"]);
    execFileSync("git", ["-C", repo, "status"], { stdio: "ignore" });

    mkdirSync(join(repo, "src/auth"), { recursive: true });
    writeFileSync(join(repo, "src/auth/session.ts"), "export const sessionTimeout = 30;\n", "utf8");
    execFileSync("git", ["-C", repo, "add", "."], { stdio: "ignore" });
    execFileSync("git", ["-C", repo, "commit", "-m", "baseline"], { stdio: "ignore" });

    writeFileSync(join(repo, "src/auth/session.ts"), "export const sessionTimeout = 45;\n", "utf8");

    const result = spawnSync(process.execPath, [
      cliPath,
      "report",
      "-C",
      repo,
      "--test",
      "node --version",
      "--output",
      reportPath,
      "--json",
      jsonPath
    ], {
      encoding: "utf8"
    });

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /verification=PASS/);
    assert.equal(existsSync(reportPath), true);
    assert.equal(existsSync(jsonPath), true);

    const markdown = readFileSync(reportPath, "utf8");
    const json = JSON.parse(readFileSync(jsonPath, "utf8"));

    assert.match(markdown, /Auth or session boundary/);
    assert.match(markdown, /Status: PASS/);
    assert.equal(json.summary.totalFiles, 1);
    assert.equal(json.summary.highRiskCount, 1);
    assert.equal(json.verification.passed, true);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

test("CLI can fail when verification fails and fail-on-test-failure is set", () => {
  const workspace = mkdtempSync(join(tmpdir(), "change-proof-cli-fail-"));

  try {
    const repo = join(workspace, "repo");
    const reportPath = join(workspace, "failure-report.md");

    execFileSync("git", ["init", repo], { stdio: "ignore" });
    execFileSync("git", ["-C", repo, "config", "user.email", "change-proof@example.local"]);
    execFileSync("git", ["-C", repo, "config", "user.name", "Change Proof Test"]);
    writeFileSync(join(repo, "README.md"), "# Fixture\n", "utf8");
    execFileSync("git", ["-C", repo, "add", "."], { stdio: "ignore" });
    execFileSync("git", ["-C", repo, "commit", "-m", "baseline"], { stdio: "ignore" });
    writeFileSync(join(repo, "README.md"), "# Fixture changed\n", "utf8");

    const result = spawnSync(process.execPath, [
      cliPath,
      "report",
      "-C",
      repo,
      "--test",
      "node --invalid-change-proof-flag",
      "--fail-on-test-failure",
      "--output",
      reportPath
    ], {
      encoding: "utf8"
    });

    assert.equal(result.status, 1);
    assert.equal(existsSync(reportPath), true);
    assert.match(readFileSync(reportPath, "utf8"), /Status: FAIL/);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});
