import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { PageHeader, PrimaryButton } from "@/components/AppShell";
import { clientsApi } from "@/lib/api";
import type { Client } from "@/lib/api";
import { Search, Phone, Mail, X, Loader2, MessageCircle, Filter } from "lucide-react";
import { toast } from "sonner";
import { buildWhatsAppLink } from "@/lib/whatsapp";

export const Route = createFileRoute("/_app/clientes")({
  component: ClientesPage,
});

function ClientesPage() {
  const [list, setList] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Client | null>(null);

  useEffect(() => {
    clientsApi
      .list()
      .then(setList)
      .catch(() => toast.error("Erro ao carregar clientes"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      list.filter(
        (c) =>
          c.name.toLowerCase().includes(q.toLowerCase()) ||
          c.phone.includes(q) ||
          c.email?.toLowerCase().includes(q.toLowerCase()),
      ),
    [list, q],
  );

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Clientes"
        subtitle={`${list.length} clientes cadastradas`}
        action={<PrimaryButton onClick={() => setOpen(true)}>Nova cliente</PrimaryButton>}
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-brand-900/40" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome, telefone ou e-mail..."
            className="h-12 w-full rounded-2xl border border-border bg-card pl-11 pr-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        <button className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-card px-5 text-sm font-semibold hover:bg-brand-100">
          <Filter className="size-4" /> Filtros
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-brand-900/40">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center">
          <p className="font-serif text-lg">Nenhuma cliente encontrada</p>
          <p className="mt-1 text-sm text-brand-900/50">Tente outro termo de busca.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-brand-50/50 text-left text-xs font-semibold uppercase tracking-wider text-brand-900/60">
                <th className="px-6 py-4">Cliente</th>
                <th className="hidden px-6 py-4 md:table-cell">Telefone</th>
                <th className="hidden px-6 py-4 lg:table-cell">Observações</th>
                <th className="px-6 py-4 text-center">Visitas</th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr
                  key={c.id}
                  className="group border-b border-border/60 transition-colors last:border-b-0 hover:bg-brand-50/40 animate-float-in"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setSelected(c)}
                      className="flex items-center gap-3 text-left"
                    >
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-100 font-serif text-sm font-semibold text-brand-600">
                        {c.name
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")}
                      </div>
                      <div>
                        <p className="font-semibold">{c.name}</p>
                        {c.email && <p className="text-xs text-brand-900/50">{c.email}</p>}
                      </div>
                    </button>
                  </td>
                  <td className="hidden px-6 py-4 text-sm text-brand-900/70 md:table-cell">
                    {c.phone}
                  </td>
                  <td className="hidden max-w-xs px-6 py-4 lg:table-cell">
                    <p className="truncate text-sm text-brand-900/60">{c.notes || "—"}</p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-600">
                      {c.visits}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <a
                      href={buildWhatsAppLink(c.phone, `Oi, ${c.name.split(" ")[0]}! 💕`)}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg p-2 text-brand-600 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-brand-100 inline-flex"
                    >
                      <MessageCircle className="size-4" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <ClientModal
          onClose={() => setOpen(false)}
          onSave={(c) => {
            setList((prev) => [c, ...prev]);
            setOpen(false);
            toast.success("Cliente cadastrada!");
          }}
        />
      )}

      {selected && (
        <ClientDetail
          client={selected}
          onClose={() => setSelected(null)}
          onDelete={(id) => {
            setList((prev) => prev.filter((c) => c.id !== id));
            setSelected(null);
          }}
        />
      )}
    </div>
  );
}

function ClientModal({ onClose, onSave }: { onClose: () => void; onSave: (c: Client) => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      toast.error("Nome e telefone são obrigatórios");
      return;
    }
    setLoading(true);
    try {
      const client = await clientsApi.create({
        name,
        phone,
        email: email || undefined,
        notes: notes || undefined,
      });
      onSave(client);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao cadastrar cliente");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-brand-900/40 backdrop-blur-sm md:items-center md:p-4">
      <div className="w-full max-w-md animate-float-in rounded-t-3xl bg-card p-6 shadow-2xl md:rounded-3xl md:p-8">
        <div className="mb-6 flex items-start justify-between">
          <h2 className="font-serif text-2xl font-semibold">Nova cliente</h2>
          <button onClick={onClose} className="rounded-xl p-2 hover:bg-brand-100">
            <X className="size-4" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <Input
            label="Nome completo"
            value={name}
            onChange={setName}
            placeholder="Ex: Isabel Rocha"
          />
          <Input label="Telefone" value={phone} onChange={setPhone} placeholder="(11) 99999-9999" />
          <Input
            label="E-mail (opcional)"
            value={email}
            onChange={setEmail}
            type="email"
            placeholder="email@exemplo.com"
          />
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-brand-900/60">
              Observações
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Preferências, alergias, indicação..."
              className="w-full rounded-xl border border-border bg-card p-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-11 flex-1 rounded-xl border border-border bg-card text-sm font-semibold hover:bg-brand-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 hover:bg-brand-500 disabled:opacity-70"
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              {loading ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ClientDetail({
  client,
  onClose,
  onDelete,
}: {
  client: Client;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Remover ${client.name}?`)) return;
    setDeleting(true);
    try {
      await clientsApi.delete(client.id);
      toast.success("Cliente removida");
      onDelete(client.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-brand-900/40 backdrop-blur-sm md:items-center md:p-4">
      <div className="w-full max-w-md animate-float-in rounded-t-3xl bg-card p-8 shadow-2xl md:rounded-3xl">
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-full bg-brand-100 font-serif text-xl font-semibold text-brand-600">
              {client.name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")}
            </div>
            <div>
              <h2 className="font-serif text-xl font-semibold">{client.name}</h2>
              <p className="text-sm text-brand-900/50">{client.visits} visitas</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 hover:bg-brand-100">
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-xl bg-brand-50 p-4">
            <Phone className="size-4 text-brand-600" />
            <span className="text-sm">{client.phone}</span>
          </div>
          {client.email && (
            <div className="flex items-center gap-3 rounded-xl bg-brand-50 p-4">
              <Mail className="size-4 text-brand-600" />
              <span className="text-sm">{client.email}</span>
            </div>
          )}
          {client.notes && (
            <div className="rounded-xl bg-brand-50 p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-brand-900/60">
                Observações
              </p>
              <p className="text-sm leading-relaxed">{client.notes}</p>
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <a
            href={buildWhatsAppLink(client.phone, `Oi, ${client.name.split(" ")[0]}! 💕`)}
            target="_blank"
            rel="noreferrer"
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500"
          >
            <MessageCircle className="size-4" /> Enviar WhatsApp
          </a>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-600 hover:bg-rose-100 disabled:opacity-70"
          >
            {deleting ? <Loader2 className="size-4 animate-spin" /> : "Remover"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Input({
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
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-brand-900/60">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
      />
    </div>
  );
}
