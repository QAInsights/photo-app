export type RecipeId =
  | "proof"
  | "watermark"
  | "enhance"
  | "grey"
  | "white"
  | "custom";

export type Engine = "ai" | "local";

export const IDENTITY_LOCK =
  "Keep the exact same person with identical facial features, age, skin tone, hair, eyes, glasses, teeth, jewelry, clothing, pose, expression, and crop. Do not beautify, age-shift, restyle, or change identity. Keep natural skin texture. Photorealistic.";

export const RECIPES: {
  id: RecipeId;
  label: string;
  blurb: string;
  needsAi: boolean;
  prompt: string;
}[] = [
  {
    id: "proof",
    label: "Proof clean",
    blurb: "Strip watermarks. Clean grey studio backdrop. Yearbook finish.",
    needsAi: true,
    prompt: `Professional school-portrait restoration of this exact photo. Completely remove every watermark, logo, stamp, and repeating text overlay from the entire image including face, hair, clothing, and background. Replace the backdrop with a clean seamless professional photography studio grey — soft even medium-grey, no text, no logos, no patterns. ${IDENTITY_LOCK} Premium DSLR yearbook quality, sharp eyes, even studio lighting. Preserve the original camera angle.`,
  },
  {
    id: "watermark",
    label: "Watermarks only",
    blurb: "Remove logos and text. Keep the original backdrop.",
    needsAi: true,
    prompt: `Restore this photograph by removing every watermark, logo, stamp, and repeating text overlay. Reconstruct covered areas so they match surrounding pixels and lighting. Keep the original background style, colors, and texture. ${IDENTITY_LOCK} Do not replace the backdrop.`,
  },
  {
    id: "enhance",
    label: "HQ enhance",
    blurb: "Color, light, and sharpness. No structural changes.",
    needsAi: false,
    prompt: `Enhance this photograph to premium high-resolution studio quality. Improve sharpness, color accuracy, exposure, and lighting. Do not add or remove objects, people, or text. Do not replace the background. ${IDENTITY_LOCK}`,
  },
  {
    id: "grey",
    label: "Studio grey",
    blurb: "Seamless grey paper backdrop. Subject unchanged.",
    needsAi: true,
    prompt: `Replace only the background with a clean seamless professional photography studio grey backdrop — soft even medium-grey paper, no text, no logos. Keep hair edges clean and natural. ${IDENTITY_LOCK}`,
  },
  {
    id: "white",
    label: "Studio white",
    blurb: "Seamless white paper backdrop. Subject unchanged.",
    needsAi: true,
    prompt: `Replace only the background with a clean seamless professional photography studio white backdrop — even bright white paper, no text, no logos, no shadows of watermarks. Keep hair edges clean and natural. ${IDENTITY_LOCK}`,
  },
  {
    id: "custom",
    label: "Custom",
    blurb: "Your instructions, identity locked.",
    needsAi: true,
    prompt: "",
  },
];

export function buildPrompt(recipe: RecipeId, custom: string) {
  if (recipe === "custom") {
    const extra = custom.trim();
    return `${IDENTITY_LOCK} ${extra || "Clean and enhance this photograph to premium studio quality without changing the subject."}`;
  }
  const found = RECIPES.find((r) => r.id === recipe);
  return found?.prompt ?? RECIPES[2].prompt;
}
