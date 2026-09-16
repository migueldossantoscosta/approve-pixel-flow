import { useCallback, useRef, useState } from "react";
import { Check, Loader2, MessageSquare, X } from "lucide-react";
import type { DraftPin, FeedbackPin } from "@/lib/proofsync-types";
import { cn } from "@/lib/utils";

type InteractiveCanvasProps = {
  imageUrl: string;
  alt: string;
  pins: FeedbackPin[];
  /** When true the image is locked: no new pins can be placed. */
  locked?: boolean;
  /** Name shown as the pin author on the confirmation bubble. */
  authorName?: string;
  onCreatePin?: (pin: DraftPin & { comment: string }) => Promise<void>;
  onToggleResolved?: (pin: FeedbackPin) => void;
  /** Creators can resolve pins; clients cannot. */
  canResolve?: boolean;
};

/**
 * Interactive review canvas.
 *
 * Pin coordinates are stored as percentages of the rendered image box, so a pin
 * dropped on a phone lands on the exact same spot of the artwork on a desktop
 * monitor, at any zoom level or container width.
 */
export function InteractiveCanvas({
  imageUrl,
  alt,
  pins,
  locked = false,
  authorName = "Cliente",
  onCreatePin,
  onToggleResolved,
  canResolve = false,
}: InteractiveCanvasProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [draft, setDraft] = useState<DraftPin | null>(null);
  const [draftComment, setDraftComment] = useState("");
  const [openPinId, setOpenPinId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleImageClick = useCallback(
    (event: React.MouseEvent<HTMLImageElement>) => {
      if (locked || !onCreatePin) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      setOpenPinId(null);
      setDraftComment("");
      setDraft({
        x: Math.min(100, Math.max(0, Number(x.toFixed(3)))),
        y: Math.min(100, Math.max(0, Number(y.toFixed(3)))),
      });
    },
    [locked, onCreatePin],
  );

  const submitDraft = async () => {
    if (!draft || !onCreatePin || draftComment.trim().length === 0) return;
    setSaving(true);
    try {
      await onCreatePin({ ...draft, comment: draftComment.trim() });
      setDraft(null);
      setDraftComment("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative w-full select-none">
      <img
        ref={imageRef}
        src={imageUrl}
        alt={alt}
        draggable={false}
        onClick={handleImageClick}
        className={cn(
          "block w-full rounded-md border border-border bg-muted",
          locked ? "cursor-default" : "cursor-crosshair",
        )}
      />

      {/* Saved pins */}
      {pins.map((pin, index) => (
        <div
          key={pin.id}
          className="absolute"
          style={{
            left: `${pin.x_coord_pct}%`,
            top: `${pin.y_coord_pct}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <button
            type="button"
            aria-label={`Nota ${index + 1}: ${pin.comment}`}
            onClick={() => setOpenPinId(openPinId === pin.id ? null : pin.id)}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold shadow-sm transition-transform hover:scale-110",
              pin.is_resolved
                ? "border-border bg-muted text-muted-foreground"
                : "border-foreground bg-foreground text-background",
            )}
          >
            {pin.is_resolved ? <Check className="h-3.5 w-3.5" /> : index + 1}
          </button>

          {openPinId === pin.id && (
            <div className="absolute left-4 top-4 z-20 w-60 rounded-md border border-border bg-card p-3 text-card-foreground shadow-lg">
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {pin.author_name}
                </span>
                <button
                  type="button"
                  aria-label="Fechar nota"
                  onClick={() => setOpenPinId(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-snug">{pin.comment}</p>
              {canResolve && onToggleResolved && (
                <button
                  type="button"
                  onClick={() => onToggleResolved(pin)}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-sm border border-border px-2 py-1 text-xs font-medium hover:bg-accent"
                >
                  <Check className="h-3 w-3" />
                  {pin.is_resolved ? "Reabrir" : "Marcar resolvido"}
                </button>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Draft pin + comment bubble */}
      {draft && (
        <div
          className="absolute z-30"
          style={{ left: `${draft.x}%`, top: `${draft.y}%`, transform: "translate(-50%, -50%)" }}
        >
          <div className="h-7 w-7 animate-pulse rounded-full border-2 border-dashed border-foreground bg-background/70" />
          <div className="absolute left-4 top-4 w-64 rounded-md border border-border bg-card p-3 text-card-foreground shadow-lg">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <MessageSquare className="h-3.5 w-3.5" />
              {authorName}
            </div>
            <textarea
              autoFocus
              rows={3}
              value={draftComment}
              onChange={(e) => setDraftComment(e.target.value)}
              placeholder="O que deve mudar aqui?"
              className="mt-2 w-full resize-none rounded-sm border border-input bg-background p-2 text-sm outline-none focus:border-ring"
            />
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDraft(null);
                  setDraftComment("");
                }}
                className="rounded-sm px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={saving || draftComment.trim().length === 0}
                onClick={submitDraft}
                className="inline-flex items-center gap-1.5 rounded-sm bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-50"
              >
                {saving && <Loader2 className="h-3 w-3 animate-spin" />}
                Guardar nota
              </button>
            </div>
          </div>
        </div>
      )}

      {locked && (
        <div className="pointer-events-none absolute right-3 top-3 rounded-sm border border-border bg-card/90 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Aprovado — bloqueado
        </div>
      )}
    </div>
  );
}
