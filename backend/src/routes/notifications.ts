import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

// notificacoes sem tabela nova: agendamentos que viraram confirmado ou cancelado
// nos ultimos 7 dias (resposta da cliente no WhatsApp ou mudanca de status).
// o "lido" fica no navegador, comparando com a data da ultima vez que abriu o sino.
router.get("/", async (req: AuthRequest, res: Response): Promise<void> => {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const appointments = await prisma.appointment.findMany({
    where: {
      userId: req.userId!,
      status: { in: ["confirmado", "cancelado"] },
      updatedAt: { gte: since },
    },
    include: { client: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });

  res.json(
    appointments.map((apt) => ({
      id: apt.id,
      type: apt.status,
      client_name: apt.client.name,
      date: apt.date,
      time: apt.time,
      at: apt.updatedAt,
    })),
  );
});

export default router;
