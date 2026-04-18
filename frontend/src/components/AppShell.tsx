import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { authApi, clearToken } from "@/lib/api";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Sparkles,
  Settings,
  Plus,
  Moon,
  Sun,
  Search,
  Bell,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/agenda", label: "Agenda", icon: Calendar },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/servicos", label: "Serviços", icon: Sparkles },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
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
            className="fixed inset-0 z-40 bg-brand-900/40 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
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
            <div className="relative hidden md:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-brand-900/40" />
              <input
                type="text"
                placeholder="Buscar clientes, serviços..."
                className="h-10 w-72 rounded-xl border border-border bg-card pl-9 pr-3 text-sm placeholder:text-brand-900/40 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
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

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-xl border border-border bg-card p-2.5 transition-colors hover:bg-brand-100"
      >
        <Bell className="size-4" />
        <span className="absolute right-2 top-2 size-2 rounded-full bg-brand-500" />
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-72 rounded-2xl border border-border bg-card p-5 shadow-lg">
          <p className="text-sm font-semibold">Notificações</p>
          <p className="mt-3 text-xs text-brand-900/50">
            Em breve: você receberá alertas de novos agendamentos, cancelamentos e confirmações diretamente aqui.
          </p>
        </div>
      )}
    </div>
  );
}

function SidebarContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: user } = useQuery({ queryKey: ["me"], queryFn: authApi.me });
  const initials = user?.studio_name
    ? user.studio_name.split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase()
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
}: {
  title: string;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}) {
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
