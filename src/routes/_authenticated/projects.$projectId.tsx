import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Copy, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { addDeliverable, getProjectWithDeliverables } from "@/lib/local-db";
import { StatusBadge } from "@/components/proofsync/StatusBadge";
import type { VersionStatus } from "@/lib/proofsync-types";

export const Route = createFileRoute("/_authenticated/projects/$projectId")({
  head: () => ({
    meta: [
      { title: "Entregáveis do projeto — ProofSync" },
      {
        name: "description",
        content: "Entregáveis, versões e links de revisão deste projeto.",
      },
      { property: "og:title", content: "Entregáveis do projeto — ProofSync" },
      { property: "og:description", content: "Gestão de versões e aprovações." },
    ],
  }),
  component: ProjectPage,
});

function ProjectPage() {
  const { projectId } = Route.useParams();
  const queryClient = useQueryClient();
  const [newTitle, setNewTitle] = useState("");

  const queryKey = ["project", projectId];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => getProjectWithDeliverables(projectId),
  });

  const addDeliverableMutation = useMutation({
    mutationFn: () => addDeliverable(projectId, newTitle.trim()),
    onSuccess: () => {
      setNewTitle("");
      toast.success("Entregável criado.");
      void queryClient.invalidateQueries({ queryKey });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível criar."),
  });

  const copyLink = async (shareToken: string) => {
    const url = `${window.location.origin}/review/${shareToken}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link do cliente copiado.");
  };

  if (isLoading) {
    return <p className="p-8 text-sm text-muted-foreground">A carregar…</p>;
  }
  if (!data) {
    return <p className="p-8 text-sm text-muted-foreground">Projeto não encontrado.</p>;
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <Link
        to="/dashboard"
        className="label-mono inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Projetos
      </Link>

      <header className="mt-4 border border-border-strong bg-card p-5 shadow-brutal">
        <h1 className="text-2xl font-bold sm:text-3xl">{data.title}</h1>
        <p className="label-mono mt-1 text-muted-foreground">{data.client_name ?? "sem cliente"}</p>
      </header>

      <form
        className="mt-6 flex flex-col gap-3 border border-border-strong bg-card p-5 shadow-brutal sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (newTitle.trim()) addDeliverableMutation.mutate();
        }}
      >
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Novo entregável (ex.: Capa do álbum)"
          required
          className="flex-1 border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
        />
        <button
          type="submit"
          disabled={addDeliverableMutation.isPending}
          className="press inline-flex items-center justify-center gap-2 border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-brutal-sm disabled:opacity-50"
        >
          {addDeliverableMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Adicionar
        </button>
      </form>

      <section className="mt-8 space-y-3">
        {data.deliverables?.length === 0 && (
          <p className="border border-dashed border-border-strong bg-surface p-6 text-center text-sm text-muted-foreground">
            Sem entregáveis. Adiciona o primeiro acima.
          </p>
        )}
        {data.deliverables?.map((d) => {
          const versions = [...(d.versions ?? [])].sort(
            (a, b) => b.version_number - a.version_number,
          );
          const latest = versions[0];
          const pins = versions.flatMap((v) => v.feedback_pins ?? []);
          const open = pins.filter((p) => !p.is_resolved).length;
          const resolved = pins.length - open;

          return (
            <article
              key={d.id}
              className="border border-border-strong bg-card p-5 shadow-brutal-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{d.title}</h2>
                  <p className="label-mono mt-1 text-muted-foreground">
                    {versions.length} versõe{versions.length === 1 ? "m" : "s"} ·{" "}
                    <span className="text-warning">{open} em aberto</span> ·{" "}
                    <span className="text-success">{resolved} resolvidas</span>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {latest && <StatusBadge status={latest.status as VersionStatus} />}
                  <button
                    type="button"
                    onClick={() => void copyLink(d.share_token)}
                    className="press label-mono inline-flex items-center gap-1.5 border border-border-strong bg-surface px-2.5 py-1.5 shadow-brutal-sm"
                  >
                    <Copy className="h-3.5 w-3.5" /> Link cliente
                  </button>
                  <Link
                    to="/deliverables/$deliverableId"
                    params={{ deliverableId: d.id }}
                    className="press label-mono inline-flex items-center gap-1.5 border border-primary bg-primary px-2.5 py-1.5 text-primary-foreground shadow-brutal-sm"
                  >
                    <Check className="h-3.5 w-3.5" /> Abrir
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
