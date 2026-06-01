#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const projectRoot = new URL("..", import.meta.url);
const tempRoot = mkdtempSync(join(tmpdir(), "change-proof-install-"));
const packageDir = join(tempRoot, "package");
const installDir = join(tempRoot, "consumer");
const registry = "https://registry.npmjs.org/";
const npmCommand = process.env.npm_execpath ? process.execPath : (process.platform === "win32" ? "npm.cmd" : "npm");
const npmBaseArgs = process.env.npm_execpath ? [process.env.npm_execpath] : [];
const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

try {
  ensureDir(packageDir);
  const packOutput = npmExec([
    ...npmBaseArgs,
    "pack",
    "--json",
    "--registry",
    registry,
    "--pack-destination",
    packageDir
  ], projectRoot);

  const [packed] = JSON.parse(packOutput);
  if (!packed?.filename) {
    throw new Error("npm pack did not return a package filename.");
  }

  const tarballPath = join(packageDir, packed.filename);

  npmExec([...npmBaseArgs, "init", "-y"], ensureDir(installDir), { quiet: true });

  npmExec([...npmBaseArgs, "install", tarballPath, "--registry", registry], installDir, { quiet: true });

  const binShim = process.platform === "win32"
    ? join(installDir, "node_modules", ".bin", "change-proof.cmd")
    : join(installDir, "node_modules", ".bin", "change-proof");

  if (!existsSync(binShim)) {
    throw new Error(`installed CLI bin shim was not found: ${binShim}`);
  }

  const installedCli = join(installDir, "node_modules", "change-proof", "dist", "cli.js");
  const result = spawnSync(process.execPath, [installedCli, "--version"], {
    cwd: installDir,
    encoding: "utf8"
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "installed CLI failed");
  }

  if (result.stdout.trim() !== packageJson.version) {
    throw new Error(`installed CLI returned unexpected version: ${result.stdout.trim()}`);
  }

  console.log(`package install verification passed with ${packed.filename}`);
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}

function ensureDir(path) {
  execFileSync(process.execPath, ["-e", `require('node:fs').mkdirSync(${JSON.stringify(path)}, { recursive: true })`]);
  return path;
}

function npmExec(args, cwd, options = {}) {
  return execFileSync(npmCommand, args, {
    cwd,
    encoding: "utf8",
    stdio: options.quiet ? ["ignore", "pipe", "pipe"] : ["ignore", "pipe", "inherit"],
    env: {
      ...process.env,
      npm_config_dry_run: "false"
    }
  });
}
