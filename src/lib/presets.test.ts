import assert from "node:assert/strict";
import test from "node:test";
import { buildPrompt, IDENTITY_LOCK, RECIPES, type RecipeId } from "./presets.ts";

test("each named finish has a distinct task prompt", () => {
  const named = RECIPES.filter((r) => r.id !== "custom");
  const prompts = named.map((r) => buildPrompt(r.id, ""));
  assert.equal(new Set(prompts).size, named.length);
  for (const prompt of prompts) {
    assert.match(prompt, /^Edit this photograph\. TASK:/);
    assert.ok(prompt.includes(IDENTITY_LOCK));
    assert.ok(prompt.length >= 8 && prompt.length <= 2000);
  }
});

test("proof strips watermarks and sets grey backdrop", () => {
  const prompt = buildPrompt("proof", "");
  assert.match(prompt, /watermark/i);
  assert.match(prompt, /studio grey/i);
  assert.match(prompt, /Yearbook/i);
});

test("watermarks only keeps the original backdrop", () => {
  const prompt = buildPrompt("watermark", "");
  assert.match(prompt, /watermark/i);
  assert.match(prompt, /do not replace the backdrop/i);
  assert.doesNotMatch(prompt, /studio grey/i);
  assert.doesNotMatch(prompt, /studio white/i);
});

test("enhance does not remove watermarks or swap the backdrop", () => {
  const prompt = buildPrompt("enhance", "");
  assert.match(prompt, /Do not add or remove/);
  assert.match(prompt, /watermarks/);
  assert.match(prompt, /Do not replace/);
});

test("studio grey and white only replace the backdrop", () => {
  const grey = buildPrompt("grey", "");
  const white = buildPrompt("white", "");
  assert.match(grey, /Replace only the background/);
  assert.match(grey, /studio grey/i);
  assert.doesNotMatch(grey, /studio white/i);
  assert.match(white, /Replace only the background/);
  assert.match(white, /studio white/i);
  assert.doesNotMatch(white, /studio grey/i);
});

test("custom requires instructions and locks identity", () => {
  assert.throws(() => buildPrompt("custom", "  "), /instructions/i);
  const prompt = buildPrompt("custom", "Soften the window light on the left.");
  assert.match(prompt, /Soften the window light on the left/);
  assert.ok(prompt.includes(IDENTITY_LOCK));
});

test("unknown recipe is rejected", () => {
  assert.throws(() => buildPrompt("nope" as RecipeId, ""), /Unknown finish/);
});
