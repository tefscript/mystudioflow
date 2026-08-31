import { describe, it, expect } from "vitest";
import { buildWhatsAppLink, buildConfirmationMessage } from "../lib/whatsapp";

const mockApt = {
  id: "apt-1",
  clientName: "Ana Silva",
  service: "Corte de cabelo",
  date: "2026-09-10",
  time: "14:00",
  duration: 60,
  status: "aguardando" as const,
  notes: "",
};

describe("buildWhatsAppLink", () => {
  it("gera link wa.me com número brasileiro", () => {
    const link = buildWhatsAppLink("47999990000", "Olá");
    expect(link).toContain("wa.me/5547999990000");
    expect(link).toContain(encodeURIComponent("Olá"));
  });

  it("não duplica código do país se já tiver 55", () => {
    const link = buildWhatsAppLink("5547999990000", "Oi");
    expect(link).toContain("wa.me/5547999990000");
    expect(link).not.toContain("555547");
  });

  it("trata phone undefined sem quebrar", () => {
    const link = buildWhatsAppLink(undefined, "Mensagem");
    expect(link).toContain("wa.me/");
  });

  it("remove caracteres não numéricos do telefone", () => {
    const link = buildWhatsAppLink("(47) 99999-0000", "Oi");
    expect(link).toContain("5547999990000");
  });

  it("codifica a mensagem corretamente na URL", () => {
    const link = buildWhatsAppLink("47999990000", "Olá, tudo bem?");
    expect(link).toContain(encodeURIComponent("Olá, tudo bem?"));
  });
});

describe("buildConfirmationMessage", () => {
  it("contém o primeiro nome do cliente", () => {
    const msg = buildConfirmationMessage(mockApt);
    expect(msg).toContain("Ana");
    expect(msg).not.toContain("Silva");
  });

  it("contém o nome do estúdio", () => {
    const msg = buildConfirmationMessage(mockApt, "Estúdio da Isabel");
    expect(msg).toContain("Estúdio da Isabel");
  });

  it("contém o horário do agendamento", () => {
    const msg = buildConfirmationMessage(mockApt);
    expect(msg).toContain("14:00");
  });

  it("contém o nome do serviço", () => {
    const msg = buildConfirmationMessage(mockApt);
    expect(msg).toContain("Corte de cabelo");
  });

  it("instrui o cliente a responder SIM", () => {
    const msg = buildConfirmationMessage(mockApt);
    expect(msg).toContain("SIM");
  });

  it("usa nome padrão 'Studio' quando não passado", () => {
    const msg = buildConfirmationMessage(mockApt);
    expect(msg).toContain("Studio");
  });
});
