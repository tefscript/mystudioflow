import cron from "node-cron";
import prisma from "../lib/prisma";
import { sendWhatsAppReminder } from "../services/whatsapp";

const TZ = "America/Sao_Paulo";

function toLocalDate(d: Date): Date {
  return new Date(d.toLocaleString("en-US", { timeZone: TZ }));
}

function getTimeWindow(now: Date): { dateStr: string; minTime: string; maxTime: string } {
  const pad = (n: number) => String(n).padStart(2, "0");

  // calcula janela em horário de Brasília
  const from = toLocalDate(new Date(now.getTime() + 12 * 60 * 60 * 1000));
  const to   = toLocalDate(new Date(now.getTime() + 12 * 60 * 60 * 1000 + 15 * 60 * 1000));

  return {
    dateStr: `${from.getFullYear()}-${pad(from.getMonth() + 1)}-${pad(from.getDate())}`,
    minTime: `${pad(from.getHours())}:${pad(from.getMinutes())}`,
    maxTime: `${pad(to.getHours())}:${pad(to.getMinutes())}`,
  };
}

let started = false;

export function startReminderJob() {
  if (started) return;
  started = true;

  cron.schedule("*/15 * * * *", async () => {
    try {
      const { dateStr, minTime, maxTime } = getTimeWindow(new Date());

      const appointments = await prisma.appointment.findMany({
        where: {
          date: dateStr,
          time: { gte: minTime, lt: maxTime },
          status: { notIn: ["cancelado"] },
        },
        include: {
          client: { select: { name: true, phone: true } },
          services: { include: { service: { select: { name: true } } } },
        },
      });

      for (const apt of appointments) {
        const serviceName = apt.services.map((as) => as.service.name).join(", ");
        sendWhatsAppReminder({
          userId: apt.userId,
          clientName: apt.client.name,
          clientPhone: apt.client.phone,
          serviceName,
          date: apt.date,
          time: apt.time,
        }).catch(() => {});
      }
    } catch {
      // silencioso — não travar o servidor por falha no cron
    }
  });

  // roda todo dia às 03:00 — limpa instâncias Evolution presas em connecting há mais de 7 dias
  cron.schedule("0 3 * * *", async () => {
    try {
      const limite = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const pendentes = await prisma.settings.findMany({
        where: {
          evolutionInstance: { not: null },
          evolutionInstanceCreatedAt: { lt: limite },
        },
        select: { userId: true, evolutionUrl: true, evolutionKey: true, evolutionInstance: true },
      });

      for (const s of pendentes) {
        if (!s.evolutionUrl || !s.evolutionKey || !s.evolutionInstance) continue;

        try {
          const statusRes = await fetch(
            `${s.evolutionUrl}/instance/connectionState/${s.evolutionInstance}`,
            { headers: { apikey: s.evolutionKey } }
          );
          if (!statusRes.ok) continue;

          const { state } = await statusRes.json() as { state?: string };
          if (state === "open") continue; // já conectada, não mexe

          // conectando há mais de 7 dias — deleta
          await fetch(`${s.evolutionUrl}/instance/delete/${s.evolutionInstance}`, {
            method: "DELETE",
            headers: { apikey: s.evolutionKey },
          });

          await prisma.settings.update({
            where: { userId: s.userId },
            data: { evolutionInstance: null, evolutionInstanceCreatedAt: null },
          });

          console.log(`[cleanupJob] instância ${s.evolutionInstance} removida por inatividade`);
        } catch {
          // falha individual não para o loop
        }
      }
    } catch {
      // silencioso
    }
  });

  console.log("Cron de lembretes iniciado");
}
