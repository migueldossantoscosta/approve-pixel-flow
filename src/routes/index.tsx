import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, MessageSquare, GitCompare } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-2xl text-center">
        <p className="label-mono text-primary">Aprova.</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
          Revisão de design, feita para aprovar.
        </h1>
        <p className="mt-4 text-balance text-muted-foreground sm:text-lg">
          Envia versões, recebe notas visuais diretamente na imagem e obtém a aprovação formal do
          cliente — sem que ele precise de criar conta.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/auth"
            className="press inline-flex items-center gap-2 border border-primary bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-brutal-sm"
          >
            Entrar no painel <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-14 grid gap-4 text-left sm:grid-cols-3">
          <Feature
            icon={<MessageSquare className="h-5 w-5" />}
            title="Notas no ponto exato"
            description="O cliente clica na imagem e deixa feedback na posição certa, em qualquer ecrã."
          />
          <Feature
            icon={<GitCompare className="h-5 w-5" />}
            title="Compara versões"
            description="Slider antes/depois para ver exatamente o que mudou entre versões."
          />
          <Feature
            icon={<CheckCircle2 className="h-5 w-5" />}
            title="Aprovação formal"
            description="Um clique bloqueia a versão e regista quem aprovou e quando."
          />
        </div>
      </div>
    </main>
  );
}

function Feature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="border border-border-strong bg-card p-4 shadow-brutal-sm">
      <div className="text-primary">{icon}</div>
      <h3 className="mt-2 text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
