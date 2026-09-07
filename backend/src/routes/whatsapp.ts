import { Router, Request, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import prisma from "../lib/prisma";
import { sendWhatsAppMessage } from "../services/whatsapp";

const router = Router();

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

// POST /api/whatsapp/webhook — sem autenticação, chamado pela EvolutionAPI
router.post("/webhook", async (req: Request, res: Response): Promise<void> => {
  res.sendStatus(200);

  try {
    const body = req.body as Record<string, any>;
    const event = body?.event as string | undefined;
    if (event !== "messages.upsert") return;

    const msg = body?.data;
    const fromMe: boolean = msg?.key?.fromMe ?? false;
    if (fromMe) return;

    const remoteJid: string = msg?.key?.remoteJid ?? "";
    const senderPn: string = msg?.key?.senderPn ?? "";
    // senderPn tem o número real quando remoteJid vem como LID (formato novo do WhatsApp)
    const phoneSource = senderPn || remoteJid;
    const phoneRaw = phoneSource.replace(/@.*$/, "");
    if (!phoneRaw) return;

    const text: string =
      msg?.message?.conversation ??
      msg?.message?.extendedTextMessage?.text ??
      "";
    if (!text) return;

    const normalized = text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

    const isConfirm = /\b(sim|ok|confirmo|confirmar|confirmado|pode|vou|certo|claro|combinado)\b/.test(normalized);
    const isCancel  = /\b(nao|nao posso|cancelar|cancelado|cancela|desmarcar|desmarco|impossivel|nao consigo)\b/.test(normalized);

    if (!isConfirm && !isCancel) return;

    const now = new Date();
    const limit = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const todayStr = toDateStr(now);
    const limitStr = toDateStr(limit);

    const digitsOnly = phoneRaw.replace(/\D/g, "");
    console.log(`[webhook] phone=${digitsOnly} last8=${digitsOnly.slice(-8)} isConfirm=${isConfirm} isCancel=${isCancel} window=${todayStr}..${limitStr}`);

    const clients = await prisma.client.findMany({
      where: { phone: { contains: digitsOnly.slice(-8) } },
      select: { id: true, userId: true, name: true, phone: true },
    });

    console.log(`[webhook] clients found: ${clients.length}`, clients.map(c => c.phone));

    if (clients.length === 0) return;

    for (const client of clients) {
      const appointment = await prisma.appointment.findFirst({
        where: {
          clientId: client.id,
          date: { gte: todayStr, lte: limitStr },
          status: { in: ["aguardando", "confirmado"] },
        },
        orderBy: { date: "asc" },
        include: { services: { include: { service: { select: { name: true } } } } },
      });

      if (!appointment) continue;

      const newStatus = isConfirm ? "confirmado" : "cancelado";
      await prisma.appointment.update({ where: { id: appointment.id }, data: { status: newStatus } });

      const hora = appointment.time;
      const [ano, mes, dia] = appointment.date.split("-");
      const dataFmt = `${dia}/${mes}/${ano}`;

      const nome = client.name.trim().split(/\s+/)[0];
      const replyText = isConfirm
        ? `Confirmado ${nome}! Te espero às ${hora} 🤎`
        : `Tudo bem ${nome}, cancelei aqui pra você. Se quiser remarcar é só chamar!`;

      await sendWhatsAppMessage(client.userId, client.phone, replyText).catch(() => {});
    }
  } catch {
    // silencioso
  }
});

router.use(requireAuth);

async function getEvolutionConfig(userId: string) {
  const settings = await prisma.settings.findUnique({ where: { userId } });
  return {
    url: settings?.evolutionUrl || process.env.EVOLUTION_API_URL || "",
    key: settings?.evolutionKey || process.env.EVOLUTION_API_KEY || "",
    instance: settings?.evolutionInstance || process.env.EVOLUTION_INSTANCE || "",
  };
}

// POST /api/whatsapp/instance — cria instância na EvolutionAPI (nome gerado automaticamente)
router.post("/instance", async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const url = process.env.EVOLUTION_API_URL || "";
    const key = process.env.EVOLUTION_MASTER_KEY || process.env.EVOLUTION_API_KEY || "";

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { studioName: true } });
    const slug = (user?.studioName || userId)
      .toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 32);
    const instanceName = `sf-${slug}`;

    if (!url || !key) {
      return res.status(500).json({ error: "Evolution API não configurada no servidor" });
    }

    const response = await fetch(`${url}/instance/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: key },
      body: JSON.stringify({ instanceName, qrcode: true, integration: "WHATSAPP-BAILEYS" }),
    });

    if (!response.ok) {
      const errText = await response.text();
      const alreadyExists = response.status === 409 || errText.includes("already in use");
      if (!alreadyExists) {
        console.log(`[instance] Evolution API error ${response.status}:`, errText);
        return res.status(response.status).json({ error: errText });
      }
    }

    await prisma.settings.upsert({
      where: { userId },
      create: { userId, evolutionUrl: url, evolutionKey: key, evolutionInstance: instanceName, evolutionInstanceCreatedAt: new Date() },
      update: { evolutionUrl: url, evolutionKey: key, evolutionInstance: instanceName, evolutionInstanceCreatedAt: new Date() },
    });

    return res.json({ instanceName });
  } catch {
    return res.status(500).json({ error: "Erro ao criar instância" });
  }
});

// GET /api/whatsapp/qrcode — busca QR code da instância
router.get("/qrcode", async (req: AuthRequest, res) => {
  try {
    const config = await getEvolutionConfig(req.userId!);
    if (!config.url || !config.key || !config.instance) {
      return res.status(400).json({ error: "WhatsApp não configurado" });
    }

    const response = await fetch(`${config.url}/instance/connect/${config.instance}`, {
      headers: { apikey: config.key },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: "Erro ao buscar QR code" });
    }

    const data = await response.json();
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "Erro ao buscar QR code" });
  }
});

// GET /api/whatsapp/status — verifica se está conectado
router.get("/status", async (req: AuthRequest, res) => {
  try {
    const config = await getEvolutionConfig(req.userId!);
    if (!config.url || !config.key || !config.instance) {
      return res.json({ connected: false, configured: false });
    }

    const response = await fetch(
      `${config.url}/instance/connectionState/${config.instance}`,
      { headers: { apikey: config.key } }
    );

    if (!response.ok) {
      return res.json({ connected: false, configured: true });
    }

    const data = (await response.json()) as { instance?: { state?: string } };
    const connected = data?.instance?.state === "open";
    return res.json({ connected, configured: true, state: data?.instance?.state });
  } catch {
    return res.json({ connected: false, configured: true });
  }
});

// DELETE /api/whatsapp/instance — desconecta e remove instância
router.delete("/instance", async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const config = await getEvolutionConfig(userId);

    if (config.url && config.key && config.instance) {
      await fetch(`${config.url}/instance/delete/${config.instance}`, {
        method: "DELETE",
        headers: { apikey: config.key },
      }).catch(() => {});
    }

    await prisma.settings.update({
      where: { userId },
      data: { evolutionUrl: null, evolutionKey: null, evolutionInstance: null },
    });

    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: "Erro ao desconectar" });
  }
});

// ─── Webhook (sem autenticação — chamado pela EvolutionAPI) ──────────────────
export default router;
