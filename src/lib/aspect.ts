export const ASPECTS = [
  "1:1",
  "16:9",
  "9:16",
  "4:3",
  "3:4",
  "3:2",
  "2:3",
  "2:1",
  "1:2",
] as const;

export type AspectRatio = (typeof ASPECTS)[number];

export function nearestAspect(width: number, height: number): AspectRatio {
  const ratio = width / Math.max(height, 1);
  let best: AspectRatio = "1:1";
  let bestDiff = Infinity;
  for (const aspect of ASPECTS) {
    const [aw, ah] = aspect.split(":").map(Number);
    const diff = Math.abs(ratio - aw / ah);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = aspect;
    }
  }
  return best;
}
