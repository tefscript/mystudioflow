import { Router, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { sendWhatsAppConfirmation, sendWhatsAppReschedule } from "../services/whatsapp";

const router = Router();
router.use(requireAuth);

const appointmentSchema = z.object({
  client_id: z.string().min(1),
  service_ids: z.array(z.string().min(1)).min(1, "Selecione ao menos um serviço"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (YYYY-MM-DD)"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida (HH:MM)"),
  notes: z.string().optional(),
});

const statusSchema = z.object({
  status: z.enum(["confirmado", "aguardando", "concluido", "cancelado"]),
});

const includeRelations = {
  client: { select: { name: true, phone: true } },
  services: {
    include: {
      service: { select: { name: true, price: true, duration: true } },
    },
  },
} as const;

function buildInitials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

// Duas faixas [start, start+duration) se sobrepõem quando cada uma começa
// antes do fim da outra. Um agendamento que termina exatamente quando o
// próximo começa (ex: 14:00-15:00 seguido de 15:00-16:00) não conflita.
function overlaps(startA: number, durationA: number, startB: number, durationB: number): boolean {
  return startA < startB + durationB && startB < startA + durationA;
}

function formatAppointment(apt: any) {
  const services = (apt.services ?? []).map((as: any) => ({
    id: as.serviceId,
    name: as.service.name,
    price: Number(as.service.price),
    duration: as.service.duration,
  }));

  const service_name = services.map((s: any) => s.name).join(" + ") || "";
  const service_price = services.reduce((sum: number, s: any) => sum + s.price, 0);

  return {
    id: apt.id,
    client_id: apt.clientId,
    service_id: services[0]?.id ?? "",
    services,
    date: apt.date,
    time: apt.time,
    duration: apt.duration,
    status: apt.status,
    notes: apt.notes,
    createdAt: apt.createdAt,
    updatedAt: apt.updatedAt,
    client_name: apt.client.name,
    client_phone: apt.client.phone,
    clientInitials: buildInitials(apt.client.name),
    service_name,
    service_price,
  };
}

router.get("/", async (req: AuthRequest, res: Response): Promise<void> => {
  const dateFilter = req.query.date as string | undefined;
  const statusFilter = req.query.status as string | undefined;

  const appointments = await prisma.appointment.findMany({
    where: {
      userId: req.userId!,
      ...(dateFilter ? { date: dateFilter } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
    },
    include: includeRelations,
    orderBy: [{ date: "asc" }, { time: "asc" }],
  });

  res.json(appointments.map(formatAppointment));
});

router.get("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  const id = String(req.params.id);
  const apt = await prisma.appointment.findFirst({
    where: { id, userId: req.userId! },
    include: includeRelations,
  });
  if (!apt) {
    res.status(404).json({ error: "Agendamento não encontrado" });
    return;
  }
  res.json(formatAppointment(apt));
});

router.post("/", async (req: AuthRequest, res: Response): Promise<void> => {
  const parse = appointmentSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0].message });
    return;
  }

  const { client_id, service_ids, date, time, notes } = parse.data;

  const [client, services] = await Promise.all([
    prisma.client.findFirst({ where: { id: client_id, userId: req.userId! } }),
    prisma.service.findMany({ where: { id: { in: service_ids }, userId: req.userId! } }),
  ]);

  if (!client) {
    res.status(404).json({ error: "Cliente não encontrada" });
    return;
  }
  if (services.length !== service_ids.length) {
    res.status(404).json({ error: "Um ou mais serviços não encontrados" });
    return;
  }

  const totalDuration = services.reduce((sum, s) => sum + s.duration, 0);

  const dayAppointments = await prisma.appointment.findMany({
    where: { userId: req.userId!, date, status: { notIn: ["cancelado"] } },
  });
  const newStart = timeToMinutes(time);
  const conflict = dayAppointments.find((a) =>
    overlaps(newStart, totalDuration, timeToMinutes(a.time), a.duration)
  );
  if (conflict) {
    res.status(409).json({ error: "Já existe um agendamento neste horário" });
    return;
  }

  const apt = await prisma.appointment.create({
    data: {
      userId: req.userId!,
      clientId: client_id,
      date,
      time,
      duration: totalDuration,
      status: "aguardando",
      notes: notes || null,
      services: {
        create: service_ids.map((serviceId) => ({ serviceId })),
      },
    },
    include: includeRelations,
  });

  await prisma.client.update({
    where: { id: client_id },
    data: { visits: { increment: 1 }, lastVisit: date },
  });

  const serviceNames = services.map((s) => s.name).join(", ");
  const today = new Date().toISOString().split("T")[0];
  if (date >= today) sendWhatsAppConfirmation({
    userId: req.userId!,
    clientName: client.name,
    clientPhone: client.phone,
    serviceName: serviceNames,
    date,
    time,
  }).catch(() => {});

  res.status(201).json(formatAppointment(apt));
});

router.put("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  const id = String(req.params.id);
  const existing = await prisma.appointment.findFirst({
    where: { id, userId: req.userId! },
    include: includeRelations,
  });
  if (!existing) {
    res.status(404).json({ error: "Agendamento não encontrado" });
    return;
  }

  const parse = appointmentSchema.partial().safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0].message });
    return;
  }

  const data = parse.data;
  const newDate = data.date ?? existing.date;
  const newTime = data.time ?? existing.time;

  let totalDuration = existing.duration;
  let newServiceIds: string[] | null = null;
  if (data.service_ids && data.service_ids.length > 0) {
    const services = await prisma.service.findMany({
      where: { id: { in: data.service_ids }, userId: req.userId! },
    });
    totalDuration = services.reduce((sum, s) => sum + s.duration, 0);
    newServiceIds = data.service_ids;
  }

  if (newDate !== existing.date || newTime !== existing.time || totalDuration !== existing.duration) {
    const dayAppointments = await prisma.appointment.findMany({
      where: { userId: req.userId!, date: newDate, status: { notIn: ["cancelado"] }, id: { not: id } },
    });
    const newStart = timeToMinutes(newTime);
    const conflict = dayAppointments.find((a) =>
      overlaps(newStart, totalDuration, timeToMinutes(a.time), a.duration)
    );
    if (conflict) {
      res.status(409).json({ error: "Já existe um agendamento neste horário" });
      return;
    }
  }

  if (newServiceIds) {
    await prisma.appointmentService.deleteMany({ where: { appointmentId: id } });
    await prisma.appointmentService.createMany({
      data: newServiceIds.map((serviceId) => ({ appointmentId: id, serviceId, id: crypto.randomUUID() })),
    });
  }

  const apt = await prisma.appointment.update({
    where: { id },
    data: {
      ...(data.client_id ? { clientId: data.client_id } : {}),
      ...(data.date ? { date: data.date } : {}),
      ...(data.time ? { time: data.time } : {}),
      duration: totalDuration,
      ...(data.notes !== undefined ? { notes: data.notes || null } : {}),
    },
    include: includeRelations,
  });

  const formatted = formatAppointment(apt);
  res.json(formatted);

  // avisa cliente se data ou hora mudou
  if (newDate !== existing.date || newTime !== existing.time) {
    const serviceName = apt.services.map((s: any) => s.service.name).join(", ");
    sendWhatsAppReschedule({
      userId: req.userId!,
      clientName: apt.client.name,
      clientPhone: apt.client.phone,
      serviceName,
      date: newDate,
      time: newTime,
      oldDate: existing.date,
      oldTime: existing.time,
    }).catch(() => {});
  }
});

router.patch("/:id/status", async (req: AuthRequest, res: Response): Promise<void> => {
  const id = String(req.params.id);
  const parse = statusSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Status inválido" });
    return;
  }

  const existing = await prisma.appointment.findFirst({
    where: { id, userId: req.userId! },
  });
  if (!existing) {
    res.status(404).json({ error: "Agendamento não encontrado" });
    return;
  }

  const apt = await prisma.appointment.update({
    where: { id },
    data: { status: parse.data.status },
    include: includeRelations,
  });

  res.json(formatAppointment(apt));
});

router.delete("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  const id = String(req.params.id);
  const existing = await prisma.appointment.findFirst({ where: { id, userId: req.userId! } });
  if (!existing) {
    res.status(404).json({ error: "Agendamento não encontrado" });
    return;
  }
  await prisma.appointment.delete({ where: { id } });
  res.json({ message: "Agendamento removido" });
});

export default router;
