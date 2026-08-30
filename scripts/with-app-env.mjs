#!/usr/bin/env node
// @ts-check
/**
 * Run a command with the app env resolved, e.g.
 * `node scripts/with-app-env.mjs vite build`.
 *
 * Layers, highest priority first: the real environment (never overwritten),
 * `.grok/app-env.json` string entries (the app-builder's config — flags like
 * `VITE_AUTH_ENABLED` must not drift from what the host resolved),
 * `.env.local`, then `.env`. Values land in `process.env`, which Vite
 * respects when it inlines `VITE_*`, so a wrapped build resolves the same
 * client env as a wrapped dev server.
 *
 * Importable too: `scripts/migrate.mjs` uses `readAppConfig` / `loadAppEnv`.
 */
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { delimiter, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Parsed `.grok/app-env.json`, or `{}` when absent/unreadable. */
export function readAppConfig() {
  const file = join(root, ".grok", "app-env.json");
  if (!existsSync(file)) return {};
  const parsed = JSON.parse(readFileSync(file, "utf8"));
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`[with-app-env] ${file} must contain a JSON object`);
  }
  return parsed;
}

/** Minimal `.env` parser: `KEY=value` lines, `#` comments, optional quotes. */
function parseEnvFile(contents) {
  const vars = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let value = line.slice(eq + 1).trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    } else {
      const hash = value.indexOf(" #");
      if (hash !== -1) value = value.slice(0, hash).trim();
    }
    vars[key] = value;
  }
  return vars;
}

function readEnvFile(name) {
  const file = join(root, name);
  if (!existsSync(file)) return {};
  return parseEnvFile(readFileSync(file, "utf8"));
}

/**
 * Merge the env layers into `process.env` (existing entries win) and return
 * it.
 */
export function loadAppEnv() {
  const configVars = {};
  for (const [key, value] of Object.entries(readAppConfig())) {
    if (typeof value === "string") configVars[key] = value;
  }
  for (const layer of [configVars, readEnvFile(".env.local"), readEnvFile(".env")]) {
    for (const [key, value] of Object.entries(layer)) {
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
  return process.env;
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const [command, ...args] = process.argv.slice(2);
  if (!command) {
    console.error("usage: node scripts/with-app-env.mjs <command> [args...]");
    process.exit(2);
  }
  loadAppEnv();
  // Ensure local binaries (vite) resolve even when invoked outside npm.
  const binDir = join(root, "node_modules", ".bin");
  const pathKey = Object.keys(process.env).find((key) => key.toUpperCase() === "PATH") ?? "PATH";
  const env = {
    ...process.env,
    [pathKey]: [binDir, process.env[pathKey]].filter(Boolean).join(delimiter),
  };
  const child = spawn(command, args, { stdio: "inherit", env });
  child.on("error", (err) => {
    console.error(`[with-app-env] failed to start ${command}: ${err.message}`);
    process.exit(127);
  });
  child.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    else process.exit(code ?? 1);
  });
}
