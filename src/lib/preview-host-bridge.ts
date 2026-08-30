import { resolveParentEmbedderOrigin } from "@/lib/preview-embedder-origin";

export type PreviewHostBridgeOptions = {
  navigate: (path: string) => void;
  getRoutePaths: () => string[];
};

const NAVIGATE = "grok-preview:navigate";
const ROUTES = "grok-preview:routes";

type RouteTreeNode = {
  path?: unknown;
  children?: Record<string, RouteTreeNode> | RouteTreeNode[] | null;
};

function joinPath(prefix: string, segment: string): string {
  const left = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix;
  const right = segment.startsWith("/") ? segment : `/${segment}`;
  const joined = `${left}${right}`.replace(/\/{2,}/g, "/");
  return joined === "" ? "/" : joined;
}

/** Absolute paths of every route in a TanStack Router route tree. */
export function collectRoutePathsFromTree(tree: unknown): string[] {
  const paths = new Set<string>();

  const walk = (node: RouteTreeNode | null | undefined, prefix: string): void => {
    if (!node || typeof node !== "object") return;
    let absolute = prefix;
    if (typeof node.path === "string" && node.path.length > 0) {
      absolute = joinPath(prefix, node.path);
      paths.add(absolute);
    }
    const { children } = node;
    if (Array.isArray(children)) {
      for (const child of children) walk(child, absolute);
    } else if (children && typeof children === "object") {
      for (const child of Object.values(children)) walk(child, absolute);
    }
  };

  walk(tree as RouteTreeNode, "");
  return [...paths].sort();
}

function matchesRoute(path: string, patterns: string[]): boolean {
  if (patterns.length === 0) return true;
  const wanted = path.split("/");
  return patterns.some((pattern) => {
    const offered = pattern.split("/");
    if (offered.length !== wanted.length) return false;
    return offered.every((segment, index) => segment.startsWith("$") || segment === wanted[index]);
  });
}

/**
 * Wire the app to the preview host that embeds it: accept navigation
 * requests for known routes and advertise the route list. No-op outside an
 * approved embedder (standalone browsing), where there is no host to bridge.
 * Returns a cleanup that removes the listener.
 */
export function installPreviewHostBridge(options: PreviewHostBridgeOptions): () => void {
  if (typeof window === "undefined" || window.self === window.top) {
    return () => {};
  }
  // Always embedded here — top-level windows returned early above.
  const parentOrigin = resolveParentEmbedderOrigin(
    false,
    document.referrer,
    window.location.ancestorOrigins?.[0] ?? null,
    window.location.hostname,
  );
  if (!parentOrigin) return () => {};

  const postRoutes = () => {
    window.parent.postMessage({ type: ROUTES, paths: options.getRoutePaths() }, parentOrigin);
  };

  const onMessage = (event: MessageEvent) => {
    if (event.origin !== parentOrigin || event.source !== window.parent) return;
    const data: unknown = event.data;
    if (!data || typeof data !== "object") return;
    const message = data as { type?: unknown; path?: unknown };
    if (message.type !== NAVIGATE) return;
    if (
      typeof message.path !== "string" ||
      !message.path.startsWith("/") ||
      message.path.includes("..")
    ) {
      return;
    }
    if (!matchesRoute(message.path, options.getRoutePaths())) return;
    options.navigate(message.path);
  };

  window.addEventListener("message", onMessage);
  postRoutes();
  return () => window.removeEventListener("message", onMessage);
}
