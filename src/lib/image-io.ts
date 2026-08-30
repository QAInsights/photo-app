import { nearestAspect, type AspectRatio } from "./aspect";

export type LoadedPhoto = {
  id: string;
  name: string;
  blobUrl: string;
  dataUrl: string;
  width: number;
  height: number;
  aspect: AspectRatio;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read that image."));
    img.src = src;
  });
}

export async function fileToLoadedPhoto(file: File): Promise<LoadedPhoto> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
    throw new Error("Use a JPEG, PNG, or WebP photo.");
  }
  const blobUrl = URL.createObjectURL(file);
  const img = await loadImage(blobUrl);
  const width = img.naturalWidth;
  const height = img.naturalHeight;
  const dataUrl = drawToJpeg(img, Math.max(width, height), 0.92);
  return {
    id: crypto.randomUUID(),
    name: file.name.replace(/\.[^.]+$/, "") || "photo",
    blobUrl,
    dataUrl,
    width,
    height,
    aspect: nearestAspect(width, height),
  };
}

export function drawToJpeg(
  img: CanvasImageSource,
  maxEdge: number,
  quality: number,
  srcW?: number,
  srcH?: number,
): string {
  const width =
    srcW ??
    (img instanceof HTMLImageElement
      ? img.naturalWidth
      : img instanceof HTMLCanvasElement
        ? img.width
        : 1);
  const height =
    srcH ??
    (img instanceof HTMLImageElement
      ? img.naturalHeight
      : img instanceof HTMLCanvasElement
        ? img.height
        : 1);
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable in this browser.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

export async function resizeDataUrl(
  dataUrl: string,
  maxEdge: number,
  quality: number,
): Promise<string> {
  const img = await loadImage(dataUrl);
  return drawToJpeg(img, maxEdge, quality);
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export async function dataUrlToPrint(dataUrl: string): Promise<string> {
  const img = await loadImage(dataUrl);
  const w = img.naturalWidth * 2;
  const h = img.naturalHeight * 2;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable in this browser.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.95);
}
