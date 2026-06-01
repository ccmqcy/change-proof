#!/usr/bin/env node
import { chmodSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const binPath = join(scriptDir, "..", "dist", "cli.js");

if (existsSync(binPath)) {
  chmodSync(binPath, 0o755);
}
