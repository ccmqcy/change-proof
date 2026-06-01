#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const registry = "https://registry.npmjs.org/";
const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const packageName = packageJson.name;
const packageVersion = packageJson.version;
const expectedRepository = "git+https://github.com/ccmqcy/change-proof.git";
const npmCommand = process.env.npm_execpath ? process.execPath : (process.platform === "win32" ? "npm.cmd" : "npm");
const npmBaseArgs = process.env.npm_execpath ? [process.env.npm_execpath] : [];

const failures = [];
const warnings = [];

if (!packageName) {
  failures.push("package.json is missing name.");
}

if (!packageVersion) {
  failures.push("package.json is missing version.");
}

if (packageJson.private === true) {
  failures.push("package.json has private=true, so npm will refuse to publish.");
}

if (packageJson.repository?.url !== expectedRepository) {
  failures.push(`repository.url must be ${expectedRepository} for npm provenance/trusted publishing alignment.`);
}

if (packageJson.publishConfig?.registry !== registry) {
  failures.push(`publishConfig.registry must be ${registry}.`);
}

if (packageJson.publishConfig?.access !== "public") {
  failures.push("publishConfig.access must be public.");
}

const ping = run("npm", ["ping", "--registry", registry]);
if (ping.status !== 0) {
  failures.push(`npm registry ping failed: ${trimOutput(ping.stderr || ping.stdout)}`);
}

const currentVersion = run("npm", ["view", `${packageName}@${packageVersion}`, "version", "--registry", registry, "--json"]);
if (currentVersion.status === 0 && currentVersion.stdout.trim()) {
  failures.push(`${packageName}@${packageVersion} already exists on npm.`);
} else if (!isNotFound(currentVersion)) {
  failures.push(`Could not verify npm version availability: ${trimOutput(currentVersion.stderr || currentVersion.stdout)}`);
}

const packageInfo = run("npm", ["view", packageName, "name", "version", "--registry", registry, "--json"]);
if (packageInfo.status === 0 && packageInfo.stdout.trim()) {
  warnings.push(`${packageName} already exists on npm. Verify ownership before publishing a new version.`);
} else if (isNotFound(packageInfo)) {
  warnings.push(`${packageName} is not currently published on npm; first publish should reserve the name.`);
} else {
  warnings.push(`Package-name lookup was inconclusive: ${trimOutput(packageInfo.stderr || packageInfo.stdout)}`);
}

const whoami = run("npm", ["whoami", "--registry", registry]);
if (whoami.status === 0) {
  warnings.push(`Authenticated to npm as ${whoami.stdout.trim()}.`);
} else {
  warnings.push("Not authenticated to npm. This is acceptable for preflight, but publish requires npm login, trusted publishing, or an approved publish flow.");
}

if (warnings.length > 0) {
  console.log("npm preflight warnings:");
  for (const warning of warnings) {
    console.log(`- ${warning}`);
  }
}

if (failures.length > 0) {
  console.error("npm preflight failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`npm preflight passed for ${packageName}@${packageVersion}`);

function run(command, args) {
  const executable = command === "npm" ? npmCommand : command;
  const effectiveArgs = command === "npm" ? [...npmBaseArgs, ...args] : args;
  return spawnSync(executable, effectiveArgs, {
    cwd: new URL("..", import.meta.url),
    encoding: "utf8"
  });
}

function isNotFound(result) {
  return /E404|Not Found/i.test(`${result.stderr}\n${result.stdout}`);
}

function trimOutput(value) {
  return (value ?? "").trim().replace(/\s+/g, " ");
}
