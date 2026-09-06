import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  SAMPLE_AFTER,
  SAMPLE_AFTER_SOURCES,
  SAMPLE_ASPECT,
  SAMPLE_BEFORE,
  SAMPLE_BEFORE_SOURCES,
  SAMPLE_DISCLAIMER,
  SAMPLE_HEIGHT,
  SAMPLE_LCP_PRELOAD,
  SAMPLE_WIDTH,
} from "./sample.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function publicPath(url: string) {
  return join(root, "public", url.replace(/^\//, ""));
}

test("sample before and after assets are in public/", () => {
  assert.ok(existsSync(publicPath(SAMPLE_BEFORE)), SAMPLE_BEFORE);
  assert.ok(existsSync(publicPath(SAMPLE_AFTER)), SAMPLE_AFTER);
  assert.ok(existsSync(publicPath(SAMPLE_LCP_PRELOAD)), SAMPLE_LCP_PRELOAD);
  for (const source of [...SAMPLE_BEFORE_SOURCES, ...SAMPLE_AFTER_SOURCES]) {
    for (const part of source.srcSet.split(",")) {
      const url = part.trim().split(/\s+/)[0];
      assert.ok(existsSync(publicPath(url)), url);
    }
  }
});

test("sample portrait is 3:4 and disclaimer is subtle", () => {
  assert.equal(SAMPLE_ASPECT, "3:4");
  assert.equal(SAMPLE_WIDTH / SAMPLE_HEIGHT, 3 / 4);
  assert.match(SAMPLE_DISCLAIMER, /actual results may vary/i);
});
