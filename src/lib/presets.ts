export type RecipeId =
  | "proof"
  | "watermark"
  | "enhance"
  | "grey"
  | "white"
  | "custom";

export const IDENTITY_LOCK =
  "Keep the exact same person with identical facial features, age, skin tone, hair, eyes, glasses, teeth, jewelry, clothing, pose, expression, and crop. Do not beautify, age-shift, restyle, or change identity. Keep natural skin texture. Photorealistic.";

export const RECIPES: {
  id: RecipeId;
  label: string;
  blurb: string;
  prompt: string;
}[] = [
  {
    id: "proof",
    label: "Proof clean",
    blurb: "Strip watermarks. Clean grey studio backdrop. Yearbook finish.",
    prompt: `Edit this photograph. TASK: Completely remove every watermark, logo, stamp, and repeating text overlay from the entire image including face, hair, clothing, and background. Replace the backdrop with a clean seamless professional photography studio grey paper — soft even medium-grey, no text, no logos, no patterns. Yearbook school-portrait finish, even studio lighting, sharp eyes. Preserve the original camera angle. ${IDENTITY_LOCK}`,
  },
  {
    id: "watermark",
    label: "Watermarks only",
    blurb: "Remove logos and text. Keep the original backdrop.",
    prompt: `Edit this photograph. TASK: Remove every watermark, logo, stamp, and repeating text overlay. Reconstruct covered areas so they match surrounding pixels and lighting. Keep the original background style, colors, and texture — do not replace the backdrop. ${IDENTITY_LOCK}`,
  },
  {
    id: "enhance",
    label: "HQ enhance",
    blurb: "Color, light, and sharpness. No structural changes.",
    prompt: `Edit this photograph. TASK: Improve sharpness, color accuracy, exposure, and lighting only. Do not add or remove objects, people, text, or watermarks. Do not replace or restyle the background. ${IDENTITY_LOCK}`,
  },
  {
    id: "grey",
    label: "Studio grey",
    blurb: "Seamless grey paper backdrop. Subject unchanged.",
    prompt: `Edit this photograph. TASK: Replace only the background with a clean seamless professional photography studio grey paper backdrop — soft even medium-grey, no text, no logos. Keep hair edges clean and natural. Do not change the subject. ${IDENTITY_LOCK}`,
  },
  {
    id: "white",
    label: "Studio white",
    blurb: "Seamless white paper backdrop. Subject unchanged.",
    prompt: `Edit this photograph. TASK: Replace only the background with a clean seamless professional photography studio white paper backdrop — even bright white paper, no text, no logos. Keep hair edges clean and natural. Do not change the subject. ${IDENTITY_LOCK}`,
  },
  {
    id: "custom",
    label: "Custom",
    blurb: "Your instructions, identity locked.",
    prompt: "",
  },
];

export function recipeById(id: RecipeId) {
  return RECIPES.find((r) => r.id === id) ?? RECIPES[0];
}

export function buildPrompt(recipe: RecipeId, custom: string) {
  if (recipe === "custom") {
    const extra = custom.trim();
    if (!extra) {
      throw new Error("Add instructions for Custom before finishing.");
    }
    return `Edit this photograph. TASK: ${extra} ${IDENTITY_LOCK}`;
  }
  const found = RECIPES.find((r) => r.id === recipe);
  if (!found?.prompt) {
    throw new Error("Unknown finish option.");
  }
  return found.prompt;
}
