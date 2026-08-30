import type { ReactNode } from "react";

/**
 * Sign-in is off for this app (`.grok/app-env.json` keeps `VITE_AUTH_ENABLED`
 * `"false"` and `deploy.database` off), so the provider is a passthrough —
 * it keeps `__root.tsx` wired the way the app-builder template expects, and
 * an app that turns auth on replaces it with the real session provider.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
