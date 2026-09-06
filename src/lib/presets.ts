export type RecipeId =
  | "proof"
  | "watermark"
  | "enhance"
  | "cleanup"
  | "grey"
  | "white"
  | "id"
  | "linkedin"
  | "custom";

export type CropId = "auto" | "1:1" | "3:4" | "2:3";
export type ToneId = "color" | "bw";

export type FinishOptions = {
  tone: ToneId;
  retouch: boolean;
  crop: CropId;
  hasLook: boolean;
  hasBackdrop: boolean;
};

export const CROPS: { id: CropId; label: string }[] = [
  { id: "auto", label: "Auto" },
  { id: "1:1", label: "1:1" },
  { id: "3:4", label: "3:4" },
  { id: "2:3", label: "2:3" },
];

export const DEFAULT_FINISH_OPTIONS: FinishOptions = {
  tone: "color",
  retouch: false,
  crop: "auto",
  hasLook: false,
  hasBackdrop: false,
};

export const IDENTITY_LOCK =
  "Keep the exact same person with identical facial features, age, skin tone, hair, eyes, glasses, teeth, jewelry, clothing, pose, and expression. Do not beautify, age-shift, restyle, or change identity. Keep natural skin texture. Photorealistic.";

export const PROMPT_MAX = 2000;
export const CUSTOM_MAX = 700;

export const LOOK_CLAUSE =
  "LOOK: Image 2 is the lighting and grade reference. Match its lighting, color grade, and contrast. Do not copy that person's face, hair, body, clothing, or identity. Match the backdrop treatment only if this task replaces the background.";

export const BACKDROP_CLAUSE =
  "BACKDROP: The last extra image is the studio paper. Replace only the background with that seamless paper — match color, texture, and falloff. Keep hair edges clean. Use this paper even if the task said to keep the original background. Do not change the subject.";

export const RETOUCH_CLAUSE =
  "RETOUCH: Gently reduce shine and minor blemishes only. Do not reshape the face, slim, change makeup, or airbrush pores away. Keep moles, freckles, and natural skin texture.";

export const BW_CLAUSE =
  "TONE: Convert the finished photograph to classic black-and-white yearbook toning — rich blacks, clean greys, no color cast, no sepia.";

export const FRAMING_AUTO = "Preserve the original camera angle and crop.";

const KEEP_BACKGROUND_PHRASES = [
  " Keep the original background style, colors, and texture — do not replace the backdrop.",
  " Do not replace or restyle the background.",
] as const;

export function framingClause(crop: CropId) {
  if (crop === "auto") return FRAMING_AUTO;
  return `Reframe to ${crop} without changing pose. Keep the subject fully in frame.`;
}

export const RECIPE_DEFAULT_CROP: Partial<Record<RecipeId, CropId>> = {
  id: "3:4",
  linkedin: "1:1",
};

export function nextCropForRecipe(next: RecipeId, current: RecipeId, crop: CropId): CropId {
  if (next === current) return crop;
  return RECIPE_DEFAULT_CROP[next] ?? crop;
}

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
    prompt:
      "Completely remove every watermark, logo, stamp, and repeating text overlay from the entire image including face, hair, clothing, and background. Replace the backdrop with a clean seamless professional photography studio grey paper — soft even medium-grey, no text, no logos, no patterns. Yearbook school-portrait finish, even studio lighting, sharp eyes.",
  },
  {
    id: "watermark",
    label: "Watermarks only",
    blurb: "Remove logos and text. Keep the original backdrop.",
    prompt:
      "Remove every watermark, logo, stamp, and repeating text overlay. Reconstruct covered areas so they match surrounding pixels and lighting. Keep the original background style, colors, and texture — do not replace the backdrop.",
  },
  {
    id: "enhance",
    label: "HQ enhance",
    blurb: "Color, light, and sharpness. No structural changes.",
    prompt:
      "Improve sharpness, color accuracy, exposure, and lighting only. Do not add or remove objects, people, text, or watermarks. Do not replace or restyle the background.",
  },
  {
    id: "cleanup",
    label: "Cleanup",
    blurb: "Glare, flyaways, lint, wrinkles. Subject unchanged.",
    prompt:
      "Remove glasses glare and reflections, stray flyaway hairs (keep the hairstyle), lint and dust on clothing, and small fabric wrinkles on collar and shoulders. Reconstruct those areas so they match surrounding pixels and lighting. Do not add or remove objects, people, text, or watermarks. Do not replace or restyle the background. Do not change clothing color or jewelry.",
  },
  {
    id: "grey",
    label: "Studio grey",
    blurb: "Seamless grey paper backdrop. Subject unchanged.",
    prompt:
      "Replace only the background with a clean seamless professional photography studio grey paper backdrop — soft even medium-grey, no text, no logos. Keep hair edges clean and natural. Do not change the subject.",
  },
  {
    id: "white",
    label: "Studio white",
    blurb: "Seamless white paper backdrop. Subject unchanged.",
    prompt:
      "Replace only the background with a clean seamless professional photography studio white paper backdrop — even bright white paper, no text, no logos. Keep hair edges clean and natural. Do not change the subject.",
  },
  {
    id: "id",
    label: "ID photo",
    blurb: "Passport-style. White backdrop. 3:4 crop.",
    prompt:
      "Produce a passport-style ID portrait. Replace the backdrop with even bright white seamless studio paper — no shadows, no text, no logos. Even front lighting, sharp eyes. Head-and-shoulders framing. Remove watermarks, logos, and overlay text. Do not change clothing.",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    blurb: "Profile headshot. Studio light. Square crop.",
    prompt:
      "Produce a professional profile headshot. Replace the backdrop with a clean seamless professional photography studio grey paper — soft even medium-grey, no text, no logos. Soft studio lighting with natural catchlights, sharp eyes. Remove watermarks, logos, and overlay text. Do not change clothing.",
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

export function buildPrompt(
  recipe: RecipeId,
  custom: string,
  options: FinishOptions = DEFAULT_FINISH_OPTIONS,
) {
  let task: string;
  if (recipe === "custom") {
    const extra = custom.trim();
    if (!extra) {
      throw new Error("Add instructions for Custom before finishing.");
    }
    task = extra;
  } else {
    const found = RECIPES.find((r) => r.id === recipe);
    if (!found?.prompt) {
      throw new Error("Unknown finish option.");
    }
    task = found.prompt;
  }

  if (options.hasBackdrop && recipe !== "custom") {
    for (const phrase of KEEP_BACKGROUND_PHRASES) {
      task = task.replaceAll(phrase, "");
    }
  }

  const parts = [`Edit this photograph. TASK: ${task}`];
  if (options.hasLook) parts.push(LOOK_CLAUSE);
  if (options.hasBackdrop) parts.push(BACKDROP_CLAUSE);
  parts.push(framingClause(options.crop));
  parts.push(IDENTITY_LOCK);
  if (options.retouch) parts.push(RETOUCH_CLAUSE);
  if (options.tone === "bw") parts.push(BW_CLAUSE);
  return parts.join(" ");
}
