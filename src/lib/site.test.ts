import assert from "node:assert/strict";
import test from "node:test";
import { FAQ, jsonLd, jsonLdScript, SITE_DESCRIPTION, SITE_URL } from "./site.ts";

test("canonical site URL is the live host", () => {
  assert.equal(SITE_URL, "https://photo.dosa.dev");
  assert.match(SITE_DESCRIPTION, /not stored/i);
});

test("JSON-LD graph covers app, how-to, and FAQ", () => {
  const types = new Set(
    (jsonLd["@graph"] as { "@type": string }[]).map((node) => node["@type"]),
  );
  for (const type of ["WebSite", "WebApplication", "Organization", "HowTo", "FAQPage"]) {
    assert.ok(types.has(type), `missing ${type}`);
  }
  assert.doesNotThrow(() => JSON.parse(jsonLdScript));
  assert.equal(FAQ.length, 5);
  assert.ok(!jsonLdScript.includes("</script>"));
});
