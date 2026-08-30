#!/usr/bin/env node
// @ts-check
/**
 * Deploy-time migration applier (`npm run build` runs this after `vite build`).
 *
 * Reads `migrations/` with `readdir` — non-recursive, per the contract in
 * `migration-plan.mjs` — and applies files the database has not seen, keyed
 * by basename in `_migrations`. No-op when the app config keeps the database
 * off (`deploy.database: false`) or the app has no migrations.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadAppEnv, readAppConfig } from "./with-app-env.mjs";
import { migrationName, pendingMigrations } from "./migration-plan.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATIONS_DIR = join(root, "migrations");

const config = readAppConfig();
if (config.deploy && config.deploy.database === false) {
  console.log("[migrate] database disabled by app config — nothing to apply");
  process.exit(0);
}
if (!existsSync(MIGRATIONS_DIR)) {
  console.log("[migrate] no migrations/ directory — nothing to apply");
  process.exit(0);
}

loadAppEnv();
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("[migrate] migrations/ exists but DATABASE_URL is not set");
  process.exit(1);
}

const { Client } = await import("pg");
const client = new Client({ connectionString });
await client.connect();
try {
  await client.query(
    "CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())",
  );
  const applied = await client.query("SELECT name FROM _migrations");
  const pending = pendingMigrations(
    readdirSync(MIGRATIONS_DIR),
    applied.rows.map((r) => r.name),
  );
  if (pending.length === 0) {
    console.log("[migrate] database up to date");
  }
  for (const { name, path } of pending) {
    const sql = readFileSync(join(MIGRATIONS_DIR, path), "utf8");
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("INSERT INTO _migrations (name) VALUES ($1)", [migrationName(path)]);
      await client.query("COMMIT");
      console.log(`[migrate] applied ${name}`);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }
  }
} finally {
  await client.end();
}
