import { createFileRoute } from "@tanstack/react-router";
import { StudioApp } from "@/components/studio-app";
import { SAMPLE_LCP_PRELOAD } from "@/lib/sample";
import { jsonLd, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from "@/lib/site";

const ogImage = `${SITE_URL}/og.png`;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: SITE_TITLE },
      { "script:ld+json": jsonLd },
      { name: "description", content: SITE_DESCRIPTION },
      {
        name: "keywords",
        content:
          "yearbook photo editor, remove watermark from portrait, studio backdrop, passport photo, LinkedIn headshot, AI photo studio",
      },
      { name: "author", content: "dosa.dev" },
      { name: "robots", content: "index, follow" },
      { name: "googlebot", content: "index, follow" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:title", content: SITE_TITLE },
      { property: "og:description", content: SITE_DESCRIPTION },
      { property: "og:url", content: SITE_URL },
      { property: "og:image", content: ogImage },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "Northlight AI portrait studio" },
      { property: "og:locale", content: "en_US" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: SITE_TITLE },
      { name: "twitter:description", content: SITE_DESCRIPTION },
      { name: "twitter:image", content: ogImage },
    ],
    links: [
      { rel: "canonical", href: SITE_URL },
      { rel: "sitemap", type: "application/xml", href: "/sitemap.xml" },
      { rel: "alternate", type: "text/markdown", href: "/about.md", title: "Markdown" },
      { rel: "alternate", type: "text/plain", href: "/llms.txt", title: "llms.txt" },
      {
        rel: "preload",
        href: SAMPLE_LCP_PRELOAD,
        as: "image",
        type: "image/avif",
        fetchPriority: "high",
      },
    ],
  }),
  component: Home,
});

function Home() {
  return <StudioApp />;
}
