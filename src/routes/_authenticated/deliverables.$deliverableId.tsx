import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Copy } from "lucide-react";
import { toast } from "sonner";
import { getDeliverableWithVersions, togglePinResolved } from "@/lib/local-db";
import { InteractiveCanvas } from "@/components/proofsync/InteractiveCanvas";
import { VersionUploader } from "@/components/proofsync/VersionUploader";
import { StatusBadge } from "@/components/proofsync/StatusBadge";
import type { FeedbackPin } from "@/lib/proofsync-types";
import { cn, reviewLinkFor } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/deliverables/$deliverableId")({
  head: () => ({
    meta: [
      { title: "Versões do entregável — Aprova." },
      {
        name: "description",
        content: "Envia novas versões, lê as notas do cliente e marca-as como resolvidas.",
      },
      { property: "og:title", content: "Versões do entregável — Aprova." },
      { property: "og:description", content: "Controlo de versões e feedback visual." },
    ],
  }),
  component: DeliverablePage,
});

function DeliverablePage() {
  const { deliverableId } = Route.useParams();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const queryKey = ["deliverable", deliverableId];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => getDeliverableWithVersions(deliverableId),
  });

  const toggleResolved = useMutation({
    mutationFn: (pin: FeedbackPin) => togglePinResolved(pin.id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível atualizar."),
  });

  const versions = data?.versions ?? [];
  const current = useMemo(
    () => versions.find((v) => v.id === selectedId) ?? versions[versions.length - 1],
    [versions, selectedId],
  );

  if (isLoading) {
    return <p className="p-8 text-sm text-muted-foreground">A carregar…</p>;
  }
  if (!data) {
    return <p className="p-8 text-sm text-muted-foreground">Entregável não encontrado.</p>;
  }

  const openPins = current?.pins.filter((p) => !p.is_resolved).length ?? 0;
  const resolvedPins = (current?.pins.length ?? 0) - openPins;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <Link
        to="/projects/$projectId"
        params={{ projectId: data.deliverable.project_id }}
        className="label-mono inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Projeto
      </Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-4 border border-border-strong bg-card p-5 shadow-brutal">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{data.deliverable.title}</h1>
          <p className="label-mono mt-1 text-muted-foreground">
            {data.deliverable.projects?.title}
            {data.deliverable.projects?.client_name
              ? ` · ${data.deliverable.projects.client_name}`
              : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(reviewLinkFor(data.deliverable.share_token));
            toast.success("Link do cliente copiado.");
          }}
          className="press label-mono inline-flex items-center gap-1.5 border border-border-strong bg-surface px-3 py-2 shadow-brutal-sm"
        >
          <Copy className="h-3.5 w-3.5" /> Copiar link do cliente
        </button>
      </header>

      <div className="mt-6">
        <VersionUploader
          deliverableId={deliverableId}
          nextVersionNumber={versions.length + 1}
          onUploaded={() => void queryClient.invalidateQueries({ queryKey })}
        />
      </div>

      {versions.length > 0 && current && (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-2">
              {versions.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedId(v.id)}
                  className={cn(
                    "label-mono border px-3 py-1.5",
                    current.id === v.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border-strong bg-surface hover:border-primary",
                  )}
                >
                  V{v.version_number}
                </button>
              ))}
            </div>
            <StatusBadge status={current.status} />
            <span className="label-mono text-muted-foreground">
              <span className="text-warning">{openPins} em aberto</span> ·{" "}
              <span className="text-success">{resolvedPins} resolvidas</span>
            </span>
          </div>

          <section className="mt-4 border border-border-strong bg-card p-3 shadow-brutal sm:p-4">
            <InteractiveCanvas
              imageUrl={current.image_url}
              alt={`${data.deliverable.title} V${current.version_number}`}
              pins={current.pins}
              locked
              canResolve
              onToggleResolved={(pin) => toggleResolved.mutate(pin)}
            />
          </section>

          <section className="mt-6 space-y-2">
            {current.pins.length === 0 && (
              <p className="label-mono text-muted-foreground">Sem notas nesta versão.</p>
            )}
            {current.pins.map((pin, index) => (
              <article
                key={pin.id}
                className="flex items-start gap-3 border border-border bg-surface p-4"
              >
                <span
                  className={cn(
                    "label-mono flex h-6 w-6 shrink-0 items-center justify-center border",
                    pin.is_resolved
                      ? "border-border bg-muted text-muted-foreground"
                      : "border-foreground bg-foreground text-background",
                  )}
                >
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="label-mono text-muted-foreground">{pin.author_name}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{pin.comment}</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleResolved.mutate(pin)}
                  className="label-mono shrink-0 border border-border-strong px-2 py-1 hover:border-primary"
                >
                  {pin.is_resolved ? "Reabrir" : "Resolver"}
                </button>
              </article>
            ))}
          </section>
        </>
      )}
    </main>
  );
}
