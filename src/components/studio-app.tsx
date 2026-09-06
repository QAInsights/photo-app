import {
  Briefcase,
  Check,
  Coffee,
  Download,
  Eraser,
  ImageIcon,
  LoaderCircle,
  Pin,
  Settings,
  Sparkles,
  SunMedium,
  Trash2,
  Upload,
  UserRound,
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
import {
  buildPrompt,
  CROPS,
  CUSTOM_MAX,
  nextCropForRecipe,
  PROMPT_MAX,
  recipeById,
  RECIPES,
  type CropId,
  type RecipeId,
  type ToneId,
} from "@/lib/presets";
import {
  SAMPLE_AFTER,
  SAMPLE_AFTER_SOURCES,
  SAMPLE_ASPECT,
  SAMPLE_BEFORE,
  SAMPLE_BEFORE_SOURCES,
  SAMPLE_DISCLAIMER,
  SAMPLE_HEIGHT,
  SAMPLE_ID,
  SAMPLE_NAME,
  SAMPLE_SIZES,
  SAMPLE_WIDTH,
} from "@/lib/sample";
import { FAQ } from "@/lib/site";
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
  isSample?: boolean;
};

type Backdrop = {
  name: string;
  blobUrl: string;
  dataUrl: string;
};

const RECIPE_ICON: Record<RecipeId, typeof Eraser> = {
  proof: Eraser,
  watermark: Eraser,
  enhance: SunMedium,
  cleanup: Sparkles,
  grey: ImageIcon,
  white: ImageIcon,
  id: UserRound,
  linkedin: Briefcase,
  custom: ImageIcon,
};

export function StudioApp() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [recipe, setRecipe] = useState<RecipeId>("proof");
  const [custom, setCustom] = useState("");
  const [crop, setCrop] = useState<CropId>("auto");
  const [tone, setTone] = useState<ToneId>("color");
  const [retouch, setRetouch] = useState(false);
  const [lookId, setLookId] = useState<string | null>(null);
  const [backdrop, setBackdrop] = useState<Backdrop | null>(null);
  const [backdropOver, setBackdropOver] = useState(false);
  const [resolution, setResolution] = useState<"1k" | "2k">("2k");
  const [serverAi, setServerAi] = useState<boolean | null>(null);
  const [browserKey, setBrowserKey] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [peek, setPeek] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const backdropInputRef = useRef<HTMLInputElement>(null);
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

  function pickRecipe(id: RecipeId) {
    if (id === recipe) return;
    setCrop((current) => nextCropForRecipe(id, recipe, current));
    setRecipe(id);
  }

  const setBackdropFile = useCallback(async (file: File) => {
    try {
      const loaded = await fileToLoadedPhoto(file);
      setBackdrop((prev) => {
        if (prev) URL.revokeObjectURL(prev.blobUrl);
        return { name: loaded.name, blobUrl: loaded.blobUrl, dataUrl: loaded.dataUrl };
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read backdrop.");
    }
  }, []);

  const clearBackdrop = useCallback(() => {
    setBackdrop((prev) => {
      if (prev) URL.revokeObjectURL(prev.blobUrl);
      return null;
    });
  }, []);

  async function finishOne(photo: Photo) {
    if (!aiReady) {
      toast.error("Add an xAI key in Settings to finish photos.");
      setSettingsOpen(true);
      return;
    }
    const activeRecipe = recipe;
    const activeCustom = custom;
    const activeResolution = resolution;
    const activeCrop = crop;
    const activeTone = tone;
    const activeRetouch = retouch;
    const activeLookId = lookId;
    const activeBackdrop = backdrop;
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
      const lookPhoto =
        activeLookId && activeLookId !== photo.id
          ? photos.find((p) => p.id === activeLookId && p.resultUrl)
          : undefined;
      const lookImageDataUrl = lookPhoto?.resultUrl
        ? await resizeDataUrl(lookPhoto.resultUrl, 1280, 0.8)
        : undefined;
      const backdropImageDataUrl = activeBackdrop
        ? await resizeDataUrl(activeBackdrop.dataUrl, 1280, 0.8)
        : undefined;
      const prompt = buildPrompt(activeRecipe, activeCustom, {
        tone: activeTone,
        retouch: activeRetouch,
        crop: activeCrop,
        hasLook: Boolean(lookImageDataUrl),
        hasBackdrop: Boolean(backdropImageDataUrl),
      });
      if (prompt.length > PROMPT_MAX) {
        throw new Error("Instructions are too long with look, backdrop, and retouch. Shorten Custom.");
      }
      const out = await finishPhoto({
        data: {
          imageDataUrl: payload,
          prompt,
          aspectRatio: activeCrop,
          resolution: activeResolution,
          apiKey: browserKey ?? undefined,
          ...(lookImageDataUrl ? { lookImageDataUrl } : {}),
          ...(backdropImageDataUrl ? { backdropImageDataUrl } : {}),
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

  const loadSample = useCallback(() => {
    setPhotos((prev) => {
      for (const photo of prev) {
        if (photo.blobUrl.startsWith("blob:")) URL.revokeObjectURL(photo.blobUrl);
      }
      return [
        {
          id: SAMPLE_ID,
          name: SAMPLE_NAME,
          blobUrl: SAMPLE_BEFORE,
          previewUrl: SAMPLE_BEFORE,
          width: SAMPLE_WIDTH,
          height: SAMPLE_HEIGHT,
          aspect: SAMPLE_ASPECT,
          resultUrl: SAMPLE_AFTER,
          status: "done",
          isSample: true,
        },
      ];
    });
    setSelectedId(SAMPLE_ID);
    setRecipe("proof");
    setCrop("auto");
    setLookId(null);
  }, []);

  function removePhoto(id: string) {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target?.blobUrl.startsWith("blob:")) URL.revokeObjectURL(target.blobUrl);
      const next = prev.filter((p) => p.id !== id);
      setSelectedId((cur) => {
        if (cur !== id) return cur;
        return next[0]?.id ?? null;
      });
      return next;
    });
    setLookId((cur) => (cur === id ? null : cur));
  }

  return (
    <div className="paper-grain flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <a href="#studio" className="skip-link visually-hidden">
        Skip to studio
      </a>
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

      <div className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto lg:grid lg:grid-cols-[5rem_minmax(0,1fr)_20rem] lg:overflow-hidden xl:grid-cols-[5.5rem_minmax(0,1fr)_22rem]">
        <aside
          className="order-3 border-t border-border lg:order-none lg:min-h-0 lg:border-r lg:border-t-0"
          aria-label="Photos"
        >
          <Filmstrip
            photos={photos}
            selectedId={selected?.id ?? null}
            lookId={lookId}
            onSelect={setSelectedId}
            onRemove={removePhoto}
            onToggleLook={(id) => setLookId((cur) => (cur === id ? null : id))}
            onAdd={() => inputRef.current?.click()}
          />
        </aside>

        <main
          id="studio"
          tabIndex={-1}
          className={cn(
            "relative order-1 flex flex-1 overflow-hidden outline-none lg:order-none lg:min-h-0",
            selected ? "min-h-[52vh]" : "min-h-[72vh] sm:min-h-[64vh]",
          )}
        >
          {selected ? (
            <>
              <h1 className="visually-hidden">{selected.name}</h1>
              <CompareStage
                beforeSrc={selected.blobUrl}
                afterSrc={selected.resultUrl}
                peekOriginal={peek}
                alt={selected.name}
                width={selected.width}
                height={selected.height}
                lcp={selected.isSample}
                beforeSources={selected.isSample ? SAMPLE_BEFORE_SOURCES : undefined}
                afterSources={selected.isSample ? SAMPLE_AFTER_SOURCES : undefined}
                sizes={selected.isSample ? SAMPLE_SIZES : undefined}
              />
            </>
          ) : (
            <DropEmpty
              dragOver={dragOver}
              onBrowse={() => inputRef.current?.click()}
              onDragOver={(on) => setDragOver(on)}
              onDrop={(files) => void addFiles(files)}
              onUseSample={loadSample}
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
          {selected?.isSample && selected.status !== "error" && selected.status !== "working" ? (
            <p className="pointer-events-none absolute inset-x-4 bottom-3 text-center">
              <span className="inline-block rounded-full bg-card/90 px-2.5 py-1 text-[11px] leading-relaxed text-muted-foreground shadow-print">
                {SAMPLE_DISCLAIMER}
              </span>
            </p>
          ) : null}
        </main>

        <aside
          className="order-2 flex flex-col border-t border-border lg:order-none lg:min-h-0 lg:border-l lg:border-t-0"
          aria-label="Finish options"
        >
          <div className="space-y-5 p-3 sm:p-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            <div>
              <p className="text-xs font-medium tracking-wide text-subtle uppercase">Finish</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {RECIPES.map((item) => {
                  const Icon = RECIPE_ICON[item.id];
                  const active = recipe === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => pickRecipe(item.id)}
                      className={cn(
                        "flex min-h-11 items-start gap-2 rounded-md border px-2.5 py-2 text-left transition-colors duration-[var(--motion-quick)]",
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
                  maxLength={CUSTOM_MAX}
                  placeholder="Describe the cleanup. Identity stays locked."
                  className="mt-2 w-full resize-none rounded-md border border-border bg-card-ink px-3 py-2.5 text-sm leading-relaxed outline-none ring-ring focus:ring-2"
                />
              </label>
            ) : null}

            <Segment
              label="Crop"
              value={crop}
              options={CROPS}
              onChange={setCrop}
            />
            <Segment
              label="Tone"
              value={tone}
              options={[
                { id: "color", label: "Color" },
                { id: "bw", label: "B&W" },
              ]}
              onChange={setTone}
            />
            <Segment
              label="Retouch"
              value={retouch ? "on" : "off"}
              options={[
                { id: "off", label: "Off" },
                { id: "on", label: "Gentle" },
              ]}
              onChange={(id) => setRetouch(id === "on")}
            />

            <LookPicker
              photos={photos}
              lookId={lookId}
              onPick={setLookId}
            />
            <BackdropPicker
              backdrop={backdrop}
              dragOver={backdropOver}
              onBrowse={() => backdropInputRef.current?.click()}
              onDragOver={setBackdropOver}
              onDrop={(file) => void setBackdropFile(file)}
              onClear={clearBackdrop}
            />
          </div>

          <div className="shrink-0 space-y-3 border-t border-border bg-background p-3 sm:p-4">
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
        aria-label="Choose photos"
        className="sr-only"
        onChange={(e) => {
          if (e.target.files) void addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={backdropInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        aria-label="Choose backdrop photo"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void setBackdropFile(file);
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

function Segment<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { id: T; label: string }[];
  onChange: (id: T) => void;
}) {
  return (
    <div>
      <p className="text-xs font-medium tracking-wide text-subtle uppercase">{label}</p>
      <div className="mt-2 flex rounded-full border border-border bg-card p-0.5">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={cn(
              "min-h-8 flex-1 rounded-full px-2 text-xs font-medium",
              value === opt.id ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function LookPicker({
  photos,
  lookId,
  onPick,
}: {
  photos: Photo[];
  lookId: string | null;
  onPick: (id: string | null) => void;
}) {
  const done = photos.filter((p) => p.status === "done" && p.resultUrl);
  return (
    <div>
      <p className="text-xs font-medium tracking-wide text-subtle uppercase">Match look</p>
      {done.length === 0 ? (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Finish one photo, then pin it so the rest match its lighting and grade.
        </p>
      ) : (
        <div className="mt-2 flex gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => onPick(null)}
            className={cn(
              "flex size-14 shrink-0 flex-col items-center justify-center rounded-md border text-xs",
              lookId === null
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-secondary",
            )}
          >
            Off
          </button>
          {done.map((photo) => {
            const active = lookId === photo.id;
            return (
              <button
                key={photo.id}
                type="button"
                title={photo.name}
                aria-label={`Match look of ${photo.name}`}
                aria-pressed={active}
                onClick={() => onPick(active ? null : photo.id)}
                className={cn(
                  "relative size-14 shrink-0 overflow-hidden rounded-md border",
                  active ? "border-primary ring-2 ring-ring/40" : "border-border",
                )}
              >
                <img
                  src={photo.resultUrl}
                  alt=""
                  width={photo.width}
                  height={photo.height}
                  loading="lazy"
                  className="size-full object-cover"
                />
                {active ? (
                  <span className="absolute inset-x-0 bottom-0 bg-primary/80 py-0.5 text-[10px] font-medium text-primary-foreground">
                    Look
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BackdropPicker({
  backdrop,
  dragOver,
  onBrowse,
  onDragOver,
  onDrop,
  onClear,
}: {
  backdrop: Backdrop | null;
  dragOver: boolean;
  onBrowse: () => void;
  onDragOver: (on: boolean) => void;
  onDrop: (file: File) => void;
  onClear: () => void;
}) {
  return (
    <div>
      <p className="text-xs font-medium tracking-wide text-subtle uppercase">Backdrop</p>
      {backdrop ? (
        <div className="relative mt-2 overflow-hidden rounded-md border border-border">
          <img
            src={backdrop.blobUrl}
            alt={backdrop.name}
            width={640}
            height={160}
            className="h-20 w-full object-cover"
          />
          <p className="absolute inset-x-0 bottom-0 truncate bg-primary/75 px-2 py-1 text-[10px] text-primary-foreground">
            {backdrop.name}
          </p>
          <button
            type="button"
            aria-label="Remove backdrop"
            onClick={onClear}
            className="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-primary text-primary-foreground"
          >
            <Trash2 className="size-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onBrowse}
          onDragOver={(e) => {
            e.preventDefault();
            onDragOver(true);
          }}
          onDragLeave={() => onDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            onDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) onDrop(file);
          }}
          className={cn(
            "mt-2 flex min-h-16 w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed px-3 py-3 text-center text-xs leading-snug transition-colors duration-[var(--motion-quick)]",
            dragOver ? "border-primary bg-secondary" : "border-border bg-card text-muted-foreground hover:bg-secondary",
          )}
        >
          <ImageIcon className="size-4" />
          Drop studio paper, or choose a photo
        </button>
      )}
    </div>
  );
}

function Filmstrip({
  photos,
  selectedId,
  lookId,
  onSelect,
  onRemove,
  onToggleLook,
  onAdd,
}: {
  photos: Photo[];
  selectedId: string | null;
  lookId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onToggleLook: (id: string) => void;
  onAdd: () => void;
}) {
  return (
    <ul
      role="list"
      className="flex gap-2 overflow-x-auto p-2 lg:h-full lg:flex-col lg:overflow-y-auto lg:px-2 lg:py-3"
    >
      <li className="shrink-0">
        <button
          type="button"
          onClick={onAdd}
          className="flex size-16 shrink-0 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border bg-card text-muted-foreground hover:bg-secondary lg:w-full"
          aria-label="Add photos"
        >
          <Upload className="size-4" />
          <span className="text-xs font-medium tracking-wide">Add</span>
        </button>
      </li>
      {photos.map((photo) => (
        <li key={photo.id} className="relative shrink-0">
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
              width={photo.width}
              height={photo.height}
              loading={selectedId === photo.id ? undefined : "lazy"}
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
          {photo.status === "done" ? (
            <button
              type="button"
              aria-label={
                lookId === photo.id ? `Stop using ${photo.name} as look` : `Use ${photo.name} as look`
              }
              aria-pressed={lookId === photo.id}
              onClick={(e) => {
                e.stopPropagation();
                onToggleLook(photo.id);
              }}
              className={cn(
                "absolute bottom-1 left-1 grid size-5 place-items-center rounded-full",
                lookId === photo.id
                  ? "bg-ok text-primary-foreground"
                  : "bg-primary/80 text-primary-foreground",
              )}
            >
              <Pin className="size-2.5" />
            </button>
          ) : null}
          <button
            type="button"
            aria-label={`Remove ${photo.name}`}
            onClick={() => onRemove(photo.id)}
            className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground"
          >
            <Trash2 className="size-3" />
          </button>
        </li>
      ))}
    </ul>
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

function SampleDemo({
  onBrowse,
  onUseSample,
}: {
  onBrowse: () => void;
  onUseSample: () => void;
}) {
  return (
    <div
      className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col px-4 pb-3 sm:px-6"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="shrink-0 text-sm text-muted-foreground">
        <span className="font-medium tracking-wide text-subtle uppercase">Sample</span>
        <span aria-hidden="true"> · </span>
        Watermarked proof, finished with Studio AI.
      </p>
      <div className="relative mx-auto mt-3 min-h-0 w-full flex-1">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative h-full max-h-full w-auto max-w-full aspect-[3/4]">
            <CompareStage
              className="absolute inset-0 p-0 sm:p-0"
              fill
              beforeSrc={SAMPLE_BEFORE}
              afterSrc={SAMPLE_AFTER}
              peekOriginal={false}
              alt="Sample yearbook proof before and after Studio AI"
              width={SAMPLE_WIDTH}
              height={SAMPLE_HEIGHT}
              sizes={SAMPLE_SIZES}
              beforeSources={SAMPLE_BEFORE_SOURCES}
              afterSources={SAMPLE_AFTER_SOURCES}
              lcp
            />
          </div>
        </div>
      </div>
      <p className="mt-2 shrink-0 text-[11px] leading-relaxed text-muted-foreground">
        {SAMPLE_DISCLAIMER}
      </p>
      <div className="mt-3 flex shrink-0 flex-wrap items-center justify-center gap-2">
        <Button onClick={onBrowse}>Choose photos</Button>
        <Button variant="outline" onClick={onUseSample}>
          Open in studio
        </Button>
      </div>
    </div>
  );
}

function DropEmpty({
  dragOver,
  onBrowse,
  onDragOver,
  onDrop,
  onUseSample,
}: {
  dragOver: boolean;
  onBrowse: () => void;
  onDragOver: (on: boolean) => void;
  onDrop: (files: FileList) => void;
  onUseSample: () => void;
}) {
  return (
    <div
      className="flex size-full min-h-0 items-stretch p-2 sm:p-3 lg:p-3"
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
          "stagger-in flex h-full min-h-0 w-full flex-col items-center overflow-hidden rounded-xl border border-dashed text-center transition-colors duration-[var(--motion-fast)]",
          dragOver ? "border-primary bg-secondary" : "border-border bg-card",
        )}
      >
        <button
          type="button"
          onClick={onBrowse}
          className="flex w-full shrink-0 flex-col items-center px-6 pt-4 hover:bg-secondary/40 sm:pt-5"
        >
          <Mark className="size-9 text-primary sm:size-11" />
          <h1 className="font-display mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            Drop proofs here
          </h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            Yearbook scans, watermarked previews, everyday portraits. Finish with Studio AI.
            Try the sample. No upload needed.
          </p>
        </button>
        <SampleDemo onBrowse={onBrowse} onUseSample={onUseSample} />
        <SiteLinks className="shrink-0 px-6 pb-3 justify-center text-sm font-semibold text-foreground" />
        <section
          className="mx-auto w-full max-w-xl shrink-0 px-6 pb-3 text-left"
          aria-labelledby="about-heading"
        >
          <details className="rounded-md border border-border bg-card-ink px-3 py-2">
            <summary id="about-heading" className="cursor-pointer text-sm font-medium">
              About Northlight
            </summary>
            <div className="mt-2 space-y-2">
              {FAQ.map((item) => (
                <details key={item.question} className="rounded-md border border-border bg-card px-3 py-2">
                  <summary className="cursor-pointer text-sm font-medium">{item.question}</summary>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </details>
        </section>
        <p className="max-w-md shrink-0 px-6 pb-4 text-xs leading-relaxed text-muted-foreground sm:text-sm">
          Images you finish are processed per <XaiPolicyLink />.
        </p>
      </div>
    </div>
  );
}
