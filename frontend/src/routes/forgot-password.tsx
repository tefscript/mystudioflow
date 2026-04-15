import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Loader2, ArrowLeft, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { authApi } from "@/lib/api";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Informe seu e-mail");
      return;
    }
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch {
      toast.error("Erro ao enviar e-mail. Tente novamente.");
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

        {sent ? (
          <div className="rounded-2xl border border-border bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle className="size-7 text-emerald-600" />
            </div>
            <h2 className="font-serif text-2xl font-semibold">E-mail enviado!</h2>
            <p className="mt-2 text-sm text-brand-900/60">
              Se <strong>{email}</strong> estiver cadastrado, você receberá as instruções para redefinir sua senha.
            </p>
            <p className="mt-2 text-xs text-brand-900/40">O link expira em 1 hora.</p>
            <Link
              to="/"
              className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold text-brand-600 hover:underline"
            >
              <ArrowLeft className="size-4" /> Voltar ao login
            </Link>
          </div>
        ) : (
          <>
            <h1 className="font-serif text-3xl font-semibold">Esqueci minha senha</h1>
            <p className="mt-2 text-brand-900/60">
              Informe seu e-mail e enviaremos um link para redefinir sua senha.
            </p>

            <form onSubmit={onSubmit} className="mt-8 space-y-5">
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
                    autoFocus
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
                {loading ? "Enviando..." : "Enviar link de redefinição"}
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
