import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Columns2, Image as ImageIcon, Lock, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { InteractiveCanvas } from "@/components/proofsync/InteractiveCanvas";
import { CompareSlider } from "@/components/proofsync/CompareSlider";
import { ApproveDialog } from "@/components/proofsync/ApproveDialog";
import { StatusBadge } from "@/components/proofsync/StatusBadge";
import {
  addPinByToken,
  approveVersionByToken,
  getReviewByToken,
} from "@/lib/review.functions";
import type { ReviewPayload } from "@/lib/proofsync-types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/review/$shareToken")({
  head: () => ({
    meta: [
      { title: "Revisão de design — ProofSync" },
      {
        name: "description",
        content:
          "Vê o trabalho, deixa notas visuais diretamente na imagem e aprova a versão final. Sem criar conta.",
      },
      { property: "og:title", content: "Revisão de design — ProofSync" },
      {
        property: "og:description",
        content: "Notas visuais e aprovação formal num único link.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReviewPage,
});

function ReviewPage() {
  const { shareToken } = Route.useParams();
  const queryClient = useQueryClient();
  const fetchReview = useServerFn(getReviewByToken);
  const addPin = useServerFn(addPinByToken);
  const approve = useServerFn(approveVersionByToken);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"single" | "compare">("single");
  const [compareLeft, setCompareLeft] = useState<string | null>(null);
  const [compareRight, setCompareRight] = useState<string | null>(null);

  const queryKey = ["review", shareToken];
  const { data, isLoading, isError } = useQuery<ReviewPayload | null>({
    queryKey,
    queryFn: () => fetchReview({ data: { token: shareToken } }),
  });

  const versions = data?.versions ?? [];
  const current = useMemo(
    () => versions.find((v) => v.id === selectedId) ?? versions[versions.length - 1],
    [versions, selectedId],
  );
  const left = versions.find((v) => v.id === compareLeft) ?? versions[0];
  const right =
    versions.find((v) => v.id === compareRight) ?? versions[versions.length - 1];

  const pinMutation = useMutation({
    mutationFn: (input: { versionId: string; x: number; y: number; comment: string }) =>
      addPin({ data: { token: shareToken, ...input } }),
    onSuccess: () => {
      toast.success("Nota enviada ao criador.");
      void queryClient.invalidateQueries({ queryKey });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível gravar."),
  });

  const approveMutation = useMutation({
    mutationFn: (input: { versionId: string; clientName: string }) =>
      approve({ data: { token: shareToken, ...input } }),
    onSuccess: () => {
      toast.success("Versão aprovada. Obrigado!");
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  if (isLoading) {
    return <CenterNote text="A carregar a revisão…" />;
  }
  if (isError || !data) {
    return <CenterNote text="Este link não é válido ou já foi removido." />;
  }

  const pending = current?.pins.filter((p) => !p.is_resolved).length ?? 0;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <header className="border border-border-strong bg-card p-5 shadow-brutal">
        <p className="label-mono text-muted-foreground">ProofSync · revisão</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{data.deliverable.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {data.project.title}
          {data.project.client_name ? ` · ${data.project.client_name}` : ""}
        </p>

        {current && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <StatusBadge status={current.status} />
            <span className="label-mono text-muted-foreground">
              {pending} nota{pending === 1 ? "" : "s"} em aberto
            </span>
            {current.status === "approved" && current.approved_by_name && (
              <span className="label-mono text-success">
                por {current.approved_by_name}
              </span>
            )}
          </div>
        )}
      </header>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {versions.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => {
                setSelectedId(v.id);
                setMode("single");
              }}
              className={cn(
                "label-mono border px-3 py-1.5",
                current?.id === v.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border-strong bg-surface hover:border-primary",
              )}
            >
              V{v.version_number}
            </button>
          ))}
        </div>

        <div className="flex border border-border-strong">
          <button
            type="button"
            onClick={() => setMode("single")}
            className={cn(
              "label-mono flex items-center gap-1.5 px-3 py-1.5",
              mode === "single" ? "bg-foreground text-background" : "bg-surface",
            )}
          >
            <ImageIcon className="h-3.5 w-3.5" /> Ver única
          </button>
          <button
            type="button"
            disabled={versions.length < 2}
            onClick={() => setMode("compare")}
            className={cn(
              "label-mono flex items-center gap-1.5 border-l border-border-strong px-3 py-1.5 disabled:opacity-40",
              mode === "compare" ? "bg-foreground text-background" : "bg-surface",
            )}
          >
            <Columns2 className="h-3.5 w-3.5" /> Comparar
          </button>
        </div>
      </div>

      <section className="mt-4 border border-border-strong bg-card p-3 shadow-brutal sm:p-4">
        {mode === "compare" && left && right ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-3">
              <VersionSelect
                label="Antes"
                value={left.id}
                versions={versions}
                onChange={setCompareLeft}
              />
              <VersionSelect
                label="Depois"
                value={right.id}
                versions={versions}
                onChange={setCompareRight}
              />
            </div>
            <CompareSlider
              beforeUrl={left.image_url}
              afterUrl={right.image_url}
              beforeLabel={`V${left.version_number}`}
              afterLabel={`V${right.version_number}`}
            />
          </div>
        ) : current ? (
          <InteractiveCanvas
            imageUrl={current.image_url}
            alt={`${data.deliverable.title} V${current.version_number}`}
            pins={current.pins}
            locked={current.status === "approved"}
            onCreatePin={async ({ x, y, comment }) => {
              await pinMutation.mutateAsync({ versionId: current.id, x, y, comment });
            }}
          />
        ) : (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Ainda não há versões para revisão.
          </p>
        )}
      </section>

      {current && (
        <footer className="mt-6 flex flex-col gap-4 border border-border-strong bg-card p-5 shadow-brutal sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            {current.status === "approved" ? (
              <>
                <Lock className="mt-0.5 h-4 w-4 text-success" />
                Versão aprovada e bloqueada
                {current.approved_at
                  ? ` a ${new Date(current.approved_at).toLocaleString("pt-PT")}`
                  : ""}
                .
              </>
            ) : (
              <>
                <MessageSquare className="mt-0.5 h-4 w-4 text-primary" />
                Clica na imagem para deixar uma nota no ponto exato.
              </>
            )}
          </div>
          {current.status !== "approved" && (
            <ApproveDialog
              versionLabel={`V${current.version_number}`}
              deliverableTitle={data.deliverable.title}
              onApprove={async (clientName) => {
                await approveMutation.mutateAsync({ versionId: current.id, clientName });
              }}
            />
          )}
        </footer>
      )}
    </main>
  );
}

function VersionSelect({
  label,
  value,
  versions,
  onChange,
}: {
  label: string;
  value: string;
  versions: ReviewPayload["versions"];
  onChange: (id: string) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="label-mono text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="label-mono border border-input bg-background px-2 py-1.5 outline-none focus:border-ring"
      >
        {versions.map((v) => (
          <option key={v.id} value={v.id}>
            V{v.version_number}
          </option>
        ))}
      </select>
    </label>
  );
}

function CenterNote({ text }: { text: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <p className="border border-border-strong bg-card px-6 py-4 text-sm shadow-brutal">{text}</p>
    </main>
  );
}
