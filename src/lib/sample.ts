import type { AspectRatio } from "./aspect";

export type SampleSource = { type: string; srcSet: string };

export const SAMPLE_ID = "sample-proof";
export const SAMPLE_NAME = "Sample proof";
export const SAMPLE_BEFORE = "/sample/proof.jpg";
export const SAMPLE_AFTER = "/sample/finished.jpg";
export const SAMPLE_WIDTH = 864;
export const SAMPLE_HEIGHT = 1152;
export const SAMPLE_ASPECT: AspectRatio = "3:4";
export const SAMPLE_DISCLAIMER = "Sample · Proof clean. Actual results may vary.";
export const SAMPLE_SIZES = "(max-width: 640px) 85vw, 28rem";
export const SAMPLE_BEFORE_SOURCES: SampleSource[] = [
  {
    type: "image/avif",
    srcSet: "/sample/proof-480.avif 480w, /sample/proof-864.avif 864w",
  },
  {
    type: "image/webp",
    srcSet: "/sample/proof-480.webp 480w, /sample/proof-864.webp 864w",
  },
];
export const SAMPLE_AFTER_SOURCES: SampleSource[] = [
  {
    type: "image/avif",
    srcSet: "/sample/finished-480.avif 480w, /sample/finished-864.avif 864w",
  },
  {
    type: "image/webp",
    srcSet: "/sample/finished-480.webp 480w, /sample/finished-864.webp 864w",
  },
];
export const SAMPLE_LCP_PRELOAD = "/sample/finished-864.avif";
