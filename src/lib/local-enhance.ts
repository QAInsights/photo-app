function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not enhance that image."));
    img.src = src;
  });
}

function clamp(n: number) {
  return n < 0 ? 0 : n > 255 ? 255 : n;
}

/** Percentile contrast stretch + mild vibrance + unsharp. Entirely on-device. */
export async function enhanceLocally(dataUrl: string): Promise<string> {
  const img = await loadImage(dataUrl);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas is unavailable in this browser.");
  ctx.drawImage(img, 0, 0);
  const image = ctx.getImageData(0, 0, w, h);
  const d = image.data;
  const luma: number[] = [];
  for (let i = 0; i < d.length; i += 16) {
    luma.push(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]);
  }
  luma.sort((a, b) => a - b);
  const low = luma[Math.floor(luma.length * 0.01)] ?? 0;
  const high = luma[Math.floor(luma.length * 0.99)] ?? 255;
  const span = Math.max(8, high - low);
  const scale = 255 / span;

  for (let i = 0; i < d.length; i += 4) {
    let r = (d[i] - low) * scale;
    let g = (d[i + 1] - low) * scale;
    let b = (d[i + 2] - low) * scale;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    const boost = (1 - sat) * 0.18;
    const avg = (r + g + b) / 3;
    r += (r - avg) * boost;
    g += (g - avg) * boost;
    b += (b - avg) * boost;
    d[i] = clamp(r * 1.02);
    d[i + 1] = clamp(g * 1.015);
    d[i + 2] = clamp(b * 0.995);
  }

  const sharp = ctx.createImageData(w, h);
  const s = sharp.data;
  const copy = new Uint8ClampedArray(d);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        const cIdx = i + c;
        const val =
          5 * copy[cIdx] -
          copy[cIdx - 4] -
          copy[cIdx + 4] -
          copy[cIdx - w * 4] -
          copy[cIdx + w * 4];
        s[cIdx] = clamp(copy[cIdx] * 0.55 + val * 0.45);
      }
      s[i + 3] = 255;
    }
  }
  for (let x = 0; x < w; x++) {
    const top = x * 4;
    const bot = ((h - 1) * w + x) * 4;
    s[top] = d[top];
    s[top + 1] = d[top + 1];
    s[top + 2] = d[top + 2];
    s[top + 3] = 255;
    s[bot] = d[bot];
    s[bot + 1] = d[bot + 1];
    s[bot + 2] = d[bot + 2];
    s[bot + 3] = 255;
  }
  for (let y = 0; y < h; y++) {
    const left = y * w * 4;
    const right = (y * w + w - 1) * 4;
    s[left] = d[left];
    s[left + 1] = d[left + 1];
    s[left + 2] = d[left + 2];
    s[left + 3] = 255;
    s[right] = d[right];
    s[right + 1] = d[right + 1];
    s[right + 2] = d[right + 2];
    s[right + 3] = 255;
  }

  ctx.putImageData(sharp, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.94);
}
