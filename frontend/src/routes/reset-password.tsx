import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Lock, Loader2, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { authApi } from "@/lib/api";

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: (search.token as string) ?? "",
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-50 px-4">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-rose-100">
            <AlertCircle className="size-7 text-rose-600" />
          </div>
          <h2 className="font-serif text-xl font-semibold">Link inválido</h2>
          <p className="mt-2 text-sm text-brand-900/60">
            Este link de redefinição é inválido ou expirou.
          </p>
          <Link
            to="/forgot-password"
            className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold text-brand-600 hover:underline"
          >
            Solicitar novo link
          </Link>
        </div>
      </div>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("A senha precisa ter pelo menos 6 caracteres");
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas não coincidem");
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate({ to: "/" }), 3000);
    } catch (err: any) {
      toast.error(err.message ?? "Link inválido ou expirado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-50 px-4">
      <div className="w-full max-w-sm animate-float-in">
        <Link to="/" className="mb-10 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-brand-500 font-serif text-2xl italic text-white shadow-lg shadow-brand-500/30">
            S
          </div>
          <span className="font-serif text-2xl font-semibold">StudioFlow</span>
        </Link>

        {done ? (
          <div className="rounded-2xl border border-border bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle className="size-7 text-emerald-600" />
            </div>
            <h2 className="font-serif text-2xl font-semibold">Senha redefinida!</h2>
            <p className="mt-2 text-sm text-brand-900/60">
              Sua senha foi atualizada. Redirecionando para o login...
            </p>
          </div>
        ) : (
          <>
            <h1 className="font-serif text-3xl font-semibold">Nova senha</h1>
            <p className="mt-2 text-brand-900/60">Escolha uma nova senha para sua conta.</p>

            <form onSubmit={onSubmit} className="mt-8 space-y-5">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-brand-900/60">
                  Nova senha
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-brand-900/40" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    autoFocus
                    className="h-12 w-full rounded-xl border border-border bg-white pl-11 pr-4 text-sm placeholder:text-brand-900/30 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-brand-900/60">
                  Confirmar nova senha
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-brand-900/40" />
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repita a senha"
                    className="h-12 w-full rounded-xl border border-border bg-white pl-11 pr-4 text-sm placeholder:text-brand-900/30 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 transition-all hover:bg-brand-500 disabled:opacity-70"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                {loading ? "Salvando..." : "Redefinir senha"}
              </button>
            </form>

            <Link
              to="/"
              className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold text-brand-600 hover:underline"
            >
              <ArrowLeft className="size-4" /> Voltar ao login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
