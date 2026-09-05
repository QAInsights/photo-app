import {
  Check,
  Coffee,
  Download,
  Eraser,
  ImageIcon,
  LoaderCircle,
  Settings,
  SunMedium,
  Trash2,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CompareStage } from "@/components/compare-stage";
import { Mark } from "@/components/mark";
import { SettingsDialog } from "@/components/settings-dialog";
import { Button } from "@/components/ui/button";
import { finishPhoto, studioStatus } from "@/lib/finish";
import { dataUrlToPrint, downloadDataUrl, fileToLoadedPhoto, resizeDataUrl } from "@/lib/image-io";
import { loadBrowserApiKey } from "@/lib/key-store";
import { buildPrompt, recipeById, RECIPES, type RecipeId } from "@/lib/presets";
import { cn } from "@/lib/utils";

const XAI_PRIVACY_POLICY = "https://x.ai/legal/privacy-policy";
const DONATE_URL = "https://buymeacoffee.com/qainsights";
const SITE_LINKS = [
  { href: "https://qainsights.com", label: "qainsights.com" },
  { href: "https://ai.dosa.dev", label: "ai.dosa.dev" },
] as const;

type Status = "idle" | "working" | "done" | "error";

type Photo = {
  id: string;
  name: string;
  blobUrl: string;
  previewUrl: string;
  width: number;
  height: number;
  aspect: string;
  resultUrl?: string;
  status: Status;
  error?: string;
};

const RECIPE_ICON: Record<RecipeId, typeof Eraser> = {
  proof: Eraser,
  watermark: Eraser,
  enhance: SunMedium,
  grey: ImageIcon,
  white: ImageIcon,
  custom: ImageIcon,
};

export function StudioApp() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [recipe, setRecipe] = useState<RecipeId>("proof");
  const [custom, setCustom] = useState("");
  const [resolution, setResolution] = useState<"1k" | "2k">("2k");
  const [serverAi, setServerAi] = useState<boolean | null>(null);
  const [browserKey, setBrowserKey] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [peek, setPeek] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const working = photos.some((p) => p.status === "working");

  const selected = photos.find((p) => p.id === selectedId) ?? photos[0];

  useEffect(() => {
    let alive = true;
    Promise.all([
      studioStatus()
        .then((s) => s.available)
        .catch(() => false),
      loadBrowserApiKey().catch(() => null),
    ]).then(([available, key]) => {
      if (!alive) return;
      setServerAi(available);
      setBrowserKey(key);
    });
    return () => {
      alive = false;
    };
  }, []);

  const refreshBrowserKey = useCallback(async () => {
    const key = await loadBrowserApiKey().catch(() => null);
    setBrowserKey(key);
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space" && selected?.resultUrl && !isTyping(e)) {
        e.preventDefault();
        setPeek(true);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") setPeek(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [selected?.resultUrl]);

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (!list.length) return;
      const room = 12 - photos.length;
      if (room <= 0) {
        toast.error("Twelve photos at a time. Remove one to add more.");
        return;
      }
      const next: Photo[] = [];
      for (const file of list.slice(0, room)) {
        try {
          const loaded = await fileToLoadedPhoto(file);
          next.push({
            id: loaded.id,
            name: loaded.name,
            blobUrl: loaded.blobUrl,
            previewUrl: loaded.dataUrl,
            width: loaded.width,
            height: loaded.height,
            aspect: loaded.aspect,
            status: "idle",
          });
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Could not read file.");
        }
      }
      if (!next.length) return;
      setPhotos((prev) => [...prev, ...next]);
      setSelectedId((id) => id ?? next[0].id);
    },
    [photos.length],
  );

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.files;
      if (items && items.length) void addFiles(items);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [addFiles]);

  const aiReady = serverAi !== false || browserKey !== null;
  const recipeMeta = recipeById(recipe);
  const customReady = recipe !== "custom" || custom.trim().length > 0;
  const canFinish = Boolean(selected) && !working && aiReady && customReady;

  async function finishOne(photo: Photo) {
    if (!aiReady) {
      toast.error("Add an xAI key in Settings to finish photos.");
      setSettingsOpen(true);
      return;
    }
    const activeRecipe = recipe;
    const activeCustom = custom;
    const activeResolution = resolution;
    if (activeRecipe === "custom" && !activeCustom.trim()) {
      toast.error("Add instructions for Custom before finishing.");
      return;
    }
    setPhotos((prev) =>
      prev.map((p) => (p.id === photo.id ? { ...p, status: "working", error: undefined } : p)),
    );
    try {
      const maxEdge = activeResolution === "2k" ? 1536 : 1280;
      const payload = await resizeDataUrl(photo.previewUrl, maxEdge, 0.84);
      const out = await finishPhoto({
        data: {
          imageDataUrl: payload,
          prompt: buildPrompt(activeRecipe, activeCustom),
          aspectRatio: "auto",
          resolution: activeResolution,
          apiKey: browserKey ?? undefined,
        },
      });
      if (!out.ok) throw new Error(out.error);
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === photo.id ? { ...p, status: "done", resultUrl: out.imageDataUrl } : p,
        ),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Finish failed.";
      setPhotos((prev) =>
        prev.map((p) => (p.id === photo.id ? { ...p, status: "error", error: message } : p)),
      );
      toast.error(message);
    }
  }

  async function finishSelected() {
    if (!selected || working) return;
    await finishOne(selected);
  }

  async function finishAll() {
    if (working) return;
    for (const photo of photos) {
      if (photo.status === "done") continue;
      await finishOne(photo);
    }
  }

  async function downloadPhoto(photo: Photo, print: boolean) {
    const src = photo.resultUrl ?? photo.previewUrl;
    const file = print ? await dataUrlToPrint(src) : src;
    downloadDataUrl(file, `${photo.name}-${print ? "print" : "hq"}.jpg`);
  }

  function removePhoto(id: string) {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.blobUrl);
      const next = prev.filter((p) => p.id !== id);
      setSelectedId((cur) => {
        if (cur !== id) return cur;
        return next[0]?.id ?? null;
      });
      return next;
    });
  }

  return (
    <div className="paper-grain flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <Mark className="size-7 shrink-0 text-primary" />
          <div className="min-w-0 leading-tight">
            <p className="font-display text-lg font-semibold tracking-tight">Northlight</p>
            <SiteLinks className="mt-0.5" />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <a
            href={DONATE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="donate-btn inline-flex min-h-9 items-center gap-1.5 rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground sm:min-h-10 sm:px-4 sm:text-sm"
          >
            <Coffee className="size-4" />
            Donate
          </a>
          <Button
            variant="outline"
            size="icon"
            aria-label="Settings"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings />
          </Button>
        </div>
      </header>

      <div className="mx-auto flex min-h-0 w-full max-w-[1400px] flex-1 flex-col overflow-y-auto lg:grid lg:grid-cols-[88px_minmax(0,1fr)_340px] lg:overflow-hidden">
        <aside className="order-3 border-t border-border lg:order-none lg:min-h-0 lg:border-r lg:border-t-0">
          <Filmstrip
            photos={photos}
            selectedId={selected?.id ?? null}
            onSelect={setSelectedId}
            onRemove={removePhoto}
            onAdd={() => inputRef.current?.click()}
          />
        </aside>

        <main className="relative order-1 flex min-h-[52vh] flex-1 overflow-hidden lg:order-none lg:min-h-0">
          {selected ? (
            <CompareStage
              beforeSrc={selected.blobUrl}
              afterSrc={selected.resultUrl}
              peekOriginal={peek}
              alt={selected.name}
            />
          ) : (
            <DropEmpty
              dragOver={dragOver}
              onBrowse={() => inputRef.current?.click()}
              onDragOver={(on) => setDragOver(on)}
              onDrop={(files) => void addFiles(files)}
            />
          )}
          {selected?.status === "working" ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center">
              <div className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground shadow-print">
                <LoaderCircle className="size-4 animate-spin" />
                Finishing
              </div>
            </div>
          ) : null}
          {selected?.status === "error" ? (
            <p className="absolute inset-x-4 bottom-4 text-center text-sm text-destructive">
              {selected.error}
            </p>
          ) : null}
        </main>

        <aside className="order-2 flex flex-col border-t border-border lg:order-none lg:min-h-0 lg:border-l lg:border-t-0">
          <div className="space-y-5 p-4 sm:p-5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            <div>
              <p className="text-xs font-medium tracking-wide text-subtle uppercase">Finish</p>
              <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-1">
                {RECIPES.map((item) => {
                  const Icon = RECIPE_ICON[item.id];
                  const active = recipe === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setRecipe(item.id)}
                      className={cn(
                        "flex min-h-11 items-start gap-2.5 rounded-md border px-3 py-2.5 text-left transition-colors duration-[var(--motion-quick)]",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card hover:bg-secondary",
                      )}
                    >
                      <Icon className="mt-0.5 size-4 shrink-0" />
                      <span>
                        <span className="block text-sm font-medium">{item.label}</span>
                        <span
                          className={cn(
                            "mt-0.5 block text-xs leading-snug",
                            active ? "text-primary-foreground/75" : "text-muted-foreground",
                          )}
                        >
                          {item.blurb}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {recipe === "custom" ? (
              <label className="block">
                <span className="text-xs font-medium tracking-wide text-subtle uppercase">
                  Instructions
                </span>
                <textarea
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  rows={4}
                  maxLength={800}
                  placeholder="Describe the cleanup. Identity stays locked."
                  className="mt-2 w-full resize-none rounded-md border border-border bg-card-ink px-3 py-2.5 text-sm leading-relaxed outline-none ring-ring focus:ring-2"
                />
              </label>
            ) : null}
          </div>

          <div className="shrink-0 space-y-3 border-t border-border bg-background p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium tracking-wide text-subtle uppercase">Output</p>
              <div className="flex rounded-full border border-border bg-card p-0.5">
                {(["1k", "2k"] as const).map((res) => (
                  <button
                    key={res}
                    type="button"
                    onClick={() => setResolution(res)}
                    className={cn(
                      "min-h-8 rounded-full px-3 text-xs font-medium",
                      resolution === res
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {res === "1k" ? "Fast 1K" : "Print 2K"}
                  </button>
                ))}
              </div>
            </div>
            <Button
              size="lg"
              className="w-full max-lg:hidden"
              disabled={!canFinish}
              onClick={() => void finishSelected()}
            >
              {working ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              Finish · {recipeMeta.label}
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                disabled={!canFinish || photos.length < 2}
                onClick={() => void finishAll()}
              >
                Finish all
              </Button>
              <Button
                variant="outline"
                disabled={!selected}
                onClick={() => selected && void downloadPhoto(selected, true)}
              >
                <Download className="size-4" />
                Print JPG
              </Button>
            </div>
            {selected?.resultUrl ? (
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => selected && void downloadPhoto(selected, false)}
              >
                Download HQ
              </Button>
            ) : null}
            <p className="text-xs leading-relaxed text-muted-foreground">
              This app does not keep your photos. Images you finish are processed per{" "}
              <XaiPolicyLink />. Hold Space to peek the original.
            </p>
          </div>
        </aside>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        multiple
        className="sr-only"
        onChange={(e) => {
          if (e.target.files) void addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <div className="sticky bottom-0 z-20 border-t border-border bg-background/95 p-3 lg:hidden">
        <Button
          size="lg"
          className="w-full"
          disabled={!canFinish}
          onClick={() => void finishSelected()}
        >
          {working ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Check className="size-4" />
          )}
          Finish · {recipeMeta.label}
        </Button>
      </div>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        hasKey={browserKey !== null}
        onKeyChanged={() => void refreshBrowserKey()}
      />
    </div>
  );
}

function isTyping(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null;
  return Boolean(t && (t.tagName === "TEXTAREA" || t.tagName === "INPUT" || t.isContentEditable));
}

function Filmstrip({
  photos,
  selectedId,
  onSelect,
  onRemove,
  onAdd,
}: {
  photos: Photo[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto p-3 lg:h-full lg:flex-col lg:overflow-y-auto">
      <button
        type="button"
        onClick={onAdd}
        className="flex size-16 shrink-0 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border bg-card text-muted-foreground hover:bg-secondary lg:w-full"
        aria-label="Add photos"
      >
        <Upload className="size-4" />
        <span className="text-xs font-medium tracking-wide">Add</span>
      </button>
      {photos.map((photo) => (
        <div key={photo.id} className="relative shrink-0">
          <button
            type="button"
            onClick={() => onSelect(photo.id)}
            className={cn(
              "block size-16 overflow-hidden rounded-md border lg:h-20 lg:w-full",
              selectedId === photo.id ? "border-primary ring-2 ring-ring/40" : "border-border",
            )}
          >
            <img
              src={photo.resultUrl ?? photo.blobUrl}
              alt={photo.name}
              className="size-full object-cover"
            />
          </button>
          {photo.status === "working" ? (
            <span className="absolute inset-0 grid place-items-center rounded-md bg-primary/40">
              <LoaderCircle className="size-4 animate-spin text-primary-foreground" />
            </span>
          ) : null}
          {photo.status === "done" ? (
            <span className="absolute top-1 left-1 grid size-4 place-items-center rounded-full bg-ok text-primary-foreground">
              <Check className="size-2.5" />
            </span>
          ) : null}
          <button
            type="button"
            aria-label={`Remove ${photo.name}`}
            onClick={() => onRemove(photo.id)}
            className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground"
          >
            <Trash2 className="size-3" />
          </button>
        </div>
      ))}
    </div>
  );
}

function SiteLinks({ className }: { className?: string }) {
  return (
    <p className={cn("flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground", className)}>
      {SITE_LINKS.map((site, i) => (
        <span key={site.href} className="inline-flex items-center gap-x-1.5">
          {i > 0 ? <span aria-hidden="true">·</span> : null}
          <a
            href={site.href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-2 hover:text-foreground hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {site.label}
          </a>
        </span>
      ))}
    </p>
  );
}

function XaiPolicyLink() {
  return (
    <a
      href={XAI_PRIVACY_POLICY}
      target="_blank"
      rel="noopener noreferrer"
      className="underline underline-offset-2 hover:text-foreground"
      onClick={(e) => e.stopPropagation()}
    >
      xAI&rsquo;s privacy policy
    </a>
  );
}

function DropEmpty({
  dragOver,
  onBrowse,
  onDragOver,
  onDrop,
}: {
  dragOver: boolean;
  onBrowse: () => void;
  onDragOver: (on: boolean) => void;
  onDrop: (files: FileList) => void;
}) {
  return (
    <div
      className="flex size-full min-h-[52vh] items-stretch p-3 sm:p-4 lg:p-5"
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(true);
      }}
      onDragLeave={() => onDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        onDragOver(false);
        if (e.dataTransfer.files.length) onDrop(e.dataTransfer.files);
      }}
    >
      <div
        className={cn(
          "stagger-in flex h-full min-h-[44vh] w-full flex-col items-center justify-center rounded-xl border border-dashed text-center transition-colors duration-[var(--motion-fast)] lg:min-h-0",
          dragOver ? "border-primary bg-secondary" : "border-border bg-card",
        )}
      >
        <div className="flex w-full flex-1 flex-col items-center justify-center">
          <button
            type="button"
            onClick={onBrowse}
            className="flex w-full flex-col items-center justify-center gap-4 px-6 py-12 hover:bg-secondary/40 lg:py-16"
          >
            <Mark className="size-12 text-primary" />
            <div className="max-w-md">
              <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Drop proofs here
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Yearbook scans, watermarked previews, everyday portraits. Finish with Studio AI.
              </p>
            </div>
            <span className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
              Choose photos
            </span>
          </button>
          <SiteLinks className="px-6 pb-4 justify-center text-sm font-semibold text-foreground" />
        </div>
        <p className="max-w-md px-6 pb-6 text-xs leading-relaxed text-muted-foreground sm:text-sm">
          Images you finish are processed per <XaiPolicyLink />.
        </p>
      </div>
    </div>
  );
}
