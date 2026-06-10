import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/AppShell";
import { settingsApi, profileApi, whatsappApi } from "@/lib/api";
import type { Settings, User } from "@/lib/api";
import { User as UserIcon, MessageCircle, Bell, Sliders, Loader2, AlertCircle, CheckCircle2, WifiOff } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/configuracoes")({
  component: SettingsPage,
});

const sections = [
  { id: "perfil", label: "Perfil", icon: UserIcon },
  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { id: "preferencias", label: "Preferências", icon: Sliders },
  { id: "notificacoes", label: "Notificações", icon: Bell },
];

function SettingsPage() {
  const [active, setActive] = useState("perfil");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    settingsApi
      .get()
      .then(setSettings)
      .catch(() => toast.error("Erro ao carregar configurações"))
      .finally(() => setLoadingSettings(false));
  }, []);

  const saveSettings = async (updated: Partial<Settings>) => {
    if (!settings) return;
    const merged = { ...settings, ...updated };
    setSettings(merged);
    try {
      const saved = await settingsApi.update(merged);
      setSettings(saved);
      toast.success("Configurações salvas!");
    } catch {
      toast.error("Erro ao salvar configurações");
    }
  };

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Configurações" subtitle="Personalize sua experiência no StudioFlow." />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[220px_1fr]">
        <nav className="space-y-1">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all ${
                active === s.id
                  ? "bg-brand-100 text-brand-600"
                  : "text-brand-900/60 hover:bg-brand-50"
              }`}
            >
              <s.icon className="size-4" />
              {s.label}
            </button>
          ))}
        </nav>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm md:p-8">
          {loadingSettings ? (
            <div className="flex items-center justify-center py-16 text-brand-900/40">
              <Loader2 className="size-6 animate-spin" />
            </div>
          ) : (
            <>
              {active === "perfil" && <PerfilSection />}
              {active === "whatsapp" && settings && (
                <WhatsAppSection settings={settings} onChange={saveSettings} />
              )}
              {active === "preferencias" && settings && (
                <PreferencesSection settings={settings} onChange={saveSettings} />
              )}
              {active === "notificacoes" && settings && (
                <NotificationsSection settings={settings} onChange={saveSettings} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PerfilSection() {
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [studio, setStudio] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    import("@/lib/api")
      .then(({ authApi }) => authApi.me())
      .then((u) => {
        setUser(u);
        setName(u.name);
        setEmail(u.email);
        setStudio(u.studio_name);
      })
      .catch(() => toast.error("Erro ao carregar perfil"))
      .finally(() => setFetching(false));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updated = await profileApi.update({
        name,
        email,
        studio_name: studio,
        ...(password ? { password } : {}),
      });
      setUser(updated);
      setPassword("");
      toast.success("Perfil atualizado!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-16 text-brand-900/40">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <form onSubmit={save}>
      <h2 className="mb-1 font-serif text-2xl font-semibold">Perfil</h2>
      <p className="mb-8 text-sm text-brand-900/50">Informações do seu estúdio e da sua conta.</p>

      <div className="mb-8 flex items-center gap-5">
        <div className="flex size-20 items-center justify-center rounded-full bg-brand-100 font-serif text-2xl font-semibold text-brand-600">
          {initials}
        </div>
        <div>
          <p className="text-sm font-semibold">{user?.name}</p>
          <p className="mt-1 text-xs text-brand-900/50">{user?.email}</p>
        </div>
      </div>

      <div className="space-y-4">
        <Field label="Nome">
          <Input value={name} onChange={setName} />
        </Field>
        <Field label="Nome do estúdio">
          <Input value={studio} onChange={setStudio} />
        </Field>
        <Field label="E-mail">
          <Input value={email} onChange={setEmail} type="email" />
        </Field>
        <Field label="Nova senha (deixe em branco para manter)">
          <Input value={password} onChange={setPassword} type="password" placeholder="••••••••" />
        </Field>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-8 flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 hover:bg-brand-500 disabled:opacity-70"
      >
        {loading && <Loader2 className="size-4 animate-spin" />}
        {loading ? "Salvando..." : "Salvar alterações"}
      </button>
    </form>
  );
}

const DEFAULT_CONFIRMATION =
  `Oi {nome}! Agendamento confirmado 🤎\n\n*{servico}*\n{data} às {horario}\n\nQualquer coisa é só me chamar!`;

const DEFAULT_REMINDER =
  `Oi {nome}! Passando pra lembrar do seu horário amanhã 🤎\n\n*{servico}* às {horario}\n\nMe responde *SIM* pra confirmar ou *NÃO* pra cancelar`;

const DEFAULT_RESCHEDULE =
  `Oi {nome}! Precisei reagendar o seu horário 🤎\n\n*{servico}*\n{data} às {horario}\n\nQualquer dúvida é só falar!`;

function WhatsAppConnection() {
  const [status, setStatus] = useState<"loading" | "connected" | "disconnected">("loading");
  const [qr, setQr] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    whatsappApi.getStatus()
      .then((s) => setStatus(s.connected ? "connected" : "disconnected"))
      .catch(() => setStatus("disconnected"));
  }, []);

  // poll status enquanto QR está visível
  useEffect(() => {
    if (!qr) return;
    const id = setInterval(async () => {
      try {
        const s = await whatsappApi.getStatus();
        if (s.connected) {
          setQr(null);
          setStatus("connected");
          setConnecting(false);
          toast.success("WhatsApp conectado!");
        }
      } catch {}
    }, 3000);
    return () => clearInterval(id);
  }, [qr]);

  async function handleConnect() {
    setConnecting(true);
    try {
      await whatsappApi.connect();
      // pequena pausa pra instância inicializar
      await new Promise((r) => setTimeout(r, 2000));
      const qrData = await whatsappApi.getQrCode();
      const base64 = qrData.base64 ?? "";
      if (!base64) {
        // pode já estar conectado
        const s = await whatsappApi.getStatus();
        if (s.connected) { setStatus("connected"); setConnecting(false); return; }
        toast.error("Não foi possível gerar o QR code. Tente novamente.");
        setConnecting(false);
        return;
      }
      setQr(base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`);
    } catch {
      toast.error("Erro ao iniciar conexão");
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await whatsappApi.deleteInstance();
      setStatus("disconnected");
      setQr(null);
      toast.success("WhatsApp desconectado");
    } catch {
      toast.error("Erro ao desconectar");
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div className="mb-10 rounded-2xl border border-border bg-card p-6">
      <h3 className="mb-1 font-semibold">Conexão WhatsApp</h3>

      {status === "loading" && (
        <div className="flex items-center gap-2 text-sm text-brand-900/50">
          <Loader2 className="size-4 animate-spin" /> Verificando...
        </div>
      )}

      {status === "connected" && !qr && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-emerald-600">
            <CheckCircle2 className="size-4" /> Conectado
          </div>
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="flex items-center gap-1.5 rounded-xl border border-rose-200 px-4 py-2 text-xs font-medium text-rose-500 hover:bg-rose-50 disabled:opacity-60"
          >
            {disconnecting && <Loader2 className="size-3 animate-spin" />}
            Desconectar
          </button>
        </div>
      )}

      {status === "disconnected" && !qr && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-brand-900/40">
            <WifiOff className="size-4" /> Não conectado
          </div>
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow shadow-brand-600/20 hover:bg-brand-500 disabled:opacity-60"
          >
            {connecting && <Loader2 className="size-3 animate-spin" />}
            {connecting ? "Aguarde..." : "Conectar WhatsApp"}
          </button>
        </div>
      )}

      {qr && (
        <div className="mt-4 flex flex-col items-center gap-3">
          <p className="text-sm text-brand-900/60">Escaneie com o WhatsApp do celular</p>
          <img src={qr} alt="QR Code WhatsApp" className="size-56 rounded-xl border border-border" />
          <p className="text-xs text-brand-900/40">Aguardando leitura...</p>
        </div>
      )}
    </div>
  );
}

function WhatsAppSection({
  settings,
  onChange,
}: {
  settings: Settings;
  onChange: (s: Partial<Settings>) => void;
}) {
  const [confirmation, setConfirmation] = useState(settings.wa_msg_confirmation ?? DEFAULT_CONFIRMATION);
  const [reminder, setReminder] = useState(settings.wa_msg_reminder ?? DEFAULT_REMINDER);
  const [reschedule, setReschedule] = useState(settings.wa_msg_reschedule ?? DEFAULT_RESCHEDULE);
  const [saving, setSaving] = useState(false);

  const reminderMissingSim = !/\bsim\b/i.test(reminder);
  const reminderMissingNao = !/\bn[aã]o\b/i.test(reminder);

  async function save() {
    setSaving(true);
    try {
      await onChange({
        wa_msg_confirmation: confirmation || null,
        wa_msg_reminder: reminder || null,
        wa_msg_reschedule: reschedule || null,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2 className="mb-1 font-serif text-2xl font-semibold">WhatsApp</h2>
      <WhatsAppConnection />
      <h3 className="mb-1 font-semibold">Mensagens automáticas</h3>
      <p className="mb-2 text-sm text-brand-900/50">
        Personalize o texto enviado automaticamente para suas clientes.
      </p>
      <p className="mb-8 text-xs text-brand-900/40">
        Variáveis disponíveis: <code className="rounded bg-brand-50 px-1">{"{nome}"}</code>{" "}
        <code className="rounded bg-brand-50 px-1">{"{servico}"}</code>{" "}
        <code className="rounded bg-brand-50 px-1">{"{data}"}</code>{" "}
        <code className="rounded bg-brand-50 px-1">{"{horario}"}</code>
      </p>

      <div className="space-y-6">
        <Field label="Confirmação de agendamento">
          <Textarea value={confirmation} onChange={setConfirmation} rows={4} />
        </Field>

        <Field label="Lembrete 12h antes">
          <Textarea value={reminder} onChange={setReminder} rows={4} />
          {(reminderMissingSim || reminderMissingNao) && (
            <div className="mt-2 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-700">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
              <span>
                O lembrete precisa conter <strong>SIM</strong> e <strong>NÃO</strong> para que o sistema reconheça a resposta da cliente.
              </span>
            </div>
          )}
        </Field>

        <Field label="Reagendamento">
          <Textarea value={reschedule} onChange={setReschedule} rows={4} />
        </Field>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="mt-8 flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 hover:bg-brand-500 disabled:opacity-70"
      >
        {saving && <Loader2 className="size-4 animate-spin" />}
        {saving ? "Salvando..." : "Salvar mensagens"}
      </button>
    </div>
  );
}

function PreferencesSection({
  settings,
  onChange,
}: {
  settings: Settings;
  onChange: (s: Partial<Settings>) => void;
}) {
  return (
    <div>
      <h2 className="mb-1 font-serif text-2xl font-semibold">Preferências</h2>
      <p className="mb-8 text-sm text-brand-900/50">Ajuste o funcionamento do StudioFlow.</p>

      <div className="space-y-3">
        <Toggle
          label="Tema escuro automático"
          value={!!settings.pref_dark_auto}
          onChange={(v) => onChange({ pref_dark_auto: v ? 1 : 0 })}
        />
        <Toggle
          label="Mostrar valores na agenda"
          value={!!settings.pref_show_values}
          onChange={(v) => onChange({ pref_show_values: v ? 1 : 0 })}
        />
        <Toggle
          label="Bloquear horários de almoço"
          value={!!settings.pref_block_lunch}
          onChange={(v) => onChange({ pref_block_lunch: v ? 1 : 0 })}
        />
        <Toggle
          label="Permitir agendamentos no domingo"
          value={!!settings.pref_allow_sunday}
          onChange={(v) => onChange({ pref_allow_sunday: v ? 1 : 0 })}
        />
      </div>
    </div>
  );
}

function NotificationsSection({
  settings,
  onChange,
}: {
  settings: Settings;
  onChange: (s: Partial<Settings>) => void;
}) {
  return (
    <div>
      <h2 className="mb-1 font-serif text-2xl font-semibold">Notificações</h2>
      <p className="mb-8 text-sm text-brand-900/50">Escolha quando quer ser avisada.</p>

      <div className="space-y-3">
        <Toggle
          label="Novo agendamento"
          value={!!settings.notify_new}
          onChange={(v) => onChange({ notify_new: v ? 1 : 0 })}
        />
        <Toggle
          label="Cancelamento"
          value={!!settings.notify_cancel}
          onChange={(v) => onChange({ notify_cancel: v ? 1 : 0 })}
        />
        <Toggle
          label="Confirmação de cliente"
          value={!!settings.notify_confirm}
          onChange={(v) => onChange({ notify_confirm: v ? 1 : 0 })}
        />
        <Toggle
          label="Resumo diário por e-mail"
          value={!!settings.notify_daily_email}
          onChange={(v) => onChange({ notify_daily_email: v ? 1 : 0 })}
        />
        <Toggle
          label="Relatório semanal"
          value={!!settings.notify_weekly}
          onChange={(v) => onChange({ notify_weekly: v ? 1 : 0 })}
        />
      </div>
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="flex w-full items-center justify-between rounded-2xl border border-border bg-card p-4 text-left hover:bg-brand-50"
    >
      <span className="text-sm font-medium">{label}</span>
      <div
        className={`relative h-6 w-11 rounded-full transition-colors ${value ? "bg-brand-500" : "bg-brand-200"}`}
      >
        <div
          className={`absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform ${
            value ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </div>
    </button>
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

function Input({
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
    />
  );
}

function Textarea({
  value,
  onChange,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <textarea
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm leading-relaxed focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-none"
    />
  );
}
