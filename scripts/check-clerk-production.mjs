#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const clerkAppId = "app_3J0Xwvy7J3M2EM3uq1M0aaudEFq";
const desired = JSON.parse(readFileSync(join(root, "clerk.production.json"), "utf8"));

const output = execFileSync(
  "clerk",
  [
    "config",
    "pull",
    "--app",
    clerkAppId,
    "--instance",
    "prod",
    "--keys",
    "auth_email,auth_password,auth_attack_protection",
  ],
  { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
);
const actual = JSON.parse(output);

function leafSettings(value, path = []) {
  return Object.entries(value).flatMap(([key, child]) => {
    const childPath = [...path, key];
    if (child && typeof child === "object" && !Array.isArray(child)) {
      return leafSettings(child, childPath);
    }
    return [[childPath, child]];
  });
}

function readPath(value, path) {
  return path.reduce((current, key) => current?.[key], value);
}

const failures = leafSettings(desired).flatMap(([path, expected]) => {
  const value = readPath(actual, path);
  return JSON.stringify(value) === JSON.stringify(expected)
    ? []
    : [[path.join("."), value, expected]];
});
if (failures.length > 0) {
  for (const [label, value, expected] of failures) {
    console.error(
      `${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(value)}`,
    );
  }
  process.exitCode = 1;
} else {
  console.log("Clerk production authentication matches clerk.production.json");
}
