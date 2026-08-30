import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  beforeSrc: string;
  afterSrc?: string;
  peekOriginal: boolean;
  alt: string;
};

export function CompareStage({
  beforeSrc,
  afterSrc,
  peekOriginal,
  alt,
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
  const baseSrc = showCompare ? afterSrc : beforeSrc;

  return (
    <div className="flex h-full w-full items-center justify-center p-4 sm:p-6">
      <div ref={frame} className="relative max-h-full max-w-full">
        <img
          src={baseSrc}
          alt={alt}
          className="block max-h-full w-auto max-w-full rounded-lg bg-card-ink object-contain shadow-print"
          draggable={false}
        />
        {showCompare ? (
          <>
            <div
              className="absolute inset-0 overflow-hidden rounded-lg"
              style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
            >
              <img
                src={beforeSrc}
                alt=""
                className="size-full object-contain"
                draggable={false}
              />
            </div>
            <button
              type="button"
              aria-label="Drag to compare before and after"
              className="absolute top-0 bottom-0 z-10 w-8 -translate-x-1/2 cursor-ew-resize touch-none"
              style={{ left: `${split}%` }}
              onPointerDown={(e) => {
                dragging.current = true;
                (e.target as HTMLElement).setPointerCapture(e.pointerId);
                onMove(e.clientX);
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
