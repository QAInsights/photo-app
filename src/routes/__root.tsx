import { ClerkProvider } from "@clerk/tanstack-react-start";
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { SAMPLE_LCP_PRELOAD } from "@/lib/sample";
import { jsonLd, SITE_DESCRIPTION, SITE_NAME, SITE_THEME, SITE_TITLE, SITE_URL } from "@/lib/site";
import { Toaster } from "sonner";
import appCss from "../styles.css?url";

const ogImage = `${SITE_URL}/og.png`;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1.0" },
      { title: SITE_TITLE },
      { "script:ld+json": jsonLd },
      { name: "description", content: SITE_DESCRIPTION },
      {
        name: "keywords",
        content:
          "yearbook photo editor, remove watermark from portrait, studio backdrop, passport photo, LinkedIn headshot, AI photo studio",
      },
      { name: "author", content: "dosa.dev" },
      { name: "theme-color", content: SITE_THEME },
      { name: "color-scheme", content: "light" },
      { name: "robots", content: "index, follow" },
      { name: "googlebot", content: "index, follow" },
      { name: "application-name", content: SITE_NAME },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: SITE_NAME },
      { name: "mobile-web-app-capable", content: "yes" },
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
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icon-192.png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "sitemap", type: "application/xml", href: "/sitemap.xml" },
      { rel: "alternate", type: "text/markdown", href: "/about.md", title: "Markdown" },
      { rel: "alternate", type: "text/plain", href: "/llms.txt", title: "llms.txt" },
      { rel: "stylesheet", href: appCss },
      {
        rel: "preload",
        href: "/fonts/outfit-latin.woff2",
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
      {
        rel: "preload",
        href: "/fonts/fraunces-latin.woff2",
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
      {
        rel: "preload",
        href: SAMPLE_LCP_PRELOAD,
        as: "image",
        type: "image/avif",
        fetchPriority: "high",
      },
    ],
  }),
  component: () => (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="min-h-dvh bg-background text-foreground">
        <ClerkProvider>
          <noscript>
            Northlight is an AI portrait studio at photo.dosa.dev. Enable JavaScript to finish
            photos. Product facts: /about.md and /llms.txt.
          </noscript>
          <PreviewHostBridge />
          <Outlet />
          <Toaster
            position="bottom-center"
            toastOptions={{
              className: "font-sans border-border bg-card text-foreground shadow-print",
            }}
          />
          <Scripts />
        </ClerkProvider>
      </body>
    </html>
  ),
});
