import {
  Check,
  Download,
  Eraser,
  ImageIcon,
  LoaderCircle,
  Settings,
  SunMedium,
  Trash2,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { CompareStage } from "@/components/compare-stage";
import { Mark } from "@/components/mark";
import { SettingsDialog } from "@/components/settings-dialog";
import { Button } from "@/components/ui/button";
import { finishPhoto, studioStatus } from "@/lib/finish";
import { dataUrlToPrint, downloadDataUrl, fileToLoadedPhoto, resizeDataUrl } from "@/lib/image-io";
import { loadBrowserApiKey } from "@/lib/key-store";
import { enhanceLocally } from "@/lib/local-enhance";
import { buildPrompt, RECIPES, type Engine, type RecipeId } from "@/lib/presets";
import { cn } from "@/lib/utils";

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
  const [engine, setEngine] = useState<Engine>("ai");
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
      if (!available && !key) setEngine("local");
    });
    return () => {
      alive = false;
    };
  }, []);

  const refreshBrowserKey = useCallback(async () => {
    const key = await loadBrowserApiKey().catch(() => null);
    setBrowserKey(key);
    if (key) setEngine("ai");
    else if (serverAi === false) setEngine("local");
  }, [serverAi]);

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

  const recipeMeta = useMemo(() => RECIPES.find((r) => r.id === recipe) ?? RECIPES[0], [recipe]);

  async function finishOne(photo: Photo) {
    setPhotos((prev) =>
      prev.map((p) => (p.id === photo.id ? { ...p, status: "working", error: undefined } : p)),
    );
    try {
      let resultUrl: string;
      if (engine === "local" || !recipeMeta.needsAi) {
        resultUrl = await enhanceLocally(photo.previewUrl);
        if (engine === "local" && recipeMeta.needsAi) {
          toast.message("On-device enhance applied. Watermark removal needs Studio AI.");
        }
      } else {
        const maxEdge = resolution === "2k" ? 1536 : 1280;
        const payload = await resizeDataUrl(photo.previewUrl, maxEdge, 0.84);
        const out = await finishPhoto({
          data: {
            imageDataUrl: payload,
            prompt: buildPrompt(recipe, custom),
            aspectRatio: photo.aspect,
            resolution,
            apiKey: browserKey ?? undefined,
          },
        });
        if (!out.ok) throw new Error(out.error);
        resultUrl = await enhanceLocally(out.imageDataUrl);
      }
      setPhotos((prev) =>
        prev.map((p) => (p.id === photo.id ? { ...p, status: "done", resultUrl } : p)),
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
        <div className="flex items-center gap-2.5">
          <Mark className="size-7 text-primary" />
          <div className="leading-tight">
            <p className="font-display text-lg font-semibold tracking-tight">Northlight</p>
            <p className="hidden text-xs text-muted-foreground sm:block">Local photo studio</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <EngineSwitch
            value={engine}
            aiOn={serverAi !== false || browserKey !== null}
            onChange={setEngine}
          />
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

      <div className="mx-auto flex min-h-0 w-full max-w-[1400px] flex-1 flex-col overflow-y-auto lg:grid lg:grid-cols-[92px_minmax(0,1fr)_300px] lg:overflow-hidden">
        <aside className="order-3 border-t border-border lg:order-none lg:border-r lg:border-t-0">
          <Filmstrip
            photos={photos}
            selectedId={selected?.id ?? null}
            onSelect={setSelectedId}
            onRemove={removePhoto}
            onAdd={() => inputRef.current?.click()}
          />
        </aside>

        <main className="relative order-1 flex min-h-[60vh] flex-1 overflow-hidden lg:order-none lg:min-h-0">
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

        <aside className="order-2 flex flex-col gap-5 border-t border-border p-4 sm:p-5 lg:order-none lg:border-l lg:border-t-0">
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

          <div className="mt-auto flex flex-col gap-2">
            <Button
              size="lg"
              className="w-full"
              disabled={!selected || working}
              onClick={() => void finishSelected()}
            >
              {working ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              Finish photo
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                disabled={!selected || working || photos.length < 2}
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
                onClick={() => selected && void downloadPhoto(selected, false)}
              >
                Download HQ
              </Button>
            ) : null}
            <p className="pt-1 text-xs leading-relaxed text-muted-foreground">
              Photos stay in this browser. Studio AI sends a copy only when you press Finish. Hold
              Space to peek the original.
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
          disabled={!selected || working}
          onClick={() => void finishSelected()}
        >
          {working ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Check className="size-4" />
          )}
          Finish photo
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

function EngineSwitch({
  value,
  aiOn,
  onChange,
}: {
  value: Engine;
  aiOn: boolean;
  onChange: (v: Engine) => void;
}) {
  return (
    <div className="flex rounded-full border border-border bg-card p-0.5">
      <button
        type="button"
        className={cn(
          "min-h-9 rounded-full px-3 text-xs font-medium sm:px-4 sm:text-sm",
          value === "local" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
        )}
        onClick={() => onChange("local")}
      >
        On device
      </button>
      <button
        type="button"
        disabled={!aiOn}
        className={cn(
          "min-h-9 rounded-full px-3 text-xs font-medium sm:px-4 sm:text-sm",
          value === "ai" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
        )}
        onClick={() => aiOn && onChange("ai")}
      >
        Studio AI
      </button>
    </div>
  );
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
      className="flex h-full min-h-[52vh] items-center justify-center p-4 sm:p-8"
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
      <button
        type="button"
        onClick={onBrowse}
        className={cn(
          "stagger-in flex w-full max-w-lg flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-16 text-center transition-colors duration-[var(--motion-fast)]",
          dragOver ? "border-primary bg-secondary" : "border-border bg-card hover:bg-secondary/70",
        )}
      >
        <Mark className="size-12 text-primary" />
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Drop proofs here
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Yearbook scans, watermarked previews, everyday portraits. Finish on this device or send
            to Studio AI. Nothing is stored on a server.
          </p>
        </div>
        <span className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
          Choose photos
        </span>
      </button>
    </div>
  );
}
