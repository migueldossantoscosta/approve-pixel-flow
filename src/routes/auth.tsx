import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — ProofSync" },
      {
        name: "description",
        content: "Entra no ProofSync para gerir projetos, versões e aprovações de design.",
      },
      { property: "og:title", content: "Entrar — ProofSync" },
      { property: "og:description", content: "Painel de revisão e aprovação para criadores." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const ensureProfile = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    await supabase.from("profiles").upsert({
      id: data.user.id,
      email: data.user.email ?? null,
      full_name:
        (data.user.user_metadata?.["full_name"] as string | undefined) ?? fullName || null,
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      await ensureProfile();
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        void navigate({ to: "/dashboard" });
      } else {
        toast.success("Confirma o email para ativar a conta.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível continuar.");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("O Google não conseguiu autenticar.");
      return;
    }
    if (result.redirected) return;
    await ensureProfile();
    void navigate({ to: "/dashboard" });
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md border border-border-strong bg-card p-6 shadow-brutal">
        <p className="label-mono text-primary">ProofSync</p>
        <h1 className="mt-1 text-2xl font-bold">
          {mode === "signin" ? "Entrar" : "Criar conta"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Painel do criador. Os teus clientes não precisam de conta.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "signup" && (
            <Field label="Nome" value={fullName} onChange={setFullName} placeholder="O teu nome" />
          )}
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="tu@estudio.pt"
          />
          <Field
            label="Palavra-passe"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
          />
          <button
            type="submit"
            disabled={busy}
            className="press inline-flex w-full items-center justify-center gap-2 border border-primary bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-brutal-sm disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "signin" ? "Entrar" : "Criar conta"}
          </button>
        </form>

        <button
          type="button"
          onClick={google}
          className="press mt-3 w-full border border-border-strong bg-surface px-4 py-2.5 text-sm font-semibold shadow-brutal-sm"
        >
          Continuar com Google
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="label-mono mt-6 w-full text-muted-foreground hover:text-foreground"
        >
          {mode === "signin" ? "Não tenho conta" : "Já tenho conta"}
        </button>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="label-mono text-muted-foreground">{label}</span>
      <input
        type={type}
        required
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
      />
    </label>
  );
}
