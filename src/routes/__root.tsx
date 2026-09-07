import { ClerkProvider } from "@clerk/tanstack-react-start";
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { SITE_NAME, SITE_THEME } from "@/lib/site";
import { Toaster } from "sonner";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1.0" },
      { name: "theme-color", content: SITE_THEME },
      { name: "color-scheme", content: "light" },
      { name: "application-name", content: SITE_NAME },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: SITE_NAME },
      { name: "mobile-web-app-capable", content: "yes" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icon-192.png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
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
