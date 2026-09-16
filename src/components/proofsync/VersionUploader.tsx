import { useRef, useState } from "react";
import { Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];

type VersionUploaderProps = {
  deliverableId: string;
  nextVersionNumber: number;
  onUploaded: () => void;
};

export function VersionUploader({
  deliverableId,
  nextVersionNumber,
  onUploaded,
}: VersionUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);

  const upload = async (file: File) => {
    if (!ACCEPTED.includes(file.type)) {
      toast.error("Só são aceites imagens PNG, JPG ou WebP.");
      return;
    }
    setBusy(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error("Sessão expirada.");

      // Re-read the highest version at upload time so parallel uploads stay sequential.
      const { data: last } = await supabase
        .from("versions")
        .select("version_number")
        .eq("deliverable_id", deliverableId)
        .order("version_number", { ascending: false })
        .limit(1)
        .maybeSingle();
      const versionNumber = (last?.version_number ?? 0) + 1;

      const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
      const path = `${userData.user.id}/${deliverableId}/v${versionNumber}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("deliverables")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from("versions").insert({
        deliverable_id: deliverableId,
        version_number: versionNumber,
        image_url: path,
        status: "pending_review",
      });
      if (insertError) throw insertError;

      toast.success(`V${versionNumber} enviada.`);
      onUploaded();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "O envio falhou.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) void upload(file);
      }}
      onClick={() => !busy && inputRef.current?.click()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 border border-dashed p-8 text-center transition-colors",
        dragOver ? "border-primary bg-primary/5" : "border-border-strong bg-surface",
        busy && "pointer-events-none opacity-60",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      {busy ? (
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      ) : (
        <UploadCloud className="h-5 w-5 text-primary" />
      )}
      <p className="text-sm font-semibold">
        {busy ? "A enviar…" : `Arrasta a imagem da V${nextVersionNumber} para aqui`}
      </p>
      <p className="label-mono text-muted-foreground">PNG · JPG · WEBP · máx 25MB</p>
    </div>
  );
}
