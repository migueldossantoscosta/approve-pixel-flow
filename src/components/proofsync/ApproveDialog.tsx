import { useState } from "react";
import { BadgeCheck, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type ApproveDialogProps = {
  versionLabel: string;
  deliverableTitle: string;
  onApprove: (clientName: string) => Promise<void>;
  disabled?: boolean;
};

export function ApproveDialog({
  versionLabel,
  deliverableTitle,
  onApprove,
  disabled,
}: ApproveDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (name.trim().length < 2) {
      setError("Escreve o teu nome completo.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onApprove(name.trim());
      setOpen(false);
      setName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível aprovar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="press inline-flex items-center gap-2 border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-brutal-sm disabled:opacity-50"
        >
          <BadgeCheck className="h-4 w-4" />
          Aprovar versão final
        </button>
      </DialogTrigger>
      <DialogContent className="border border-border-strong bg-card shadow-brutal sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">Aprovação formal</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Vais aprovar <span className="font-mono text-foreground">{versionLabel}</span> de{" "}
            <span className="text-foreground">{deliverableTitle}</span>. Depois disto a versão fica
            bloqueada e não aceita novas notas.
          </DialogDescription>
        </DialogHeader>

        <label className="block">
          <span className="label-mono text-muted-foreground">O teu nome</span>
          <input
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Ana Ribeiro"
            className="mt-2 w-full border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
          />
        </label>
        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="press inline-flex items-center gap-2 border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-brutal-sm disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirmar aprovação
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
