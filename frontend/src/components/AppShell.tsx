import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { authApi, clearToken, notificationsApi } from "@/lib/api";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Sparkles,
  Settings,
  Plus,
  Moon,
  Sun,
  Bell,
  Menu,
  X,
  LogOut,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/agenda", label: "Agenda", icon: Calendar },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/servicos", label: "Serviços", icon: Sparkles },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const location = useLocation();
  const [dark, setDark] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 z-30 hidden h-full w-64 flex-col border-r border-border bg-card px-5 py-7 lg:flex">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <>
          <div
            role="button"
            tabIndex={0}
            className="fixed inset-0 z-40 bg-brand-900/40 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
            onKeyDown={(e) => e.key === "Enter" && setMobileOpen(false)}
          />
          <aside className="fixed left-0 top-0 z-50 flex h-full w-72 flex-col border-r border-border bg-card px-5 py-7 lg:hidden animate-float-in">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-2 hover:bg-brand-100"
            >
              <X className="size-5" />
            </button>
            <SidebarContent />
          </aside>
        </>
      )}

      {/* Main */}
      <div className="lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-border bg-background/80 px-4 backdrop-blur-md md:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 hover:bg-brand-100 lg:hidden"
            >
              <Menu className="size-5" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDark((v) => !v)}
              className="rounded-xl border border-border bg-card p-2.5 transition-colors hover:bg-brand-100"
              aria-label="Alternar tema"
            >
              {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            <NotificationButton />
          </div>
        </header>

        <main className="p-4 pb-24 md:p-8 lg:pb-8">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 z-30 flex w-full items-center justify-around border-t border-border bg-card/95 py-2 backdrop-blur-md lg:hidden">
        {nav.slice(0, 5).map(({ to, label, icon: Icon }) => {
          const active =
            location.pathname === to || (to === "/dashboard" && location.pathname === "/");
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[10px] font-medium transition-colors",
                active ? "text-brand-600" : "text-brand-900/50",
              )}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function NotificationButton() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // atualiza sozinho a cada minuto
  const { data: items = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: notificationsApi.list,
    refetchInterval: 60_000,
  });

  // "lido" fica no navegador: tudo que mudou depois da ultima vez que abriu o sino e novo
  const [lastSeen, setLastSeen] = useState(() => readLastSeen());
  const unread = items.filter((n) => new Date(n.at).getTime() > lastSeen).length;

  function toggle() {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen) {
      const now = Date.now();
      try {
        localStorage.setItem(LAST_SEEN_KEY, String(now));
      } catch {
        // sem localStorage o sino so nao lembra o que ja foi visto
      }
      // espera fechar pra apagar o destaque dos novos
      setTimeout(() => setLastSeen(now), 3000);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggle}
        aria-label="Notificações"
        className="relative rounded-xl border border-border bg-card p-2.5 transition-colors hover:bg-brand-100"
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-80 rounded-2xl border border-border bg-card p-5 shadow-lg">
          <p className="text-sm font-semibold">Notificações</p>
          {items.length === 0 ? (
            <p className="mt-3 text-xs text-brand-900/50">
              Nenhuma confirmação ou cancelamento nos últimos 7 dias.
            </p>
          ) : (
            <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto">
              {items.map((n) => {
                const isNew = new Date(n.at).getTime() > lastSeen;
                const [, m, d] = n.date.split("-");
                return (
                  <li
                    key={n.id}
                    className={cn(
                      "flex items-start gap-3 rounded-xl p-2 text-xs",
                      isNew && "bg-brand-50",
                    )}
                  >
                    {n.type === "confirmado" ? (
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                    ) : (
                      <XCircle className="mt-0.5 size-4 shrink-0 text-red-500" />
                    )}
                    <div>
                      <p>
                        <span className="font-semibold">{n.client_name}</span>{" "}
                        {n.type === "confirmado" ? "confirmou" : "cancelou"} o horário de {d}/{m} às{" "}
                        {n.time}
                      </p>
                      <p className="mt-0.5 text-brand-900/50">{timeAgo(n.at)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

const LAST_SEEN_KEY = "sf_notifications_seen";

function readLastSeen(): number {
  try {
    return Number(localStorage.getItem(LAST_SEEN_KEY)) || 0;
  } catch {
    return 0;
  }
}

function timeAgo(iso: string): string {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "ontem" : `há ${d} dias`;
}

function SidebarContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: user } = useQuery({ queryKey: ["me"], queryFn: authApi.me });
  const initials = user?.studio_name
    ? user.studio_name
        .split(" ")
        .slice(0, 2)
        .map((w: string) => w[0])
        .join("")
        .toUpperCase()
    : "SF";

  function logout() {
    clearToken();
    navigate({ to: "/" });
  }

  return (
    <>
      <Link to="/dashboard" className="mb-10 flex items-center gap-3 px-2">
        <div className="flex size-9 items-center justify-center rounded-xl bg-brand-500 font-serif text-xl italic text-white shadow-md shadow-brand-500/30">
          S
        </div>
        <span className="font-serif text-xl font-semibold tracking-tight">StudioFlow</span>
      </Link>

      <nav className="space-y-1">
        {nav.map(({ to, label, icon: Icon }) => {
          const active =
            location.pathname === to || (to === "/dashboard" && location.pathname === "/");
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-brand-100 text-brand-600"
                  : "text-brand-900/60 hover:bg-brand-50 hover:text-brand-900",
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3">
        <div className="flex items-center gap-3 px-2">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-200 font-serif text-sm font-semibold text-brand-700 ring-1 ring-black/5">
            {initials}
          </div>
          <div className="min-w-0 overflow-hidden">
            <p className="truncate text-sm font-semibold">{user?.studio_name ?? "StudioFlow"}</p>
            <p className="truncate text-xs text-brand-900/50">{user?.email ?? ""}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-brand-900/60 transition-all hover:bg-rose-50 hover:text-rose-600"
        >
          <LogOut className="size-4" />
          Sair
        </button>
      </div>
    </>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: Readonly<{
  title: string;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}>) {
  return (
    <header className="mb-8 flex flex-col gap-4 md:mb-10 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="font-serif text-3xl font-semibold md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-brand-900/50">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function PrimaryButton({
  children,
  icon: Icon = Plus,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 transition-all hover:bg-brand-500 active:scale-[0.98]",
        props.className,
      )}
    >
      {Icon && <Icon className="size-4" />}
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-brand-900 transition-all hover:border-brand-300 hover:shadow-sm",
        props.className,
      )}
    >
      {children}
    </button>
  );
}
