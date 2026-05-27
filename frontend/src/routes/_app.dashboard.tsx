import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, PrimaryButton, SecondaryButton } from "@/components/AppShell";
import { dashboardApi, authApi } from "@/lib/api";
import type { DashboardData } from "@/lib/api";
import { statusStyles, statusLabels } from "@/lib/mock-data";
import { appointmentsApi } from "@/lib/api";
import type { Appointment } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  TrendingUp,
  Users,
  DollarSign,
  MessageCircle,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
});

function saudacao(nome: string) {
  const h = new Date().getHours();
  const primeiro = nome.split(" ")[0];
  if (h >= 5 && h < 12) return `Bom dia, ${primeiro}`;
  if (h >= 12 && h < 15) return `Boa tarde, ${primeiro}`;
  if (h >= 15 && h < 18) return `Uma tarde produtiva, ${primeiro}`;
  if (h >= 18 && h < 21) return `Boa noite, ${primeiro}`;
  if (h >= 21 || h < 5) return `Ainda acordada, ${primeiro}?`;
  return `Olá, ${primeiro}`;
}

function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [todayApts, setTodayApts] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: user } = useQuery({ queryKey: ["me"], queryFn: authApi.me });

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    Promise.all([dashboardApi.get(), appointmentsApi.list({ date: today })])
      .then(([dash, apts]) => {
        setData(dash);
        setTodayApts(apts);
      })
      .catch(() => toast.error("Erro ao carregar dashboard"))
      .finally(() => setLoading(false));
  }, [today]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-brand-900/40">
        <Loader2 className="size-8 animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const { stats, revenueWeek, popularServices } = data;
  const maxRev = Math.max(...revenueWeek.map((d) => d.value), 1);

  const kpis = [
    {
      label: "Atendimentos hoje",
      value: stats.todayAppointments,
      icon: Calendar,
      trend: "hoje",
      trendUp: true,
    },
    {
      label: "Próximos agendamentos",
      value: stats.upcoming,
      icon: TrendingUp,
      trend: "esta semana",
      trendUp: true,
    },
    {
      label: "Clientes cadastradas",
      value: stats.totalClients,
      icon: Users,
      trend: `+${stats.newClients} este mês`,
      trendUp: true,
    },
    {
      label: "Faturamento hoje",
      value: `R$ ${stats.estimatedRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      trend: `R$ ${stats.weekRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} na semana`,
      trendUp: true,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title={saudacao(user?.name ?? "profissional")}
        subtitle={
          <>
            Hoje você tem{" "}
            <span className="font-semibold text-brand-600">{todayApts.length} agendamentos</span>.
            Tudo sob controle.
          </>
        }
        action={
          <div className="flex items-center gap-3">
            <Link to="/agenda">
              <SecondaryButton>Ver agenda</SecondaryButton>
            </Link>
            <Link to="/agenda">
              <PrimaryButton>Novo agendamento</PrimaryButton>
            </Link>
          </div>
        }
      />

      {/* KPIs */}
      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k, i) => (
          <div
            key={k.label}
            className="animate-float-in rounded-3xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-brand-900/60">{k.label}</p>
              <div className="flex size-9 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
                <k.icon className="size-4" />
              </div>
            </div>
            <h3 className="font-serif text-3xl font-semibold">{k.value}</h3>
            <p className="mt-2 text-xs font-medium text-emerald-600">
              <span>↑</span> {k.trend}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        {/* Appointments */}
        <div className="xl:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-serif text-xl font-semibold">Atendimentos de hoje</h2>
            <Link
              to="/agenda"
              className="flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline"
            >
              Ver todos <ArrowRight className="size-3.5" />
            </Link>
          </div>

          {todayApts.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-4">
              {todayApts.map((a, i) => (
                <div
                  key={a.id}
                  className="group flex animate-float-in flex-col gap-4 rounded-2xl border border-border bg-card p-5 transition-all hover:border-brand-300 hover:shadow-md md:flex-row md:items-center md:gap-6"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="flex items-center gap-4 md:flex-col md:items-center md:gap-0 md:min-w-16 md:text-center">
                    <p className="font-serif text-2xl font-bold md:text-lg">{a.time}</p>
                    <p className="text-xs uppercase tracking-tight text-brand-900/40">
                      {a.duration} min
                    </p>
                  </div>
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-100 font-serif font-semibold text-brand-600">
                    {a.clientInitials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold">{a.client_name}</h4>
                    <p className="truncate text-sm text-brand-900/50">{a.service_name}</p>
                  </div>
                  <div className="flex items-center justify-between gap-3 md:flex-col md:items-end">
                    <span
                      className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-tight ${statusStyles[a.status]}`}
                    >
                      {statusLabels[a.status]}
                    </span>
                    <button
                      onClick={() => toast.success("Abrindo WhatsApp...")}
                      className="flex items-center gap-1 text-xs font-semibold text-brand-600/70 hover:text-brand-600"
                    >
                      <MessageCircle className="size-3" /> WhatsApp
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Revenue chart */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-brand-900">
                Faturamento
              </h3>
              <span className="text-xs font-semibold text-brand-600">7 dias</span>
            </div>
            <p className="mb-5 font-serif text-2xl font-semibold">
              R$ {stats.weekRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
            <div className="flex h-32 items-end gap-2">
              {revenueWeek.map((d) => (
                <div key={d.day} className="group flex flex-1 flex-col items-center gap-2">
                  <div className="relative flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-brand-300 to-brand-500 transition-all group-hover:from-brand-500 group-hover:to-brand-600"
                      style={{
                        height: `${(d.value / maxRev) * 100}%`,
                        minHeight: d.value > 0 ? "4px" : "0",
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-brand-900/50">{d.day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quote card */}
          <DicaDoDia />

          {/* Popular services */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-brand-900">
              Serviços populares
            </h3>
            {popularServices.length === 0 ? (
              <p className="text-sm text-brand-900/50">Nenhum agendamento ainda.</p>
            ) : (
              <div className="space-y-3">
                {popularServices.map((s) => (
                  <div key={s.name} className="flex items-center justify-between text-sm">
                    <span>{s.name}</span>
                    <span className="rounded-md bg-brand-100 px-2 py-0.5 text-xs font-bold text-brand-600">
                      {s.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card p-12 text-center">
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-brand-100">
        <Calendar className="size-7 text-brand-600" />
      </div>
      <h3 className="font-serif text-xl font-semibold">Nenhum atendimento hoje</h3>
      <p className="mt-1 max-w-sm text-sm text-brand-900/50">
        Aproveite para descansar ou criar um novo agendamento para preencher sua agenda.
      </p>
    </div>
  );
}

const dicas = [
  {
    curta: "Cliente satisfeita não precisa de desconto — precisa de data marcada.",
    completa: "A fidelização vem do relacionamento, não do preço. Quando a cliente sai feliz, ela já está pensando no próximo agendamento. Facilite isso com lembretes e confirmações automáticas.",
  },
  {
    curta: "Se a cliente pediu 'natural', prepare-se para refazer três vezes.",
    completa: "O famoso 'natural' é um dos pedidos mais subjetivos da beleza. Invista em consultas rápidas antes do procedimento para alinhar expectativas e evitar retrabalho.",
  },
  {
    curta: "Agenda cheia é resultado de atendimento caprichado, não de sorte.",
    completa: "Profissionais com agenda lotada raramente chegam lá por acidente. É consistência, capricho no detalhe e atenção genuína à cliente que geram indicações espontâneas.",
  },
  {
    curta: "O fio de sobrancelha que você não tirou hoje vai aparecer na foto de amanhã.",
    completa: "Atenção aos detalhes é o que separa um bom atendimento de um atendimento inesquecível. A cliente pode não notar o que você fez, mas vai notar o que você deixou de fazer.",
  },
  {
    curta: "Fidelização começa no WhatsApp: uma mensagem de confirmação já faz diferença.",
    completa: "Comunicação proativa transmite profissionalismo. Confirmar o agendamento com antecedência reduz faltas e mostra que você valoriza o tempo da cliente — e o seu.",
  },
  {
    curta: "Sua melhor vitrine é a cliente saindo pela porta sorrindo.",
    completa: "O marketing boca a boca ainda é o mais poderoso no setor de beleza. Cada cliente satisfeita é uma potencial divulgadora do seu trabalho no círculo social dela.",
  },
  {
    curta: "Não subestime o poder de lembrar o nome da cliente na segunda visita.",
    completa: "Pequenos gestos de personalização criam uma conexão emocional forte. Use as anotações do perfil da cliente para surpreendê-la com detalhes que mostram que você se importa.",
  },
  {
    curta: "Foto boa de resultado vale mais que dez posts de frase motivacional.",
    completa: "No setor de beleza, o portfólio é tudo. Invista em boa iluminação e peça permissão para fotografar o resultado. Antes e depois bem feitos geram muito mais engajamento.",
  },
  {
    curta: "Cliente que cancela em cima da hora não é cliente — é um treino de paciência.",
    completa: "Estabeleça uma política de cancelamento clara e gentil. Comunicar com antecedência protege sua agenda e educa a clientela sobre o valor do seu tempo.",
  },
  {
    curta: "Manter a agenda organizada é autocuidado profissional.",
    completa: "Uma agenda bagunçada gera estresse, atrasos e impressão de amadorismo. Organizar seus horários é respeitar a si mesma e às suas clientes.",
  },
  {
    curta: "O estudo nunca para — nem na área da beleza.",
    completa: "Tendências mudam rápido. Profissionais que investem em capacitação constante se destacam e conseguem cobrar mais pelo diferencial de técnica e conhecimento.",
  },
  {
    curta: "Precificação errada é trabalho grátis com etiqueta de preço.",
    completa: "Calcule seus custos fixos, variáveis, tempo e margem de lucro. Cobrar pouco desvaloriza seu trabalho e insustenta o negócio. Cliente que valoriza seu trabalho paga o preço justo.",
  },
  {
    curta: "Retorno de cliente é mais barato que conquistar uma nova.",
    completa: "Estratégias de retenção como lembretes de retorno, programas de fidelidade e atendimento personalizado custam menos do que aquisição de novas clientes e geram receita mais previsível.",
  },
  {
    curta: "Glitter é lindo até você encontrá-lo seis meses depois em lugares inexplicáveis.",
    completa: "Organização do espaço de trabalho é parte do atendimento. Um estúdio limpo, cheiroso e bem organizado já passa confiança antes mesmo de você pegar no pincel.",
  },
  {
    curta: "Uma avaliação no Google vale mais que um outdoor.",
    completa: "Peça avaliações às clientes satisfeitas — muitas esquecem mas fazem de bom grado quando solicitadas. Presença digital sólida é fundamental para atrair novas clientes na sua região.",
  },
];

function DicaDoDia() {
  const [expandida, setExpandida] = useState(false);
  const dica = dicas[new Date().getDate() % dicas.length];

  return (
    <div className="relative overflow-hidden rounded-3xl bg-brand-900 p-8 text-white">
      <div className="absolute -right-10 -bottom-10 size-40 rounded-full bg-brand-500/20 blur-3xl" />
      <div className="relative z-10">
        <h3 className="mb-2 font-serif text-lg italic">Dica do dia</h3>
        <p className="mb-4 text-sm leading-relaxed text-white/70">
          "{dica.curta}"
        </p>
        {expandida && (
          <p className="mb-4 text-sm leading-relaxed text-white/90">
            {dica.completa}
          </p>
        )}
        <button
          onClick={() => setExpandida((v) => !v)}
          className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold transition-colors hover:bg-white/20"
        >
          {expandida ? "Fechar" : "Ler mais"}
        </button>
      </div>
    </div>
  );
}
