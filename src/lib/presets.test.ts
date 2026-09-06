import assert from "node:assert/strict";
import test from "node:test";
import {
  BACKDROP_CLAUSE,
  BW_CLAUSE,
  buildPrompt,
  CUSTOM_MAX,
  DEFAULT_FINISH_OPTIONS,
  FRAMING_AUTO,
  framingClause,
  IDENTITY_LOCK,
  LOOK_CLAUSE,
  nextCropForRecipe,
  PROMPT_MAX,
  RECIPE_DEFAULT_CROP,
  RECIPES,
  RETOUCH_CLAUSE,
  type FinishOptions,
  type RecipeId,
} from "./presets.ts";

const ALL_ON: FinishOptions = {
  tone: "bw",
  retouch: true,
  crop: "3:4",
  hasLook: true,
  hasBackdrop: true,
};

test("each named finish has a distinct task prompt", () => {
  const named = RECIPES.filter((r) => r.id !== "custom");
  const prompts = named.map((r) => buildPrompt(r.id, ""));
  assert.equal(new Set(prompts).size, named.length);
  for (const prompt of prompts) {
    assert.match(prompt, /^Edit this photograph\. TASK:/);
    assert.ok(prompt.includes(IDENTITY_LOCK));
    assert.ok(prompt.includes(FRAMING_AUTO));
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

test("cleanup targets glare, flyaways, lint, and wrinkles", () => {
  const prompt = buildPrompt("cleanup", "");
  assert.match(prompt, /glare/i);
  assert.match(prompt, /flyaway/i);
  assert.match(prompt, /lint/i);
  assert.match(prompt, /wrinkle/i);
  assert.match(prompt, /Do not replace or restyle the background/);
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

test("id photo is a white passport-style portrait", () => {
  const prompt = buildPrompt("id", "");
  assert.match(prompt, /passport-style/i);
  assert.match(prompt, /white/i);
  assert.match(prompt, /Head-and-shoulders/);
  assert.equal(RECIPE_DEFAULT_CROP.id, "3:4");
});

test("linkedin is a square studio headshot", () => {
  const prompt = buildPrompt("linkedin", "");
  assert.match(prompt, /profile headshot/i);
  assert.match(prompt, /studio grey/i);
  assert.equal(RECIPE_DEFAULT_CROP.linkedin, "1:1");
});

test("only id and linkedin lock a crop", () => {
  const locked = Object.keys(RECIPE_DEFAULT_CROP).sort();
  assert.deepEqual(locked, ["id", "linkedin"]);
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

test("default options omit look, backdrop, retouch, and bw clauses", () => {
  const prompt = buildPrompt("enhance", "", DEFAULT_FINISH_OPTIONS);
  assert.ok(!prompt.includes(LOOK_CLAUSE));
  assert.ok(!prompt.includes(BACKDROP_CLAUSE));
  assert.ok(!prompt.includes(RETOUCH_CLAUSE));
  assert.ok(!prompt.includes(BW_CLAUSE));
  assert.ok(prompt.includes(FRAMING_AUTO));
});

test("look, backdrop, retouch, bw, and crop modifiers append", () => {
  const prompt = buildPrompt("proof", "", ALL_ON);
  assert.ok(prompt.includes(LOOK_CLAUSE));
  assert.ok(prompt.includes(BACKDROP_CLAUSE));
  assert.ok(prompt.includes(RETOUCH_CLAUSE));
  assert.ok(prompt.includes(BW_CLAUSE));
  assert.ok(prompt.includes(framingClause("3:4")));
  assert.ok(!prompt.includes(FRAMING_AUTO));
  assert.ok(prompt.length <= PROMPT_MAX);
});

test("crop framing names the requested ratio", () => {
  const square = buildPrompt("enhance", "", { ...DEFAULT_FINISH_OPTIONS, crop: "1:1" });
  const portrait = buildPrompt("enhance", "", { ...DEFAULT_FINISH_OPTIONS, crop: "3:4" });
  const tall = buildPrompt("enhance", "", { ...DEFAULT_FINISH_OPTIONS, crop: "2:3" });
  assert.ok(square.includes("Reframe to 1:1"));
  assert.ok(portrait.includes("Reframe to 3:4"));
  assert.ok(tall.includes("Reframe to 2:3"));
  assert.notEqual(square, portrait);
  assert.notEqual(portrait, tall);
});

test("backdrop overrides keep-background language on named finishes", () => {
  const withPaper = { ...DEFAULT_FINISH_OPTIONS, hasBackdrop: true };
  for (const id of ["watermark", "enhance", "cleanup"] as const) {
    const plain = buildPrompt(id, "");
    const paper = buildPrompt(id, "", withPaper);
    assert.match(plain, /do not replace/i);
    assert.doesNotMatch(paper, /do not replace/i);
    assert.ok(paper.includes(BACKDROP_CLAUSE));
  }
});

test("re-clicking a recipe keeps the current crop", () => {
  assert.equal(nextCropForRecipe("proof", "proof", "1:1"), "1:1");
});

test("id and linkedin lock crop; other recipes keep a manual crop", () => {
  assert.equal(nextCropForRecipe("id", "proof", "auto"), "3:4");
  assert.equal(nextCropForRecipe("linkedin", "id", "3:4"), "1:1");
  assert.equal(nextCropForRecipe("enhance", "linkedin", "1:1"), "1:1");
  assert.equal(nextCropForRecipe("grey", "proof", "2:3"), "2:3");
});

test("max-length custom with every modifier stays under the API limit", () => {
  const prompt = buildPrompt("custom", "x".repeat(CUSTOM_MAX), ALL_ON);
  assert.ok(prompt.length <= PROMPT_MAX);
  assert.ok(PROMPT_MAX - prompt.length >= 40);
});
