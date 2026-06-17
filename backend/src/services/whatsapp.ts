import prisma from "../lib/prisma";

interface ConfirmationPayload {
  clientName: string;
  clientPhone: string;
  serviceName: string;
  date: string;
  time: string;
  userId: string;
}

interface ReminderPayload {
  clientName: string;
  clientPhone: string;
  serviceName: string;
  date: string;
  time: string;
  userId: string;
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("55") ? digits : `55${digits}`;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0];
}

function applyTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

async function getConfig(userId: string) {
  const settings = await prisma.settings.findUnique({ where: { userId } });
  return {
    url: settings?.evolutionUrl || process.env.EVOLUTION_API_URL || "",
    key: settings?.evolutionKey || process.env.EVOLUTION_API_KEY || "",
    instance: settings?.evolutionInstance || process.env.EVOLUTION_INSTANCE || "",
    waMsgConfirmation: settings?.waMsgConfirmation ?? null,
    waMsgReminder: settings?.waMsgReminder ?? null,
    waMsgReschedule: settings?.waMsgReschedule ?? null,
  };
}

export async function sendWhatsAppMessage(userId: string, phone: string, text: string): Promise<void> {
  const config = await getConfig(userId);
  if (!config.url || !config.key || !config.instance || !phone) return;

  const formatted = formatPhone(phone);
  if (formatted.length < 12) return;

  const response = await fetch(`${config.url}/message/sendText/${config.instance}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: config.key,
    },
    body: JSON.stringify({ number: formatted, text }),
  });

  if (!response.ok) {
    const txt = await response.text();
    throw new Error(`EvolutionAPI error ${response.status}: ${txt}`);
  }
}

const DEFAULT_CONFIRMATION =
  `Oi {nome}! Agendamento confirmado 🤎\n\n` +
  `*{servico}*\n` +
  `{data} às {horario}\n\n` +
  `Qualquer coisa é só me chamar!`;

const DEFAULT_REMINDER =
  `Oi {nome}! Passando pra lembrar do seu horário amanhã 🤎\n\n` +
  `*{servico}* às {horario}\n\n` +
  `Me responde *SIM* pra confirmar ou *NÃO* pra cancelar`;

const DEFAULT_RESCHEDULE =
  `Oi {nome}! Precisei reagendar o seu horário 🤎\n\n` +
  `*{servico}*\n` +
  `{data} às {horario}\n\n` +
  `Qualquer dúvida é só falar!`;

export async function sendWhatsAppConfirmation(payload: ConfirmationPayload): Promise<void> {
  const config = await getConfig(payload.userId);
  const template = config.waMsgConfirmation || DEFAULT_CONFIRMATION;
  const text = applyTemplate(template, {
    nome: firstName(payload.clientName),
    servico: payload.serviceName,
    data: formatDate(payload.date),
    horario: payload.time,
  });
  await sendWhatsAppMessage(payload.userId, payload.clientPhone, text);
}

export async function sendWhatsAppReschedule(payload: ReminderPayload & { oldDate: string; oldTime: string }): Promise<void> {
  const config = await getConfig(payload.userId);
  const template = config.waMsgReschedule || DEFAULT_RESCHEDULE;
  const text = applyTemplate(template, {
    nome: firstName(payload.clientName),
    servico: payload.serviceName,
    data: formatDate(payload.date),
    horario: payload.time,
  });
  await sendWhatsAppMessage(payload.userId, payload.clientPhone, text);
}

export async function sendWhatsAppReminder(payload: ReminderPayload): Promise<void> {
  const config = await getConfig(payload.userId);
  const template = config.waMsgReminder || DEFAULT_REMINDER;
  const text = applyTemplate(template, {
    nome: firstName(payload.clientName),
    servico: payload.serviceName,
    data: formatDate(payload.date),
    horario: payload.time,
  });
  await sendWhatsAppMessage(payload.userId, payload.clientPhone, text);
}
