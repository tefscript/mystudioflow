import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

// data no horario de Brasilia (o servidor roda em UTC; depois das 21h o UTC ja e o dia seguinte)
function toDateStr(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

function addDaysStr(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

router.get("/", async (req: AuthRequest, res: Response): Promise<void> => {
  const today = toDateStr(new Date());
  // ultimos 7 dias contando hoje (antes era desde segunda, e na segunda zerava)
  const weekStart = addDaysStr(today, -6);
  const firstOfMonth = today.slice(0, 8) + "01";

  const userId = req.userId!;

  const [
    todayAppointments,
    upcoming,
    totalClients,
    newClients,
    returningClients,
    weekRevenueRaw,
    todayEstimated,
    popularServicesRaw,
  ] = await Promise.all([
    prisma.appointment.count({
      where: { userId, date: today, status: { not: "cancelado" } },
    }),
    prisma.appointment.count({
      where: { userId, date: { gte: today }, status: { in: ["confirmado", "aguardando"] } },
    }),
    prisma.client.count({ where: { userId } }),
    prisma.client.count({ where: { userId, lastVisit: { gte: firstOfMonth } } }),
    prisma.client.count({ where: { userId, visits: { gt: 1 } } }),
    prisma.appointment.findMany({
      // conta tudo que nao foi cancelado (antes so "concluido", que quase ninguem marca)
      where: { userId, date: { gte: weekStart, lte: today }, status: { not: "cancelado" } },
      include: {
        services: { include: { service: { select: { price: true } } } },
      },
    }),
    prisma.appointment.findMany({
      where: { userId, date: today, status: { in: ["confirmado", "aguardando", "concluido"] } },
      include: {
        services: { include: { service: { select: { price: true } } } },
      },
    }),
    prisma.appointmentService.groupBy({
      by: ["serviceId"],
      where: { appointment: { userId } },
      _count: { serviceId: true },
      orderBy: { _count: { serviceId: "desc" } },
      take: 4,
    }),
  ]);

  // Receita por dia (ultimos 7 dias)
  const DAYS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const revenueByDay: Record<string, number> = {};
  for (const apt of weekRevenueRaw) {
    const aptRevenue = apt.services.reduce((sum, as) => sum + Number(as.service.price), 0);
    revenueByDay[apt.date] = (revenueByDay[apt.date] || 0) + aptRevenue;
  }

  const revenueWeek = Array.from({ length: 7 }, (_, i) => {
    const dateStr = addDaysStr(weekStart, i);
    const weekday = new Date(`${dateStr}T12:00:00Z`).getUTCDay();
    return { day: DAYS_PT[weekday], value: revenueByDay[dateStr] || 0 };
  });

  const weekRevenue = Object.values(revenueByDay).reduce((a, b) => a + b, 0);

  const estimatedRevenue = todayEstimated.reduce(
    (s, a) => s + a.services.reduce((ss, as) => ss + Number(as.service.price), 0),
    0
  );

  // Nomes dos serviços populares
  const serviceIds = popularServicesRaw.map((r) => r.serviceId);
  const services = await prisma.service.findMany({
    where: { id: { in: serviceIds } },
    select: { id: true, name: true },
  });
  const serviceMap = Object.fromEntries(services.map((s) => [s.id, s.name]));
  const popularServices = popularServicesRaw.map((r) => ({
    name: serviceMap[r.serviceId] || "Desconhecido",
    count: r._count?.serviceId ?? 0,
  }));

  const retentionRate =
    totalClients > 0 ? Math.round((returningClients / totalClients) * 100) : 0;

  res.json({
    stats: {
      todayAppointments,
      upcoming,
      totalClients,
      estimatedRevenue,
      weekRevenue,
      newClients,
      retentionRate,
    },
    revenueWeek,
    popularServices,
  });
});

export default router;
