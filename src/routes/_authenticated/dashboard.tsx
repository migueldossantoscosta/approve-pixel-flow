import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderPlus, Loader2, LogOut, Plus } from "lucide-react";
import { toast } from "sonner";
import { createProject as createLocalProject, listProjects } from "@/lib/local-db";
import { DASHBOARD_UNLOCKED_KEY } from "@/lib/dashboard-lock";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Projetos — ProofSync" },
      {
        name: "description",
        content: "Gere projetos, entregáveis e links de revisão para os teus clientes.",
      },
      { property: "og:title", content: "Projetos — ProofSync" },
      { property: "og:description", content: "Painel do criador no ProofSync." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: listProjects,
  });

  const createProject = useMutation({
    mutationFn: () =>
      createLocalProject({ title: title.trim(), client_name: clientName.trim() || null }),
    onSuccess: () => {
      setTitle("");
      setClientName("");
      toast.success("Projeto criado.");
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível criar."),
  });

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-mono text-primary">ProofSync</p>
          <h1 className="text-3xl font-bold">Projetos</h1>
        </div>
        <button
          type="button"
          onClick={() => {
            localStorage.removeItem(DASHBOARD_UNLOCKED_KEY);
            queryClient.clear();
            window.location.href = "/auth";
          }}
          className="press label-mono inline-flex items-center gap-2 border border-border-strong bg-surface px-3 py-2 shadow-brutal-sm"
        >
          <LogOut className="h-3.5 w-3.5" /> Sair
        </button>
      </header>

      <section className="mt-6 border border-border-strong bg-card p-5 shadow-brutal">
        <h2 className="label-mono flex items-center gap-2 text-muted-foreground">
          <FolderPlus className="h-3.5 w-3.5" /> Novo projeto
        </h2>
        <form
          className="mt-4 flex flex-col gap-3 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim()) createProject.mutate();
          }}
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título do projeto"
            required
            className="flex-1 border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
          />
          <input
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Cliente"
            className="flex-1 border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
          />
          <button
            type="submit"
            disabled={createProject.isPending}
            className="press inline-flex items-center justify-center gap-2 border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-brutal-sm disabled:opacity-50"
          >
            {createProject.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Criar
          </button>
        </form>
      </section>

      <section className="mt-8 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">A carregar…</p>}
        {projects?.length === 0 && (
          <p className="border border-dashed border-border-strong bg-surface p-6 text-center text-sm text-muted-foreground">
            Ainda não tens projetos. Cria o primeiro acima.
          </p>
        )}
        {projects?.map((project) => (
          <Link
            key={project.id}
            to="/projects/$projectId"
            params={{ projectId: project.id }}
            className="press block border border-border-strong bg-card p-5 shadow-brutal-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-semibold">{project.title}</h3>
              <span className="label-mono text-muted-foreground">
                {project.deliverables?.length ?? 0} entregáveis
              </span>
            </div>
            <p className="label-mono mt-1 text-muted-foreground">
              {project.client_name ?? "sem cliente"} ·{" "}
              {new Date(project.created_at).toLocaleDateString("pt-PT")}
            </p>
          </Link>
        ))}
      </section>
    </main>
  );
}
