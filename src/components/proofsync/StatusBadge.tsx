import { cn } from "@/lib/utils";
import type { VersionStatus } from "@/lib/proofsync-types";

const LABELS: Record<VersionStatus, string> = {
  pending_review: "Em revisão",
  changes_requested: "Alterações pedidas",
  approved: "Aprovado",
};

const STYLES: Record<VersionStatus, string> = {
  pending_review: "border-border-strong bg-secondary text-secondary-foreground",
  changes_requested: "border-warning bg-warning/15 text-warning",
  approved: "border-success bg-success/15 text-success",
};

export function StatusBadge({
  status,
  className,
}: {
  status: VersionStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "label-mono inline-flex items-center gap-1.5 border px-2 py-1",
        STYLES[status],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 bg-current" />
      {LABELS[status]}
    </span>
  );
}

export const statusLabel = (status: VersionStatus) => LABELS[status];
