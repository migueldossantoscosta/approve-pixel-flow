import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { DASHBOARD_UNLOCKED_KEY } from "@/lib/dashboard-lock";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — ProofSync" },
      { name: "description", content: "Introduz o PIN para aceder ao painel do criador." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (localStorage.getItem(DASHBOARD_UNLOCKED_KEY) === "true") {
      void navigate({ to: "/dashboard" });
    }
  }, [navigate]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const expected = import.meta.env["VITE_DASHBOARD_PIN"];
    if (!expected) {
      toast.error("PIN do painel não configurado (VITE_DASHBOARD_PIN).");
      return;
    }
    if (pin !== expected) {
      setError("PIN incorreto.");
      return;
    }
    localStorage.setItem(DASHBOARD_UNLOCKED_KEY, "true");
    void navigate({ to: "/dashboard" });
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md border border-border-strong bg-card p-6 shadow-brutal">
        <p className="label-mono text-primary">ProofSync</p>
        <h1 className="mt-1 text-2xl font-bold">Entrar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Painel do criador. Os teus clientes não precisam de conta.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block">
            <span className="label-mono text-muted-foreground">PIN</span>
            <input
              type="password"
              required
              autoFocus
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError(null);
              }}
              placeholder="••••••"
              className="mt-2 w-full border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
            />
          </label>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            type="submit"
            className="press inline-flex w-full items-center justify-center gap-2 border border-primary bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-brutal-sm"
          >
            Entrar
          </button>
        </form>
      </div>
    </main>
  );
}
