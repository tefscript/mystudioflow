import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { PageHeader, PrimaryButton } from "@/components/AppShell";
import { statusLabels, statusStyles } from "@/lib/mock-data";
import { appointmentsApi, clientsApi, servicesApi } from "@/lib/api";
import type { Appointment, Client, Service } from "@/lib/api";
import { ChevronLeft, ChevronRight, Loader2, Phone, X, Calendar, Clock, User, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/agenda")({
  component: AgendaPage,
});

// ── constants ──────────────────────────────────────────────
type ViewMode = "day" | "week" | "month";
const HOUR_H = 72;
const START_H = 0;
const END_H = 24;
const HOURS = Array.from({ length: END_H - START_H }, (_, i) => START_H + i);
const TOTAL_H = HOURS.length * HOUR_H + 16;
const WEEK_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const MONTH_NAMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const SNAP_MIN = 15; // snap de 15 em 15 minutos

// ── helpers ────────────────────────────────────────────────
function toISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function aptTop(time: string) {
  const [h, m] = time.split(":").map(Number);
  return 16 + (h * 60 + m) / 60 * HOUR_H;
}

function aptHeight(duration: number) {
  return Math.max((duration / 60) * HOUR_H, 28);
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function startOfWeek(d: Date) {
  const day = d.getDay();
  return addDays(d, -(day === 0 ? 6 : day - 1));
}

function getMonthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const firstDow = first.getDay() === 0 ? 6 : first.getDay() - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array(firstDow).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function isToday(d: Date) {
  return toISO(d) === toISO(new Date());
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

// converte offsetY dentro do grid em horário snapped
function pxToTime(py: number): string {
  const totalMin = Math.max(0, Math.min((py - 16) / HOUR_H * 60, END_H * 60 - SNAP_MIN));
  const snapped = Math.round(totalMin / SNAP_MIN) * SNAP_MIN;
  const h = Math.floor(snapped / 60);
  const m = snapped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// ── main page ──────────────────────────────────────────────
function AgendaPage() {
  const [view, setView] = useState<ViewMode>("day");
  const [baseDate, setBaseDate] = useState(new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [defaultTime, setDefaultTime] = useState<string | undefined>();
  const [detailApt, setDetailApt] = useState<Appointment | null>(null);
  const [editApt, setEditApt] = useState<Appointment | null>(null);
  const [newAptSaved, setNewAptSaved] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setNewAptSaved((k) => k + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  function navigate(dir: -1 | 1) {
    if (view === "day") setBaseDate((d) => addDays(d, dir));
    else if (view === "week") setBaseDate((d) => addDays(d, dir * 7));
    else setBaseDate((d) => {
      const r = new Date(d);
      r.setMonth(r.getMonth() + dir);
      return r;
    });
  }

  function openNew(time?: string) {
    setDefaultTime(time);
    setModalOpen(true);
  }

  const navLabel =
    view === "day"
      ? baseDate.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })
      : view === "week"
      ? (() => {
          const mon = startOfWeek(baseDate);
          const sun = addDays(mon, 6);
          return `${mon.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} – ${sun.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}`;
        })()
      : `${MONTH_NAMES[baseDate.getMonth()]} ${baseDate.getFullYear()}`;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Agenda"
        subtitle="Visualize, crie e gerencie seus atendimentos."
        action={<PrimaryButton onClick={() => openNew()}>Novo agendamento</PrimaryButton>}
      />

      {/* Controls */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex gap-1 rounded-xl bg-brand-100 p-1 w-fit">
          {(["day", "week", "month"] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "rounded-lg px-4 py-1.5 text-sm font-semibold transition-all",
                view === v ? "bg-white shadow text-brand-700" : "text-brand-900/50 hover:text-brand-700"
              )}
            >
              {v === "day" ? "Dia" : v === "week" ? "Semana" : "Mês"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="rounded-xl p-2 hover:bg-brand-100">
            <ChevronLeft className="size-4" />
          </button>
          <p className="min-w-52 text-center font-serif text-base font-semibold capitalize">{navLabel}</p>
          <button onClick={() => navigate(1)} className="rounded-xl p-2 hover:bg-brand-100">
            <ChevronRight className="size-4" />
          </button>
          <button
            onClick={() => setBaseDate(new Date())}
            className="rounded-xl border border-border bg-card px-4 py-1.5 text-sm font-semibold hover:bg-brand-100"
          >
            Hoje
          </button>
        </div>
      </div>

      {view === "day" && (
        <DayView
          date={baseDate}
          refreshKey={newAptSaved}
          onNewAt={openNew}
          onDetail={setDetailApt}
        />
      )}
      {view === "week" && (
        <WeekView
          baseDate={baseDate}
          refreshKey={newAptSaved}
          onNewAt={openNew}
          onDetail={setDetailApt}
          onDayClick={(d) => { setBaseDate(d); setView("day"); }}
        />
      )}
      {view === "month" && (
        <MonthView
          baseDate={baseDate}
          refreshKey={newAptSaved}
          onDayClick={(d) => { setBaseDate(d); setView("day"); }}
        />
      )}

      {modalOpen && (
        <AppointmentModal
          onClose={() => setModalOpen(false)}
          defaultDate={toISO(baseDate)}
          defaultTime={defaultTime}
          onSave={(apt) => {
            setModalOpen(false);
            setNewAptSaved((n) => n + 1);
            toast.success("Agendamento criado!", { description: `${apt.client_name} às ${apt.time}` });
          }}
        />
      )}

      {editApt && (
        <AppointmentModal
          apt={editApt}
          onClose={() => setEditApt(null)}
          defaultDate={editApt.date}
          defaultTime={editApt.time}
          onSave={(updated) => {
            setEditApt(null);
            setDetailApt(updated);
            setNewAptSaved((n) => n + 1);
            toast.success("Agendamento atualizado!");
          }}
        />
      )}

      {detailApt && (
        <AptDetailModal
          apt={detailApt}
          onClose={() => setDetailApt(null)}
          onUpdate={(updated) => setDetailApt(updated)}
          onEdit={() => { setEditApt(detailApt); setDetailApt(null); }}
          onDelete={() => { setDetailApt(null); setNewAptSaved((n) => n + 1); }}
        />
      )}
    </div>
  );
}

// ── day view ───────────────────────────────────────────────
function DayView({
  date,
  refreshKey,
  onNewAt,
  onDetail,
}: {
  date: Date;
  refreshKey: number;
  onNewAt: (time?: string) => void;
  onDetail: (apt: Appointment) => void;
}) {
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    appointmentsApi
      .list({ date: toISO(date) })
      .then(setItems)
      .catch(() => toast.error("Erro ao carregar agendamentos"))
      .finally(() => setLoading(false));
  }, [toISO(date), refreshKey]);

  useEffect(() => {
    if (!loading && scrollRef.current) {
      scrollRef.current.scrollTop = 8 * HOUR_H;
    }
  }, [loading]);

  const handleDrop = useCallback(async (aptId: string, newTime: string) => {
    const apt = items.find((a) => a.id === aptId);
    if (!apt || apt.time === newTime) return;
    try {
      const updated = await appointmentsApi.update(aptId, { time: newTime });
      setItems((prev) => prev.map((a) => (a.id === aptId ? updated : a)));
      toast.success(`Horário alterado para ${newTime}`);
    } catch {
      toast.error("Erro ao mover agendamento");
    }
  }, [items]);

  return (
    <div className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden">
      {loading ? (
        <div className="flex items-center justify-center py-20 text-brand-900/40">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : (
        <div ref={scrollRef} className="overflow-y-auto" style={{ maxHeight: "70vh" }}>
          <TimeGrid
            appointments={items}
            onNewAt={onNewAt}
            onDetail={onDetail}
            onUpdate={(updated) => setItems((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))}
            onDrop={handleDrop}
          />
        </div>
      )}
    </div>
  );
}

// ── week view ──────────────────────────────────────────────
function WeekView({
  baseDate,
  refreshKey,
  onNewAt,
  onDetail,
  onDayClick,
}: {
  baseDate: Date;
  refreshKey: number;
  onNewAt: (time?: string) => void;
  onDetail: (apt: Appointment) => void;
  onDayClick: (d: Date) => void;
}) {
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(baseDate), i));
  const [aptsByDay, setAptsByDay] = useState<Record<string, Appointment[]>>({});
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all(weekDays.map((d) => appointmentsApi.list({ date: toISO(d) }).then((apts) => ({ date: toISO(d), apts }))))
      .then((results) => {
        const map: Record<string, Appointment[]> = {};
        results.forEach(({ date, apts }) => { map[date] = apts; });
        setAptsByDay(map);
      })
      .catch(() => toast.error("Erro ao carregar semana"))
      .finally(() => setLoading(false));
  }, [toISO(startOfWeek(baseDate)), refreshKey]);

  useEffect(() => {
    if (!loading && scrollRef.current) {
      scrollRef.current.scrollTop = 8 * HOUR_H;
    }
  }, [loading]);

  const handleDrop = useCallback(async (aptId: string, newTime: string, newDate: string) => {
    // encontra em qual dia está
    let sourceDate = "";
    let apt: Appointment | undefined;
    for (const [d, apts] of Object.entries(aptsByDay)) {
      const found = apts.find((a) => a.id === aptId);
      if (found) { apt = found; sourceDate = d; break; }
    }
    if (!apt || (apt.time === newTime && sourceDate === newDate)) return;
    try {
      const updated = await appointmentsApi.update(aptId, { time: newTime, date: newDate });
      setAptsByDay((prev) => {
        const next = { ...prev };
        if (next[sourceDate]) next[sourceDate] = next[sourceDate].filter((a) => a.id !== aptId);
        next[newDate] = [...(next[newDate] ?? []), updated];
        return next;
      });
      toast.success(`Movido para ${formatDate(newDate)} às ${newTime}`);
    } catch {
      toast.error("Erro ao mover agendamento");
    }
  }, [aptsByDay]);

  return (
    <div className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden overflow-x-auto">
      {loading ? (
        <div className="flex items-center justify-center py-20 text-brand-900/40">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : (
        <div className="min-w-[700px]">
          {/* Grid + header dentro do mesmo scroll container para alinhar colunas */}
          <div ref={scrollRef} className="overflow-y-auto" style={{ maxHeight: "70vh" }}>
            {/* Header sticky */}
            <div className="sticky top-0 z-20 flex border-b border-border bg-card">
              <div className="w-14 shrink-0" />
              {weekDays.map((d, i) => (
                <button
                  key={i}
                  onClick={() => onDayClick(d)}
                  className={cn(
                    "flex-1 py-3 text-center text-xs font-semibold border-l border-border hover:bg-brand-50 transition-colors",
                    isToday(d) ? "text-brand-600 bg-brand-50" : "text-brand-900/60"
                  )}
                >
                  <span className="block uppercase tracking-wider">{WEEK_LABELS[i]}</span>
                  <span className={cn(
                    "mt-1 inline-flex size-6 items-center justify-center rounded-full font-serif text-sm",
                    isToday(d) ? "bg-brand-500 text-white" : ""
                  )}>
                    {d.getDate()}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex">
              {/* Time labels */}
              <div className="w-14 shrink-0 relative" style={{ height: TOTAL_H }}>
                {HOURS.map((h, i) => (
                  <div
                    key={h}
                    style={{ position: "absolute", top: 16 + i * HOUR_H, right: 8, left: 0 }}
                    className="flex justify-end"
                  >
                    <span className="text-[10px] font-semibold text-brand-900/40 leading-none">{String(h).padStart(2, "0")}:00</span>
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {weekDays.map((d, i) => {
                const dateStr = toISO(d);
                const dayApts = aptsByDay[dateStr] ?? [];
                return (
                  <WeekDayColumn
                    key={i}
                    dateStr={dateStr}
                    appointments={dayApts}
                    onDetail={onDetail}
                    onDrop={handleDrop}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WeekDayColumn({
  dateStr,
  appointments,
  onDetail,
  onDrop,
}: {
  dateStr: string;
  appointments: Appointment[];
  onDetail: (apt: Appointment) => void;
  onDrop: (aptId: string, time: string, date: string) => void;
}) {
  const colRef = useRef<HTMLDivElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const aptId = e.dataTransfer.getData("aptId");
    if (!aptId || !colRef.current) return;
    const rect = colRef.current.getBoundingClientRect();
    const offsetY = e.clientY - rect.top + colRef.current.scrollTop;
    const newTime = pxToTime(offsetY);
    onDrop(aptId, newTime, dateStr);
  };

  return (
    <div
      ref={colRef}
      className="flex-1 relative border-l border-border"
      style={{ height: TOTAL_H }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {HOURS.map((_, hi) => (
        <div
          key={hi}
          style={{ position: "absolute", top: 16 + hi * HOUR_H, left: 0, right: 0 }}
          className="border-t border-border/40"
        />
      ))}
      {appointments.map((apt) => (
        <div
          key={apt.id}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("aptId", apt.id);
            e.dataTransfer.effectAllowed = "move";
          }}
          style={{
            position: "absolute",
            top: aptTop(apt.time),
            left: 2,
            right: 2,
            height: aptHeight(apt.duration),
          }}
          className="overflow-hidden rounded-lg bg-brand-100 border border-brand-300 px-1.5 py-1 cursor-grab active:cursor-grabbing hover:bg-brand-200 transition-colors"
          onClick={() => onDetail(apt)}
          title={`${apt.client_name} — ${apt.service_name}`}
        >
          <p className="truncate text-[10px] font-bold text-brand-700">{apt.time} {apt.client_name}</p>
          <p className="truncate text-[9px] text-brand-600/70">{apt.service_name}</p>
        </div>
      ))}
    </div>
  );
}

// ── month view ─────────────────────────────────────────────
function MonthView({
  baseDate,
  refreshKey,
  onDayClick,
}: {
  baseDate: Date;
  refreshKey: number;
  onDayClick: (d: Date) => void;
}) {
  const cells = getMonthGrid(baseDate.getFullYear(), baseDate.getMonth());
  const todayISO = toISO(new Date());
  const [aptsByDay, setAptsByDay] = useState<Record<string, Appointment[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const days = cells.filter(Boolean) as Date[];
    Promise.all(
      days.map((d) => appointmentsApi.list({ date: toISO(d) }).then((apts) => ({ date: toISO(d), apts })))
    )
      .then((results) => {
        const map: Record<string, Appointment[]> = {};
        results.forEach(({ date, apts }) => { map[date] = apts; });
        setAptsByDay(map);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [baseDate.getFullYear(), baseDate.getMonth(), refreshKey]);

  const statusChip: Record<string, string> = {
    confirmado: "bg-emerald-500 text-white",
    aguardando: "bg-sky-500 text-white",
    concluido: "bg-brand-500 text-white",
    cancelado: "bg-rose-400 text-white",
  };

  return (
    <div className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="grid grid-cols-7 border-b border-border">
        {WEEK_LABELS.map((l) => (
          <div key={l} className="py-3 text-center text-xs font-semibold uppercase tracking-wider text-brand-900/40">
            {l}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d, i) => {
          const isT = d ? toISO(d) === todayISO : false;
          const isCurMonth = d ? d.getMonth() === baseDate.getMonth() : false;
          const dayApts = d ? (aptsByDay[toISO(d)] ?? []) : [];

          return (
            <div
              key={i}
              onClick={() => d && onDayClick(d)}
              className={cn(
                "min-h-[80px] border-b border-r border-border p-2 transition-colors",
                d ? "cursor-pointer hover:bg-brand-50" : "bg-background/40",
                !isCurMonth && d ? "opacity-30" : ""
              )}
            >
              {d && (
                <>
                  <span className={cn(
                    "inline-flex size-7 items-center justify-center rounded-full font-serif text-sm font-semibold",
                    isT ? "bg-brand-500 text-white" : "text-brand-900/70"
                  )}>
                    {d.getDate()}
                  </span>
                  {!loading && dayApts.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {dayApts.slice(0, 3).map((apt) => (
                        <span
                          key={apt.id}
                          className={cn(
                            "inline-block truncate max-w-full rounded px-1 py-0.5 text-[9px] font-semibold",
                            statusChip[apt.status] ?? "bg-brand-500 text-white"
                          )}
                        >
                          {apt.time} {apt.client_name.split(" ")[0]}
                        </span>
                      ))}
                      {dayApts.length > 3 && (
                        <span className="text-[9px] text-brand-900/40 font-semibold">+{dayApts.length - 3}</span>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── time grid (day view) ───────────────────────────────────
function TimeGrid({
  appointments,
  onNewAt,
  onDetail,
  onUpdate,
  onDrop,
}: {
  appointments: Appointment[];
  onNewAt: (time?: string) => void;
  onDetail: (apt: Appointment) => void;
  onUpdate: (apt: Appointment) => void;
  onDrop: (aptId: string, newTime: string) => void;
}) {
  const gridRef = useRef<HTMLDivElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const aptId = e.dataTransfer.getData("aptId");
    if (!aptId || !gridRef.current) return;
    const rect = gridRef.current.getBoundingClientRect();
    const scrollTop = gridRef.current.closest("[data-scroll]")?.scrollTop ?? 0;
    const offsetY = e.clientY - rect.top + (scrollTop as number);
    onDrop(aptId, pxToTime(offsetY));
  };

  return (
    <div className="flex">
      {/* Time labels */}
      <div className="w-16 shrink-0 border-r border-border relative" style={{ height: TOTAL_H }}>
        {HOURS.map((h, i) => (
          <div
            key={h}
            style={{ position: "absolute", top: 16 + i * HOUR_H, right: 0, left: 0 }}
            className="flex justify-end pr-3"
          >
            <span className="text-xs font-semibold text-brand-900/40 leading-none">{String(h).padStart(2, "0")}:00</span>
          </div>
        ))}
      </div>

      {/* Appointment area */}
      <div
        ref={gridRef}
        className="flex-1 relative"
        style={{ height: TOTAL_H }}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {HOURS.map((h, i) => {
          const hStr = `${String(h).padStart(2, "0")}:00`;
          return (
            <div
              key={h}
              style={{ position: "absolute", top: 16 + i * HOUR_H, left: 0, right: 0, height: HOUR_H }}
              className="border-t border-border/60 group cursor-pointer hover:bg-brand-50 transition-colors"
              onClick={() => onNewAt(hStr)}
            >
              <span className="invisible absolute left-4 top-1/2 -translate-y-1/2 text-xs text-brand-600 group-hover:visible">
                + {hStr}
              </span>
            </div>
          );
        })}

        {appointments.map((apt) => (
          <AptBlock key={apt.id} apt={apt} onDetail={onDetail} onUpdate={onUpdate} />
        ))}
      </div>
    </div>
  );
}

// ── appointment block ──────────────────────────────────────
function AptBlock({
  apt,
  onDetail,
  onUpdate,
}: {
  apt: Appointment;
  onDetail: (apt: Appointment) => void;
  onUpdate: (apt: Appointment) => void;
}) {
  const top = aptTop(apt.time);
  const height = aptHeight(apt.duration);
  const compact = height < 56;

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("aptId", apt.id);
        e.dataTransfer.effectAllowed = "move";
        e.stopPropagation();
      }}
      style={{ position: "absolute", top, left: 8, right: 8, height }}
      className="overflow-hidden rounded-2xl border border-brand-200 bg-brand-50 shadow-sm hover:shadow-md hover:border-brand-400 transition-all z-10 cursor-grab active:cursor-grabbing"
      onClick={() => onDetail(apt)}
    >
      <div className="flex h-full items-start justify-between gap-2 px-4 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <div className={cn(
            "shrink-0 flex items-center justify-center rounded-full bg-brand-200 font-serif font-semibold text-brand-700",
            compact ? "size-7 text-xs" : "size-10 text-sm"
          )}>
            {apt.clientInitials}
          </div>
          <div className="min-w-0">
            <p className={cn("font-semibold truncate", compact ? "text-xs" : "text-sm")}>{apt.client_name}</p>
            {!compact && (
              <p className="truncate text-xs text-brand-900/50">{apt.service_name} • {apt.duration} min</p>
            )}
          </div>
        </div>
        <div className={cn("flex shrink-0 items-center gap-2", compact ? "flex-row" : "flex-col items-end")}>
          <select
            value={apt.status}
            onClick={(e) => e.stopPropagation()}
            onChange={async (e) => {
              e.stopPropagation();
              try {
                const updated = await appointmentsApi.setStatus(apt.id, e.target.value as Appointment["status"]);
                onUpdate(updated);
                toast.success("Status atualizado!");
              } catch {
                toast.error("Erro ao atualizar status");
              }
            }}
            className={`rounded-full border-0 px-2 py-0.5 text-[9px] font-bold uppercase cursor-pointer ${statusStyles[apt.status]}`}
          >
            {(["confirmado", "aguardando", "concluido", "cancelado"] as const).map((s) => (
              <option key={s} value={s}>{statusLabels[s]}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

// ── apt detail modal ───────────────────────────────────────
function AptDetailModal({
  apt,
  onClose,
  onUpdate,
  onEdit,
  onDelete,
}: {
  apt: Appointment;
  onClose: () => void;
  onUpdate: (apt: Appointment) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirming) { setConfirming(true); return; }
    setDeleting(true);
    try {
      await appointmentsApi.delete(apt.id);
      toast.success("Agendamento excluído.");
      onDelete();
    } catch {
      toast.error("Erro ao excluir agendamento");
      setDeleting(false);
      setConfirming(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-brand-900/40 p-0 backdrop-blur-sm md:items-center md:p-4">
      <div className="w-full max-w-md animate-float-in rounded-t-3xl bg-card p-6 shadow-2xl md:rounded-3xl md:p-8">
        {/* Header */}
        <div className="mb-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-full bg-brand-100 font-serif font-semibold text-brand-700 text-base">
              {apt.clientInitials}
            </div>
            <div>
              <h2 className="font-serif text-xl font-semibold">{apt.client_name}</h2>
              {apt.client_phone && (
                <p className="flex items-center gap-1 text-sm text-brand-900/50">
                  <Phone className="size-3" /> {apt.client_phone}
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 hover:bg-brand-100"><X className="size-4" /></button>
        </div>

        {/* Info */}
        <div className="space-y-3 rounded-2xl bg-brand-50 p-4">
          <div className="flex items-center gap-3 text-sm">
            <Calendar className="size-4 text-brand-400 shrink-0" />
            <span className="text-brand-900/70">{formatDate(apt.date)}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Clock className="size-4 text-brand-400 shrink-0" />
            <span className="text-brand-900/70">{apt.time} • {apt.duration} min</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <User className="size-4 text-brand-400 shrink-0" />
            <span className="text-brand-900/70">{apt.service_name}</span>
          </div>
          {apt.notes && (
            <p className="border-t border-border pt-3 text-xs text-brand-900/50">{apt.notes}</p>
          )}
        </div>

        {/* Status */}
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-900/50">Status</p>
          <div className="grid grid-cols-2 gap-2">
            {(["confirmado", "aguardando", "concluido", "cancelado"] as const).map((s) => (
              <button
                key={s}
                onClick={async () => {
                  try {
                    const updated = await appointmentsApi.setStatus(apt.id, s);
                    onUpdate(updated);
                    toast.success("Status atualizado!");
                  } catch {
                    toast.error("Erro ao atualizar status");
                  }
                }}
                className={cn(
                  "rounded-xl py-2.5 text-xs font-bold uppercase transition-all",
                  apt.status === s
                    ? statusStyles[s] + " ring-2 ring-offset-1 ring-brand-400"
                    : "bg-brand-50 text-brand-900/40 hover:bg-brand-100"
                )}
              >
                {statusLabels[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={onEdit}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm font-semibold hover:bg-brand-50 transition-colors"
          >
            <Pencil className="size-4" /> Editar
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-colors",
              confirming
                ? "bg-rose-500 text-white hover:bg-rose-600"
                : "border border-border hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200"
            )}
          >
            {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            {confirming ? "Confirmar exclusão" : "Excluir"}
          </button>
        </div>
        {confirming && !deleting && (
          <button
            onClick={() => setConfirming(false)}
            className="mt-2 w-full text-center text-xs text-brand-900/40 hover:text-brand-900/70"
          >
            cancelar
          </button>
        )}
      </div>
    </div>
  );
}

// ── appointment modal (criar + editar) ─────────────────────
function AppointmentModal({
  apt,
  onClose,
  onSave,
  defaultDate,
  defaultTime,
}: {
  apt?: Appointment;
  onClose: () => void;
  onSave: (apt: Appointment) => void;
  defaultDate: string;
  defaultTime?: string;
}) {
  const isEdit = !!apt;

  const [clientId, setClientId] = useState(apt?.client_id ?? "");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(
    apt?.services?.map((s) => s.id) ?? []
  );
  const [date, setDate] = useState(apt?.date ?? defaultDate);
  const [time, setTime] = useState(apt?.time ?? defaultTime ?? "");
  const [notes, setNotes] = useState(apt?.notes ?? "");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  useEffect(() => {
    clientsApi.list().then(setClients).catch(() => toast.error("Erro ao carregar clientes"));
    servicesApi.list().then(setServices).catch(() => toast.error("Erro ao carregar serviços"));
  }, []);

  function toggleService(id: string) {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  const selectedServices = services.filter((s) => selectedServiceIds.includes(s.id));
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0);
  const totalPrice = selectedServices.reduce((sum, s) => sum + Number(s.price), 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!clientId) errs.client = "Selecione uma cliente";
    if (selectedServiceIds.length === 0) errs.service = "Selecione ao menos um serviço";
    if (!date) errs.date = "Informe a data";
    if (!time) errs.time = "Informe o horário";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      let result: Appointment;
      if (isEdit) {
        result = await appointmentsApi.update(apt.id, {
          client_id: clientId,
          service_ids: selectedServiceIds,
          date,
          time,
          notes,
        });
      } else {
        result = await appointmentsApi.create({ client_id: clientId, service_ids: selectedServiceIds, date, time, notes });
      }
      onSave(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar agendamento");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-brand-900/40 p-0 backdrop-blur-sm md:items-center md:p-4">
      <div className="w-full max-w-lg animate-float-in rounded-t-3xl bg-card p-6 shadow-2xl md:rounded-3xl md:p-8 max-h-[90vh] overflow-y-auto">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold">{isEdit ? "Editar agendamento" : "Novo agendamento"}</h2>
            <p className="mt-1 text-sm text-brand-900/50">Preencha os dados abaixo.</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 hover:bg-brand-100"><X className="size-4" /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Cliente" error={errors.client}>
            <select value={clientId} onChange={(e) => setClientId(e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20">
              <option value="">Selecione uma cliente</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>

          <Field label="Procedimentos" error={errors.service}>
            <div className="rounded-xl border border-border bg-card divide-y divide-border max-h-48 overflow-y-auto">
              {services.length === 0 ? (
                <p className="p-3 text-sm text-brand-900/40">Nenhum serviço cadastrado</p>
              ) : (
                services.map((s) => {
                  const checked = selectedServiceIds.includes(s.id);
                  return (
                    <label key={s.id} className={cn(
                      "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors",
                      checked ? "bg-brand-50" : "hover:bg-brand-50/50"
                    )}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleService(s.id)}
                        className="size-4 accent-brand-500 rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{s.name}</p>
                        <p className="text-xs text-brand-900/50">{s.duration} min • R$ {Number(s.price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
            {selectedServices.length > 0 && (
              <div className="mt-2 flex items-center justify-between rounded-lg bg-brand-100 px-3 py-2 text-xs font-semibold text-brand-700">
                <span>{selectedServices.length} procedimento{selectedServices.length > 1 ? "s" : ""}</span>
                <span>{totalDuration} min • R$ {totalPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
              </div>
            )}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Data" error={errors.date}>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
            </Field>
            <Field label="Horário" error={errors.time}>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
            </Field>
          </div>

          <Field label="Observações">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              placeholder="Ex: preferências, alergias, indicação..."
              className="w-full rounded-xl border border-border bg-card p-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
          </Field>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="h-11 flex-1 rounded-xl border border-border bg-card text-sm font-semibold hover:bg-brand-100">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 hover:bg-brand-500 disabled:opacity-70">
              {loading && <Loader2 className="size-4 animate-spin" />}
              {loading ? "Salvando..." : isEdit ? "Salvar alterações" : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── field ──────────────────────────────────────────────────
function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-brand-900/60">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}
