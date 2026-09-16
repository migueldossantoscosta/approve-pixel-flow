import { useCallback, useRef, useState } from "react";
import { MoveHorizontal } from "lucide-react";

type CompareSliderProps = {
  beforeUrl: string;
  afterUrl: string;
  beforeLabel: string;
  afterLabel: string;
};

/** Horizontal before/after divider. Works with mouse, touch and keyboard. */
export function CompareSlider({
  beforeUrl,
  afterUrl,
  beforeLabel,
  afterLabel,
}: CompareSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(50);
  const [dragging, setDragging] = useState(false);

  const moveTo = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, pct)));
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full touch-none select-none overflow-hidden border border-border bg-muted"
      onMouseDown={(e) => {
        setDragging(true);
        moveTo(e.clientX);
      }}
      onMouseMove={(e) => dragging && moveTo(e.clientX)}
      onMouseUp={() => setDragging(false)}
      onMouseLeave={() => setDragging(false)}
      onTouchStart={(e) => moveTo(e.touches[0]!.clientX)}
      onTouchMove={(e) => moveTo(e.touches[0]!.clientX)}
    >
      <img src={beforeUrl} alt={beforeLabel} draggable={false} className="block w-full" />
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 0 0 ${position}%)` }}
      >
        <img
          src={afterUrl}
          alt={afterLabel}
          draggable={false}
          className="block h-full w-full object-cover"
        />
      </div>

      <span className="label-mono absolute left-3 top-3 border border-border-strong bg-background/85 px-2 py-1">
        {beforeLabel}
      </span>
      <span className="label-mono absolute right-3 top-3 border border-border-strong bg-background/85 px-2 py-1">
        {afterLabel}
      </span>

      <div
        className="absolute inset-y-0 w-px bg-primary"
        style={{ left: `${position}%` }}
        aria-hidden
      />
      <input
        type="range"
        min={0}
        max={100}
        step={0.5}
        value={position}
        aria-label="Divisor de comparação"
        onChange={(e) => setPosition(Number(e.target.value))}
        className="absolute inset-x-0 bottom-0 h-8 w-full cursor-ew-resize opacity-0"
      />
      <div
        className="pointer-events-none absolute top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center border border-primary bg-background text-primary"
        style={{ left: `${position}%` }}
      >
        <MoveHorizontal className="h-4 w-4" />
      </div>
    </div>
  );
}
