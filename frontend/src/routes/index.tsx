import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Lock, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { authApi, setToken } from "@/lib/api";

export const Route = createFileRoute("/")({
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Preencha e-mail e senha");
      return;
    }
    setLoading(true);
    try {
      const { token, user } = await authApi.login(email, password);
      setToken(token);
      toast.success(`Bem-vinda de volta, ${user.name.split(" ")[0]}!`);
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao entrar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 bg-brand-50 lg:grid-cols-2">
      {/* Form side */}
      <div className="flex flex-col justify-center px-6 py-12 md:px-16">
        <div className="mx-auto w-full max-w-sm animate-float-in">
          <Link to="/" className="mb-12 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-brand-500 font-serif text-2xl italic text-white shadow-lg shadow-brand-500/30">
              S
            </div>
            <span className="font-serif text-2xl font-semibold">StudioFlow</span>
          </Link>

          <h1 className="font-serif text-3xl font-semibold md:text-4xl">Bem-vinda de volta</h1>
          <p className="mt-2 text-brand-900/60">Entre para gerenciar sua agenda e clientes.</p>

          <form onSubmit={onSubmit} className="mt-10 space-y-5">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-brand-900/60">
                E-mail
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-brand-900/40" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="h-12 w-full rounded-xl border border-border bg-white pl-11 pr-4 text-sm placeholder:text-brand-900/30 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-brand-900/60">
                  Senha
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-brand-600 hover:underline"
                >
                  Esqueci minha senha
                </Link>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-brand-900/40" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-12 w-full rounded-xl border border-border bg-white pl-11 pr-4 text-sm placeholder:text-brand-900/30 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 transition-all hover:bg-brand-500 active:scale-[0.99] disabled:opacity-70"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

        </div>
      </div>

      {/* Decorative side */}
      <div className="relative hidden overflow-hidden bg-brand-900 lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-700 via-brand-900 to-brand-900" />
        <div className="absolute -right-32 -top-32 size-96 rounded-full bg-brand-500/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 size-96 rounded-full bg-brand-300/20 blur-3xl" />

        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
            <Sparkles className="size-3" /> Studio Premium
          </div>

          <div className="space-y-8">
            <blockquote className="font-serif text-3xl italic leading-snug text-white">
              "Organizei minha agenda em um dia e dobrei meus retornos no primeiro mês."
            </blockquote>
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-full bg-brand-500 font-serif text-lg font-semibold">
                CR
              </div>
              <div>
                <p className="font-semibold">Carla Ribeiro</p>
                <p className="text-sm text-white/60">Lash Designer, São Paulo</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs text-white/60">
            <div>
              <p className="font-serif text-3xl text-white">2.4k+</p>
              <p>profissionais</p>
            </div>
            <div className="h-10 w-px bg-white/20" />
            <div>
              <p className="font-serif text-3xl text-white">98%</p>
              <p>satisfação</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
