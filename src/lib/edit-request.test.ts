import assert from "node:assert/strict";
import test from "node:test";
import { buildEditBody } from "./edit-request.ts";

const base = {
  imageDataUrl: "data:image/jpeg;base64,aaa",
  prompt: "Edit this photograph. TASK: test",
  aspectRatio: "auto",
  resolution: "2k" as const,
};

test("single image uses image, not images", () => {
  const body = buildEditBody("grok-imagine-image-2.0", base);
  assert.deepEqual(body.image, { url: base.imageDataUrl, type: "image_url" });
  assert.equal("images" in body, false);
  assert.equal(body.aspect_ratio, "auto");
  assert.equal(body.n, 1);
});

test("look and backdrop are extra images after the subject", () => {
  const body = buildEditBody("grok-imagine-image-2.0", {
    ...base,
    lookImageDataUrl: "data:image/jpeg;base64,look",
    backdropImageDataUrl: "data:image/jpeg;base64,paper",
    aspectRatio: "3:4",
  });
  assert.equal("image" in body, false);
  assert.deepEqual(body.images, [
    { type: "image_url", url: base.imageDataUrl },
    { type: "image_url", url: "data:image/jpeg;base64,look" },
    { type: "image_url", url: "data:image/jpeg;base64,paper" },
  ]);
  assert.equal(body.aspect_ratio, "3:4");
});
