export const SITE_URL = "https://photo.dosa.dev";
export const SITE_NAME = "Northlight";
export const SITE_SHORT_NAME = "Northlight";
export const SITE_TITLE = "Northlight: AI portrait studio";
export const SITE_TAGLINE = "Finish portraits with Studio AI.";
export const SITE_DESCRIPTION =
  "Finish portraits in the browser. Strip watermarks, clean studio backdrops, and export print-ready HQ or 2× JPG. Identity stays locked. Photos are not stored.";
export const SITE_THEME = "#24302c";
export const SITE_BACKGROUND = "#efeae3";

export const FAQ = [
  {
    question: "What is Northlight?",
    answer:
      "Northlight is a portrait finishing studio at photo.dosa.dev. Drop JPEG, PNG, or WebP photos, pick a finish, and Studio AI returns a print-ready image. It is built for yearbook proofs, watermarked previews, ID photos, and LinkedIn headshots.",
  },
  {
    question: "Does Northlight store my photos?",
    answer:
      "No. The app does not persist photos. Images you finish are sent to xAI Imagine for that request only, under xAI's privacy policy. A browser-supplied API key stays encrypted in this browser and is never stored on the server.",
  },
  {
    question: "What finishes can I apply?",
    answer:
      "Proof clean (watermarks off, grey yearbook backdrop), watermarks only, HQ enhance, cleanup (glare, flyaways, lint, wrinkles), studio grey or white paper, passport-style ID (3:4), LinkedIn square headshot, or custom instructions. Optional crop, black-and-white tone, gentle retouch, a pinned look photo, and a droppable studio-paper backdrop.",
  },
  {
    question: "Will it change the person's face?",
    answer:
      "No. Every finish includes an identity lock: same person, features, age, skin, hair, clothing, pose, and expression. It does not beautify, age-shift, or restyle identity. Gentle retouch only reduces shine and minor blemishes.",
  },
  {
    question: "Do I need an API key?",
    answer:
      "Studio AI calls xAI images/edits with grok-imagine-image-2.0. If the host has no XAI_API_KEY, open Settings and paste your own. The browser key is stored AES-256-GCM in this browser only and takes precedence over the server key.",
  },
] as const;

export const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      inLanguage: "en",
      publisher: { "@id": `${SITE_URL}/#org` },
    },
    {
      "@type": "WebApplication",
      "@id": `${SITE_URL}/#app`,
      url: SITE_URL,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Web",
      browserRequirements: "Requires a modern browser with canvas support.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      featureList: [
        "Watermark removal",
        "Yearbook proof cleanup",
        "Studio grey and white backdrops",
        "Passport-style ID photos",
        "LinkedIn headshots",
        "Identity-locked edits",
        "Print-ready JPG export",
      ],
      screenshot: `${SITE_URL}/og.png`,
      image: `${SITE_URL}/og.png`,
      publisher: { "@id": `${SITE_URL}/#org` },
    },
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#org`,
      name: "dosa.dev",
      url: "https://dosa.dev",
      sameAs: ["https://qainsights.com", "https://ai.dosa.dev"],
    },
    {
      "@type": "HowTo",
      "@id": `${SITE_URL}/#howto`,
      name: "Finish a portrait in Northlight",
      description: "Turn a watermarked proof or everyday portrait into a print-ready studio photo.",
      totalTime: "PT2M",
      tool: { "@type": "HowToTool", name: "Northlight" },
      step: [
        {
          "@type": "HowToStep",
          position: 1,
          name: "Add photos",
          text: "Drop, paste, or choose up to 12 JPEG, PNG, or WebP portraits.",
        },
        {
          "@type": "HowToStep",
          position: 2,
          name: "Pick a finish",
          text: "Choose proof clean, watermarks only, HQ enhance, cleanup, studio grey or white, ID photo, LinkedIn, or custom instructions.",
        },
        {
          "@type": "HowToStep",
          position: 3,
          name: "Adjust output",
          text: "Optionally lock crop, switch to black-and-white, turn on gentle retouch, pin a look, or drop studio paper as the backdrop.",
        },
        {
          "@type": "HowToStep",
          position: 4,
          name: "Finish and export",
          text: "Press Finish photo, compare with the slider, hold Space to peek the original, then download HQ or Print JPG at 2×.",
        },
      ],
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE_URL}/#faq`,
      mainEntity: FAQ.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    },
  ],
};

export const jsonLdScript = JSON.stringify(jsonLd);
