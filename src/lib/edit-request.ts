export type EditInput = {
  imageDataUrl: string;
  lookImageDataUrl?: string;
  backdropImageDataUrl?: string;
  prompt: string;
  aspectRatio: string;
  resolution: "1k" | "2k";
};

type ImageRef = { url: string; type: "image_url" };

export function buildEditBody(model: string, data: EditInput) {
  const extras: ImageRef[] = [];
  if (data.lookImageDataUrl) {
    extras.push({ url: data.lookImageDataUrl, type: "image_url" });
  }
  if (data.backdropImageDataUrl) {
    extras.push({ url: data.backdropImageDataUrl, type: "image_url" });
  }

  const imageField =
    extras.length === 0
      ? { image: { url: data.imageDataUrl, type: "image_url" as const } }
      : {
          images: [{ type: "image_url" as const, url: data.imageDataUrl }, ...extras],
        };

  return {
    model,
    prompt: data.prompt,
    ...imageField,
    aspect_ratio: data.aspectRatio || "auto",
    resolution: data.resolution,
    quality: "medium" as const,
    n: 1,
    response_format: "b64_json" as const,
  };
}
