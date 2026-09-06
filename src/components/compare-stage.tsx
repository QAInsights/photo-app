import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type ImageSource = { type: string; srcSet: string };

type Props = {
  beforeSrc: string;
  afterSrc?: string;
  peekOriginal: boolean;
  alt: string;
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  beforeSources?: ImageSource[];
  afterSources?: ImageSource[];
  lcp?: boolean;
};

export function CompareStage({
  beforeSrc,
  afterSrc,
  peekOriginal,
  alt,
  className,
  fill = false,
  width,
  height,
  sizes,
  beforeSources,
  afterSources,
  lcp = false,
}: Props) {
  const [split, setSplit] = useState(52);
  const dragging = useRef(false);
  const frame = useRef<HTMLDivElement>(null);

  const onMove = useCallback((clientX: number) => {
    const el = frame.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const next = ((clientX - rect.left) / rect.width) * 100;
    setSplit(Math.min(96, Math.max(4, next)));
  }, []);

  useEffect(() => {
    const up = () => {
      dragging.current = false;
    };
    const move = (e: PointerEvent) => {
      if (!dragging.current) return;
      onMove(e.clientX);
    };
    window.addEventListener("pointerup", up);
    window.addEventListener("pointermove", move);
    return () => {
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointermove", move);
    };
  }, [onMove]);

  const showCompare = Boolean(afterSrc) && !peekOriginal;
  const baseSrc = showCompare ? afterSrc! : beforeSrc;
  const baseSources = showCompare ? afterSources : beforeSources;

  function nudge(delta: number) {
    setSplit((current) => Math.min(96, Math.max(4, current + delta)));
  }

  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center p-4 sm:p-6",
        className,
      )}
    >
      <div
        ref={frame}
        className={cn("relative max-h-full max-w-full", fill && "h-full w-full")}
      >
        <StageImage
          src={baseSrc}
          sources={baseSources}
          alt={alt}
          width={width}
          height={height}
          sizes={sizes}
          fetchPriority={lcp ? "high" : undefined}
          fill={fill}
        />
        {showCompare ? (
          <>
            <div
              className="absolute inset-0 overflow-hidden rounded-lg"
              style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
            >
              <StageImage
                src={beforeSrc}
                sources={beforeSources}
                alt=""
                width={width}
                height={height}
                sizes={sizes}
                fill
              />
            </div>
            <button
              type="button"
              role="slider"
              aria-label="Compare before and after"
              aria-valuemin={4}
              aria-valuemax={96}
              aria-valuenow={Math.round(split)}
              aria-orientation="horizontal"
              className="absolute top-0 bottom-0 z-10 w-8 -translate-x-1/2 cursor-ew-resize touch-none"
              style={{ left: `${split}%` }}
              onPointerDown={(e) => {
                dragging.current = true;
                (e.target as HTMLElement).setPointerCapture(e.pointerId);
                onMove(e.clientX);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft") {
                  e.preventDefault();
                  nudge(-4);
                } else if (e.key === "ArrowRight") {
                  e.preventDefault();
                  nudge(4);
                } else if (e.key === "Home") {
                  e.preventDefault();
                  setSplit(4);
                } else if (e.key === "End") {
                  e.preventDefault();
                  setSplit(96);
                }
              }}
            >
              <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-primary-foreground/90 mix-blend-difference" />
              <span className="absolute top-1/2 left-1/2 size-7 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-card-ink shadow-print" />
            </button>
            <div className="pointer-events-none absolute top-3 left-3 rounded-full bg-primary/75 px-2.5 py-1 text-xs font-medium tracking-wide text-primary-foreground">
              Before
            </div>
            <div className="pointer-events-none absolute top-3 right-3 rounded-full bg-primary/75 px-2.5 py-1 text-xs font-medium tracking-wide text-primary-foreground">
              After
            </div>
          </>
        ) : null}
        {peekOriginal && afterSrc ? (
          <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-primary/80 px-3 py-1 text-xs font-medium text-primary-foreground">
            Original
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StageImage({
  src,
  sources,
  alt,
  width,
  height,
  sizes,
  fetchPriority,
  fill,
}: {
  src: string;
  sources?: ImageSource[];
  alt: string;
  width?: number;
  height?: number;
  sizes?: string;
  fetchPriority?: "high" | "low";
  fill?: boolean;
}) {
  const imgClass = cn(
    "block rounded-lg bg-card-ink object-contain shadow-print",
    fill ? "size-full" : "max-h-full w-auto max-w-full",
  );
  const img = (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      fetchPriority={fetchPriority}
      className={imgClass}
      draggable={false}
    />
  );
  if (!sources?.length) return img;
  return (
    <picture className={fill ? "contents" : undefined}>
      {sources.map((source) => (
        <source
          key={source.type}
          type={source.type}
          srcSet={source.srcSet}
          sizes={sizes}
        />
      ))}
      {img}
    </picture>
  );
}
