import type { Appointment } from "./mock-data";
import { clients } from "./mock-data";

export function buildConfirmationMessage(apt: Appointment, studioName = "Studio") {
  const dateLabel = new Date(apt.date + "T00:00:00").toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
  const firstName = apt.clientName.split(" ")[0];
  return [
    `Oi, ${firstName}!`,
    ``,
    `Passando para confirmar seu horário no ${studioName}:`,
    ``,
    `Data: ${dateLabel}`,
    `Horário: ${apt.time} (${apt.duration} min)`,
    `Serviço: ${apt.service}`,
    ``,
    `Posso confirmar sua presença? Responda com *SIM* para confirmar ou me avise caso precise remarcar.`,
    ``,
    `Até breve!`,
  ].join("\n");
}

export function getClientPhone(apt: Appointment): string | undefined {
  return clients.find((c) => c.name === apt.clientName)?.phone;
}

export function buildWhatsAppLink(phone: string | undefined, message: string) {
  const digits = (phone ?? "").replace(/\D/g, "");
  // Assume Brazil if no country code (10-11 digits)
  const withCountry = digits.length > 0 && digits.length <= 11 ? `55${digits}` : digits;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
}
