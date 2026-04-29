import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, PrimaryButton } from "@/components/AppShell";
import { servicesApi } from "@/lib/api";
import type { Service } from "@/lib/api";
import { Clock, DollarSign, Pencil, Trash2, X, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/servicos")({
  component: ServicosPage,
});

function ServicosPage() {
  const [list, setList] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Service | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    servicesApi
      .list()
      .then(setList)
      .catch(() => toast.error("Erro ao carregar serviços"))
      .finally(() => setLoading(false));
  }, []);

  const groups = list.reduce<Record<string, Service[]>>((acc, s) => {
    (acc[s.category] ||= []).push(s);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Serviços"
        subtitle="Gerencie os serviços oferecidos no seu estúdio."
        action={
          <PrimaryButton
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            Novo serviço
          </PrimaryButton>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-16 text-brand-900/40">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center">
          <p className="font-serif text-lg">Nenhum serviço cadastrado</p>
          <p className="mt-1 text-sm text-brand-900/50">
            Crie seu primeiro serviço clicando no botão acima.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groups).map(([cat, items]) => (
            <section key={cat}>
              <h2 className="mb-4 flex items-center gap-2 font-serif text-lg font-semibold">
                <Sparkles className="size-4 text-brand-500" /> {cat}
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((s, i) => (
                  <div
                    key={s.id}
                    className="group animate-float-in rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-brand-300 hover:shadow-md"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <div className="mb-4 flex items-start justify-between">
                      <h3 className="font-serif text-lg font-semibold">{s.name}</h3>
                      <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => {
                            setEditing(s);
                            setOpen(true);
                          }}
                          className="rounded-lg p-1.5 text-brand-600 hover:bg-brand-100"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm(`Remover "${s.name}"?`)) return;
                            try {
                              await servicesApi.delete(s.id);
                              setList((prev) => prev.filter((x) => x.id !== s.id));
                              toast.success("Serviço removido");
                            } catch (err) {
                              toast.error(err instanceof Error ? err.message : "Erro ao remover");
                            }
                          }}
                          className="rounded-lg p-1.5 text-destructive hover:bg-rose-50"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-sm text-brand-900/60">
                        <Clock className="size-3.5" /> {s.duration} min
                      </div>
                      <div className="flex items-center gap-0.5 font-serif text-xl font-semibold text-brand-600">
                        <DollarSign className="size-4" />
                        {s.price.toLocaleString("pt-BR")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {open && (
        <ServiceModal
          service={editing}
          onClose={() => setOpen(false)}
          onSave={(s) => {
            setList((prev) => {
              const exists = prev.find((x) => x.id === s.id);
              return exists ? prev.map((x) => (x.id === s.id ? s : x)) : [s, ...prev];
            });
            setOpen(false);
            toast.success(editing ? "Serviço atualizado!" : "Serviço criado!");
          }}
        />
      )}
    </div>
  );
}

function ServiceModal({
  service,
  onClose,
  onSave,
}: {
  service: Service | null;
  onClose: () => void;
  onSave: (s: Service) => void;
}) {
  const PRESET_CATEGORIES = ["Cílios", "Sobrancelha", "Estética", "Perfuração", "Outros"];

  const [name, setName] = useState(service?.name ?? "");
  const [category, setCategory] = useState(service?.category ?? "Cílios");
  const [customCategory, setCustomCategory] = useState(
    service && !PRESET_CATEGORIES.includes(service.category) ? service.category : ""
  );
  const [duration, setDuration] = useState(service?.duration ?? 60);
  const [price, setPrice] = useState(service?.price ?? 100);
  const [loading, setLoading] = useState(false);

  const effectiveCategory = category === "__custom__" ? customCategory.trim() : category;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      toast.error("Nome obrigatório");
      return;
    }
    setLoading(true);
    try {
      if (category === "__custom__" && !customCategory.trim()) {
        toast.error("Digite o nome da categoria");
        setLoading(false);
        return;
      }
      let saved: Service;
      if (service) {
        saved = await servicesApi.update(service.id, { name, category: effectiveCategory, duration, price });
      } else {
        saved = await servicesApi.create({ name, category: effectiveCategory, duration, price });
      }
      onSave(saved);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar serviço");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-brand-900/40 backdrop-blur-sm md:items-center md:p-4">
      <div className="w-full max-w-md animate-float-in rounded-t-3xl bg-card p-6 shadow-2xl md:rounded-3xl md:p-8">
        <div className="mb-6 flex items-start justify-between">
          <h2 className="font-serif text-2xl font-semibold">
            {service ? "Editar serviço" : "Novo serviço"}
          </h2>
          <button onClick={onClose} className="rounded-xl p-2 hover:bg-brand-100">
            <X className="size-4" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Nome">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Lash Lifting"
              className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </Field>
          <Field label="Categoria">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option>Cílios</option>
              <option>Sobrancelha</option>
              <option>Estética</option>
              <option>Perfuração</option>
              <option>Outros</option>
              <option value="__custom__">+ Nova categoria...</option>
            </select>
            {category === "__custom__" && (
              <input
                autoFocus
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Nome da nova categoria"
                className="mt-2 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            )}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Duração (min)">
              <input
                type="number"
                min={5}
                step={5}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </Field>
            <Field label="Preço (R$)">
              <input
                type="number"
                min={0}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </Field>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-brand-900/60">
        {label}
      </label>
      {children}
    </div>
  );
}
